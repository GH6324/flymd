// 大纲剥离布局：固定 / 自动隐藏（类似库侧栏）
// 目标：
// - 不破坏现有行为：默认仍是固定占位（editor 不抖动）
// - 自动隐藏时不占位：通过 transform 滑入/滑出
// - 左侧自动避让“库侧栏抽屉”（库未固定但当前可见时）
// - 右侧自动避让“库侧栏抽屉”（库未固定但当前可见时）与 dock-right-gap（AI/插件面板）

import { ribbonIcons } from '../icons'
import { getOutlineHasContent, type OutlineLayoutMode } from './outlineAutoHide'

type StoreLike = {
  get: (key: string) => Promise<any>
  set: (key: string, value: any) => Promise<void>
  save: () => Promise<void>
}

export type OutlineDockUiDeps = {
  // 依赖注入：避免模块直接依赖 main.ts 巨石状态
  getStore: () => StoreLike | null
  t: (key: string) => string
  getOutlineLayout: () => OutlineLayoutMode
  // 外部触发布局重算（re-parent + 占位类）
  requestApplyOutlineLayout: () => void
}

const OUTLINE_DOCKED_KEY = 'outlineDocked'
const OUTLINE_DOCKED_LS_KEY = 'flymd:outlineDocked'

let _deps: OutlineDockUiDeps | null = null
let _bound = false
let _outlineDocked = true

let _autoOpen = false
let _leaveTimer: number | null = null

function readDockedFromLocalStorage(): boolean | null {
  try {
    const v = localStorage.getItem(OUTLINE_DOCKED_LS_KEY)
    if (v === '1') return true
    if (v === '0') return false
  } catch {}
  return null
}

function writeDockedToLocalStorage(v: boolean): void {
  try { localStorage.setItem(OUTLINE_DOCKED_LS_KEY, v ? '1' : '0') } catch {}
}

function getEls(): {
  container: HTMLDivElement | null
  library: HTMLDivElement | null
  outline: HTMLDivElement | null
  edge: HTMLDivElement | null
} {
  const container = document.querySelector('.container') as HTMLDivElement | null
  const library = document.getElementById('library') as HTMLDivElement | null
  const outline = document.getElementById('lib-outline') as HTMLDivElement | null
  const edge = document.getElementById('outline-edge') as HTMLDivElement | null
  return { container, library, outline, edge }
}

function ensureEdgeEl(container: HTMLDivElement | null): HTMLDivElement | null {
  try {
    if (!container) return null
    let el = document.getElementById('outline-edge') as HTMLDivElement | null
    if (el) return el
    el = document.createElement('div') as HTMLDivElement
    el.id = 'outline-edge'
    el.className = 'outline-edge side-left'
    container.appendChild(el)
    return el
  } catch {
    return null
  }
}

function syncPinButtonUi(pinBtn: HTMLButtonElement | null): void {
  try {
    if (!pinBtn || !_deps) return
    // 跟库一致：图标/文案表示“点击后的动作”
    pinBtn.innerHTML = _outlineDocked ? ribbonIcons.pinOff : ribbonIcons.pin
    pinBtn.title = _outlineDocked ? (_deps.t('outline.pin.auto') || '自动隐藏') : (_deps.t('outline.pin.fixed') || '固定')
  } catch {}
}

function updateOutlineOffsets(container: HTMLDivElement | null, library: HTMLDivElement | null): void {
  try {
    if (!container) return
    let left = 0
    let right = 0

    // 仅处理“库抽屉可见但不占位”的情况：避免大纲贴边和库重叠
    if (library && !library.classList.contains('hidden')) {
      const rect = library.getBoundingClientRect()
      const w = Math.max(0, rect.width || 0)
      if (w > 0) {
        if (library.classList.contains('side-left') && !container.classList.contains('with-library-left')) left = w
        if (library.classList.contains('side-right') && !container.classList.contains('with-library-right')) right = w
      }
    }

    container.style.setProperty('--outline-left-offset', `${left}px`)
    container.style.setProperty('--outline-right-offset', `${right}px`)
  } catch {}
}

function clearLeaveTimer(): void {
  try {
    if (_leaveTimer != null) { clearTimeout(_leaveTimer); _leaveTimer = null }
  } catch {}
}

function openAutoHideNow(): void {
  try {
    if (_autoOpen) return
    _autoOpen = true
    applyOutlineDockUi()
  } catch {}
}

function scheduleCloseAutoHide(): void {
  try {
    clearLeaveTimer()
    _leaveTimer = window.setTimeout(() => {
      _leaveTimer = null
      // 鼠标仍在大纲上时不收起
      try {
        const { outline, edge } = getEls()
        if (outline && outline.matches(':hover')) return
        if (edge && edge.matches(':hover')) return
      } catch {}
      _autoOpen = false
      applyOutlineDockUi()
    }, 260)
  } catch {}
}

function ensureHoverBound(outline: HTMLDivElement | null, edge: HTMLDivElement | null): void {
  try {
    if ((outline as any)?._outlineAutoHideHoverBound) return
    if (outline) {
      outline.addEventListener('mouseenter', () => {
        try {
          if (_outlineDocked) return
          openAutoHideNow()
        } catch {}
      })
      outline.addEventListener('mouseleave', () => {
        try {
          if (_outlineDocked) return
          scheduleCloseAutoHide()
        } catch {}
      })
      ;(outline as any)._outlineAutoHideHoverBound = true
    }

    if (edge && !(edge as any)._outlineAutoHideHoverBound) {
      edge.addEventListener('mouseenter', () => {
        try {
          if (_outlineDocked) return
          openAutoHideNow()
        } catch {}
      })
      edge.addEventListener('mouseleave', () => {
        try {
          if (_outlineDocked) return
          scheduleCloseAutoHide()
        } catch {}
      })
      ;(edge as any)._outlineAutoHideHoverBound = true
    }
  } catch {}
}

export function getOutlineDocked(): boolean {
  return _outlineDocked
}

export async function setOutlineDocked(docked: boolean, persist = true): Promise<void> {
  _outlineDocked = !!docked
  // 自动隐藏关闭时，强制收起（避免“切回固定但仍保持 open 状态”）
  if (_outlineDocked) {
    _autoOpen = false
    clearLeaveTimer()
  }

  writeDockedToLocalStorage(_outlineDocked)

  try {
    if (persist && _deps) {
      const store = _deps.getStore()
      if (store) {
        await store.set(OUTLINE_DOCKED_KEY, _outlineDocked)
        await store.save()
      }
    }
  } catch {}

  // 触发重算：占位类的增减必须由外部 applyOutlineLayout 处理
  try { _deps?.requestApplyOutlineLayout() } catch {}
}

export async function syncOutlineDockFromStore(): Promise<void> {
  try {
    if (!_deps) return
    const store = _deps.getStore()
    if (!store) return
    const v = await store.get(OUTLINE_DOCKED_KEY)
    const picked = typeof v === 'boolean' ? v : _outlineDocked

    // 优先 localStorage（更接近用户刚点的那一下），仅在缺失时用 Store 补齐
    const fromLs = readDockedFromLocalStorage()
    const finalPicked = (fromLs != null) ? fromLs : picked
    _outlineDocked = !!finalPicked
    writeDockedToLocalStorage(_outlineDocked)

    if (typeof v !== 'boolean') {
      await store.set(OUTLINE_DOCKED_KEY, _outlineDocked)
      await store.save()
    }
  } catch {}
}

export function configureOutlineDockUi(deps: OutlineDockUiDeps): void {
  _deps = deps
  // 先用 localStorage 立即恢复（无需等 Store）
  const fromLs = readDockedFromLocalStorage()
  if (fromLs != null) _outlineDocked = fromLs

  if (_bound) { applyOutlineDockUi(); return }
  _bound = true

  try {
    const { container } = getEls()
    ensureEdgeEl(container)
  } catch {}

  // 监听库侧栏显示/隐藏/左右切换，动态更新避让 offset
  try {
    const { library } = getEls()
    if (library) {
      const obs = new MutationObserver(() => { try { applyOutlineDockUi() } catch {} })
      obs.observe(library, { attributes: true, attributeFilter: ['class', 'style'] })
    }
  } catch {}

  // 绑定按钮点击与 hover 展开/收起
  try {
    const { outline, container, library } = getEls()
    const edge = ensureEdgeEl(container)
    ensureHoverBound(outline, edge)

    // 初次应用：按钮/偏移/热区
    updateOutlineOffsets(container, library)
  } catch {}

  applyOutlineDockUi()
}

function appendMenuSeparator(menu: HTMLDivElement): void {
  try {
    const sep = document.createElement('div')
    sep.style.height = '1px'
    sep.style.margin = '4px 0'
    sep.style.background = 'var(--border)'
    menu.appendChild(sep)
  } catch {}
}

// 将“自动隐藏”复选框挂到大纲布局下拉菜单里
export function appendOutlineDockMenuItems(menu: HTMLDivElement, layout: OutlineLayoutMode): void {
  try {
    if (!menu) return
    const labelAuto = (_deps?.t('outline.pin.auto') || '自动隐藏')
    // 嵌入布局下没意义，但给个禁用项，避免用户找不到
    const disabled = layout === 'embedded'
    const checked = !_outlineDocked

    appendMenuSeparator(menu)

    const item = document.createElement('div')
    item.style.padding = '6px 12px'
    item.style.cursor = disabled ? 'not-allowed' : 'pointer'
    item.style.whiteSpace = 'nowrap'
    item.style.color = 'var(--fg)'
    item.style.display = 'flex'
    item.style.alignItems = 'center'
    item.style.gap = '8px'
    item.style.opacity = disabled ? '0.55' : '1'

    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = checked
    cb.disabled = disabled

    const text = document.createElement('div')
    text.textContent = labelAuto
    text.style.flex = '1'

    item.appendChild(cb)
    item.appendChild(text)

    const hoverBg = 'rgba(148,163,184,0.16)'
    item.addEventListener('mouseenter', () => { try { if (!disabled) item.style.background = hoverBg } catch {} })
    item.addEventListener('mouseleave', () => { try { item.style.background = 'transparent' } catch {} })

    const apply = async (v: boolean) => {
      // v=true => 自动隐藏启用 => docked=false
      try { await setOutlineDocked(!v) } catch {}
      // 更新复选框（以最终状态为准）
      try { cb.checked = !_outlineDocked } catch {}
    }

    item.addEventListener('click', async (ev) => {
      try { ev.preventDefault() } catch {}
      if (disabled) return
      try { await apply(!cb.checked) } catch {}
    })
    cb.addEventListener('click', (ev) => { try { ev.stopPropagation() } catch {} })
    cb.addEventListener('change', async () => {
      if (disabled) return
      try { await apply(cb.checked) } catch {}
    })

    menu.appendChild(item)
  } catch {}
}

// 根据当前状态同步：
// - 按钮显隐与文案
// - 自动隐藏 class 与热区显示
// - 避让库抽屉 offset（仅影响大纲自身定位，不推挤编辑区）
export function applyOutlineDockUi(): void {
  try {
    const layout = _deps?.getOutlineLayout ? _deps.getOutlineLayout() : 'embedded'
    const { container, library, outline } = getEls()
    const edge = ensureEdgeEl(container)
    if (!container || !outline) return

    updateOutlineOffsets(container, library)

    // 嵌入布局：不显示大纲固定按钮，不启用自动隐藏
    if (layout === 'embedded') {
      try { edge && (edge.style.display = 'none') } catch {}
      try {
        outline.classList.remove('outline-autohide', 'outline-autohide-open')
      } catch {}
      _autoOpen = false
      clearLeaveTimer()
      return
    }

    const hasContent = getOutlineHasContent(outline)
    const enableAutoHide = !_outlineDocked && hasContent && !outline.classList.contains('hidden')

    // 固定时：强制关闭自动隐藏
    if (!enableAutoHide) {
      try { outline.classList.remove('outline-autohide', 'outline-autohide-open') } catch {}
      try { if (edge) edge.style.display = 'none' } catch {}
      _autoOpen = false
      clearLeaveTimer()
      return
    }

    // 自动隐藏：确保 hover 绑定
    ensureHoverBound(outline, edge)

    try {
      outline.classList.add('outline-autohide')
      outline.classList.toggle('outline-autohide-open', _autoOpen)
    } catch {}

    try {
      if (edge) {
        edge.classList.toggle('side-left', layout === 'left')
        edge.classList.toggle('side-right', layout !== 'left')
        edge.style.display = _autoOpen ? 'none' : 'block'
      }
    } catch {}
  } catch {}
}
