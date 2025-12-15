// 路径相关的跨模块事件

export const FLYMD_PATH_DELETED_EVENT = 'flymd-path-deleted'

export type FlymdPathDeletedDetail = {
  path: string
  isDir: boolean
}

export function dispatchPathDeleted(path: string, isDir: boolean): void {
  try {
    window.dispatchEvent(new CustomEvent(FLYMD_PATH_DELETED_EVENT, { detail: { path, isDir } satisfies FlymdPathDeletedDetail }))
  } catch {}
}

