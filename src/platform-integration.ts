/*
  平台集成层（移动端补丁）
  原则：别搞两套状态机。主程序（main.ts）负责“当前文件/库/模式”等状态，
  这里仅负责：
  - 设置平台 CSS class（用于移动端样式）
  - 初始化移动端 UI 补丁（键盘适配/禁用拖拽等）
 */

import { getPlatform, isMobile } from './platform'
import { initMobileUI } from './mobile'

export async function initPlatformIntegration(): Promise<void> {
  const platform = await getPlatform()

  try {
    const ua = String(navigator?.userAgent || '')
    const uaIsAndroid = /Android/i.test(ua)
    if (platform === 'android' || uaIsAndroid) {
      document.body.classList.add('platform-android')
    }
    if (isMobile() || platform === 'android') {
      document.body.classList.add('platform-mobile')
    }
  } catch {}

  // 移动端初始化 UI（键盘适配/禁用拖拽/自动收起库面板）
  try {
    if (isMobile() || platform === 'android') {
      initMobileUI()
    }
  } catch {}

  console.log('[Platform] Running on:', platform)
}
