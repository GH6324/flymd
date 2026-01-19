// 日记与任务插件：为当前文档快速插入日记 / 会议记录 / 读书笔记等模板，并提供任务总览与简单日历面板
// 设计原则：
// 1. 仅操作当前文档内容，不创建 / 移动物理文件，避免依赖宿主未文档化 API
// 2. 复用现有 front matter 字段（title / date / created / tags），不引入新语法
// 3. 中英双语，JS 绘制设置窗口，窗口层级高于扩展市场 ext-overlay

// 轻量多语言：跟随宿主（flymd.locale），默认用系统语言
const NT_LOCALE_LS_KEY = 'flymd.locale'
function ntDetectLocale() {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : null
    const lang = (nav && (nav.language || nav.userLanguage)) || 'en'
    const lower = String(lang || '').toLowerCase()
    if (lower.startsWith('zh')) return 'zh'
  } catch {}
  return 'en'
}
function ntGetLocale() {
  try {
    const ls = typeof localStorage !== 'undefined' ? localStorage : null
    const v = ls && ls.getItem(NT_LOCALE_LS_KEY)
    if (v === 'zh' || v === 'en') return v
  } catch {}
  return ntDetectLocale()
}
function ntText(zh, en) {
  return ntGetLocale() === 'en' ? en : zh
}

// 配置默认值
const NT_DEFAULT_CONFIG = {
  overwriteExisting: false, // 应用模板时是否清空现有内容（非空文档）
  dailyTags: ['daily'],
  meetingTags: ['meeting'],
  readingTags: ['reading'],
}

// 设置窗口样式（只注入一次），需要高于扩展市场 ext-overlay (z-index: 80000)
function ntEnsureSettingsStyle() {
  if (typeof document === 'undefined') return
  let style = document.getElementById('note-templates-settings-style')
  if (!style) {
    style = document.createElement('style')
    style.id = 'note-templates-settings-style'
    document.head.appendChild(style)
  }
  style.textContent = `
.nt-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  /* 需要高于扩展市场 ext-overlay (z-index: 80000) */
  z-index: 90030;
}
.nt-dialog {
  background: var(--flymd-panel-bg, #fff);
  color: inherit;
  min-width: 380px;
  max-width: 480px;
  border-radius: 10px;
  box-shadow: 0 18px 40px rgba(0,0,0,0.35);
  padding: 16px 20px 14px;
  font-size: 13px;
}
.nt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-weight: 600;
}
.nt-body {
  margin-bottom: 12px;
}
.nt-row {
  margin-bottom: 10px;
}
.nt-row label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.nt-row-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.nt-row-main span {
  flex: 1;
}
.nt-row input[type="checkbox"] {
  width: 15px;
  height: 15px;
}
.nt-row input[type="text"] {
  flex: 1;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.2);
  font-size: 12px;
}
.nt-tip {
  margin-top: 2px;
  font-size: 11px;
  opacity: 0.8;
}
.nt-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.nt-btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.2);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.nt-btn-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.nt-btn:hover {
  opacity: 0.92;
}
.nt-panel-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 70vh;
}
.nt-task-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.nt-task-filters select,
.nt-task-filters input[type="text"] {
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.2);
}
.nt-task-table-wrap {
  flex: 1;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.06);
  overflow: auto;
  background: rgba(127,127,127,0.02);
}
.nt-task-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.nt-task-table th,
.nt-task-table td {
  padding: 6px 8px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  text-align: left;
}
.nt-task-table thead {
  background: rgba(127,127,127,0.06);
}
.nt-task-select-cell {
  width: 32px;
  text-align: center;
}
.nt-task-empty {
  padding: 18px;
  text-align: center;
  font-size: 12px;
  color: rgba(0,0,0,0.6);
}
.nt-task-title-link {
  color: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-thickness: 1px;
}
.nt-task-title-link:hover {
  opacity: 0.85;
}
.nt-task-text-done {
  text-decoration: line-through;
  opacity: 0.7;
}
.nt-calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--flymd-text-primary, #1f2937);
}
.nt-calendar-nav {
  display: flex;
  gap: 6px;
}
.nt-calendar-nav button {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.08);
  background: var(--flymd-panel-bg, #fff);
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.nt-calendar-nav button:hover {
  background: rgba(37,99,235,0.05);
  border-color: rgba(37,99,235,0.2);
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
}
.nt-calendar {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
  font-size: 13px;
  padding: 4px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.05);
}
/* 星期标题 - 加粗 */
.nt-calendar-weekday {
  text-align: center;
  font-weight: 700;
  font-size: 10px;
  color: #0891b2;
  padding: 6px 0;
  letter-spacing: 1px;
  background: rgba(8,145,178,0.06);
  border-radius: 6px;
  margin-bottom: 3px;
}
/* 周末标题 */
.nt-calendar-weekday-weekend {
  color: #10b981;
  background: rgba(16,185,129,0.06);
}
.nt-calendar-day {
  position: relative;
  text-align: center;
  padding: 6px 3px;
  min-height: 35px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.nt-calendar-day:hover:not(.nt-calendar-day-empty) {
  background: linear-gradient(135deg, #e0f2fe 0%, #cffafe 100%);
  border-color: rgba(8,145,178,0.2);
  box-shadow: 0 3px 8px rgba(8,145,178,0.12);
  transform: translateY(-1px);
}
.nt-calendar-day-empty {
  cursor: default;
  background: transparent;
  border: none;
  box-shadow: none;
}
/* 公历日期 - 大字加粗有颜色 */
.nt-cal-solar {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  color: #0891b2;
}
/* 农历 - 小字浅色 */
.nt-cal-lunar {
  font-size: 8px;
  line-height: 1.2;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
/* 周末颜色 - 绿色 */
.nt-calendar-day-weekend {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}
.nt-calendar-day-weekend .nt-cal-solar {
  color: #10b981;
}
/* 节日颜色 - 鲜红色 */
.nt-calendar-day-festival .nt-cal-lunar {
  color: #dc2626;
  font-weight: 700;
}
/* 节气颜色 - 鲜红色（与节日相同） */
.nt-calendar-day-term .nt-cal-lunar {
  color: #dc2626;
  font-weight: 700;
}
/* 有任务/笔记的日期 */
.nt-calendar-day-has {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: rgba(59,130,246,0.15);
}
.nt-calendar-day-has::after {
  content: '';
  position: absolute;
  right: 4px;
  top: 4px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 1px 3px rgba(37,99,235,0.3);
}
/* 今日高亮 - 黄色边框 */
.nt-calendar-day-today {
  border: 2px solid #eab308;
  background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
  box-shadow: 0 0 0 3px rgba(234,179,8,0.15);
}
.nt-calendar-day-today .nt-cal-solar {
  color: #ca8a04;
}
/* 选中状态 */
.nt-calendar-day-selected {
  background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
  border-color: #0891b2;
  box-shadow: 0 4px 12px rgba(8,145,178,0.3);
}
.nt-calendar-day-selected .nt-cal-solar,
.nt-calendar-day-selected .nt-cal-lunar {
  color: #fff;
}
/* 今日+选中 */
.nt-calendar-day-today.nt-calendar-day-selected {
  border-color: #eab308;
  background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
}
/* 移动端适配 */
@media (max-width: 600px) {
  /* 设置窗口全屏 */
  .nt-dialog {
    min-width: 95vw !important;
    max-width: 95vw !important;
    width: 95vw !important;
    max-height: 95vh !important;
    padding: 12px 14px;
    border-radius: 0;
  }

  /* 过滤栏竖向堆叠 */
  .nt-task-filters {
    flex-direction: column;
    align-items: stretch;
  }
  .nt-task-filters select,
  .nt-task-filters input[type="text"] {
    width: 100%;
    font-size: 16px;
    padding: 6px 10px;
  }

  /* 日历导航按钮 */
  .nt-calendar-nav button {
    padding: 6px 12px;
    font-size: 13px;
    min-height: 44px;
  }

  /* 日历网格优化 */
  .nt-calendar {
    gap: 1px;
    padding: 2px;
  }
  .nt-calendar-weekday {
    font-size: 9px;
    padding: 4px 0;
  }
  .nt-calendar-day {
    min-height: 28px;
    padding: 3px 2px;
    gap: 1px;
  }
  .nt-cal-solar {
    font-size: 11px;
  }
  .nt-cal-lunar {
    font-size: 7px;
  }

  /* 任务表格适配 */
  .nt-task-table-wrap {
    overflow-x: auto;
  }
  .nt-task-table {
    font-size: 11px;
  }
  .nt-task-table th,
  .nt-task-table td {
    padding: 4px 6px;
    white-space: nowrap;
  }
  /* 隐藏复选框列（移动端用按钮操作更友好） */
  .nt-task-select-cell {
    display: none;
  }

  /* 按钮适配 */
  .nt-btn {
    padding: 8px 14px;
    font-size: 14px;
    min-height: 44px;
  }
  .nt-footer {
    flex-direction: column;
    gap: 8px;
  }
  .nt-footer button {
    width: 100%;
  }

  /* 面板主体高度调整 */
  .nt-panel-main {
    max-height: 85vh;
  }
}
`
  document.head.appendChild(style)
}

// 配置加载 / 保存
async function ntLoadConfig(context) {
  try {
    if (!context || !context.storage || typeof context.storage.get !== 'function') {
      return { ...NT_DEFAULT_CONFIG }
    }
    const raw = (await context.storage.get('config')) || {}
    const cfg = typeof raw === 'object' && raw ? raw : {}

    const parseTags = (val, fallback) => {
      if (!val) return fallback.slice()
      if (Array.isArray(val)) {
        return val.map((x) => String(x || '').trim()).filter(Boolean)
      }
      const s = String(val || '')
      return s
        .split(/[;,，\s]+/)
        .map((x) => x.trim())
        .filter(Boolean)
    }

    return {
      overwriteExisting:
        typeof cfg.overwriteExisting === 'boolean'
          ? !!cfg.overwriteExisting
          : NT_DEFAULT_CONFIG.overwriteExisting,
      dailyTags: parseTags(cfg.dailyTags, NT_DEFAULT_CONFIG.dailyTags),
      meetingTags: parseTags(cfg.meetingTags, NT_DEFAULT_CONFIG.meetingTags),
      readingTags: parseTags(cfg.readingTags, NT_DEFAULT_CONFIG.readingTags),
    }
  } catch {
    return { ...NT_DEFAULT_CONFIG }
  }
}

async function ntSaveConfig(context, cfg) {
  try {
    if (!context || !context.storage || typeof context.storage.set !== 'function') return
    const normalizeTags = (arr, fallback) => {
      if (!arr) return fallback.slice()
      if (!Array.isArray(arr)) {
        return fallback.slice()
      }
      return arr.map((x) => String(x || '').trim()).filter(Boolean)
    }
    const next = {
      overwriteExisting:
        typeof cfg.overwriteExisting === 'boolean'
          ? !!cfg.overwriteExisting
          : NT_DEFAULT_CONFIG.overwriteExisting,
      dailyTags: normalizeTags(cfg.dailyTags, NT_DEFAULT_CONFIG.dailyTags),
      meetingTags: normalizeTags(cfg.meetingTags, NT_DEFAULT_CONFIG.meetingTags),
      readingTags: normalizeTags(cfg.readingTags, NT_DEFAULT_CONFIG.readingTags),
    }
    await context.storage.set('config', next)
  } catch {
    // 忽略存储错误
  }
}

// 简单 front matter 拆分（和 AutoYAML 同类逻辑）
function ntSplitFrontMatter(src) {
  const original = String(src || '')
  if (!original.trim()) {
    return { frontMatter: null, body: '' }
  }
  let text = original
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }
  const lines = text.split(/\r?\n/)
  if (!lines.length || lines[0].trim() !== '---') {
    return { frontMatter: null, body: original }
  }
  let endIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i
      break
    }
  }
  if (endIndex === -1) {
    return { frontMatter: null, body: original }
  }
  const frontLines = lines.slice(0, endIndex + 1)
  const bodyLines = lines.slice(endIndex + 1)
  const frontMatter = frontLines.join('\n')
  const body = bodyLines.join('\n')
  return { frontMatter, body }
}

// YAML 简单转义（只用于 title 等）
function ntEscapeYamlScalar(value) {
  const s = String(value ?? '')
  if (!s) return "''"
  if (/\s/.test(s) || /[:#\-\[\]\{\},&*!?|>'\"%@`]/.test(s)) {
    return JSON.stringify(s)
  }
  return s
}

function ntRenderTags(tags) {
  const arr = Array.isArray(tags)
    ? tags.map((x) => String(x || '').trim()).filter(Boolean)
    : []
  if (!arr.length) return ''
  const esc = arr.map((t) => JSON.stringify(t))
  return `tags: [${esc.join(', ')}]`
}

function ntNow() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const date = `${y}-${m}-${day}`
  const iso = d.toISOString()
  return { date, iso }
}

function ntFormatDateYMD(ts) {
  if (!ts || !Number.isFinite(ts)) return ''
  try {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return ''
  }
}

// 从待办文本中抽取 @YYYY-MM-DD（可选时间）作为日期，只返回日期部分
function ntExtractTodoDateFromText(text) {
  const raw = String(text || '').trim()
  if (!raw) return ''
  const atIdx = raw.lastIndexOf('@')
  if (atIdx < 0) return ''
  let expr = String(raw.slice(atIdx + 1)).trim()
  if (!expr) return ''
  // 去掉后续可能追加的标记，例如 [pushed] / [reminded]
  const flagIdx = expr.indexOf('[')
  if (flagIdx >= 0) {
    expr = expr.slice(0, flagIdx).trim()
  }
  if (!expr) return ''
  // 显式日期：YYYY-MM-DD 或 YYYY-M-D，可选时间部分（忽略）
  const m = expr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+\d{1,2}(?::\d{1,2})?)?$/)
  if (!m) return ''
  const y = parseInt(m[1], 10) || 0
  const mo = parseInt(m[2], 10) || 0
  const d = parseInt(m[3], 10) || 0
  if (!y || !mo || !d) return ''
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return ''
  const mm = String(mo).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

// 写入任意文本文件（依赖宿主的 write_text_file_any 调用）
async function ntWriteTextFileAny(context, path, content) {
  if (!context || typeof context.invoke !== 'function') {
    throw new Error('context.invoke 不可用，无法写入文件')
  }
  await context.invoke('write_text_file_any', { path, content })
}

// 获取 xxtui-todo-push 插件 API，可能不存在
function ntGetXxtuiApi(context) {
  try {
    if (!context || typeof context.getPluginAPI !== 'function') return null
    const api = context.getPluginAPI('xxtui-todo-push')
    if (!api) return null
    if (
      typeof api.pushToXxtui !== 'function' ||
      typeof api.createReminder !== 'function' ||
      typeof api.parseAndCreateReminders !== 'function'
    ) {
      return null
    }
    return api
  } catch {
    return null
  }
}

// 从 front matter 中提取 title / date / created（与属性视图插件保持同一风格）
function ntParseMeta(front) {
  const meta = {
    title: '',
    date: '',
    created: '',
  }
  if (!front) return meta
  const lines = String(front || '').split(/\r?\n/)
  let inHeader = false
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = String(raw || '').trim()
    if (!line) continue
    if (line === '---') {
      if (!inHeader) {
        inHeader = true
        continue
      } else {
        break
      }
    }
    if (!inHeader) continue
    if (line.startsWith('#')) continue

    const t = ntMatchScalar(line, 'title')
    if (t && !meta.title) {
      meta.title = t
      continue
    }
    const d = ntMatchScalar(line, 'date')
    if (d && !meta.date) {
      meta.date = d
      continue
    }
    const c = ntMatchScalar(line, 'created')
    if (c && !meta.created) {
      meta.created = c
      continue
    }
  }
  return meta
}

function ntStripYamlQuotes(v) {
  let s = String(v || '').trim()
  if (!s) return ''
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1)
  }
  return s.trim()
}

function ntMatchScalar(line, key) {
  const re = new RegExp('^' + key + '\\s*:\\s*(.+)$', 'i')
  const m = line.match(re)
  if (!m) return ''
  return ntStripYamlQuotes(m[1])
}

// 模板构造：返回 { full, body }，full 用于空文档 / 覆盖，body 用于在现有内容后追加
function ntBuildDailyTemplate(cfg) {
  const { date, iso } = ntNow()
  const titleZh = `日记 ${date}`
  const titleEn = `Daily ${date}`
  const title = ntText(titleZh, titleEn)
  const titleLine = `title: ${ntEscapeYamlScalar(title)}`
  const dateLine = `date: ${ntEscapeYamlScalar(date)}`
  const createdLine = `created: ${ntEscapeYamlScalar(iso)}`
  const tagsLine = ntRenderTags(cfg.dailyTags || NT_DEFAULT_CONFIG.dailyTags)

  const headerLines = ['---', titleLine, dateLine, createdLine]
  if (tagsLine) headerLines.push(tagsLine)
  headerLines.push('---', '')

  const bodyZh = [
    '## 今日概览',
    '',
    '- [ ] 关键任务 1',
    '- [ ] 关键任务 2',
    '',
    '## 笔记',
    '',
    '',
  ].join('\n')
  const bodyEn = [
    '## Today',
    '',
    '- [ ] Key task 1',
    '- [ ] Key task 2',
    '',
    '## Notes',
    '',
    '',
  ].join('\n')
  const body = ntText(bodyZh, bodyEn)

  return {
    full: headerLines.join('\n') + body,
    body,
  }
}

function ntBuildMeetingTemplate(cfg) {
  const { date, iso } = ntNow()
  const titleZh = `会议记录 ${date}`
  const titleEn = `Meeting Notes ${date}`
  const title = ntText(titleZh, titleEn)
  const titleLine = `title: ${ntEscapeYamlScalar(title)}`
  const dateLine = `date: ${ntEscapeYamlScalar(date)}`
  const createdLine = `created: ${ntEscapeYamlScalar(iso)}`
  const tagsLine = ntRenderTags(cfg.meetingTags || NT_DEFAULT_CONFIG.meetingTags)

  const headerLines = ['---', titleLine, dateLine, createdLine]
  if (tagsLine) headerLines.push(tagsLine)
  headerLines.push('---', '')

  const bodyZh = [
    '## 会议信息',
    '',
    '- 主题：',
    '- 时间：',
    '- 参会人：',
    '',
    '## 讨论要点',
    '',
    '- ',
    '',
    '## 决议与行动项',
    '',
    '- [ ] 负责人：，事项：',
    '- [ ] 负责人：，事项：',
    '',
  ].join('\n')
  const bodyEn = [
    '## Meeting Info',
    '',
    '- Topic:',
    '- Time:',
    '- Attendees:',
    '',
    '## Key Points',
    '',
    '- ',
    '',
    '## Decisions & Action Items',
    '',
    '- [ ] Owner: , Item:',
    '- [ ] Owner: , Item:',
    '',
  ].join('\n')
  const body = ntText(bodyZh, bodyEn)

  return {
    full: headerLines.join('\n') + body,
    body,
  }
}

function ntBuildReadingTemplate(cfg) {
  const { date, iso } = ntNow()
  const titleZh = `读书笔记`
  const titleEn = `Reading Notes`
  const title = ntText(titleZh, titleEn)
  const titleLine = `title: ${ntEscapeYamlScalar(title)}`
  const dateLine = `date: ${ntEscapeYamlScalar(date)}`
  const createdLine = `created: ${ntEscapeYamlScalar(iso)}`
  const tagsLine = ntRenderTags(cfg.readingTags || NT_DEFAULT_CONFIG.readingTags)

  const headerLines = ['---', titleLine, dateLine, createdLine]
  if (tagsLine) headerLines.push(tagsLine)
  headerLines.push('---', '')

  const bodyZh = [
    '## 书目信息',
    '',
    '- 书名：',
    '- 作者：',
    '- 出版社 / 版本：',
    '',
    '## 核心观点',
    '',
    '- ',
    '',
    '## 个人收获',
    '',
    '- ',
    '',
    '## 待实践 / 待思考',
    '',
    '- [ ] ',
    '',
  ].join('\n')
  const bodyEn = [
    '## Book Info',
    '',
    '- Title:',
    '- Author:',
    '- Publisher / Edition:',
    '',
    '## Key Ideas',
    '',
    '- ',
    '',
    '## Takeaways',
    '',
    '- ',
    '',
    '## To Apply / To Reflect',
    '',
    '- [ ] ',
    '',
  ].join('\n')
  const body = ntText(bodyZh, bodyEn)

  return {
    full: headerLines.join('\n') + body,
    body,
  }
}

// 设置当前文档内容：优先使用 setEditorValue，退回 replaceRange
function ntSetEditorValue(context, next) {
  try {
    if (!context) return
    if (typeof context.setEditorValue === 'function') {
      context.setEditorValue(String(next ?? ''))
      return
    }
    if (
      typeof context.getEditorValue === 'function' &&
      typeof context.replaceRange === 'function'
    ) {
      const cur = String(context.getEditorValue() || '')
      const len = cur.length
      context.replaceRange(0, len, String(next ?? ''))
      return
    }
  } catch (e) {
    try {
      console.error('[note-templates] 设置编辑器内容失败', e)
    } catch {}
  }
}

// 应用模板到当前文档
async function ntApplyTemplate(context, kind) {
  try {
    const cfg = await ntLoadConfig(context)
    const content =
      (context && typeof context.getEditorValue === 'function'
        ? context.getEditorValue()
        : '') || ''
    const trimmed = String(content || '').trim()
    const { frontMatter, body } = ntSplitFrontMatter(content)

    let tpl
    if (kind === 'daily') {
      tpl = ntBuildDailyTemplate(cfg)
    } else if (kind === 'meeting') {
      tpl = ntBuildMeetingTemplate(cfg)
    } else if (kind === 'reading') {
      tpl = ntBuildReadingTemplate(cfg)
    } else {
      return
    }

    const overwrite = cfg.overwriteExisting || !trimmed
    let nextContent
    if (overwrite) {
      // 空文档或允许覆盖：直接写入完整模板（带 front matter）
      nextContent = tpl.full
    } else if (frontMatter && body !== undefined) {
      // 已有 front matter：保留 front matter，在正文末尾追加模板主体
      const mergedBody = (body ? String(body) : '') + (body ? '\n' : '') + tpl.body
      nextContent = frontMatter + '\n' + mergedBody
    } else {
      // 无 front matter 且不覆盖：直接在末尾追加主体
      nextContent =
        String(content || '') +
        (content && !content.endsWith('\n') ? '\n\n' : '\n') +
        tpl.body
    }

    ntSetEditorValue(context, nextContent)
    if (context && context.ui && typeof context.ui.notice === 'function') {
      let msgZh = ''
      let msgEn = ''
      if (kind === 'daily') {
        msgZh = '已插入日记模板'
        msgEn = 'Daily note template inserted'
      } else if (kind === 'meeting') {
        msgZh = '已插入会议记录模板'
        msgEn = 'Meeting note template inserted'
      } else if (kind === 'reading') {
        msgZh = '已插入读书笔记模板'
        msgEn = 'Reading note template inserted'
      }
      context.ui.notice(ntText(msgZh, msgEn), 'ok', 1800)
    }
  } catch (e) {
    try {
      console.error('[note-templates] 应用模板失败', e)
    } catch {}
    if (context && context.ui && typeof context.ui.notice === 'function') {
      context.ui.notice(
        ntText('应用模板失败，请检查控制台日志。', 'Failed to apply template, please check console.'),
        'err',
        2200,
      )
    }
  }
}

// 任务与日历索引构建
const NT_TASK_MAX_FILES = 800

async function ntScanTasks(context) {
  const tasks = []
  const dateStats = new Map()
  if (!context || typeof context.listLibraryFiles !== 'function') {
    return { tasks, dateStats: {} }
  }
  let files = []
  try {
    files =
      (await context.listLibraryFiles({
        extensions: ['md', 'markdown'],
        maxDepth: 64,
      })) || []
  } catch {
    files = []
  }
  if (!files || !files.length) {
    return { tasks, dateStats: {} }
  }
  const limit = Math.min(NT_TASK_MAX_FILES, files.length)
  for (let i = 0; i < limit; i++) {
    const f = files[i]
    let text = ''
    try {
      if (typeof context.readTextFile === 'function') {
        text = (await context.readTextFile(f.path)) || ''
      } else if (typeof context.readFile === 'function') {
        text = (await context.readFile(f.path)) || ''
      }
    } catch {
      continue
    }
    const { frontMatter, body } = ntSplitFrontMatter(text)
    const meta = ntParseMeta(frontMatter)
    const title = meta.title || f.name || ''
    let noteDate = meta.date || ''
    if (!noteDate && meta.created && /^\d{4}-\d{2}-\d{2}/.test(meta.created)) {
      noteDate = meta.created.slice(0, 10)
    }
    if (!noteDate && typeof f.mtime === 'number') {
      noteDate = ntFormatDateYMD(f.mtime)
    }
    const noteId = (f && (f.relative || f.path)) || f.path
    if (noteDate) {
      let stat = dateStats.get(noteDate)
      if (!stat) {
        stat = { notes: new Set(), tasks: 0 }
        dateStats.set(noteDate, stat)
      }
      stat.notes.add(noteId)
    }

    const bodyText = body !== undefined ? body : text
    const lines = String(bodyText || '').split(/\r?\n/)
    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
      const line = lines[lineNo]
      // 待办识别规则与 xxtui-todo-push 插件保持一致：支持 - / * 列表
      const m = line.match(/^\s*[-*]\s+\[(\s|x|X)\]\s+(.+)$/)
      if (!m) continue
      const done = String(m[1] || '').toLowerCase() === 'x'
      const txt = String(m[2] || '').trim()
      if (!txt) continue
      // 如果文本中包含 @YYYY-MM-DD（可选时间），使用该日期优先驱动日历；否则回退到笔记日期
      const todoDate = ntExtractTodoDateFromText(txt) || noteDate || ''
      const task = {
        path: f.path,
        relative: f.relative || f.path,
        title,
        text: txt,
        done,
        date: todoDate,
        line: lineNo + 1,
      }
      tasks.push(task)
      if (todoDate) {
        let stat = dateStats.get(todoDate)
        if (!stat) {
          stat = { notes: new Set(), tasks: 0 }
          dateStats.set(todoDate, stat)
        }
        stat.tasks++
      }
    }
  }
  const outStats = {}
  for (const [d, stat] of dateStats.entries()) {
    outStats[d] = {
      notes: stat.notes.size,
      tasks: stat.tasks,
    }
  }
  return { tasks, dateStats: outStats }
}

function ntGetMonthStart(date) {
  const d = new Date(date.getTime())
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function ntGetDaysInMonth(date) {
  const y = date.getFullYear()
  const m = date.getMonth()
  return new Date(y, m + 1, 0).getDate()
}

// ============================================================
// 农历计算模块 - 基于寿星万年历算法简化版
// ============================================================

// 农历数据：1900-2100年（每年用16进制表示闰月和每月大小）
const NT_LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520
]

// 农历月份名称
const NT_LUNAR_MONTH = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
// 农历日期名称
const NT_LUNAR_DAY = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
]
// 天干
const NT_TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
// 地支
const NT_DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
// 生肖
const NT_SHENG_XIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

// 24节气名称
const NT_SOLAR_TERMS = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
]

// 公历节日
const NT_SOLAR_FESTIVALS = {
  '1-1': '元旦',
  '2-14': '情人节',
  '3-8': '妇女节',
  '3-12': '植树节',
  '4-1': '愚人节',
  '5-1': '劳动节',
  '5-4': '青年节',
  '6-1': '儿童节',
  '7-1': '建党节',
  '8-1': '建军节',
  '9-10': '教师节',
  '10-1': '国庆节',
  '12-13': '公祭日',
  '12-24': '平安夜',
  '12-25': '圣诞节'
}

// 农历节日
const NT_LUNAR_FESTIVALS = {
  '1-1': '春节',
  '1-15': '元宵',
  '2-2': '龙抬头',
  '5-5': '端午',
  '7-7': '七夕',
  '7-15': '中元',
  '8-15': '中秋',
  '9-9': '重阳',
  '12-8': '腊八',
  '12-23': '小年',
  '12-30': '除夕'
}

// 获取农历年的闰月（0表示无闰月）
function ntLeapMonth(year) {
  const idx = year - 1900
  if (idx < 0 || idx >= NT_LUNAR_INFO.length) return 0
  return NT_LUNAR_INFO[idx] & 0xf
}

// 获取农历年闰月的天数
function ntLeapDays(year) {
  if (ntLeapMonth(year)) {
    const idx = year - 1900
    if (idx < 0 || idx >= NT_LUNAR_INFO.length) return 0
    return (NT_LUNAR_INFO[idx] & 0x10000) ? 30 : 29
  }
  return 0
}

// 获取农历年某月的天数
function ntMonthDays(year, month) {
  const idx = year - 1900
  if (idx < 0 || idx >= NT_LUNAR_INFO.length) return 30
  return (NT_LUNAR_INFO[idx] & (0x10000 >> month)) ? 30 : 29
}

// 获取农历年的总天数
function ntYearDays(year) {
  const idx = year - 1900
  if (idx < 0 || idx >= NT_LUNAR_INFO.length) return 365
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (NT_LUNAR_INFO[idx] & i) ? 1 : 0
  }
  return sum + ntLeapDays(year)
}

// 公历转农历
function ntSolarToLunar(year, month, day) {
  // 基准日期：1900年1月31日为农历正月初一
  const baseDate = new Date(1900, 0, 31)
  const targetDate = new Date(year, month - 1, day)
  let offset = Math.floor((targetDate - baseDate) / 86400000)

  // 计算农历年
  let lunarYear = 1900
  let daysInYear
  while (lunarYear < 2101 && offset > 0) {
    daysInYear = ntYearDays(lunarYear)
    if (offset < daysInYear) break
    offset -= daysInYear
    lunarYear++
  }

  // 计算农历月
  let lunarMonth = 1
  let isLeap = false
  const leapMonth = ntLeapMonth(lunarYear)
  let daysInMonth

  for (let i = 1; i <= 12; i++) {
    // 闰月处理
    if (leapMonth > 0 && i === leapMonth + 1 && !isLeap) {
      --i
      isLeap = true
      daysInMonth = ntLeapDays(lunarYear)
    } else {
      daysInMonth = ntMonthDays(lunarYear, i)
    }

    if (offset < daysInMonth) {
      lunarMonth = i
      break
    }
    offset -= daysInMonth

    if (isLeap && i === leapMonth + 1) {
      isLeap = false
    }
  }

  const lunarDay = offset + 1

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap: isLeap,
    monthStr: (isLeap ? '闰' : '') + NT_LUNAR_MONTH[lunarMonth - 1] + '月',
    dayStr: NT_LUNAR_DAY[lunarDay - 1] || String(lunarDay),
    yearGanZhi: NT_TIAN_GAN[(lunarYear - 4) % 10] + NT_DI_ZHI[(lunarYear - 4) % 12],
    shengXiao: NT_SHENG_XIAO[(lunarYear - 4) % 12]
  }
}

// 获取节气
function ntGetSolarTerm(year, month, day) {
  // 每月有两个节气，分别在月初和月中
  const termIndex = (month - 1) * 2

  // 检查该月的两个节气
  for (let i = 0; i < 2; i++) {
    const idx = termIndex + i
    if (idx >= 24) continue

    // 计算该节气的精确日期
    const termDayExact = ntGetTermDay(year, idx)
    if (day === termDayExact) {
      return NT_SOLAR_TERMS[idx]
    }
  }
  return ''
}

// 精确计算某年第n个节气的日期
function ntGetTermDay(year, n) {
  // 使用寿星公式计算节气
  const y = year % 100

  // 节气系数表（简化版）
  const termCoef = [
    [6.11, 20.84], [4.15, 18.73], [5.63, 20.64], [5.43, 20.12],
    [5.09, 20.51], [6.06, 21.31], [7.26, 22.81], [8.08, 23.65],
    [8.29, 23.95], [8.18, 23.89], [8.15, 23.99], [7.90, 22.60]
  ]

  const monthIdx = Math.floor(n / 2)
  const isSecond = n % 2

  if (monthIdx >= 12) return 1

  const coef = termCoef[monthIdx][isSecond]
  const d = Math.floor(y * 0.2422 + coef) - Math.floor((y - 1) / 4)

  return d
}

// 获取节日（优先级：公历节日 > 农历节日）
function ntGetFestival(solarMonth, solarDay, lunarMonth, lunarDay, isLeap) {
  // 公历节日
  const solarKey = `${solarMonth}-${solarDay}`
  if (NT_SOLAR_FESTIVALS[solarKey]) {
    return { name: NT_SOLAR_FESTIVALS[solarKey], type: 'solar' }
  }

  // 农历节日（闰月不算）
  if (!isLeap) {
    const lunarKey = `${lunarMonth}-${lunarDay}`
    if (NT_LUNAR_FESTIVALS[lunarKey]) {
      return { name: NT_LUNAR_FESTIVALS[lunarKey], type: 'lunar' }
    }
    // 除夕特殊处理：腊月最后一天
    if (lunarMonth === 12 && lunarDay >= 29) {
      // 需要判断当年腊月是29还是30天
      return { name: '除夕', type: 'lunar' }
    }
  }

  return null
}

// 获取日历单元格的农历信息
function ntGetLunarInfo(year, month, day) {
  const weekday = new Date(year, month - 1, day).getDay()
  const isWeekend = weekday === 0 || weekday === 6

  const lunar = ntSolarToLunar(year, month, day)
  const term = ntGetSolarTerm(year, month, day)
  const festival = ntGetFestival(month, day, lunar.month, lunar.day, lunar.isLeap)

  // 显示优先级：节日 > 节气 > 农历日期
  let displayText = lunar.dayStr
  let displayType = 'lunar'

  if (term) {
    displayText = term
    displayType = 'term'
  }

  if (festival) {
    displayText = festival.name
    displayType = 'festival'
  }

  return {
    day: lunar.dayStr,
    month: lunar.monthStr,
    term: term,
    festival: festival ? festival.name : '',
    displayText: displayText,
    displayType: displayType,
    isWeekend: isWeekend,
    yearGanZhi: lunar.yearGanZhi,
    shengXiao: lunar.shengXiao
  }
}

// ============================================================
// 农历计算模块结束
// ============================================================

function ntBuildCalendarGrid(baseDate, dateStats, selectedDateStr) {
  const first = ntGetMonthStart(baseDate)
  const days = ntGetDaysInMonth(first)
  const firstWeekday = first.getDay() // 0-6
  const cells = []
  // week day labels - 从周一开始（参考图样式）
  const weekdaysZh = ['一', '二', '三', '四', '五', '六', '日']
  const weekdaysEn = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const weekdayLabels = ntText(weekdaysZh, weekdaysEn)
  // 计算周一起始的偏移量（周日=0 需要转换为6，其他减1）
  const mondayOffset = firstWeekday === 0 ? 6 : firstWeekday - 1
  // header row is handled in DOM，这里只返回每天的信息
  for (let i = 0; i < mondayOffset; i++) {
    cells.push({ empty: true })
  }
  const todayStr = ntFormatDateYMD(Date.now())
  const year = first.getFullYear()
  const month = first.getMonth() + 1
  for (let d = 1; d <= days; d++) {
    const cur = new Date(year, month - 1, d)
    const ds = ntFormatDateYMD(cur.getTime())
    const stat = dateStats && dateStats[ds]
    // 获取农历信息
    const lunar = ntGetLunarInfo(year, month, d)
    cells.push({
      empty: false,
      day: d,
      dateStr: ds,
      has: !!stat && (stat.tasks > 0 || stat.notes > 0),
      isToday: ds === todayStr,
      isSelected: ds === selectedDateStr,
      lunar: lunar
    })
  }
  return { cells, weekdayLabels }
}

// 打开任务总览 + 简单日历面板
async function ntOpenTasksPanel(context) {
  if (typeof document === 'undefined') return
  ntEnsureSettingsStyle()

  const overlay = document.createElement('div')
  overlay.className = 'nt-overlay'

  const dialog = document.createElement('div')
  dialog.className = 'nt-dialog'
  dialog.style.minWidth = '900px'
  dialog.style.maxWidth = '1100px'
  dialog.style.maxHeight = '80vh'
  dialog.style.display = 'flex'
  dialog.style.flexDirection = 'column'

  const header = document.createElement('div')
  header.className = 'nt-header'
  const title = document.createElement('div')
  title.textContent = ntText('日记与任务面板', 'Journals & Tasks Panel')
  const btnClose = document.createElement('button')
  btnClose.className = 'nt-btn'
  btnClose.style.padding = '0 6px'
  btnClose.style.fontSize = '16px'
  btnClose.textContent = '×'
  header.appendChild(title)
  header.appendChild(btnClose)

  const body = document.createElement('div')
  body.className = 'nt-panel-main'

  const filters = document.createElement('div')
  filters.className = 'nt-task-filters'

  const statusSelect = document.createElement('select')
  const optAll = document.createElement('option')
  optAll.value = 'all'
  optAll.textContent = ntText('全部任务', 'All tasks')
  const optOpen = document.createElement('option')
  optOpen.value = 'open'
  optOpen.textContent = ntText('仅未完成', 'Undone only')
  const optDone = document.createElement('option')
  optDone.value = 'done'
  optDone.textContent = ntText('仅已完成', 'Done only')
  statusSelect.appendChild(optAll)
  statusSelect.appendChild(optOpen)
  statusSelect.appendChild(optDone)

  const rangeSelect = document.createElement('select')
  ;[
    { value: 'day', zh: '按天', en: 'By day' },
    { value: 'week', zh: '按周', en: 'By week' },
    { value: 'month', zh: '按月', en: 'By month' },
  ].forEach((opt) => {
    const o = document.createElement('option')
    o.value = opt.value
    o.textContent = ntText(opt.zh, opt.en)
    rangeSelect.appendChild(o)
  })
  rangeSelect.value = 'day'

  const kwInput = document.createElement('input')
  kwInput.type = 'text'
  kwInput.placeholder = ntText('按标题 / 任务内容过滤', 'Filter by title / task text')

  const selectedDateLabel = document.createElement('div')
  selectedDateLabel.style.fontSize = '12px'
  selectedDateLabel.style.opacity = '0.8'

  filters.appendChild(statusSelect)
  filters.appendChild(rangeSelect)
  filters.appendChild(kwInput)
  filters.appendChild(selectedDateLabel)

  const calendarWrap = document.createElement('div')
  const calHeader = document.createElement('div')
  calHeader.className = 'nt-calendar-header'
  const monthLabel = document.createElement('div')
    const calNav = document.createElement('div')
    calNav.className = 'nt-calendar-nav'
    const btnPrev = document.createElement('button')
    btnPrev.textContent = ntText('上月', 'Prev')
    const btnNext = document.createElement('button')
    btnNext.textContent = ntText('下月', 'Next')
    const btnRefresh = document.createElement('button')
    btnRefresh.textContent = ntText('刷新', 'Refresh')
    calNav.appendChild(btnPrev)
    calNav.appendChild(btnNext)
    calNav.appendChild(btnRefresh)
  calHeader.appendChild(monthLabel)
  calHeader.appendChild(calNav)

  const calendar = document.createElement('div')
  calendar.className = 'nt-calendar'

  calendarWrap.appendChild(calHeader)
  calendarWrap.appendChild(calendar)

  const tableWrap = document.createElement('div')
  tableWrap.className = 'nt-task-table-wrap'
  const table = document.createElement('table')
  table.className = 'nt-task-table'
  const thead = document.createElement('thead')
  const headTr = document.createElement('tr')
  const selectTh = document.createElement('th')
  selectTh.className = 'nt-task-select-cell'
  const selectAllInput = document.createElement('input')
  selectAllInput.type = 'checkbox'
  selectAllInput.title = ntText('选择当前列表所有任务', 'Select all visible todos')
  selectTh.appendChild(selectAllInput)
  headTr.appendChild(selectTh)
  ;[
    ntText('文档标题', 'Note title'),
    ntText('任务内容', 'Task text'),
    ntText('状态', 'Status'),
    ntText('日期', 'Date'),
  ].forEach((txt) => {
    const th = document.createElement('th')
    th.textContent = txt
    headTr.appendChild(th)
  })
  thead.appendChild(headTr)
  const tbody = document.createElement('tbody')
  table.appendChild(thead)
  table.appendChild(tbody)
  tableWrap.appendChild(table)

  body.appendChild(filters)
  body.appendChild(calendarWrap)
  body.appendChild(tableWrap)

  const footer = document.createElement('div')
  footer.className = 'nt-footer'
  const footerInfo = document.createElement('div')
  footerInfo.style.fontSize = '12px'
  footerInfo.style.opacity = '0.8'
  footerInfo.style.marginRight = 'auto'
  footer.appendChild(footerInfo)
  const btnPushNow = document.createElement('button')
  btnPushNow.className = 'nt-btn'
  btnPushNow.textContent = ntText('推送到 xxtui', 'Push to xxtui')
  const btnCreateReminders = document.createElement('button')
  btnCreateReminders.className = 'nt-btn'
  btnCreateReminders.textContent = ntText('创建 xxtui 提醒', 'Create xxtui reminders')
  const btnMarkDone = document.createElement('button')
  btnMarkDone.className = 'nt-btn'
  btnMarkDone.textContent = ntText('标记已完成', 'Mark done')
  const btnMarkOpen = document.createElement('button')
  btnMarkOpen.className = 'nt-btn'
  btnMarkOpen.textContent = ntText('标记未完成', 'Mark open')
  footer.appendChild(btnPushNow)
  footer.appendChild(btnCreateReminders)
  footer.appendChild(btnMarkDone)
  footer.appendChild(btnMarkOpen)

  dialog.appendChild(header)
  dialog.appendChild(body)
  dialog.appendChild(footer)
  overlay.appendChild(dialog)
  document.body.appendChild(overlay)

  function close() {
    try {
      overlay.remove()
    } catch {}
  }

  btnClose.onclick = () => close()
  overlay.onclick = (e) => {
    if (e.target === overlay) close()
  }

  let allTasks = []
  let dateStats = {}
  let currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)
  let activeDate = ''
  let rangeMode = 'day' // day | week | month
  const selectedKeys = new Set()

  const getTaskKey = (t) =>
    `${t && t.path ? String(t.path) : ''}:${t && t.line ? String(t.line) : 0}`

  function ntParseDateStrLocal(s) {
    if (!s || typeof s !== 'string') return null
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) return null
    const y = Number(m[1]) || 0
    const mo = Number(m[2]) || 0
    const d = Number(m[3]) || 0
    if (!y || !mo || !d) return null
    return { y, m: mo, d }
  }

  function ntGetWeekRangeForDate(s) {
    const p = ntParseDateStrLocal(s)
    if (!p) return null
    const base = new Date(p.y, p.m - 1, p.d)
    const weekday = base.getDay() // 0-6, 周日=0
    const diffToMonday = weekday === 0 ? -6 : 1 - weekday
    const start = new Date(base.getTime())
    start.setDate(base.getDate() + diffToMonday)
    const end = new Date(start.getTime())
    end.setDate(start.getDate() + 6)
    return {
      start: ntFormatDateYMD(start.getTime()),
      end: ntFormatDateYMD(end.getTime()),
    }
  }

  function ntGetMonthKeyForDate(s) {
    const p = ntParseDateStrLocal(s)
    if (!p) return ''
    const mm = String(p.m).padStart(2, '0')
    return `${p.y}-${mm}`
  }

  function updateSelectedDateLabel() {
    if (!activeDate) {
      selectedDateLabel.textContent = ntText(
        '当前未按日期筛选',
        'No date filter applied',
      )
      return
    }
    if (rangeMode === 'week') {
      const r = ntGetWeekRangeForDate(activeDate)
      if (!r) {
        selectedDateLabel.textContent = ntText(
          '当前未按日期筛选',
          'No date filter applied',
        )
        return
      }
      selectedDateLabel.textContent = ntText(
        `当前筛选周：${r.start} ~ ${r.end}`,
        `Current week: ${r.start} ~ ${r.end}`,
      )
    } else if (rangeMode === 'month') {
      const k = ntGetMonthKeyForDate(activeDate)
      if (!k) {
        selectedDateLabel.textContent = ntText(
          '当前未按日期筛选',
          'No date filter applied',
        )
        return
      }
      selectedDateLabel.textContent = ntText(
        `当前筛选月份：${k}`,
        `Current month: ${k}`,
      )
    } else {
      selectedDateLabel.textContent = ntText(
        `当前筛选日期：${activeDate}`,
        `Filter date: ${activeDate}`,
      )
    }
  }

  function renderCalendar() {
    const y = currentMonth.getFullYear()
    const m = currentMonth.getMonth() + 1
    monthLabel.textContent = ntText(
      `${y} 年 ${m} 月`,
      `${y}-${String(m).padStart(2, '0')}`,
    )
    const grid = ntBuildCalendarGrid(currentMonth, dateStats, activeDate)
    calendar.innerHTML = ''
    // weekday header
    grid.weekdayLabels.forEach((lbl, idx) => {
      const wd = document.createElement('div')
      wd.className = 'nt-calendar-weekday'
      // 周末用不同颜色（周六=5, 周日=6）
      if (idx >= 5) wd.classList.add('nt-calendar-weekday-weekend')
      wd.textContent = lbl
      calendar.appendChild(wd)
    })
    // cells
    grid.cells.forEach((c) => {
      const el = document.createElement('div')
      el.className = 'nt-calendar-day'
      if (c.empty) {
        el.classList.add('nt-calendar-day-empty')
        calendar.appendChild(el)
        return
      }

      // 双行布局：公历 + 农历
      const solarDiv = document.createElement('div')
      solarDiv.className = 'nt-cal-solar'
      solarDiv.textContent = String(c.day).padStart(2, '0')

      const lunarDiv = document.createElement('div')
      lunarDiv.className = 'nt-cal-lunar'
      lunarDiv.textContent = c.lunar ? c.lunar.displayText : ''

      el.appendChild(solarDiv)
      el.appendChild(lunarDiv)

      // 应用各种状态样式
      if (c.has) el.classList.add('nt-calendar-day-has')
      if (c.isToday) el.classList.add('nt-calendar-day-today')
      if (c.isSelected) el.classList.add('nt-calendar-day-selected')

      // 农历相关样式
      if (c.lunar) {
        if (c.lunar.isWeekend) el.classList.add('nt-calendar-day-weekend')
        if (c.lunar.displayType === 'festival') el.classList.add('nt-calendar-day-festival')
        if (c.lunar.displayType === 'term') el.classList.add('nt-calendar-day-term')
      }

      el.onclick = () => {
        if (activeDate === c.dateStr) {
          activeDate = ''
        } else {
          activeDate = c.dateStr
        }
        updateSelectedDateLabel()
        renderCalendar()
        renderTasks()
      }
      calendar.appendChild(el)
    })
  }

  function getFilteredTasks() {
    const kw = String(kwInput.value || '').trim().toLowerCase()
    const status = statusSelect.value
    let filtered = allTasks.slice()
    if (status === 'open') {
      filtered = filtered.filter((t) => !t.done)
    } else if (status === 'done') {
      filtered = filtered.filter((t) => t.done)
    }
    if (kw) {
      filtered = filtered.filter((t) => {
        const hay =
          String(t.title || '') +
          ' ' +
          String(t.text || '') +
          ' ' +
          String(t.relative || '')
        return hay.toLowerCase().includes(kw)
      })
    }
    if (activeDate) {
      if (rangeMode === 'week') {
        const r = ntGetWeekRangeForDate(activeDate)
        if (r) {
          filtered = filtered.filter(
            (t) => t.date && t.date >= r.start && t.date <= r.end,
          )
        }
      } else if (rangeMode === 'month') {
        const k = ntGetMonthKeyForDate(activeDate)
        if (k) {
          filtered = filtered.filter((t) =>
            String(t.date || '').startsWith(k),
          )
        }
      } else {
        filtered = filtered.filter((t) => t.date === activeDate)
      }
    }
    return filtered
  }

  function renderTasks() {
    const filtered = getFilteredTasks()

    tbody.innerHTML = ''
      if (!filtered.length) {
        const tr = document.createElement('tr')
        const td = document.createElement('td')
        td.colSpan = 5
        td.className = 'nt-task-empty'
        td.textContent = ntText('没有匹配的任务。', 'No matching tasks.')
        tr.appendChild(td)
        tbody.appendChild(tr)
      } else {
        filtered.forEach((t) => {
          const tr = document.createElement('tr')

          const tdSelect = document.createElement('td')
          tdSelect.className = 'nt-task-select-cell'
          const rowCheckbox = document.createElement('input')
          rowCheckbox.type = 'checkbox'
          const key = getTaskKey(t)
          rowCheckbox.checked = selectedKeys.has(key)
          rowCheckbox.onclick = (e) => {
            e.stopPropagation()
            if (rowCheckbox.checked) {
              selectedKeys.add(key)
            } else {
              selectedKeys.delete(key)
            }
            // 更新全选状态
            const all = getFilteredTasks()
            const total = all.length
            const selectedCount = all.filter((item) =>
              selectedKeys.has(getTaskKey(item)),
            ).length
            if (!selectAllInput) return
            if (!total || !selectedCount) {
              selectAllInput.checked = false
              selectAllInput.indeterminate = false
            } else if (selectedCount === total) {
              selectAllInput.checked = true
              selectAllInput.indeterminate = false
            } else {
              selectAllInput.checked = false
              selectAllInput.indeterminate = true
            }
          }
          tdSelect.appendChild(rowCheckbox)

          const tdTitle = document.createElement('td')
          const titleBtn = document.createElement('span')
          titleBtn.className = 'nt-task-title-link'
          titleBtn.textContent = t.title || ''
          titleBtn.onclick = (e) => {
            e.stopPropagation()
            try {
              if (
                context &&
                typeof context.openFileByPath === 'function'
              ) {
                context.openFileByPath(t.path)
              }
            } catch {}
          }
          tdTitle.appendChild(titleBtn)

          const tdText = document.createElement('td')
          tdText.textContent = t.text || ''
          if (t.done) {
            tdText.classList.add('nt-task-text-done')
          }

          const tdStatus = document.createElement('td')
          tdStatus.textContent = t.done
            ? ntText('已完成', 'Done')
            : ntText('未完成', 'Open')

          const tdDate = document.createElement('td')
          tdDate.textContent = t.date || ''

          tr.appendChild(tdSelect)
          tr.appendChild(tdTitle)
          tr.appendChild(tdText)
          tr.appendChild(tdStatus)
          tr.appendChild(tdDate)
          tbody.appendChild(tr)
        })
        // 同步全选勾选状态
        if (selectAllInput) {
          const total = filtered.length
          const selectedCount = filtered.filter((item) =>
            selectedKeys.has(getTaskKey(item)),
          ).length
          if (!total || !selectedCount) {
            selectAllInput.checked = false
            selectAllInput.indeterminate = false
          } else if (selectedCount === total) {
            selectAllInput.checked = true
            selectAllInput.indeterminate = false
          } else {
            selectAllInput.checked = false
            selectAllInput.indeterminate = true
          }
        }
      }
    footerInfo.textContent = ntText(
      `当前任务数：${filtered.length}`,
      `Current tasks: ${filtered.length}`,
    )
  }

    btnPrev.onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1)
      renderCalendar()
      renderTasks()
    }
    btnNext.onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1)
      renderCalendar()
      renderTasks()
    }

  rangeSelect.onchange = () => {
      const v = String(rangeSelect.value || 'day')
      if (v === 'week' || v === 'month' || v === 'day') {
        rangeMode = v
      } else {
        rangeMode = 'day'
      }
      updateSelectedDateLabel()
      renderTasks()
    }

    selectAllInput.onchange = () => {
      const checked = !!selectAllInput.checked
      const list = getFilteredTasks()
      if (!checked) {
        list.forEach((t) => selectedKeys.delete(getTaskKey(t)))
      } else {
        list.forEach((t) => selectedKeys.add(getTaskKey(t)))
      }
      renderTasks()
    }

    async function reloadTasks() {
      footerInfo.textContent = ntText(
        '正在扫描任务…',
        'Scanning tasks…',
      )
      try {
        const res = await ntScanTasks(context)
        allTasks = res.tasks || []
        dateStats = res.dateStats || {}
        footerInfo.textContent = ntText(
          `已索引任务数：${allTasks.length}`,
          `Indexed tasks: ${allTasks.length}`,
        )
        updateSelectedDateLabel()
        renderCalendar()
        renderTasks()
      } catch (e) {
        try {
          console.error('[note-templates] 扫描任务失败', e)
        } catch {}
        footerInfo.textContent = ntText(
          '扫描任务失败，请检查控制台日志。',
          'Failed to scan tasks, please check console.',
        )
      }
    }

    btnRefresh.onclick = () => {
      void reloadTasks()
    }

    btnPushNow.onclick = async () => {
      const api = ntGetXxtuiApi(context)
      if (!api) {
        if (context && context.ui && context.ui.notice) {
          context.ui.notice(
            ntText(
              'xxtui 待办推送插件不可用，请先启用该插件。',
              'xxtui todo push plugin is not available. Please enable it first.',
            ),
            'err',
            3200,
          )
        }
        return
      }
      const todos = getFilteredTasks().filter((t) =>
        selectedKeys.has(getTaskKey(t)),
      )
      if (!todos.length) {
        if (context && context.ui && context.ui.notice) {
          context.ui.notice(
            ntText('请先勾选要推送的任务。', 'Please select todos to push.'),
            'warn',
            2200,
          )
        }
        return
      }
      const title = ntText(
        `任务清单 · 共 ${todos.length} 条`,
        `Todo list · ${todos.length} items`,
      )
      const lines = []
      todos.forEach((t, idx) => {
        const mark = t.done ? '[x]' : '[ ]'
        const datePart = t.date ? ` · ${t.date}` : ''
        lines.push(
          `${idx + 1}. ${mark} ${t.text || ''}${datePart}`,
        )
      })
      const content = lines.join('\n')
      try {
        const ok = await api.pushToXxtui(title, content)
        if (context && context.ui && context.ui.notice) {
          context.ui.notice(
            ok
              ? ntText('已推送到 xxtui。', 'Pushed to xxtui.')
              : ntText('推送到 xxtui 失败。', 'Failed to push to xxtui.'),
            ok ? 'ok' : 'err',
            2600,
          )
        }
      } catch (err) {
        try {
          console.error('[note-templates] 推送到 xxtui 失败', err)
        } catch {}
        if (context && context.ui && context.ui.notice) {
          context.ui.notice(
            ntText('推送到 xxtui 时出错。', 'Error while pushing to xxtui.'),
            'err',
            2600,
          )
        }
      }
    }

    btnCreateReminders.onclick = async () => {
      const api = ntGetXxtuiApi(context)
      if (!api) {
        if (context && context.ui && context.ui.notice) {
          context.ui.notice(
            ntText(
              'xxtui 待办推送插件不可用，请先启用该插件。',
              'xxtui todo push plugin is not available. Please enable it first.',
            ),
            'err',
            3200,
          )
        }
        return
      }
      const todos = getFilteredTasks().filter(
        (t) => !t.done && selectedKeys.has(getTaskKey(t)),
      )
      if (!todos.length) {
        if (context && context.ui && context.ui.notice) {
          context.ui.notice(
            ntText('请先勾选要创建提醒的任务。', 'Please select todos to create reminders.'),
            'warn',
            2600,
          )
        }
        return
      }
      const md = todos
        .map((t) => `- [ ] ${t.text || ''}`)
        .join('\n')
      try {
        const res = await api.parseAndCreateReminders(md)
        const succ = res && typeof res.success === 'number' ? res.success : 0
        const failed =
          res && typeof res.failed === 'number' ? res.failed : 0
        if (context && context.ui && context.ui.notice) {
          context.ui.notice(
            ntText(
              `已在 xxtui 创建提醒：成功 ${succ} 条，失败 ${failed} 条。`,
              `Created reminders in xxtui: ${succ} succeeded, ${failed} failed.`,
            ),
            failed ? 'warn' : 'ok',
            3200,
          )
        }
      } catch (err) {
        try {
          console.error('[note-templates] 在 xxtui 创建提醒失败', err)
        } catch {}
        if (context && context.ui && context.ui.notice) {
          context.ui.notice(
            ntText('在 xxtui 创建提醒时出错。', 'Error while creating reminders in xxtui.'),
            'err',
            2600,
          )
        }
      }
    }

    async function markTodos(doneFlag) {
      const target = getFilteredTasks().filter((t) =>
        selectedKeys.has(getTaskKey(t)),
      )
      if (!target.length) {
        if (context && context.ui && context.ui.notice) {
          context.ui.notice(
            ntText('请先勾选要标记的任务。', 'Please select todos to mark.'),
            'warn',
            2200,
          )
        }
        return
      }

      const byPath = new Map()
      target.forEach((t) => {
        const key = t && t.path ? String(t.path) : ''
        if (!key) return
        if (!byPath.has(key)) byPath.set(key, [])
        byPath.get(key).push(t)
      })

      let success = 0
      let failed = 0

        for (const [path, list] of byPath.entries()) {
          try {
            let text = ''
            if (typeof context.readTextFile === 'function') {
              text = (await context.readTextFile(path)) || ''
            } else if (typeof context.readFile === 'function') {
              text = (await context.readFile(path)) || ''
            } else {
              failed += list.length
              continue
            }

            const { frontMatter, body } = ntSplitFrontMatter(text)
            const bodyText = body !== undefined ? body : text
            const bodyLines = String(bodyText || '').split(/\r?\n/)

            list.forEach((t) => {
              const ln = (t && t.line ? Number(t.line) : 0) - 1
              if (ln < 0 || ln >= bodyLines.length) {
                failed++
                return
              }
              const raw = bodyLines[ln]
              const m = raw.match(/^(\s*[-*]\s+)\[(\s|x|X)\](\s+.*)$/)
              if (!m) {
                failed++
                return
              }
              const prefix = m[1]
              const suffix = m[3]
              const ch = doneFlag ? 'x' : ' '
              bodyLines[ln] = `${prefix}[${ch}]${suffix}`
              success++
            })

            const nextBody = bodyLines.join('\n')
            const nextText =
              frontMatter !== null && frontMatter !== undefined
                ? `${frontMatter}\n${nextBody}`
                : nextBody

            if (nextText !== text) {
              await ntWriteTextFileAny(context, path, nextText)
            }
          } catch (err) {
            failed += list.length
            try {
              console.error('[note-templates] 标记任务状态失败', err)
            } catch {}
          }
        }

      selectedKeys.clear()
      await reloadTasks()

      if (context && context.ui && context.ui.notice) {
        if (success) {
          context.ui.notice(
            doneFlag
              ? ntText(
                  `已标记 ${success} 条为已完成`,
                  `Marked ${success} todos as done`,
                )
              : ntText(
                  `已标记 ${success} 条为未完成`,
                  `Marked ${success} todos as open`,
                ),
            failed ? 'warn' : 'ok',
            2600,
          )
        } else {
          context.ui.notice(
            ntText(
              '未能标记任何任务，请检查这些行是否为标准待办语法（- [ ] / - [x]）。',
              'No todos were marked. Please check if lines use "- [ ]" / "- [x]" syntax.',
            ),
            'warn',
            3200,
          )
        }
      }
    }

    btnMarkDone.onclick = () => {
      void markTodos(true)
    }
    btnMarkOpen.onclick = () => {
      void markTodos(false)
    }
    statusSelect.onchange = () => renderTasks()
    kwInput.onkeydown = (e) => {
      if (e.key === 'Enter') renderTasks()
    }
  
    // 首次加载任务
    void reloadTasks()
}

// 打开设置窗口（JS 绘制）
async function ntOpenSettingsDialog(context, cfg) {
  if (typeof document === 'undefined') return null
  ntEnsureSettingsStyle()

  return await new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'nt-overlay'

    const dialog = document.createElement('div')
    dialog.className = 'nt-dialog'

    const header = document.createElement('div')
    header.className = 'nt-header'
    const title = document.createElement('div')
    title.textContent = ntText('笔记模板设置', 'Note Templates Settings')
    const btnClose = document.createElement('button')
    btnClose.className = 'nt-btn'
    btnClose.style.padding = '0 6px'
    btnClose.style.fontSize = '16px'
    btnClose.textContent = '×'
    header.appendChild(title)
    header.appendChild(btnClose)

    const body = document.createElement('div')
    body.className = 'nt-body'

    // 覆盖模式开关
    const rowOverwrite = document.createElement('div')
    rowOverwrite.className = 'nt-row'
    const labelOverwrite = document.createElement('label')
    const inputOverwrite = document.createElement('input')
    inputOverwrite.type = 'checkbox'
    inputOverwrite.checked = !!cfg.overwriteExisting
    const spanOverwrite = document.createElement('span')
    spanOverwrite.textContent = ntText(
      '应用模板时，如文档非空则清空后写入模板',
      'When applying a template, clear non-empty documents before inserting',
    )
    labelOverwrite.appendChild(inputOverwrite)
    labelOverwrite.appendChild(spanOverwrite)
    const tipOverwrite = document.createElement('div')
    tipOverwrite.className = 'nt-tip'
    tipOverwrite.textContent = ntText(
      '建议仅在专门用于日记 / 模板的新文档中使用该选项，避免覆盖已有内容。',
      'It is recommended to enable this only for new documents dedicated to templates to avoid overwriting existing content.',
    )
    rowOverwrite.appendChild(labelOverwrite)
    rowOverwrite.appendChild(tipOverwrite)

    // 标签设置行构造函数
    const buildTagsRow = (labelZh, labelEn, tags, key) => {
      const row = document.createElement('div')
      row.className = 'nt-row'

      const main = document.createElement('div')
      main.className = 'nt-row-main'

      const span = document.createElement('span')
      span.textContent = ntText(labelZh, labelEn)

      const input = document.createElement('input')
      input.type = 'text'
      input.value = Array.isArray(tags) ? tags.join(', ') : ''
      input.dataset.ntKey = key

      main.appendChild(span)
      main.appendChild(input)
      row.appendChild(main)

      const tip = document.createElement('div')
      tip.className = 'nt-tip'
      tip.textContent = ntText(
        '以逗号或空格分隔多个标签，例如：daily work',
        'Separate multiple tags with comma or space, e.g. daily work',
      )
      row.appendChild(tip)

      return row
    }

    const rowDaily = buildTagsRow(
      '日记模板默认标签',
      'Default tags for daily template',
      cfg.dailyTags,
      'dailyTags',
    )
    const rowMeeting = buildTagsRow(
      '会议记录模板默认标签',
      'Default tags for meeting template',
      cfg.meetingTags,
      'meetingTags',
    )
    const rowReading = buildTagsRow(
      '读书笔记模板默认标签',
      'Default tags for reading template',
      cfg.readingTags,
      'readingTags',
    )

    body.appendChild(rowOverwrite)
    body.appendChild(rowDaily)
    body.appendChild(rowMeeting)
    body.appendChild(rowReading)

    const footer = document.createElement('div')
    footer.className = 'nt-footer'
    const btnCancel = document.createElement('button')
    btnCancel.className = 'nt-btn'
    btnCancel.textContent = ntText('取消', 'Cancel')
    const btnOk = document.createElement('button')
    btnOk.className = 'nt-btn nt-btn-primary'
    btnOk.textContent = ntText('保存', 'Save')
    footer.appendChild(btnCancel)
    footer.appendChild(btnOk)

    dialog.appendChild(header)
    dialog.appendChild(body)
    dialog.appendChild(footer)
    overlay.appendChild(dialog)
    document.body.appendChild(overlay)

    function close(result) {
      try {
        overlay.remove()
      } catch {}
      resolve(result)
    }

    btnClose.onclick = () => close(null)
    btnCancel.onclick = () => close(null)
    overlay.onclick = (e) => {
      if (e.target === overlay) close(null)
    }

    btnOk.onclick = () => {
      const next = {
        overwriteExisting: !!inputOverwrite.checked,
        dailyTags: [],
        meetingTags: [],
        readingTags: [],
      }
      const inputs = dialog.querySelectorAll('input[type="text"][data-nt-key]')
      inputs.forEach((el) => {
        const key = el.dataset.ntKey
        const val = String(el.value || '')
        const tags = val
          .split(/[;,，\s]+/)
          .map((x) => x.trim())
          .filter(Boolean)
        if (key && Object.prototype.hasOwnProperty.call(next, key)) {
          next[key] = tags
        }
      })
      close(next)
    }
  })
}

// 插件主入口
export async function activate(context) {
  // 在 Ribbon 栏注册快捷按钮
  if (typeof context.addRibbonButton === 'function') {
    context.addRibbonButton({
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      iconType: 'svg',
      title: ntText('打开任务与日历面板', 'Open tasks & calendar'),
      onClick: () => {
        void ntOpenTasksPanel(context)
      }
    })
  }

  // 在"插件"菜单中添加入口
  if (typeof context.addMenuItem === 'function') {
    context.addMenuItem({
      label: ntText('日记与任务', 'Journals & Tasks'),
      title: ntText(
        '快速插入日记 / 会议记录 / 读书笔记模板，并查看任务总览与简单日历',
        'Quickly insert daily / meeting / reading note templates, and view task overview with a simple calendar',
      ),
      children: [
        {
          label: ntText('插入日记模板', 'Insert daily template'),
          onClick: () => {
            void ntApplyTemplate(context, 'daily')
          },
        },
        {
          label: ntText('插入会议记录模板', 'Insert meeting template'),
          onClick: () => {
            void ntApplyTemplate(context, 'meeting')
          },
        },
        {
          label: ntText('插入读书笔记模板', 'Insert reading template'),
          onClick: () => {
            void ntApplyTemplate(context, 'reading')
          },
        },
        {
          label: ntText('打开任务与日历面板', 'Open tasks & calendar'),
          onClick: () => {
            void ntOpenTasksPanel(context)
          },
        },
      ],
    })
  }

  // 在编辑区右键菜单中添加入口（所见 / 源码模式通用）
  if (typeof context.addContextMenuItem === 'function') {
    context.addContextMenuItem({
      label: ntText('日记与任务', 'Journals & Tasks'),
      icon: '📅',
      children: [
        {
          label: ntText('打开任务与日历面板', 'Open tasks & calendar'),
          onClick: () => {
            void ntOpenTasksPanel(context)
          },
        },
        {
          label: ntText('插入日记模板', 'Insert daily template'),
          onClick: () => {
            void ntApplyTemplate(context, 'daily')
          },
        },
        {
          label: ntText('插入会议记录模板', 'Insert meeting template'),
          onClick: () => {
            void ntApplyTemplate(context, 'meeting')
          },
        },
        {
          label: ntText('插入读书笔记模板', 'Insert reading template'),
          onClick: () => {
            void ntApplyTemplate(context, 'reading')
          },
        },
      ],
    })
  }
}

export async function openSettings(context) {
  const cfg = await ntLoadConfig(context)
  const next = await ntOpenSettingsDialog(context, cfg)
  if (!next) return
  await ntSaveConfig(context, next)
  if (context && context.ui && typeof context.ui.notice === 'function') {
    context.ui.notice(
      ntText('日记与任务设置已保存', 'Journals & Tasks settings saved'),
      'ok',
      1800,
    )
  }
}

export function deactivate() {
  // 当前插件没有全局事件或定时器，无需特殊清理
}
