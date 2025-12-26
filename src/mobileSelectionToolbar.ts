/*
  移动端：选区悬浮工具条（内置）
  目标：仅在“有选区”时显示；避免抢焦点导致选区丢失；不影响桌面端。
*/

import { t } from './i18n'

export type MobileSelectionToolbarOptions = {
  enabled: () => boolean
  // 阅读模式（纯预览）下强制隐藏，避免“残留选区”误触发
  isReadingMode?: () => boolean
  getEditor: () => HTMLTextAreaElement | null
  getWysiwygRoot: () => HTMLElement | null
  onBold: () => void | Promise<void>
  onItalic: () => void | Promise<void>
  onLink: () => void | Promise<void>
  notice?: (msg: string, level?: 'ok' | 'err', ms?: number) => void
}

type SelectionSnapshot =
  | { kind: 'editor'; text: string; start: number; end: number }
  | { kind: 'wysiwyg'; text: string }
  | { kind: 'none'; text: '' }

function isReadingModeDom(): boolean {
  try {
    const container = document.querySelector('.container')
    if (!container) return false
    // 所见模式：有 wysiwyg / wysiwyg-v2 类
    if (container.classList.contains('wysiwyg')) return false
    if (container.classList.contains('wysiwyg-v2')) return false
    // 分屏模式：源码 + 预览同时可见
    if (container.classList.contains('split-preview')) return false

    const previewEl = container.querySelector('.preview') as HTMLElement | null
    const editorEl = container.querySelector('.editor') as HTMLElement | null
    if (!previewEl) return false

    const pcs = window.getComputedStyle(previewEl)
    const previewHidden =
      previewEl.classList.contains('hidden') ||
      pcs.display === 'none' ||
      pcs.visibility === 'hidden'
    const previewVisible = !previewHidden

    let editorVisible = false
    if (editorEl) {
      const ecs = window.getComputedStyle(editorEl)
      const editorHidden =
        editorEl.classList.contains('hidden') ||
        ecs.display === 'none' ||
        ecs.visibility === 'hidden'
      editorVisible = !editorHidden
    }

    // 阅读模式：预览可见且编辑器不可见
    return previewVisible && !editorVisible
  } catch {
    return false
  }
}

function snapshotSelection(
  editor: HTMLTextAreaElement | null,
  wysiwygRoot: HTMLElement | null,
): SelectionSnapshot {
  // 源码：仅在编辑器为 activeElement 时才取选区，避免“上次选区残留”误触发
  try {
    if (editor && document.activeElement === editor) {
      const s = Number(editor.selectionStart ?? 0)
      const e = Number(editor.selectionEnd ?? 0)
      if (s !== e) {
        const a = Math.min(s, e)
        const b = Math.max(s, e)
        const text = String(editor.value || '').slice(a, b)
        return { kind: 'editor', text, start: a, end: b }
      }
    }
  } catch {}

  // 所见：要求 activeElement 位于所见根节点内，避免预览/菜单选字触发
  try {
    if (wysiwygRoot) {
      const ae = document.activeElement as HTMLElement | null
      if (ae && wysiwygRoot.contains(ae)) {
        const sel = window.getSelection?.()
        const text = sel ? String(sel.toString() || '') : ''
        if (text.trim().length > 0) return { kind: 'wysiwyg', text }
      }
    }
  } catch {}

  return { kind: 'none', text: '' }
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  const raw = String(text || '')
  if (!raw) return false
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(raw)
      return true
    }
  } catch {}
  try {
    const ta = document.createElement('textarea')
    ta.value = raw
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    ta.style.top = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand && document.execCommand('copy')
    try { document.body.removeChild(ta) } catch {}
    return !!ok
  } catch {
    return false
  }
}

export function initMobileSelectionToolbar(opt: MobileSelectionToolbarOptions): void {
  try {
    const w = window as any
    if (w.__flymdMobileSelectionToolbarInited) return
    w.__flymdMobileSelectionToolbarInited = true
  } catch {}

  const enabled = () => {
    try { return !!opt?.enabled?.() } catch { return false }
  }

  const isReadingMode = () => {
    try {
      if (typeof opt?.isReadingMode === 'function') return !!opt.isReadingMode()
    } catch {}
    return isReadingModeDom()
  }

  const ensureBar = () => {
    let el = document.getElementById('mobile-selection-toolbar') as HTMLDivElement | null
    if (el) return el

    el = document.createElement('div')
    el.id = 'mobile-selection-toolbar'
    el.className = 'mobile-selection-toolbar hidden'
    el.setAttribute('role', 'toolbar')

    const mkBtn = (id: string, text: string, title: string) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.id = id
      b.className = 'mst-btn'
      b.textContent = text
      b.title = title
      return b
    }

    const btnBold = mkBtn('mst-bold', t('mst.bold'), t('mst.bold'))
    const btnItalic = mkBtn('mst-italic', t('mst.italic'), t('mst.italic'))
    const btnLink = mkBtn('mst-link', t('mst.link'), t('mst.link'))
    const btnCopy = mkBtn('mst-copy', t('mst.copy'), t('mst.copy'))
    const btnMore = mkBtn('mst-more', t('mst.more'), t('mst.more'))

    el.appendChild(btnBold)
    el.appendChild(btnItalic)
    el.appendChild(btnLink)
    el.appendChild(btnCopy)
    el.appendChild(btnMore)

    document.body.appendChild(el)
    return el
  }

  let raf = 0
  let last: SelectionSnapshot = { kind: 'none', text: '' }

  const restoreEditorSelectionIfNeeded = () => {
    try {
      if (last.kind !== 'editor') return
      const editor = opt.getEditor()
      if (!editor) return
      editor.focus()
      editor.selectionStart = last.start
      editor.selectionEnd = last.end
    } catch {}
  }

  const updateBarBottomByKeyboard = () => {
    try {
      const bar = document.getElementById('mobile-selection-toolbar') as HTMLDivElement | null
      if (!bar) return
      const vv = (window as any).visualViewport as VisualViewport | undefined
      if (!vv) return
      const kb = Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)))
      const bottom = kb > 80 ? (kb + 12) : 12
      bar.style.bottom = `calc(env(safe-area-inset-bottom) + ${bottom}px)`
    } catch {}
  }

  const update = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      raf = 0
      try {
        const bar = ensureBar()
        if (!enabled() || isReadingMode()) {
          bar.classList.add('hidden')
          return
        }

        const editor = opt.getEditor()
        const wysi = opt.getWysiwygRoot()
        last = snapshotSelection(editor, wysi)

        if (last.kind === 'none' || last.text.trim().length === 0) {
          bar.classList.add('hidden')
          return
        }

        updateBarBottomByKeyboard()
        bar.classList.remove('hidden')
      } catch {}
    })
  }

  const bindButton = (id: string, run: () => void | Promise<void>) => {
    try {
      const bar = ensureBar()
      const btn = bar.querySelector('#' + id) as HTMLButtonElement | null
      if (!btn) return
      // 关键：按下时不要抢焦点，否则选区会丢失
      const onDown = (e: Event) => {
        try {
          const editor = opt.getEditor()
          const wysi = opt.getWysiwygRoot()
          last = snapshotSelection(editor, wysi)
        } catch {}
        try { e.preventDefault() } catch {}
        try { (e as any).stopPropagation?.() } catch {}
      }
      btn.addEventListener('mousedown', onDown, { capture: true })
      btn.addEventListener('touchstart', onDown, { capture: true, passive: false } as any)
      btn.addEventListener('click', () => {
        try {
          restoreEditorSelectionIfNeeded()
          const r = run()
          if (r && typeof (r as any).then === 'function') {
            ;(r as Promise<any>).finally(() => { setTimeout(update, 0) })
            return
          }
          setTimeout(update, 0)
        } catch {
          setTimeout(update, 0)
        }
      })
    } catch {}
  }

  bindButton('mst-bold', () => opt.onBold())
  bindButton('mst-italic', () => opt.onItalic())
  bindButton('mst-link', () => opt.onLink())
  bindButton('mst-copy', async () => {
    const text = last.kind === 'none' ? '' : String(last.text || '')
    const ok = await copyTextToClipboard(text)
    if (ok) opt.notice?.(t('mst.copied') || '已复制', 'ok', 1200)
    else opt.notice?.(t('mst.copyFail') || '复制失败', 'err', 1600)
  })
  bindButton('mst-more', () => {
    // 打开顶栏“更多”（移动端）
    try {
      const el = document.getElementById('btn-mobile-menu') as HTMLElement | null
      if (el) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        return
      }
    } catch {}
    // 兜底：旧入口（避免少数旧 UI/主题没有 btn-mobile-menu 时彻底没法用）
    try {
      const w = window as any
      if (typeof w.flymdOpenContextMenu === 'function') w.flymdOpenContextMenu()
    } catch {}
  })

  // 监听：选区变化/键盘弹出/收起
  try { document.addEventListener('selectionchange', update, true) } catch {}
  try { document.addEventListener('keyup', update, true) } catch {}
  try { document.addEventListener('mouseup', update, true) } catch {}
  try { document.addEventListener('touchend', update, true) } catch {}
  try { document.addEventListener('focusin', update, true) } catch {}
  try { document.addEventListener('focusout', () => { setTimeout(update, 0) }, true) } catch {}
  try { window.addEventListener('resize', update) } catch {}
  try {
    const vv = (window as any).visualViewport as VisualViewport | undefined
    if (vv && typeof vv.addEventListener === 'function') {
      vv.addEventListener('resize', () => { updateBarBottomByKeyboard(); update() })
    }
  } catch {}

  // 语言切换后刷新按钮文案
  try {
    window.addEventListener('flymd:localeChanged', () => {
      try {
        const bar = ensureBar()
        const set = (id: string, key: string) => {
          const b = bar.querySelector('#' + id) as HTMLButtonElement | null
          if (!b) return
          const txt = t(key)
          b.textContent = txt
          b.title = txt
        }
        set('mst-bold', 'mst.bold')
        set('mst-italic', 'mst.italic')
        set('mst-link', 'mst.link')
        set('mst-copy', 'mst.copy')
        set('mst-more', 'mst.more')
      } catch {}
    })
  } catch {}

  // 初次刷新
  update()
}
