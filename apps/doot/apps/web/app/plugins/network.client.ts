/**
 * Client plugin to detect and initialize the LAN network address on host startup.
 * Ensures window.__DOOT_BASE_URL__ is populated with the teacher machine's Wi-Fi / LAN IP,
 * preventing 'localhost' from leaking into QR codes or join links shown to students.
 */
export default defineNuxtPlugin(async () => {
  const { fetchNetworkInfo, effectiveBaseUrl } = useLanNetwork()

  if (typeof window !== 'undefined') {
    ;(window as any).__DOOT_BASE_URL__ = effectiveBaseUrl.value
  }

  // Asynchronously query network info for any dynamic interfaces
  await fetchNetworkInfo()

  if (typeof window !== 'undefined') {
    ;(window as any).__DOOT_BASE_URL__ = effectiveBaseUrl.value
  }
})
