/**
 * 拖拽幽灵窗口（仅桌面端 Tauri）
 *
 * 为什么需要它：
 * - DOM 元素永远画不出“窗口外面”
 * - 想让拖拽提示跟着鼠标跨出窗口，只能用一个透明置顶的小窗口
 *
 * 设计约束：
 * - 失败要静默降级（不影响拖拽功能本身）
 * - 窗口必须 click-through，不能挡住目标窗口（setIgnoreCursorEvents）
 */

export type DragGhostWindow = {
  label: string
  setText: (text: string) => void
  setPosition: (screenX: number, screenY: number) => Promise<void>
  show: () => Promise<void>
  hide: () => Promise<void>
  destroy: () => Promise<void>
}

const LEGACY_LABEL_PREFIX = 'drag-ghost-'
const LABEL_PREFIX = 'flymd-drag-ghost-'

export async function cleanupDragGhostWindows(): Promise<void> {
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const wins = await WebviewWindow.getAll()
    for (const w of wins) {
      try {
        const label = String((w as any)?.label || '')
        // 只清理拖拽幽灵窗口：包括旧版本随机 label 与当前版本稳定 label
        if (!label.startsWith(LEGACY_LABEL_PREFIX) && !label.startsWith(LABEL_PREFIX)) continue
        await w.destroy()
      } catch {}
    }
  } catch {
    // 忽略
  }
}

function stableLabel(ownerLabel: string): string {
  // Webview label 的约束：`a-zA-Z-/:_`；ownerLabel 本身通常已满足，但这里仍做一次保险过滤
  const safe = String(ownerLabel || 'main').replace(/[^a-zA-Z0-9\-/:_]/g, '_')
  return LABEL_PREFIX + safe
}

function isWindowsPlatform(): boolean {
  const platform = (navigator.platform || '').toLowerCase()
  return platform.includes('win')
}

export async function createDragGhostWindow(text: string): Promise<DragGhostWindow | null> {
  // 仅 Windows 使用透明幽灵窗口；Mac/Linux 回退到无幽灵窗口（避免透明导致的黑块/不透明边缘问题）
  if (!isWindowsPlatform()) return null

  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { LogicalPosition } = await import('@tauri-apps/api/window')

    const ownerLabel = WebviewWindow.getCurrent()?.label || 'main'
    const label = stableLabel(ownerLabel)
    const url = `drag-ghost.html?owner=${encodeURIComponent(ownerLabel)}&text=${encodeURIComponent(String(text || ''))}`

    let w = await WebviewWindow.getByLabel(label)
    if (!w) {
      w = new WebviewWindow(label, {
        url,
        title: 'drag-ghost',
        width: 240,
        height: 36,
        resizable: false,
        decorations: false,
        transparent: true,
        shadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        visible: false,
        focus: false,
        focusable: false,
      })

      // 等待创建完成；失败就当作不支持（避免后续对“无效句柄”反复 IPC 打爆）
      const createdOk = await new Promise<boolean>((resolve) => {
        let done = false
        const finish = (ok: boolean) => {
          if (done) return
          done = true
          resolve(ok)
        }
        try {
          w!.once('tauri://created', () => finish(true))
          w!.once('tauri://error', () => finish(false))
          setTimeout(() => finish(false), 2000)
        } catch {
          finish(false)
        }
      })
      if (!createdOk) {
        try { await w.destroy() } catch {}
        return null
      }
    }

    // click-through：不挡住其它窗口的鼠标事件
    try { await w.setIgnoreCursorEvents(true) } catch {}
    // 创建/复用时先确保隐藏，避免 dev/HMR 之后残留在屏幕上
    try { await w.hide() } catch {}

    const channelName = `flymd:drag-ghost:${ownerLabel}`
    const bc =
      (typeof (globalThis as any).BroadcastChannel === 'function')
        ? new (globalThis as any).BroadcastChannel(channelName)
        : null

    return {
      label,
      setText(nextText: string) {
        try { bc?.postMessage({ type: 'text', text: String(nextText || '') }) } catch {}
      },
      async setPosition(screenX: number, screenY: number) {
        try {
          // 用逻辑坐标：与 PointerEvent.screenX/screenY 语义一致
          await w.setPosition(new LogicalPosition(Math.round(screenX), Math.round(screenY)))
        } catch {}
      },
      async show() {
        try { await w.show() } catch {}
      },
      async hide() {
        try { await w.hide() } catch {}
      },
      async destroy() {
        try { bc?.close?.() } catch {}
        try { await w.destroy() } catch {}
      },
    }
  } catch {
    return null
  }
}
