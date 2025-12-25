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

export function isContentUriPath(p: string): boolean {
  return typeof p === 'string' && p.startsWith('content://')
}

function decodeURIComponentSafe(s: string): string {
  try { return decodeURIComponent(String(s || '')) } catch { return String(s || '') }
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
  await invoke('android_persist_uri_permission', { uri })
}

export async function safPickFolder(timeoutMs = 60_000): Promise<string> {
  return await invoke<string>('android_saf_pick_folder', { timeout_ms: timeoutMs })
}

export async function safListDir(uri: string): Promise<AndroidSafDirEntry[]> {
  const ents = await invoke<AndroidSafDirEntry[]>('android_saf_list_dir', { uri })
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
  return await invoke<string>('android_saf_create_file', {
    parent_uri: parentUri,
    name,
    mime_type: mimeType,
  })
}

export async function safCreateDir(parentUri: string, name: string): Promise<string> {
  return await invoke<string>('android_saf_create_dir', { parent_uri: parentUri, name })
}

export async function safDelete(uri: string): Promise<void> {
  await invoke('android_saf_delete', { uri })
}

export async function safRename(uri: string, newName: string): Promise<string> {
  return await invoke<string>('android_saf_rename', { uri, new_name: newName })
}
