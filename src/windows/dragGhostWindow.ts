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
  setPosition: (screenX: number, screenY: number) => Promise<void>
  destroy: () => Promise<void>
}

function genLabel(): string {
  return 'drag-ghost-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

export async function createDragGhostWindow(text: string): Promise<DragGhostWindow | null> {
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { LogicalPosition } = await import('@tauri-apps/api/window')

    const label = genLabel()
    const url = `drag-ghost.html?text=${encodeURIComponent(String(text || ''))}`

    const w = new WebviewWindow(label, {
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
      focus: false,
      focusable: false,
    })

    // 等待创建完成（避免后续 setPosition / setIgnoreCursorEvents 被吞）
    await new Promise<void>((resolve) => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        resolve()
      }
      try {
        w.once('tauri://created', () => finish())
        w.once('tauri://error', () => finish())
        setTimeout(() => finish(), 800)
      } catch {
        finish()
      }
    })

    // click-through：不挡住其它窗口的鼠标事件
    try { await w.setIgnoreCursorEvents(true) } catch {}

    return {
      label,
      async setPosition(screenX: number, screenY: number) {
        try {
          // 用逻辑坐标：与 PointerEvent.screenX/screenY 语义一致
          await w.setPosition(new LogicalPosition(Math.round(screenX), Math.round(screenY)))
        } catch {}
      },
      async destroy() {
        try { await w.destroy() } catch {}
      },
    }
  } catch {
    return null
  }
}

