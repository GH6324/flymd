// 左侧库面板默认页签：默认仍显示目录，只有用户显式开启时才显示大纲。
export const DEFAULT_OUTLINE_TAB_KEY = 'flymd:library:defaultOutlineTab'

export function getDefaultOutlineTabEnabled(): boolean {
  try {
    return localStorage.getItem(DEFAULT_OUTLINE_TAB_KEY) === 'true'
  } catch {
    return false
  }
}

export function setDefaultOutlineTabEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(DEFAULT_OUTLINE_TAB_KEY, enabled ? 'true' : 'false')
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('flymd:library:defaultOutlineTab:changed', { detail: { enabled } }))
  } catch {}
}
