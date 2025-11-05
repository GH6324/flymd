// 代码块装饰：语言角标、行号与复制按钮（仅阅读模式生成行号；不改动 hljs 结构，避免 HTML 等语言错位）
export function decorateCodeBlocks(preview: HTMLElement) {
  try {
    const codes = Array.from(preview.querySelectorAll('pre > code.hljs')) as HTMLElement[]
    for (const code of codes) {
      const pre = code.parentElement as HTMLElement | null
      if (!pre || pre.getAttribute('data-codebox') === '1') continue
      if (code.classList.contains('language-mermaid')) continue

      const lang = ((Array.from(code.classList).find(c => c.startsWith('language-')) || '').slice(9) || 'text').toUpperCase()

      // 外层容器（不改动 code 内部结构）
      const box = document.createElement('div')
      box.className = 'codebox'
      if (pre.parentElement) pre.parentElement.insertBefore(box, pre)
      box.appendChild(pre)

      // 仅在阅读模式生成行号列
      let isWysiwyg = false
      try {
        const containerEl = preview.closest('.container') as HTMLElement | null
        isWysiwyg = !!(containerEl && (containerEl.classList.contains('wysiwyg') || containerEl.classList.contains('wysiwyg-v2')))
      } catch {}
      if (!isWysiwyg) {
        try {
          const raw = code.textContent || ''
          const lines = raw.endsWith('\n') ? raw.slice(0, -1).split('\n') : raw.split('\n')
          const lnWrap = document.createElement('div')
          lnWrap.className = 'code-lnums'
          lnWrap.setAttribute('aria-hidden', 'true')
          // 与代码实际行高对齐：读取 computed line-height（像素）并应用到行号列
          try {
            const cs = getComputedStyle(code)
            const csPre = getComputedStyle(pre)
            // 行高与字号（像素）
            const lhStr = cs.lineHeight
            const fsStr = cs.fontSize
            if (lhStr && lhStr !== 'normal') lnWrap.style.lineHeight = lhStr
            const lh = parseFloat(lhStr || '0')
            const fs = parseFloat(fsStr || '0')
            const pt = parseFloat(csPre.paddingTop || '0')
            // 以 half-leading 修正：offset = max((lh - fs)/2, 0)
            let offset = 0
            if (isFinite(lh) && isFinite(fs) && lh > fs) offset = (lh - fs) / 2
            const padTop = Math.max(0, pt + offset)
            lnWrap.style.paddingTop = padTop + 'px'
          } catch {}
          let buf = ''
          for (let i = 0; i < lines.length; i++) buf += '<span class="ln">' + (i + 1) + '</span>'
          lnWrap.innerHTML = buf
          pre.appendChild(lnWrap)
          // 微对齐：测量第一行在 pre 内的实际像素起点，修正与行号列的起点差（通常为 0~2px）
          try {
            const probe = document.createElement('span')
            probe.style.display = 'inline-block'
            probe.style.width = '0'; probe.style.height = '0'; probe.style.padding = '0'; probe.style.margin = '0'
            code.insertBefore(probe, code.firstChild)
            const preRect = pre.getBoundingClientRect()
            const probeRect = probe.getBoundingClientRect()
            const csPre2 = getComputedStyle(pre)
            const pt2 = parseFloat(csPre2.paddingTop || '0')
            const yFirst = (probeRect.top - preRect.top) + pre.scrollTop  // 代码第一行相对 pre 顶部位置
            const current = parseFloat(lnWrap.style.paddingTop || '0')
            const delta = Math.round(yFirst - current)
            if (isFinite(delta) && Math.abs(delta) <= 4) {
              lnWrap.style.paddingTop = (current + delta) + 'px'
            }
            probe.remove()
          } catch {}
        } catch {}
      }

      // 角标与复制按钮
      const badge = document.createElement('div')
      badge.className = 'code-lang'
      badge.textContent = lang
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'code-copy'
      btn.textContent = '复制'
      box.appendChild(badge)
      box.appendChild(btn)

      pre.setAttribute('data-codebox', '1')
    }
  } catch {}
}
