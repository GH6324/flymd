/*
  移动端 UI 交互逻辑
  - 文件库面板交互补丁（避免误触）
  - 虚拟键盘适配
*/

import { isMobile } from './platform'

let _autoCloseBindTries = 0

// 初始化移动端 UI
export function initMobileUI(): void {
  if (!isMobile()) return

  // 适配虚拟键盘
  adaptVirtualKeyboard()

  // 禁用桌面端拖拽打开文件
  disableDragDrop()

  // 点击文件后自动收起库面板（仅文件，不关闭目录）
  bindAutoCloseLibraryOnFileClick()
}

function hideLibraryPanel(): void {
  try {
    const lib = document.getElementById('library') as HTMLDivElement | null
    if (!lib || lib.classList.contains('hidden')) return
    const btn = document.getElementById('btn-library') as HTMLDivElement | null
    if (btn) {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return
    }
    lib.classList.add('hidden')
  } catch {}
}

// 适配虚拟键盘（防止遮挡编辑器）
function adaptVirtualKeyboard(): void {
  // 使用 Visual Viewport API
  if ('visualViewport' in window) {
    const viewport = window.visualViewport!
    const editor = document.getElementById('editor')

    viewport.addEventListener('resize', () => {
      if (!editor) return

      // 计算键盘高度
      const keyboardHeight = window.innerHeight - viewport.height

      if (keyboardHeight > 100) {
        // 键盘弹出
        editor.style.paddingBottom = `${keyboardHeight}px`
      } else {
        // 键盘收起
        editor.style.paddingBottom = '0'
      }
    })
  }
}

// 禁用拖拽打开文件（移动端不支持）
function disableDragDrop(): void {
  document.addEventListener('dragover', (e) => e.preventDefault(), true)
  document.addEventListener('drop', (e) => e.preventDefault(), true)
}

function bindAutoCloseLibraryOnFileClick(): void {
  try {
    const lib = document.getElementById('library')
    if (!lib) {
      // main.ts 会在模块加载后续步骤里创建 #library，这里做一个温和的重试即可
      if (_autoCloseBindTries++ < 20) {
        window.setTimeout(() => {
          try { bindAutoCloseLibraryOnFileClick() } catch {}
        }, 80)
      }
      return
    }
    if ((lib as any)._mobileAutoCloseBound) return
    ;(lib as any)._mobileAutoCloseBound = true

    lib.addEventListener(
      'click',
      (ev) => {
        try {
          const target = ev.target as HTMLElement | null
          const fileNode = target?.closest?.('.lib-node.lib-file') as HTMLElement | null
          if (!fileNode) return
          // 给打开/渲染留一点时间，避免偶发“点击无效”的错觉
          window.setTimeout(() => {
            try { hideLibraryPanel() } catch {}
          }, 60)
        } catch {}
      },
      { capture: true },
    )
  } catch {}
}

// 监听屏幕旋转
export function onOrientationChange(callback: () => void): void {
  window.addEventListener('orientationchange', callback)
  window.addEventListener('resize', callback)
}

// 请求全屏（移动端沉浸式体验）
export async function requestFullscreen(): Promise<void> {
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen()
    }
  } catch (err) {
    console.warn('Fullscreen request failed:', err)
  }
}

// 退出全屏
export async function exitFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen()
    }
  } catch (err) {
    console.warn('Exit fullscreen failed:', err)
  }
}

// 检测是否为平板设备（横屏且宽度较大）
export function isTablet(): boolean {
  return window.innerWidth >= 768 && window.innerWidth < 1200
}

// 震动反馈（Android 支持）
export function vibrate(pattern: number | number[] = 50): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}
