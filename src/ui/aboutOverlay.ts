// 关于对话框 UI 模块
// 从 main.ts 拆分：负责 about-overlay 的 DOM 构建与内容渲染

import goodImgUrl from '../../good.png?url'
import { t } from '../i18n'
import { APP_VERSION } from '../core/appInfo'

// 初始化/重建关于对话框（幂等，实现多次调用不重复注入 footer）
export function initAboutOverlay(): void {
  try {
    const containerEl = document.querySelector('.container') as HTMLDivElement | null
    if (!containerEl) return

    let about = document.getElementById('about-overlay') as HTMLDivElement | null
    if (!about) {
      about = document.createElement('div')
      about.id = 'about-overlay'
      about.className = 'about-overlay hidden'
      about.innerHTML = `
        <div class="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
          <div class="about-header">
            <div id="about-title">${t('about.title')}  v${APP_VERSION}</div>
            <button id="about-close" class="about-close" title="${t('about.close')}">×</button>
          </div>
          <div class="about-body">
            <p>${t('about.tagline')}</p>
          </div>
        </div>
      `
      containerEl.appendChild(about)
    }

    try {
      const aboutBody = about.querySelector('.about-body') as HTMLDivElement | null
      if (aboutBody) {
        aboutBody.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
            <p>${t('about.tagline')}</p>
            <img src="${goodImgUrl}" alt="二维码" style="width:320px;height:320px;border-radius:0;object-fit:contain;"/>
            <div style="text-align:center;">
              <p style="margin:6px 0 0;color:var(--muted);font-size:12px;">${t('about.license.brief')}</p>
              <p style="margin:4px 0 0;"><a href="https://github.com/flyhunterl/flymd/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">${t('about.license.link')}</a></p>
            </div>
          </div>
        `
      }

      const aboutTitle = about.querySelector('#about-title') as HTMLDivElement | null
      if (aboutTitle) aboutTitle.textContent = `${t('about.title')} FlyMD v${APP_VERSION}`
      const aboutClose = about.querySelector('#about-close') as HTMLButtonElement | null
      if (aboutClose) { aboutClose.textContent = '×'; aboutClose.title = t('about.close') }

      const dialog = about.querySelector('.about-dialog') as HTMLDivElement | null
      if (dialog && !dialog.querySelector('.about-footer')) {
        const footer = document.createElement('div')
        footer.className = 'about-footer'
        footer.innerHTML = '<div class="about-footer-links">\
<a href="https://flymd.llingfei.com/" target="_blank" rel="noopener noreferrer">\
  <img class="favicon" src="https://icons.duckduckgo.com/ip3/flymd.llingfei.com.ico" alt="" referrerpolicy="no-referrer"/>官方网站\
</a><span class="sep">&nbsp;&nbsp;</span>\
<a href="https://www.llingfei.com" target="_blank" rel="noopener noreferrer">\
  <img class="favicon" src="https://icons.duckduckgo.com/ip3/www.llingfei.com.ico" alt="" referrerpolicy="no-referrer"/>博客\
</a><span class="sep">&nbsp;&nbsp;</span>\
<a href="https://github.com/flyhunterl/flymd" target="_blank" rel="noopener noreferrer">\
  <img class="favicon" src="https://icons.duckduckgo.com/ip3/github.com.ico" alt="" referrerpolicy="no-referrer"/>GitHub\
</a></div><span id="about-version"></span>'
        dialog.appendChild(footer)
        const verEl = footer.querySelector('#about-version') as HTMLSpanElement | null
        if (verEl) verEl.textContent = `v${APP_VERSION}`
      }
    } catch {}
  } catch {}
}

// 显示/隐藏关于对话框
export function showAbout(show: boolean): void {
  try {
    const overlay = document.getElementById('about-overlay') as HTMLDivElement | null
    if (!overlay) return
    if (show) overlay.classList.remove('hidden')
    else overlay.classList.add('hidden')
  } catch {}
}

