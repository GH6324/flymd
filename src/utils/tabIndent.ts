export const TAB_INDENT = '\u00A0\u00A0\u00A0\u00A0'

const LEGACY_TAB_INDENTS = ['\u3000\u3000', '\u00A0\u00A0', '&emsp;&emsp;', '\u2003\u2003'] as const
const ALL_TAB_INDENTS = [TAB_INDENT, ...LEGACY_TAB_INDENTS] as const

export type TabIndentEditResult = {
  value: string
  selectionStart: number
  selectionEnd: number
  changed: boolean
}

export function normalizeTabIndentText(input: string): string {
  let out = String(input || '')
  for (const token of LEGACY_TAB_INDENTS) {
    out = out.split(token).join(TAB_INDENT)
  }
  return out
}

export function getLeadingTabIndentLength(input: string): number {
  const text = String(input || '')
  for (const token of ALL_TAB_INDENTS) {
    if (text.startsWith(token)) return token.length
  }
  return 0
}

export function ensureLeadingTabIndent(input: string): string {
  const text = String(input || '')
  const len = getLeadingTabIndentLength(text)
  if (len > 0) return TAB_INDENT + text.slice(len)
  return TAB_INDENT + text
}

export function removeLeadingTabIndent(input: string): string {
  const text = String(input || '')
  const len = getLeadingTabIndentLength(text)
  return len > 0 ? text.slice(len) : text
}

export function getTabIndentLengthEndingAt(input: string, end: number): number {
  const text = String(input || '')
  const safeEnd = Math.max(0, Math.min(end >>> 0, text.length))
  for (const token of ALL_TAB_INDENTS) {
    if (safeEnd >= token.length && text.slice(safeEnd - token.length, safeEnd) === token) {
      return token.length
    }
  }
  return 0
}

function getLeadingRawTabLength(input: string): number {
  const text = String(input || '')
  return text.startsWith('\t') ? 1 : 0
}

function clampSelection(value: string, start: number, end: number): { start: number; end: number } {
  const max = value.length
  const safeStart = Math.max(0, Math.min(start >>> 0, max))
  const safeEnd = Math.max(0, Math.min(end >>> 0, max))
  return safeStart <= safeEnd
    ? { start: safeStart, end: safeEnd }
    : { start: safeEnd, end: safeStart }
}

function buildSingleLineOutdentResult(
  value: string,
  start: number,
  end: number,
  deleteStart: number,
  deleteEnd: number,
): TabIndentEditResult {
  const nextValue = value.slice(0, deleteStart) + value.slice(deleteEnd)
  const delta = deleteEnd - deleteStart
  const nextStart = Math.max(deleteStart, start - delta)
  const nextEnd = Math.max(nextStart, end - delta)
  return {
    value: nextValue,
    selectionStart: nextStart,
    selectionEnd: nextEnd,
    changed: true,
  }
}

// 源码模式 Tab 规则：
// 1. 光标/单行选区：Tab 在光标处插入缩进，Shift+Tab 优先删除光标前一档缩进；
// 2. 多行选区：按行缩进/反缩进；
// 3. 兜底兼容历史文档中的旧缩进 token 与原始制表符。
export function applyTabIndentEdit(
  input: string,
  selectionStart: number,
  selectionEnd: number,
  shiftKey: boolean,
): TabIndentEditResult {
  const value = String(input || '')
  const { start, end } = clampSelection(value, selectionStart, selectionEnd)
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const selectionFromLineStart = value.slice(lineStart, end)

  if (start !== end && selectionFromLineStart.includes('\n')) {
    const lines = value.slice(lineStart, end).split('\n')
    const changed = lines.map((line) => {
      if (shiftKey) {
        const next = removeLeadingTabIndent(line)
        if (next !== line) return next
        if (line.startsWith('\t')) return line.slice(1)
        return line
      }
      return ensureLeadingTabIndent(line)
    }).join('\n')

    return {
      value: value.slice(0, lineStart) + changed + value.slice(end),
      selectionStart: lineStart,
      selectionEnd: end + (changed.length - (end - lineStart)),
      changed: changed !== value.slice(lineStart, end),
    }
  }

  if (!shiftKey) {
    return {
      value: value.slice(0, start) + TAB_INDENT + value.slice(end),
      selectionStart: start + TAB_INDENT.length,
      selectionEnd: start + TAB_INDENT.length,
      changed: true,
    }
  }

  const currentLine = value.slice(lineStart)
  const offsetInLine = start - lineStart
  const indentLength = getTabIndentLengthEndingAt(currentLine, offsetInLine)
  if (indentLength > 0) {
    return buildSingleLineOutdentResult(value, start, end, start - indentLength, start)
  }

  const leadingIndentLength = getLeadingTabIndentLength(currentLine)
  if (leadingIndentLength > 0) {
    return buildSingleLineOutdentResult(value, start, end, lineStart, lineStart + leadingIndentLength)
  }

  const rawTabLength = getLeadingRawTabLength(currentLine)
  if (rawTabLength > 0) {
    return buildSingleLineOutdentResult(value, start, end, lineStart, lineStart + rawTabLength)
  }

  return {
    value,
    selectionStart: start,
    selectionEnd: end,
    changed: false,
  }
}
