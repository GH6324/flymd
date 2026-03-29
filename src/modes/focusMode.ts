// 专注模式相关的窗口装饰与自定义标题栏逻辑

import { bindWindowMaximizedState } from '../windows/maximizedState'

export type FocusTitlebarDeps = {
  getCurrentWindow: () => any
  // 退出专注模式回调，由 main.ts 提供（内部会调用 toggleFocusMode(false)）
  onExitFocus: () => Promise<void> | void
}

let disposeCustomTitlebarMaximizedBinding: (() => void) | null = null
let customTitlebarBindingSerial = 0

// 创建自定义标题栏控件
export function createCustomTitleBar(deps: FocusTitlebarDeps): void {
  // 如果已存在，先移除
  removeCustomTitleBar()
  const bindingSerial = ++customTitlebarBindingSerial

  // 创建容器
  const titleBar = document.createElement('div')
  titleBar.id = 'custom-titlebar'
  titleBar.className = 'custom-titlebar'

  // 创建拖动区域
  const dragRegion = document.createElement('div')
  dragRegion.className = 'custom-titlebar-drag'
  dragRegion.setAttribute('data-tauri-drag-region', '')

  // 创建控制按钮容器
  const controls = document.createElement('div')
  controls.className = 'custom-titlebar-controls'

  // 退出专注模式按钮
  const exitFocusBtn = document.createElement('button')
  exitFocusBtn.className = 'custom-titlebar-btn custom-titlebar-exit-focus'
  exitFocusBtn.innerHTML = '&lt;/&gt;'
  exitFocusBtn.title = '退出专注模式'
  exitFocusBtn.addEventListener('click', async () => {
    try {
      await deps.onExitFocus()
    } catch (err) {
      console.error('退出专注模式失败:', err)
    }
  })

  // 分隔线
  const separator = document.createElement('span')
  separator.className = 'custom-titlebar-separator'

  // 最小化按钮
  const minBtn = document.createElement('button')
  minBtn.className = 'custom-titlebar-btn custom-titlebar-minimize'
  minBtn.innerHTML = '－'
  minBtn.title = '最小化'
  minBtn.addEventListener('click', async () => {
    try {
      await deps.getCurrentWindow().minimize()
    } catch (err) {
      console.error('最小化失败:', err)
    }
  })

  // 最大化/还原按钮
  const maxBtn = document.createElement('button')
  maxBtn.className = 'custom-titlebar-btn custom-titlebar-maximize'
  const applyMaximizedState = (isMaximized: boolean) => {
    maxBtn.innerHTML = isMaximized ? '□' : '＋'
    maxBtn.title = isMaximized ? '还原' : '最大化'
  }
  applyMaximizedState(false)
  maxBtn.addEventListener('click', async () => {
    try {
      const win = deps.getCurrentWindow()
      const isMaximized = await win.isMaximized()
      if (isMaximized) {
        await win.unmaximize()
      } else {
        await win.maximize()
      }
    } catch (err) {
      console.error('最大化/还原失败:', err)
    }
  })

  // 关闭按钮
  const closeBtn = document.createElement('button')
  closeBtn.className = 'custom-titlebar-btn custom-titlebar-close'
  closeBtn.innerHTML = '×'
  closeBtn.title = '关闭'
  closeBtn.addEventListener('click', async () => {
    try {
      // 触发正常的关闭流程（会检查是否需要保存）
      const win = deps.getCurrentWindow()
      await win.close()
    } catch (err) {
      console.error('关闭窗口失败:', err)
    }
  })

  // 组装元素
  controls.appendChild(exitFocusBtn)
  controls.appendChild(separator)
  controls.appendChild(minBtn)
  controls.appendChild(maxBtn)
  controls.appendChild(closeBtn)
  titleBar.appendChild(dragRegion)
  titleBar.appendChild(controls)

  // 添加到页面顶部
  document.body.insertBefore(titleBar, document.body.firstChild)

  // 添加标记类
  document.body.classList.add('custom-titlebar-active')

  void bindWindowMaximizedState(deps.getCurrentWindow, applyMaximizedState).then((binding) => {
    if (bindingSerial !== customTitlebarBindingSerial) {
      try { binding.dispose() } catch {}
      return
    }
    disposeCustomTitlebarMaximizedBinding = binding.dispose
  }).catch(() => {
    if (bindingSerial === customTitlebarBindingSerial) {
      disposeCustomTitlebarMaximizedBinding = null
    }
  })
}

// 移除自定义标题栏
export function removeCustomTitleBar(): void {
  customTitlebarBindingSerial += 1
  try { disposeCustomTitlebarMaximizedBinding?.() } catch {}
  disposeCustomTitlebarMaximizedBinding = null

  const titleBar = document.getElementById('custom-titlebar')
  if (titleBar) {
    titleBar.remove()
  }

  // 移除标记类
  document.body.classList.remove('custom-titlebar-active')
}

// 根据当前状态统一更新窗口是否显示原生标题栏
export async function applyWindowDecorationsCore(
  getCurrentWindow: () => any,
  focusMode: boolean,
  compactTitlebar: boolean,
): Promise<void> {
  try {
    const win = getCurrentWindow()
    const hideNative = focusMode || compactTitlebar
    await win.setDecorations(!hideNative)

    // macOS：无边框窗口（decorations: false）下，窗口可能被系统视为“不可最小化”，导致 minimize() 无效。
    // 只在 macOS 且隐藏原生装饰时强制启用，避免影响其它平台与正常模式。
    const platform = (navigator.platform || '').toLowerCase()
    if (hideNative && platform.includes('mac')) {
      try { await win.setMinimizable(true) } catch {}
    }

    // 同步更新 body class，用于 CSS 判断是否显示自定义窗口控制按钮
    document.body.classList.toggle('no-native-decorations', hideNative)
  } catch (err) {
    console.warn('切换窗口装饰失败:', err)
  }
}
