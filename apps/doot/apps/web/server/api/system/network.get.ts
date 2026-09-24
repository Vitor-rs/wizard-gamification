import os from 'node:os'

export interface NetworkInterfaceInfo {
  name: string
  address: string
  isWifi: boolean
  isEthernet: boolean
  isVirtual: boolean
  isDefault: boolean
}

export function detectNetworkInterfaces(port = 4000) {
  const customPublicUrl = process.env.PUBLIC_BASE_URL || process.env.DOOT_HOST_URL || ''
  const nets = os.networkInterfaces()
  const list: NetworkInterfaceInfo[] = []

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1') {
        const isVirtual = /vethernet|virtual|vmware|hyper-v|pseudo|loopback|docker|wsl|tap|wg|tunnel/i.test(name)
        const isWifi = /wi-fi|wifi|wireless|wlan/i.test(name)
        const isEthernet = /ethernet|eth|lan/i.test(name)

        list.push({
          name,
          address: net.address,
          isWifi,
          isEthernet,
          isVirtual,
          isDefault: false,
        })
      }
    }
  }

  // Score and sort interfaces so Wi-Fi / Ethernet are at the top, virtual adapters at bottom
  list.sort((a, b) => {
    const scoreA =
      (a.isVirtual ? -100 : 0) +
      (a.isWifi ? 50 : 0) +
      (a.isEthernet ? 40 : 0) +
      (a.address.startsWith('192.168.') ? 20 : 0) +
      (a.address.startsWith('10.') ? 15 : 0)
    const scoreB =
      (b.isVirtual ? -100 : 0) +
      (b.isWifi ? 50 : 0) +
      (b.isEthernet ? 40 : 0) +
      (b.address.startsWith('192.168.') ? 20 : 0) +
      (b.address.startsWith('10.') ? 15 : 0)
    return scoreB - scoreA
  })

  if (list.length > 0 && list[0]) {
    list[0].isDefault = true
  }

  const defaultIp = list[0]?.address || 'localhost'
  const defaultBaseUrl = customPublicUrl || `http://${defaultIp}:${port}`

  return {
    ip: defaultIp,
    port,
    baseUrl: defaultBaseUrl,
    interfaces: list,
    customPublicUrl: customPublicUrl || null,
  }
}

export default defineEventHandler(() => {
  const port = Number(process.env.PORT) || 4000
  return detectNetworkInterfaces(port)
})
