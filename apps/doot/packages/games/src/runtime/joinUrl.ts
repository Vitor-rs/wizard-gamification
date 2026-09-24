import { computed, inject, type Ref } from 'vue'

/**
 * Resolves the player join URL for a game host screen.
 * Automatically replaces localhost with the detected LAN base URL or custom host URL,
 * so mobile devices and tablets can scan the QR code and connect over local Wi-Fi.
 */
export function useHostJoinUrl(code: Ref<string> | (() => string)) {
  const customJoinUrl = inject<((code: string) => string) | Ref<string> | null>('dootJoinUrl', null)
  const customBaseUrl = inject<Ref<string> | string | null>('dootBaseUrl', null)

  return computed(() => {
    const c = typeof code === 'function' ? code() : code.value

    // 1. Injected joinUrl function or ref from HostRoom
    if (customJoinUrl) {
      if (typeof customJoinUrl === 'function') return customJoinUrl(c)
      if (typeof (customJoinUrl as any).value === 'function') return (customJoinUrl as any).value(c)
      if (typeof (customJoinUrl as any).value === 'string') return (customJoinUrl as any).value
    }

    // 2. Injected baseUrl from HostRoom
    if (customBaseUrl) {
      const base = typeof customBaseUrl === 'string' ? customBaseUrl : customBaseUrl.value
      if (base) return `${base.replace(/\/+$/, '')}/play/${c}`
    }

    // 3. Global window fallback (__DOOT_BASE_URL__)
    if (typeof window !== 'undefined') {
      const winBase = (window as any).__DOOT_BASE_URL__
      if (winBase) return `${winBase.replace(/\/+$/, '')}/play/${c}`

      // 4. If window.location.hostname is already a non-localhost address (e.g. 192.168.x.x, domain)
      const host = window.location.hostname
      if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
        return `${window.location.origin}/play/${c}`
      }
    }

    return typeof window === 'undefined' ? `/play/${c}` : `${window.location.origin}/play/${c}`
  })
}
