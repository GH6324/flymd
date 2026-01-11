// 专注模式宿主：管理专注模式与紧凑标题栏的核心状态与窗口装饰

import { getCurrentWindow } from '@tauri-apps/api/window'
import type { Store } from '@tauri-apps/plugin-store'
import { createCustomTitleBar, removeCustomTitleBar, applyWindowDecorationsCore } from './focusMode'

function isWindowsPlatform(): boolean {
  const platform = (navigator.platform || '').toLowerCase()
  return platform.includes('win')
}

// 内部状态：专注模式与紧凑标题栏开关
let focusMode = false
let compactTitlebar = isWindowsPlatform()

// 对外同步当前专注模式状态（供主模块判断）
export function isFocusModeEnabled(): boolean {
  return focusMode
}

export function setFocusModeFlag(enabled: boolean): void {
  focusMode = !!enabled
}

// 对外同步当前紧凑标题栏状态
export function isCompactTitlebarEnabled(): boolean {
  return compactTitlebar
}

export function setCompactTitlebarFlag(enabled: boolean): void {
  compactTitlebar = isWindowsPlatform() ? true : !!enabled
}

// 专注模式切换：负责 body 类、自定义标题栏与窗口装饰
export async function toggleFocusMode(enabled?: boolean): Promise<void> {
  focusMode = enabled !== undefined ? !!enabled : !focusMode

  try {
    document.body.classList.toggle('focus-mode', focusMode)
  } catch {}

  try {
    if (focusMode) {
      createCustomTitleBar({
        getCurrentWindow,
        onExitFocus: () => toggleFocusMode(false),
      })
    } else {
      removeCustomTitleBar()
    }
    await applyWindowDecorationsCore(getCurrentWindow, focusMode, compactTitlebar)
    try { syncCustomTitlebarPlacement() } catch {}
  } catch {}

  // 退出专注模式时，确保标题栏不残留“显示”状态
  if (!focusMode) {
    try {
      const titlebar = document.querySelector('.titlebar') as HTMLElement | null
      if (titlebar) titlebar.classList.remove('show')
    } catch {}
  }
}

// 从 Store 读取专注模式持久化状态（若存在），否则回退到当前内存状态
export async function getFocusMode(store: Store | null): Promise<boolean> {
  try {
    if (!store) return focusMode
    const v = await store.get('focusMode')
    if (typeof v === 'boolean') {
      focusMode = v
      return v
    }
    return focusMode
  } catch {
    return focusMode
  }
}

// 从 Store 读取紧凑标题栏状态
export async function getCompactTitlebar(store: Store | null): Promise<boolean> {
  if (isWindowsPlatform()) {
    compactTitlebar = true
    return true
  }
  try {
    if (!store) return compactTitlebar
    const v = await store.get('compactTitlebar')
    if (typeof v === 'boolean') {
      compactTitlebar = v
      return v
    }
    return compactTitlebar
  } catch {
    return compactTitlebar
  }
}

// 设置紧凑标题栏状态
export async function setCompactTitlebar(
  enabled: boolean,
  store: Store | null,
  persist = true,
): Promise<void> {
  compactTitlebar = isWindowsPlatform() ? true : !!enabled

  try {
    document.body.classList.toggle('compact-titlebar', compactTitlebar)
  } catch {}

  if (persist && store && !isWindowsPlatform()) {
    try {
      await store.set('compactTitlebar', compactTitlebar)
      await store.save()
    } catch {}
  }

  try {
    await applyWindowDecorationsCore(getCurrentWindow, focusMode, compactTitlebar)
  } catch {}
}

// 同步自定义标题栏控制按钮位置：当库在右侧且处于专注模式时，将控制按钮移到左侧
export function syncCustomTitlebarPlacement(): void {
  try {
    const titleBar = document.getElementById('custom-titlebar') as HTMLDivElement | null
    if (!titleBar) return

    const libraryEl = document.getElementById('library') as HTMLDivElement | null
    const libraryOnRight = !!libraryEl && libraryEl.classList.contains('side-right')

    const controlsLeft = focusMode && libraryOnRight
    titleBar.classList.toggle('controls-left', controlsLeft)
  } catch {}
}

// 兜底：强制退出专注模式并恢复原生标题栏（供异常恢复使用）
export async function resetFocusModeDecorations(): Promise<void> {
  try {
    focusMode = false
    try { document.body.classList.remove('focus-mode') } catch {}
    try { removeCustomTitleBar() } catch {}
    try {
      await applyWindowDecorationsCore(getCurrentWindow, focusMode, compactTitlebar)
      try { syncCustomTitlebarPlacement() } catch {}
    } catch {}
  } catch {}
}
