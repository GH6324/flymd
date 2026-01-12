// 大纲面板自动显隐：仅影响“剥离布局”（左/右侧独立列）
// - 有大纲：显示独立列并占位
// - 无大纲：隐藏独立列并释放占位

export type OutlineLayoutMode = 'embedded' | 'left' | 'right'

const OUTLINE_HAS_CONTENT_DATASET_KEY = 'flymdOutlineHasContent'

export function setOutlineHasContent(outlineEl: HTMLElement | null, hasContent: boolean): void {
  try {
    if (!outlineEl) return
    outlineEl.dataset[OUTLINE_HAS_CONTENT_DATASET_KEY] = hasContent ? '1' : '0'
  } catch {}
}

export function getOutlineHasContent(outlineEl: HTMLElement | null): boolean {
  try {
    if (!outlineEl) return false
    return outlineEl.dataset[OUTLINE_HAS_CONTENT_DATASET_KEY] === '1'
  } catch {
    return false
  }
}

// 是否应该触发一次大纲渲染/刷新：
// - 剥离布局：即使当前被隐藏（可能是“无大纲自动隐藏”），也要刷新，以便大纲出现时自动显示
// - 嵌入布局：仅当大纲面板处于可见（用户切到“大纲”Tab）时才刷新，避免无谓开销
export function shouldUpdateOutlinePanel(layout: OutlineLayoutMode, outlineEl: HTMLElement | null): boolean {
  if (!outlineEl) return false
  return layout !== 'embedded' || !outlineEl.classList.contains('hidden')
}

// 同步剥离布局下的占位与显示状态（不负责 re-parent，仅负责“显隐 + 容器占位类”）
// docked=true：固定列占位（推挤编辑区）
// docked=false：自动隐藏模式不占位（由外层负责 hover 展开/收起动画）
export function syncDetachedOutlineVisibility(
  layout: OutlineLayoutMode,
  containerEl: HTMLElement | null,
  outlineEl: HTMLElement | null,
  docked: boolean = true,
): boolean {
  if (!containerEl || !outlineEl) return false
  if (layout === 'embedded') return false

  const beforeHidden = outlineEl.classList.contains('hidden')
  const beforeLeft = containerEl.classList.contains('with-outline-left')
  const beforeRight = containerEl.classList.contains('with-outline-right')

  const hasContent = getOutlineHasContent(outlineEl)
  if (!hasContent) {
    try { outlineEl.classList.add('hidden') } catch {}
    try { containerEl.classList.remove('with-outline-left', 'with-outline-right') } catch {}
  } else {
    const isLeft = layout === 'left'
    try { outlineEl.classList.remove('hidden') } catch {}
    if (!docked) {
      // 自动隐藏：不占位，避免 hover 时编辑区抖动
      try { containerEl.classList.remove('with-outline-left', 'with-outline-right') } catch {}
    } else {
      try {
        containerEl.classList.toggle('with-outline-left', isLeft)
        containerEl.classList.toggle('with-outline-right', !isLeft)
      } catch {}
    }
  }

  const afterHidden = outlineEl.classList.contains('hidden')
  const afterLeft = containerEl.classList.contains('with-outline-left')
  const afterRight = containerEl.classList.contains('with-outline-right')
  return beforeHidden !== afterHidden || beforeLeft !== afterLeft || beforeRight !== afterRight
}
