// 代码块语法高亮 NodeView：使用 highlight.js 为非 mermaid 代码块添加高亮
// 采用 overlay 方式：contentDOM 保持纯文本可编辑，下方叠加高亮显示层
import type { Node } from '@milkdown/prose/model'
import type { EditorView, NodeView } from '@milkdown/prose/view'

// 常用语言列表（带图标）
const POPULAR_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', icon: '🟨' },
  { id: 'typescript', name: 'TypeScript', icon: '🔷' },
  { id: 'python', name: 'Python', icon: '🐍' },
  { id: 'java', name: 'Java', icon: '☕' },
  { id: 'cpp', name: 'C++', icon: '⚙️' },
  { id: 'c', name: 'C', icon: '🔧' },
  { id: 'csharp', name: 'C#', icon: '🎯' },
  { id: 'go', name: 'Go', icon: '🐹' },
  { id: 'rust', name: 'Rust', icon: '🦀' },
  { id: 'ruby', name: 'Ruby', icon: '💎' },
  { id: 'php', name: 'PHP', icon: '🐘' },
  { id: 'swift', name: 'Swift', icon: '🕊️' },
  { id: 'kotlin', name: 'Kotlin', icon: '🎨' },
  { id: 'html', name: 'HTML', icon: '🌐' },
  { id: 'css', name: 'CSS', icon: '🎨' },
  { id: 'scss', name: 'SCSS', icon: '🎀' },
  { id: 'sql', name: 'SQL', icon: '🗃️' },
  { id: 'bash', name: 'Bash', icon: '💻' },
  { id: 'shell', name: 'Shell', icon: '🐚' },
  { id: 'powershell', name: 'PowerShell', icon: '🔵' },
  { id: 'json', name: 'JSON', icon: '📋' },
  { id: 'yaml', name: 'YAML', icon: '📄' },
  { id: 'xml', name: 'XML', icon: '📰' },
  { id: 'markdown', name: 'Markdown', icon: '📝' },
  { id: 'dockerfile', name: 'Dockerfile', icon: '🐳' },
  { id: 'lua', name: 'Lua', icon: '🌙' },
  { id: 'r', name: 'R', icon: '📊' },
  { id: 'scala', name: 'Scala', icon: '🔴' },
  { id: 'perl', name: 'Perl', icon: '🐪' },
  { id: 'haskell', name: 'Haskell', icon: '🟣' },
  { id: 'elixir', name: 'Elixir', icon: '💧' },
  { id: 'clojure', name: 'Clojure', icon: '🟢' },
  { id: 'dart', name: 'Dart', icon: '🎯' },
  { id: 'vue', name: 'Vue', icon: '💚' },
  { id: 'graphql', name: 'GraphQL', icon: '🔺' },
  { id: 'nginx', name: 'Nginx', icon: '🌿' },
  { id: 'plaintext', name: 'Plain Text', icon: '📃' },
]

// 高亮代码块 NodeView
export class HighlightCodeBlockNodeView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  private highlightLayer: HTMLElement
  private codeWrapper: HTMLElement
  private langSelector: HTMLElement
  private langInput: HTMLInputElement
  private langDropdown: HTMLElement
  private node: Node
  private view: EditorView
  private getPos: () => number | undefined
  private lastCode: string = ''
  private highlightTimer: number | null = null

  constructor(node: Node, view: EditorView, getPos: () => number | undefined) {
    this.node = node
    this.view = view
    this.getPos = getPos
    const lang = node.attrs.language || ''

    // 创建 <pre> 容器
    this.dom = document.createElement('pre')
    this.dom.classList.add('code-block-wrapper')
    if (lang) {
      this.dom.setAttribute('data-language', lang)
    }

    // 创建一个内部包装器，用于精确对齐两个层
    this.codeWrapper = document.createElement('div')
    this.codeWrapper.classList.add('code-layers')
    this.codeWrapper.style.position = 'relative'
    this.dom.appendChild(this.codeWrapper)

    // 创建语言选择器（设置 contentEditable=false 阻止 ProseMirror 处理）
    this.langSelector = document.createElement('div')
    this.langSelector.className = 'code-lang-selector'
    this.langSelector.contentEditable = 'false'

    this.langInput = document.createElement('input')
    this.langInput.type = 'text'
    this.langInput.className = 'code-lang-input'
    this.langInput.placeholder = '选择语言...'
    this.langInput.value = lang
    this.langSelector.appendChild(this.langInput)

    this.langDropdown = document.createElement('div')
    this.langDropdown.className = 'code-lang-dropdown'
    this.langDropdown.style.pointerEvents = 'auto'
    this.langSelector.appendChild(this.langDropdown)

    this.dom.appendChild(this.langSelector)

    // 绑定语言选择器事件
    this.setupLangSelector()

    // 创建高亮显示层（只读，显示高亮后的代码）
    // 放在底层，contentDOM 透明覆盖在上面
    this.highlightLayer = document.createElement('code')
    this.highlightLayer.classList.add('highlight-layer')
    if (lang) {
      this.highlightLayer.classList.add(`language-${lang}`)
    }
    this.highlightLayer.style.display = 'block'
    this.highlightLayer.style.whiteSpace = 'pre'
    this.highlightLayer.style.pointerEvents = 'none'
    this.codeWrapper.appendChild(this.highlightLayer)

    // 创建 <code> 作为 contentDOM（ProseMirror 可编辑区域）
    // 绝对定位覆盖在 highlightLayer 上方
    this.contentDOM = document.createElement('code')
    this.contentDOM.classList.add('editable-layer')
    if (lang) {
      this.contentDOM.classList.add(`language-${lang}`)
    }
    // 编辑层样式：文字透明，只显示光标，绝对定位完全覆盖高亮层
    this.contentDOM.style.position = 'absolute'
    this.contentDOM.style.top = '0'
    this.contentDOM.style.left = '0'
    this.contentDOM.style.right = '0'
    this.contentDOM.style.bottom = '0'
    this.contentDOM.style.display = 'block'
    this.contentDOM.style.color = 'transparent'
    this.contentDOM.style.caretColor = 'var(--fg, #d4d4d4)'
    this.contentDOM.style.whiteSpace = 'pre'
    this.contentDOM.style.background = 'transparent'
    this.contentDOM.style.margin = '0'
    this.contentDOM.style.padding = '0'
    this.codeWrapper.appendChild(this.contentDOM)

    // 初始高亮（延迟执行，等待 ProseMirror 填充内容）
    requestAnimationFrame(() => {
      this.scheduleHighlight()
    })
  }

  private setupLangSelector() {
    // 渲染下拉列表
    const renderDropdown = (filter: string = '') => {
      const lowerFilter = filter.toLowerCase()
      const filtered = filter
        ? POPULAR_LANGUAGES.filter(l =>
            l.id.toLowerCase().includes(lowerFilter) ||
            l.name.toLowerCase().includes(lowerFilter)
          )
        : POPULAR_LANGUAGES

      this.langDropdown.innerHTML = filtered.map(l =>
        `<div class="code-lang-item" data-lang="${l.id}">
          <span class="code-lang-icon">${l.icon}</span>
          <span class="code-lang-name">${l.name}</span>
        </div>`
      ).join('')

      // 如果有过滤文本但没有匹配项，显示自定义语言选项
      if (filter && filtered.length === 0) {
        this.langDropdown.innerHTML = `
          <div class="code-lang-item" data-lang="${filter}">
            <span class="code-lang-icon">📝</span>
            <span class="code-lang-name">使用 "${filter}"</span>
          </div>`
      }
    }

    // 选择语言
    const selectLanguage = (langId: string) => {
      this.langInput.value = langId
      this.langDropdown.classList.remove('show')

      // 更新 ProseMirror 节点属性
      const pos = this.getPos()
      if (pos !== undefined) {
        const tr = this.view.state.tr.setNodeAttribute(pos, 'language', langId)
        this.view.dispatch(tr)
      }
    }

    // 定位下拉菜单（使用 fixed 定位避免被 overflow 裁剪）
    const positionDropdown = () => {
      const rect = this.langInput.getBoundingClientRect()
      this.langDropdown.style.position = 'fixed'
      this.langDropdown.style.top = `${rect.bottom + 4}px`
      this.langDropdown.style.left = `${rect.right - 180}px` // 右对齐，宽度 180px
    }

    // 输入框聚焦时显示下拉
    this.langInput.addEventListener('focus', () => {
      renderDropdown(this.langInput.value)
      positionDropdown()
      this.langDropdown.classList.add('show')
    })

    // 输入时过滤
    this.langInput.addEventListener('input', () => {
      renderDropdown(this.langInput.value)
      positionDropdown()
      this.langDropdown.classList.add('show')
    })

    // 点击下拉项（使用 mousedown 防止 blur 先触发）
    this.langDropdown.addEventListener('mousedown', (e) => {
      e.preventDefault() // 阻止 blur 触发
      const item = (e.target as HTMLElement).closest('.code-lang-item')
      if (item) {
        const langId = item.getAttribute('data-lang') || ''
        selectLanguage(langId)
      }
    })

    // 回车确认
    this.langInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const firstItem = this.langDropdown.querySelector('.code-lang-item')
        if (firstItem) {
          const langId = firstItem.getAttribute('data-lang') || this.langInput.value
          selectLanguage(langId)
        } else {
          selectLanguage(this.langInput.value)
        }
        this.langInput.blur()
      } else if (e.key === 'Escape') {
        this.langDropdown.classList.remove('show')
        this.langInput.blur()
      }
    })

    // 点击外部关闭
    this.langInput.addEventListener('blur', () => {
      // 延迟关闭，以便点击下拉项能触发
      setTimeout(() => {
        this.langDropdown.classList.remove('show')
      }, 150)
    })

    // 初始渲染
    renderDropdown()
  }

  private scheduleHighlight() {
    // 防抖：100ms 内多次调用只执行一次
    if (this.highlightTimer !== null) {
      window.clearTimeout(this.highlightTimer)
    }
    this.highlightTimer = window.setTimeout(() => {
      this.highlightTimer = null
      this.doHighlight()
    }, 100)
  }

  private async doHighlight() {
    try {
      const code = this.contentDOM.textContent || ''
      console.log('[Highlight Plugin] doHighlight 被调用, code length:', code.length)

      // 如果代码没变化，跳过高亮
      if (code === this.lastCode) {
        console.log('[Highlight Plugin] 代码未变化，跳过')
        return
      }
      this.lastCode = code

      if (!code.trim()) {
        this.highlightLayer.innerHTML = ''
        return
      }

      const lang = this.node.attrs.language || ''
      console.log('[Highlight Plugin] 语言:', lang)

      const hljs = await import('highlight.js')
      console.log('[Highlight Plugin] highlight.js 已加载')

      let result: { value: string }
      if (lang && hljs.default.getLanguage(lang)) {
        result = hljs.default.highlight(code, { language: lang, ignoreIllegals: true })
        console.log('[Highlight Plugin] 使用指定语言高亮')
      } else {
        result = hljs.default.highlightAuto(code)
        console.log('[Highlight Plugin] 使用自动检测高亮')
      }

      // 将高亮结果应用到显示层（不影响 contentDOM）
      this.highlightLayer.innerHTML = result.value
      console.log('[Highlight Plugin] 高亮完成, HTML length:', result.value.length)
    } catch (e) {
      // 高亮失败时显示原始代码
      console.error('[Highlight Plugin] 高亮失败:', e)
      this.highlightLayer.textContent = this.contentDOM.textContent || ''
    }
  }

  update(node: Node) {
    if (node.type !== this.node.type) return false

    // 更新语言属性
    const oldLang = this.node.attrs.language || ''
    const newLang = node.attrs.language || ''
    if (oldLang !== newLang) {
      if (newLang) {
        this.dom.setAttribute('data-language', newLang)
        this.contentDOM.className = `editable-layer language-${newLang}`
        this.highlightLayer.className = `highlight-layer language-${newLang}`
      } else {
        this.dom.removeAttribute('data-language')
        this.contentDOM.className = 'editable-layer'
        this.highlightLayer.className = 'highlight-layer'
      }
      // 同步语言输入框
      this.langInput.value = newLang
    }

    this.node = node

    // 检查代码是否变化，触发重新高亮
    const newCode = this.contentDOM.textContent || ''
    if (newCode !== this.lastCode) {
      this.scheduleHighlight()
    }

    return true
  }

  ignoreMutation(mutation: MutationRecord) {
    // 忽略高亮层的任何变化
    if (mutation.target === this.highlightLayer || this.highlightLayer.contains(mutation.target as globalThis.Node)) {
      return true
    }
    // 忽略语言选择器的任何变化
    if (mutation.target === this.langSelector || this.langSelector.contains(mutation.target as globalThis.Node)) {
      return true
    }
    // contentDOM 的变化需要通知 ProseMirror
    return false
  }

  destroy() {
    if (this.highlightTimer !== null) {
      window.clearTimeout(this.highlightTimer)
      this.highlightTimer = null
    }
  }
}
