export type WindowMaximizedStateBinding = {
  dispose: () => void
  syncNow: () => Promise<void>
}

function readMaximizedPayload(event: any): boolean | null {
  if (typeof event === 'boolean') return event
  const payload = event && typeof event === 'object' ? (event as any).payload : null
  return typeof payload === 'boolean' ? payload : null
}

// 统一把窗口最大化状态同步给前端控件。
// 不信任“按钮刚刚点过”，只信任窗口当前真实状态。
export async function bindWindowMaximizedState(
  getWindow: () => any,
  applyState: (isMaximized: boolean) => void,
): Promise<WindowMaximizedStateBinding> {
  const unlisteners: Array<() => void> = []
  let disposed = false

  const setState = (isMaximized: boolean) => {
    if (disposed) return
    applyState(!!isMaximized)
  }

  const syncNow = async () => {
    try {
      const win = getWindow()
      setState(await win.isMaximized())
    } catch {}
  }

  await syncNow()

  try {
    const win = getWindow()
    try {
      const off = await win.onResized(() => {
        void syncNow()
      })
      if (typeof off === 'function') unlisteners.push(off)
    } catch {}
    try {
      const off = await win.listen('flymd://window-maximized-changed', (event: any) => {
        const payload = readMaximizedPayload(event)
        if (payload == null) {
          void syncNow()
          return
        }
        setState(payload)
      })
      if (typeof off === 'function') unlisteners.push(off)
    } catch {}
  } catch {}

  return {
    dispose: () => {
      if (disposed) return
      disposed = true
      for (const off of unlisteners.splice(0)) {
        try { off() } catch {}
      }
    },
    syncNow,
  }
}
