// 扩展市场相关逻辑（索引获取、排序、缓存）
// 与宿主解耦：通过依赖注入访问 Store 和 HTTP

export type InstallableItem = {
  id: string
  name: string
  description?: string
  author?: string
  homepage?: string
  // 可选分类信息，用于扩展市场筛选（仅由索引提供，宿主不强制）
  category?: string
  install: { type: 'github' | 'manifest'; ref: string }
}

// 扩展市场统一排序规则：
// 1) 推荐（featured）永远排在最前面
// 2) 其余按名称首字母 A-Z 排序（不再使用 rank）
export function compareInstallableItems(a: any, b: any): number {
  try {
    const fa = a && (a.featured === true ? 1 : 0)
    const fb = b && (b.featured === true ? 1 : 0)
    if (fb !== fa) return fb - fa
    const na = String(a?.name || a?.id || '')
    const nb = String(b?.name || b?.id || '')
    return na.localeCompare(nb, 'en', { sensitivity: 'base' })
  } catch {
    return 0
  }
}

// 兜底列表：保留现有硬编码单条，作为无网/源失败时的默认项
export const FALLBACK_INSTALLABLES: InstallableItem[] = [
  {
    id: 'typecho-publisher-flymd',
    name: 'Typecho Publisher',
    description: '发布到 Typecho',
    author: 'HansJack',
    homepage: 'https://github.com/TGU-HansJack/typecho-publisher-flymd',
    install: { type: 'github', ref: 'TGU-HansJack/typecho-publisher-flymd@http' }
  }
]

export type PluginMarketChannel = 'github' | 'official'

export interface PluginMarketDeps {
  // 宿主提供 Store 访问（可为空，便于无 Store 场景降级）
  getStore(): { get(key: string): Promise<any>; set(key: string, value: any): Promise<void>; save(): Promise<void> } | null
  // 宿主提供带 HTTP 插件优先的文本获取函数
  fetchTextSmart(url: string): Promise<string>
}

const PLUGIN_MARKET_CACHE_VERSION = 2

export function createPluginMarket(deps: PluginMarketDeps) {
  // 插件市场：获取 GitHub 索引地址（优先级：Store > 环境变量 > 默认）
  async function getMarketUrl(): Promise<string | null> {
    try {
      const store = deps.getStore()
      if (store) {
        const u = await store.get('pluginMarket:url')
        if (typeof u === 'string' && /^https?:\/\//i.test(u)) return u
      }
    } catch {}
    try {
      const u = (import.meta as any)?.env?.FLYMD_PLUGIN_MARKET_URL
      if (typeof u === 'string' && /^https?:\/\//i.test(u)) return u
    } catch {}
    // 默认索引（占位，仓库可替换为实际地址）
    return 'https://raw.githubusercontent.com/flyhunterl/flymd/main/index.json'
  }

  // 读取当前渠道（默认 GitHub 优先，以保持向后兼容）
  async function getMarketChannel(): Promise<PluginMarketChannel> {
    try {
      const store = deps.getStore()
      if (!store) return 'github'
      const v = await store.get('pluginMarket:channel')
      if (v === 'official') return 'official'
      return 'github'
    } catch {
      return 'github'
    }
  }

  // 持久化渠道选择并清空缓存
  async function setMarketChannel(channel: PluginMarketChannel): Promise<void> {
    try {
      const store = deps.getStore()
      if (!store) return
      await store.set('pluginMarket:channel', channel)
      await store.set('pluginMarket:cache', null as any)
      await store.save()
    } catch {}
  }

  // 加载“可安装的扩展”索引（带缓存与多源回退：GitHub → 官网 → 本地文件 → 内置兜底）
  async function loadInstallablePlugins(force = false): Promise<InstallableItem[]> {
    // 1) 缓存（Store）
    try {
      const store = deps.getStore()
      if (!force && store) {
        const c = (await store.get('pluginMarket:cache')) as any
        const now = Date.now()
        if (c && Array.isArray(c.items) && typeof c.ts === 'number' && typeof c.ttl === 'number') {
          const ver = Number.isFinite(c.cacheVersion) ? c.cacheVersion : 0
          if (ver === PLUGIN_MARKET_CACHE_VERSION && now - c.ts < c.ttl) {
            return c.items as InstallableItem[]
          }
        }
      }
    } catch {}

    // 2) 远程索引
    try {
      const githubUrl = await getMarketUrl()
      const officialUrl = 'https://flymd.llingfei.com/plugins/index.json'
      const channel = await getMarketChannel()
      const tried: string[] = []
      let text: string | null = null
      let ttlMs = 3600_000

      const urls: string[] = []
      if (channel === 'official') {
        if (officialUrl) urls.push(officialUrl)
        if (githubUrl && !urls.includes(githubUrl)) urls.push(githubUrl)
      } else {
        if (githubUrl) urls.push(githubUrl)
        if (officialUrl && !urls.includes(officialUrl)) urls.push(officialUrl)
      }

      for (const u of urls) {
        if (!u) continue
        tried.push(u)
        try {
          const t = await deps.fetchTextSmart(u)
          if (!t || !String(t).trim()) continue
          text = String(t)
          break
        } catch {
          // 忽略失败，尝试下一个源
        }
      }

      if (text) {
        const json = JSON.parse(text)
        ttlMs = Math.max(10_000, Math.min(24 * 3600_000, (json.ttlSeconds ?? 3600) * 1000))
        let items = (json.items ?? [])
          .filter((x: any) =>
            x &&
            typeof x.id === 'string' &&
            x.install &&
            (x.install.type === 'github' || x.install.type === 'manifest') &&
            typeof x.install.ref === 'string'
          )
        // 推荐优先，其次按名称首字母 A-Z 排序（不再依赖 rank）
        try {
          items = items.sort(compareInstallableItems)
        } catch {}
        items = items.slice(0, 100)
        const store = deps.getStore()
        if (store) {
          try {
            await store.set('pluginMarket:cache', {
              cacheVersion: PLUGIN_MARKET_CACHE_VERSION,
              ts: Date.now(),
              ttl: ttlMs,
              items,
              tried,
            })
            await store.save()
          } catch {}
        }
        if (items.length > 0) return items as InstallableItem[]
      }
    } catch {}

    // 3) 本地内置文件（如存在）
    try {
      const resp = await fetch('plugin-market.json')
      if (resp && resp.ok) {
        const text = await resp.text()
        const json = JSON.parse(text)
        let items = Array.isArray(json?.items) ? json.items : []
        try { items = items.sort(compareInstallableItems) } catch {}
        if (items.length > 0) return items as InstallableItem[]
      }
    } catch {}

    // 4) 兜底
    return FALLBACK_INSTALLABLES
  }

  return {
    getMarketUrl,
    getMarketChannel,
    setMarketChannel,
    loadInstallablePlugins,
  }
}
