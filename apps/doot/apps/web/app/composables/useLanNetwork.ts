import { computed, ref } from 'vue'

export interface NetworkInfo {
  ip: string
  port: number
  baseUrl: string
  interfaces: Array<{
    name: string
    address: string
    isWifi: boolean
    isEthernet: boolean
    isVirtual: boolean
    isDefault: boolean
  }>
  customPublicUrl: string | null
}

const networkState = ref<NetworkInfo | null>(null)
const isFetched = ref(false)

export function useLanNetwork() {
  const runtime = useRuntimeConfig()
  const fallbackLanUrl = (runtime.public.lanUrl as string) || ''

  const effectiveBaseUrl = computed(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      // If the host is accessed via a real IP, LAN name or public domain, use that exact origin
      if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '::1') {
        return window.location.origin
      }
    }
    // If the host is accessed via localhost, use detected LAN base URL
    if (networkState.value?.baseUrl) {
      return networkState.value.baseUrl
    }
    if (fallbackLanUrl) {
      return fallbackLanUrl
    }
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return ''
  })

  const effectiveHost = computed(() => {
    try {
      if (effectiveBaseUrl.value) {
        const u = new URL(effectiveBaseUrl.value)
        return u.host
      }
    } catch {
      // fallback
    }
    return ''
  })

  async function fetchNetworkInfo() {
    if (isFetched.value) return
    try {
      const res = await $fetch<NetworkInfo>('/api/system/network')
      if (res) {
        networkState.value = res
        isFetched.value = true
        if (typeof window !== 'undefined') {
          ;(window as any).__DOOT_BASE_URL__ = effectiveBaseUrl.value
        }
      }
    } catch {
      // Ignore network fetch errors, fallbackLanUrl is already in place
    }
  }

  if (typeof window !== 'undefined') {
    ;(window as any).__DOOT_BASE_URL__ = effectiveBaseUrl.value
  }

  return {
    networkState,
    effectiveBaseUrl,
    effectiveHost,
    fetchNetworkInfo,
  }
}
