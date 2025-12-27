/**
 * Lucide Icons 管理模块
 * 仅导入移动端顶栏所需的 9 个图标，优化打包体积
 */

import {
  Library,
  Puzzle,
  Menu,
  CodeXml,
  Eye,
  Undo2,
  Redo2,
  Save,
  Search
} from 'lucide'

// 动态获取图标颜色（支持主题切换）
function getIconColor(): string {
  const isDark = document.body.classList.contains('dark-mode') ||
                 document.body.classList.contains('theme-dark')
  return isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
}

// 创建 SVG 图标元素
function createIcon(
  iconFunction: typeof Library,
  customAttrs?: { color?: string; size?: number }
): SVGSVGElement {
  const color = customAttrs?.color || getIconColor()
  const size = customAttrs?.size || 20

  const svg = iconFunction.toSvg({
    width: size,
    height: size,
    color: color,
    'stroke-width': 2,
    class: 'mobile-icon'
  })

  // 将 SVG 字符串转换为 DOM 元素
  const template = document.createElement('template')
  template.innerHTML = svg.trim()
  return template.content.firstChild as SVGSVGElement
}

// 图标映射表（按钮 ID → 图标函数）
export const MOBILE_ICONS = {
  'btn-library': Library,
  'btn-plugins': Puzzle,
  'btn-mobile-menu': Menu,
  'btn-mode-toggle': CodeXml,
  'btn-mode-toggle-alt': Eye,
  'btn-undo': Undo2,
  'btn-redo': Redo2,
  'btn-save': Save,
  'btn-find': Search
} as const

/**
 * 替换按钮文本为图标
 * @param buttonId 按钮 DOM ID
 * @param iconKey 图标键名（从 MOBILE_ICONS）
 * @param customAttrs 自定义属性
 */
export function replaceWithIcon(
  buttonId: string,
  iconKey: keyof typeof MOBILE_ICONS,
  customAttrs?: { color?: string; size?: number }
): void {
  const button = document.getElementById(buttonId)
  if (!button) {
    console.warn(`[Icons] 未找到按钮: ${buttonId}`)
    return
  }

  const iconFn = MOBILE_ICONS[iconKey]
  const svg = createIcon(iconFn, customAttrs)

  // 清空按钮文本，插入图标
  button.innerHTML = ''
  button.appendChild(svg)
  button.classList.add('icon-button')
}

/**
 * 切换模式图标（源码 ⇄ 阅读）
 * @param isReadMode 是否为阅读模式
 */
export function toggleModeIcon(isReadMode: boolean): void {
  const key = isReadMode ? 'btn-mode-toggle-alt' : 'btn-mode-toggle'
  replaceWithIcon('btn-mode-toggle', key)
}

/**
 * 初始化移动端顶栏图标（仅在 Android 平台调用）
 */
export function initMobileIcons(): void {
  // 左侧现有按钮替换
  replaceWithIcon('btn-library', 'btn-library')
  replaceWithIcon('btn-plugins', 'btn-plugins')
  replaceWithIcon('btn-mobile-menu', 'btn-mobile-menu')

  // 右侧工具栏按钮替换
  replaceWithIcon('btn-mode-toggle', 'btn-mode-toggle')
  replaceWithIcon('btn-undo', 'btn-undo')
  replaceWithIcon('btn-redo', 'btn-redo')
  replaceWithIcon('btn-save', 'btn-save')
  replaceWithIcon('btn-find', 'btn-find')

  console.log('[Icons] 移动端图标初始化完成')
}
