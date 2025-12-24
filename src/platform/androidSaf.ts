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

export async function persistSafUriPermission(uri: string): Promise<void> {
  if (!isContentUriPath(uri)) return
  await invoke('android_persist_uri_permission', { uri })
}

export async function safListDir(uri: string): Promise<AndroidSafDirEntry[]> {
  return await invoke<AndroidSafDirEntry[]>('android_saf_list_dir', { uri })
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

