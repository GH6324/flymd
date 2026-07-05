export const NETWORK_PROXY_DEFAULT_NO_PROXY = 'localhost,127.0.0.1,::1'

export function normalizeNetworkNoProxy(input: string): string {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (value: string) => {
    const v = String(value || '').trim()
    if (!v) return
    const key = v.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(v)
  }

  for (const part of String(input || '').split(/[,\s]+/)) add(part)
  for (const part of NETWORK_PROXY_DEFAULT_NO_PROXY.split(',')) add(part)
  return out.join(',')
}
