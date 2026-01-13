// 图片处理工具（前端转码为 WebP，带动图/APNG 检测）
// 仅依赖浏览器/Tauri WebView API

export type TranscodeResult = {
  blob: Blob
  type: string
  fileName: string
  changed: boolean
}

function getExtLower(name: string): string {
  try {
    const s = String(name || '').trim().toLowerCase()
    const m = s.match(/\.([a-z0-9]+)$/i)
    return m ? m[1].toLowerCase() : ''
  } catch { return '' }
}

// 将文件名后缀替换为 .webp
function toWebpName(name: string): string {
  try {
    const idx = name.lastIndexOf('.')
    if (idx > 0) return name.slice(0, idx) + '.webp'
    return name + '.webp'
  } catch { return (name || 'image') + '.webp' }
}

// 读取 Blob 为 ArrayBuffer
async function readBlobBytes(b: Blob, limit?: number): Promise<Uint8Array> {
  const buf = new Uint8Array(await b.arrayBuffer())
  if (!limit || buf.length <= limit) return buf
  return buf.subarray(0, limit)
}

// 检测 GIF 是否为动图：
// - 先查找 NETSCAPE2.0/ANIMEXTS1.0 应用扩展；
// - 若未命中，统计 Image Descriptor(0x2C) 出现次数 >= 2 也视为动图。
function isAnimatedGifBytes(bytes: Uint8Array): boolean {
  try {
    const str = new TextDecoder('ascii', { fatal: false }).decode(bytes)
    if (str.includes('NETSCAPE2.0') || str.includes('ANIMEXTS1.0')) return true
  } catch {}
  // 简易扫描 0x2C（图像描述符）计数
  let count = 0
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x2C) { count++; if (count >= 2) return true }
  }
  return false
}

// 检测 PNG 是否为 APNG：存在 acTL 块
function isApngBytes(bytes: Uint8Array): boolean {
  try {
    // PNG 头部签名 8 字节：89 50 4E 47 0D 0A 1A 0A
    if (bytes.length < 16) return false
    const sig = [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]
    for (let i = 0; i < sig.length; i++) if (bytes[i] !== sig[i]) return false
    // 简易查找 "acTL"
    const str = new TextDecoder('latin1', { fatal: false }).decode(bytes)
    return str.includes('acTL')
  } catch { return false }
}

// 通用：基于 Canvas 转为 WebP
async function rasterizeToWebp(input: Blob, quality: number): Promise<Blob | null> {
  const url = URL.createObjectURL(input)
  try {
    const img = new Image()
    const blob: Blob | null = await new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          const w = (img.naturalWidth || (img as any).width || 1) >>> 0
          const h = (img.naturalHeight || (img as any).height || 1) >>> 0
          const canvas = document.createElement('canvas')
          canvas.width = w > 0 ? w : 1
          canvas.height = h > 0 ? h : 1
          const ctx = canvas.getContext('2d')!
          // 默认白底，避免某些格式带 alpha 叠加差异；保留透明由 WebP 处理
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
          canvas.toBlob((b) => resolve(b), 'image/webp', Number.isFinite(quality) ? Math.max(0.01, Math.min(0.99, quality || 0.85)) : 0.85)
        } catch (e) { reject(e) }
      }
      img.onerror = () => reject(new Error('image decode failed'))
      img.src = url
    })
    return blob
  } finally {
    try { URL.revokeObjectURL(url) } catch {}
  }
}

export async function transcodeToWebpIfNeeded(input: Blob, origName: string, quality = 0.85, opts?: { skipAnimated?: boolean }): Promise<TranscodeResult> {
  try {
    const type = (input.type || '').toLowerCase()
    const skipAnimated = !!opts?.skipAnimated
    const ext = getExtLower(origName)
    // 已是 WebP：直接返回
    if (type.includes('image/webp')) {
      return { blob: input, type: 'image/webp', fileName: origName, changed: false }
    }
    // GIF：按 UI 语义“Gif 直接跳过”（不要转 WebP）。
    // 不能只靠 Blob.type：某些环境/来源会是 application/octet-stream 或空字符串。
    if (skipAnimated && (type.includes('image/gif') || (ext === 'gif' && !type.includes('image/')))) {
      return { blob: input, type: 'image/gif', fileName: origName, changed: false }
    }
    // APNG：跳过
    if (skipAnimated && type.includes('image/png')) {
      try { const head = await readBlobBytes(input, 512 * 1024); if (isApngBytes(head)) return { blob: input, type: 'image/png', fileName: origName, changed: false } } catch {}
    }
    // 其他位图或 SVG：尝试转码
    const webp = await rasterizeToWebp(input, quality)
    if (webp && webp.size > 0) {
      return { blob: webp, type: 'image/webp', fileName: toWebpName(origName || 'image'), changed: true }
    }
    // 转码失败：回退
    return { blob: input, type, fileName: origName, changed: false }
  } catch {
    return { blob: input, type: (input.type || 'application/octet-stream'), fileName: origName, changed: false }
  }
}

