/**
 * 应用级 Store 单例
 *
 * 关键点：
 * - 同一个 Store 文件（flymd-settings.json）只能有一个 Store 实例在写
 * - 否则会出现“最后写入者覆盖整个文件/写一半被强杀导致文件损坏”，表现为：重启后配置全丢
 *
 * 这在 Android + SAF 外置库 + 插件安装/同步 场景下更容易触发（写入更频繁、更容易被系统强杀）。
 */

import { Store } from '@tauri-apps/plugin-store'
import { SETTINGS_FILE_NAME } from './configBackup'

let _store: Store | null = null
let _loading: Promise<Store> | null = null

export function setAppStore(next: Store | null): void {
  _store = next
  _loading = null
}

export async function getAppStore(): Promise<Store> {
  if (_store) return _store
  if (_loading) return await _loading
  _loading = (async () => {
    const s = await Store.load(SETTINGS_FILE_NAME, { autoSave: true } as any)
    _store = s
    return s
  })()
  return await _loading
}

