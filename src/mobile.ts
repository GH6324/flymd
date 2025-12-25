/*
  移动端 UI 交互逻辑
  - FAB（浮动操作按钮）
  - 抽屉式文件库（复用 #library 侧栏）
  - 虚拟键盘适配
*/

import { isMobile } from './platform'

let _autoCloseBindTries = 0
let _fabContainer: HTMLDivElement | null = null
let _fabMain: HTMLButtonElement | null = null
let _fabMenu: HTMLDivElement | null = null
let _fabOpen = false

const MOBILE_UI_MIN_KEY = 'flymd_mobile_ui_minimized'

function isUiMinimized(): boolean {
  try { return localStorage.getItem(MOBILE_UI_MIN_KEY) === '1' } catch { return false }
}

function setUiMinimized(minimized: boolean): void {
  try { localStorage.setItem(MOBILE_UI_MIN_KEY, minimized ? '1' : '0') } catch {}
  try { document.body.classList.toggle('mobile-ui-minimized', minimized) } catch {}
}

function setFabOpen(open: boolean): void {
  try {
    if (!_fabMain || !_fabMenu) return
    _fabOpen = open
    _fabMain.classList.toggle('open', _fabOpen)
    _fabMenu.classList.toggle('open', _fabOpen)
  } catch {}
}

function openFabMenu(): void {
  setFabOpen(true)
}

// 初始化移动端 UI
export function initMobileUI(): void {
  if (!isMobile()) return

  // 先应用“最小 UI”偏好（用于隐藏主题按钮 / FAB）
  try { setUiMinimized(isUiMinimized()) } catch {}

  // 创建 FAB
  createFAB()

  // 创建“呼出 UI”的小把手（仅最小 UI 时显示）
  createUiHandle()

  // 创建抽屉遮罩层
  createDrawerOverlay()

  // 适配虚拟键盘
  adaptVirtualKeyboard()

  // 禁用桌面端拖拽打开文件
  disableDragDrop()

  // 点击文件后自动关闭抽屉（仅文件，不关闭目录）
  bindAutoCloseDrawerOnFileClick()
}

// 创建浮动操作按钮
function createFAB(): void {
  const container = document.createElement('div')
  container.className = 'fab-container'
  container.id = 'fab-container'
  container.innerHTML = `
    <button class="fab-main" id="fabMain" aria-label="操作菜单">
      <span>+</span>
    </button>
    <div class="fab-menu" id="fabMenu">
      <button class="fab-item" data-action="ui-min" data-label="隐藏UI" aria-label="隐藏主题按钮与浮动按钮">
        🫥
      </button>
      <button class="fab-item" data-action="menu" data-label="更多" aria-label="更多操作">
        ⋯
      </button>
      <button class="fab-item" data-action="library" data-label="文件库" aria-label="打开文件库">
        📁
      </button>
      <button class="fab-item" data-action="preview" data-label="预览" aria-label="切换预览">
        👁️
      </button>
      <button class="fab-item" data-action="save" data-label="保存" aria-label="保存文件">
        💾
      </button>
      <button class="fab-item" data-action="sync" data-label="立即同步" aria-label="WebDAV 立即同步">
        🔄
      </button>
      <button class="fab-item" data-action="sync-settings" data-label="同步设置" aria-label="打开 WebDAV 设置">
        ⚙️
      </button>
      <button class="fab-item" data-action="open" data-label="打开" aria-label="打开文件">
        📂
      </button>
      <button class="fab-item" data-action="new" data-label="新建" aria-label="新建文件">
        📄
      </button>
    </div>
  `
  document.body.appendChild(container)
  _fabContainer = container

  // FAB 主按钮点击事件
  const fabMain = document.getElementById('fabMain') as HTMLButtonElement
  const fabMenu = document.getElementById('fabMenu') as HTMLDivElement
  _fabMain = fabMain
  _fabMenu = fabMenu

  fabMain.addEventListener('click', () => {
    setFabOpen(!_fabOpen)
  })

  // FAB 子按钮点击事件（通过事件委托）
  fabMenu.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const btn = target.closest('.fab-item') as HTMLElement
    if (!btn) return

    const action = btn.dataset.action
    if (!action) return

    // UI 收起/展开不走主程序
    if (action === 'ui-min') {
      setFabOpen(false)
      setUiMinimized(true)
      return
    }

    // 触发对应操作
    triggerFABAction(action)

    // 关闭菜单
    setFabOpen(false)
  })

  // 点击其他区域关闭 FAB
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target as Node) && _fabOpen) {
      setFabOpen(false)
    }
  })
}

function createUiHandle(): void {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.id = 'mobile-ui-handle'
  btn.className = 'mobile-ui-handle'
  btn.textContent = '＋'
  btn.setAttribute('aria-label', '呼出操作按钮')
  document.body.appendChild(btn)

  btn.addEventListener('click', () => {
    setUiMinimized(false)
    // 呼出后顺便展开菜单（减少一次点击）
    openFabMenu()
  })
}

// 触发 FAB 操作（通过自定义事件通知 main.ts）
function triggerFABAction(action: string): void {
  const event = new CustomEvent('fab-action', { detail: { action } })
  window.dispatchEvent(event)
}

// 创建抽屉遮罩层
function createDrawerOverlay(): void {
  const overlay = document.createElement('div')
  overlay.className = 'drawer-overlay'
  overlay.id = 'drawerOverlay'
  document.body.appendChild(overlay)

  // 点击遮罩关闭抽屉
  overlay.addEventListener('click', () => {
    closeDrawer()
  })
}

// 打开抽屉（文件库）
export function openDrawer(): void {
  const panel = document.getElementById('library')
  const overlay = document.getElementById('drawerOverlay')
  if (panel && overlay) {
    panel.classList.remove('hidden')
    panel.classList.add('mobile-open')
    overlay.classList.add('show')
    document.body.style.overflow = 'hidden' // 防止背景滚动
  }
}

// 关闭抽屉
export function closeDrawer(): void {
  const panel = document.getElementById('library')
  const overlay = document.getElementById('drawerOverlay')
  if (panel && overlay) {
    panel.classList.add('hidden')
    panel.classList.remove('mobile-open')
    overlay.classList.remove('show')
    document.body.style.overflow = ''
  }
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

function bindAutoCloseDrawerOnFileClick(): void {
  try {
    const lib = document.getElementById('library')
    if (!lib) {
      // main.ts 会在模块加载后续步骤里创建 #library，这里做一个温和的重试即可
      if (_autoCloseBindTries++ < 20) {
        window.setTimeout(() => {
          try { bindAutoCloseDrawerOnFileClick() } catch {}
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
          // 给 openFile2 / 渲染留一点时间，避免偶发“点击无效”的错觉
          window.setTimeout(() => {
            try { closeDrawer() } catch {}
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
