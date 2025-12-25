/**
 * Android SAF（Storage Access Framework）最小桥接（前端）
 *
 * 设计约束：
 * - SAF 返回的是 content:// URI，不是传统文件路径
 * - 我们把 URI 当作“path”传递给现有逻辑（读写走后端命令兜底）
 * - 目录列举/创建/删除/重命名：通过 src-tauri 的 JNI 实现
 */

import { invoke } from '@tauri-apps/api/core'

export type AndroidSafDirEntry = {
  name: string
  path: string
  isDir: boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms | 0)))
}

function isCancelErrorMessage(msg: string): boolean {
  const s = String(msg || '')
  return /cancel/i.test(s) || /canceled/i.test(s) || /cancellation/i.test(s)
}

// 说明：Android release 场景下，极少数情况下 invoke 可能在 UI 交互早期不可用/失败；
// 对 SAF 相关命令做轻量重试，避免“偶发不可用”导致功能直接报废。
async function invokeSaf<T>(cmd: string, args?: any, opt?: { retries?: number; baseDelayMs?: number }): Promise<T> {
  const retries = Math.max(0, opt?.retries ?? 2)
  const baseDelayMs = Math.max(50, opt?.baseDelayMs ?? 200)
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await invoke<T>(cmd as any, args as any)
    } catch (e) {
      lastErr = e
      const msg = String((e as any)?.message || e || '')
      // 用户取消：不重试，交给上层按“取消选择”处理
      if (isCancelErrorMessage(msg)) throw e
      // 明确不可用：不重试（例如非 Android、命令不存在）
      if (/only available on android/i.test(msg) || /unknown command/i.test(msg)) throw e
      // 仅对疑似“桥接未就绪/偶发注入失败”做重试
      const transient =
        /__tauri__/i.test(msg) ||
        /tauri/i.test(msg) ||
        /invoke/i.test(msg) ||
        /ipc/i.test(msg) ||
        /not.*initialized/i.test(msg) ||
        /cannot read (properties|property)/i.test(msg)
      if (!transient || attempt >= retries) throw e
      await sleep(baseDelayMs * (attempt + 1))
    }
  }
  throw (lastErr instanceof Error) ? lastErr : new Error(String(lastErr || 'invokeSaf failed'))
}

export function isContentUriPath(p: string): boolean {
  return typeof p === 'string' && p.startsWith('content://')
}

function decodeURIComponentSafe(s: string): string {
  try { return decodeURIComponent(String(s || '')) } catch { return String(s || '') }
}

function extractTreeDocId(uri: string): string {
  try {
    const u = String(uri || '')
    const idx = u.indexOf('/tree/')
    if (idx < 0) return ''
    const rest = u.slice(idx + '/tree/'.length)
    const slash = rest.indexOf('/')
    const enc = (slash >= 0 ? rest.slice(0, slash) : rest).trim()
    if (!enc) return ''
    return decodeURIComponentSafe(enc)
  } catch {
    return ''
  }
}

// SAF：给 UI 用的“位置提示”，尽量暴露 docId 的真实路径（用于识别 Android/data 这类危险目录）
export function safLocationHint(uri: string): string {
  try {
    const raw = String(uri || '').trim()
    if (!raw) return ''
    const decoded = decodeURIComponentSafe(raw)
    const docId = extractTreeDocId(decoded) || ''
    const base = (docId || decoded).trim()
    if (!base) return ''

    // docId 常见：primary:Documents/FlyMD 或 1234-5678:Documents/FlyMD
    if (base.startsWith('primary:')) return base.slice('primary:'.length).replace(/^[/\\]+/, '')
    return base.replace(/^[/\\]+/, '')
  } catch {
    return ''
  }
}

// SAF：强防护——检测“卸载会被系统清空”的危险目录
// 说明：Android 会在卸载应用时自动删除其“应用专用外部目录”（常见在 /Android/data 与 /Android/obb）
// 用户如果通过 SAF 误选了这类目录当库，卸载=文档被系统清空，这是事故。
export function isSafUninstallUnsafeFolder(uri: string): boolean {
  try {
    const raw = String(uri || '').trim()
    if (!raw) return false

    const decodedUri = decodeURIComponentSafe(raw)
    const treeDocId = extractTreeDocId(decodedUri)
    const s = (treeDocId || decodedUri).toLowerCase().replace(/\\/g, '/')

    // docId 常见形式：primary:Android/data/... 或 primary:Android/obb/...
    if (s.includes(':android/data') || s.includes(':android/obb')) return true

    // 兜底：部分 provider 会在 URI 路径中直接出现 Android/data
    // 注意：这里要带分隔符，避免误伤 com.android.* authority
    if (/(^|[\/:])android\/data([\/]|$)/i.test(s)) return true
    if (/(^|[\/:])android\/obb([\/]|$)/i.test(s)) return true

    return false
  } catch {
    return false
  }
}

// SAF：把“docId/uri”变成人能看的文件名（隐藏 primary: 这类前缀与 URL 编码）
export function safPrettyName(input: string): string {
  try {
    const raw = String(input || '').trim()
    if (!raw) return ''
    const decoded = decodeURIComponentSafe(raw)
    const last = (decoded.split('/').pop() || decoded).trim()
    if (!last) return raw
    // 常见 docId：primary:xxx
    if (last.startsWith('primary:')) return last.slice('primary:'.length) || last
    return last
  } catch {
    return String(input || '')
  }
}

function normalizeSafEntryName(name: string, uri: string): string {
  const n = String(name || '').trim()
  if (n) return safPrettyName(n)
  const last = (String(uri || '').split('/').pop() || '').trim()
  return safPrettyName(last || uri)
}

export async function persistSafUriPermission(uri: string): Promise<void> {
  if (!isContentUriPath(uri)) return
  await invokeSaf('android_persist_uri_permission', { uri })
}

export async function safPickFolder(timeoutMs = 60_000): Promise<string> {
  return await invokeSaf<string>('android_saf_pick_folder', { timeout_ms: timeoutMs })
}

export async function safListDir(uri: string): Promise<AndroidSafDirEntry[]> {
  const ents = await invokeSaf<AndroidSafDirEntry[]>('android_saf_list_dir', { uri })
  const out: AndroidSafDirEntry[] = []
  for (const it of ents || []) {
    const p = String((it as any)?.path || '').trim()
    const nmRaw = String((it as any)?.name || '').trim()
    const isDir = !!(it as any)?.isDir
    if (!p) continue
    const nm = normalizeSafEntryName(nmRaw, p)
    out.push({ name: nm, path: p, isDir })
  }
  return out
}

export async function safCreateFile(
  parentUri: string,
  name: string,
  mimeType?: string,
): Promise<string> {
  return await invokeSaf<string>('android_saf_create_file', {
    parent_uri: parentUri,
    name,
    mime_type: mimeType,
  })
}

export async function safCreateDir(parentUri: string, name: string): Promise<string> {
  return await invokeSaf<string>('android_saf_create_dir', { parent_uri: parentUri, name })
}

export async function safDelete(uri: string): Promise<void> {
  await invokeSaf('android_saf_delete', { uri })
}

export async function safRename(uri: string, newName: string): Promise<string> {
  return await invokeSaf<string>('android_saf_rename', { uri, new_name: newName })
}
