import './imePatch'

/*
  flymd 主入口（中文注释）
*/
// 性能标记：应用启动
performance.mark('flymd-app-start')
const _startTime = performance.now()
import './style.css'
import './mobile.css'  // 移动端样式
import { initThemeUI, applySavedTheme, updateChromeColorsForMode } from './theme'
import { t, fmtStatus, getLocalePref, setLocalePref, getLocale, tLocale } from './i18n'
// KaTeX 样式改为按需动态加载（首次检测到公式时再加载）
// markdown-it 和 DOMPurify 改为按需动态 import，类型仅在编译期引用
import type MarkdownIt from 'markdown-it'
import type { LocalePref } from './i18n'
// WYSIWYG: 锚点插件与锚点同步（用于替换纯比例同步）
import { enableWysiwygV2, disableWysiwygV2, wysiwygV2ToggleBold, wysiwygV2ToggleItalic, wysiwygV2ApplyLink, wysiwygV2InsertImage, wysiwygV2ToggleBulletList, wysiwygV2ApplyHeading, wysiwygV2GetSelectedText, wysiwygV2FindNext, wysiwygV2FindPrev, wysiwygV2ReplaceOne as wysiwygV2ReplaceOneSel, wysiwygV2ReplaceAllInDoc, wysiwygV2ReplaceAll } from './wysiwyg/v2/index'
// Tauri 插件（v2）
// Tauri 对话框：使用 ask 提供原生确认，避免浏览器 confirm 在关闭事件中失效
import { open, save, ask } from '@tauri-apps/plugin-dialog'
import { showThreeButtonDialog } from './dialog'
import { readTextFile, writeTextFile, readDir, stat, readFile, mkdir  , rename, remove, writeFile, exists, copyFile } from '@tauri-apps/plugin-fs'
import { Store } from '@tauri-apps/plugin-store'
import { open as openFileHandle, BaseDirectory } from '@tauri-apps/plugin-fs'
// Tauri v2 插件 opener 的导出为 openUrl / openPath，不再是 open
import { openPath } from '@tauri-apps/plugin-opener'
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { appLocalDataDir } from '@tauri-apps/api/path'
import fileTree, { FOLDER_ICONS, folderIconModal, newFileSafe as newFileSafeInTree } from './fileTree'
import { uploadImageToS3R2, type UploaderConfig } from './uploader/s3'
import { openUploaderDialog as openUploaderDialogInternal, testUploaderConnectivity } from './uploader/uploaderDialog'
import { uploadImageFromContextMenu } from './uploader/manualImageUpload'
import { transcodeToWebpIfNeeded } from './utils/image'
import { protectExcelDollarRefs } from './utils/excelFormula'
import { saveImageToLocalAndGetPathCore, toggleUploaderEnabledFromMenuCore } from './core/imagePaste'
// 方案A：多库管理（统一 libraries/activeLibraryId）
import { getLibraries, getActiveLibraryId, getActiveLibraryRoot, setActiveLibraryId as setActiveLibId, upsertLibrary, removeLibrary as removeLib, renameLibrary as renameLib } from './utils/library'
import appIconUrl from '../Flymdnew.png?url'
import { decorateCodeBlocks } from './decorate'
import { APP_VERSION } from './core/appInfo'
import type { UpdateAssetInfo, CheckUpdateResp, UpdateExtra } from './core/updateTypes'
// htmlToMarkdown 改为按需动态导入（仅在粘贴 HTML 时使用）
import { initWebdavSync, openWebdavSyncDialog, getWebdavSyncConfig, isWebdavConfiguredForActiveLibrary, syncNow as webdavSyncNow, setOnSyncComplete, openSyncLog as webdavOpenSyncLog } from './extensions/webdavSync'
// 平台适配层（Android 支持）
import { initPlatformIntegration } from './platform-integration'
import { ensureAndroidDefaultLibraryRoot } from './platform/androidLibrary'
import { safDelete, safListDir, safCreateDir, safCreateFile, persistSafUriPermission, safPickFolder, safPrettyName, isSafUninstallUnsafeFolder, safLocationHint } from './platform/androidSaf'
import { getPlatform } from './platform'
import { createImageUploader } from './core/imageUpload'
import { getAppStore, setAppStore } from './core/appStore'
import { createPluginMarket, compareInstallableItems, FALLBACK_INSTALLABLES } from './extensions/market'
import type { InstallableItem } from './extensions/market'
import { isSupportedDoc, listDirOnce, type LibEntry } from './core/libraryFs'
import { normSep, isInside, ensureDir, moveFileSafe, renameFileSafe, normalizePath, readTextFileAnySafe, writeTextFileAnySafe } from './core/fsSafe'
import { initBuiltInFloatingToolbar } from './mobileFloatingToolbarBuiltIn'
import { getLibrarySort, setLibrarySort, type LibSortMode } from './core/librarySort'
import { searchLibraryFilesByName, type LibrarySearchResult } from './core/librarySearch'
import { createCustomTitleBar, removeCustomTitleBar, applyWindowDecorationsCore } from './modes/focusMode'
// 移动端图标管理
import { initMobileIcons, toggleModeIcon } from './icons'
import {
  toggleFocusMode,
  getFocusMode,
  getCompactTitlebar,
  setCompactTitlebar,
  isFocusModeEnabled,
  isCompactTitlebarEnabled,
  setFocusModeFlag,
  syncCustomTitlebarPlacement,
  resetFocusModeDecorations,
} from './modes/focusModeHost'
import {
  type StickyNoteColor,
  type StickyNoteReminderMap,
  type StickyNotePrefs,
  STICKY_NOTE_PREFS_FILE,
  STICKY_NOTE_DEFAULT_OPACITY,
  STICKY_NOTE_DEFAULT_COLOR,
  STICKY_NOTE_VALID_COLORS,
  loadStickyNotePrefsCore,
  saveStickyNotePrefsCore,
  type StickyNotePrefsDeps,
  applyStickyNoteAppearance,
  type StickyNoteModeDeps,
  type StickyNoteModeResult,
  type StickyNoteWindowDeps,
  enterStickyNoteModeCore,
  restoreWindowStateBeforeStickyCore,
} from './modes/stickyNote'
import {
  createStickyNotePrefsHost,
  type StickyNotePrefsHost,
  createStickyNoteWindowHost,
  type StickyNoteWindowHost,
} from './modes/stickyNoteHost'
import {
  createStickyNoteUi,
  type StickyNoteUiHandles,
} from './modes/stickyNoteUi'
import {
  initFocusModeEventsImpl,
  updateFocusSidebarBgImpl,
} from './modes/focusModeUi'
import {
  ensurePluginsDir,
  parseRepoInput,
  compareVersions,
  getHttpClient,
  fetchTextSmart,
  fetchBinarySmart,
  resolvePluginManifestUrl,
  getPluginUpdateStates,
  loadInstalledPlugins,
  saveInstalledPlugins,
  installPluginFromGitCore,
  installPluginFromLocalCore,
  type PluginManifest,
  type InstalledPlugin,
  type PluginUpdateState,
} from './extensions/runtime'
import {
  initPluginRuntime,
  type PluginRuntimeHandles,
} from './extensions/pluginRuntimeHost'
import {
  CORE_AI_EXTENSION_ID,
  ensureCoreExtensionsAfterStartup,
  markCoreExtensionBlocked,
} from './extensions/coreExtensions'
import {
  initPluginsMenu,
  addToPluginsMenu,
  removeFromPluginsMenu,
  togglePluginDropdown,
  setPluginsMenuManagerOpener,
  getPluginsMenuItemsSnapshot,
} from './extensions/pluginMenu'
import { openLinkDialog, openRenameDialog } from './ui/linkDialogs'
import { initExtensionsPanel, refreshExtensionsUI as panelRefreshExtensionsUI, showExtensionsOverlay as panelShowExtensionsOverlay, prewarmExtensionsPanel as panelPrewarmExtensionsPanel } from './extensions/extensionsPanel'
import { initAboutOverlay, showAbout } from './ui/aboutOverlay'
import { ensureUpdateOverlay, showUpdateOverlayLinux, showUpdateDownloadedOverlay, showInstallFailedOverlay, loadUpdateExtra, renderUpdateDetailsHTML } from './ui/updateOverlay'
import { openInBrowser, upMsg } from './core/updateUtils'
import { initLibraryContextMenu } from './ui/libraryContextMenu'
import {
  removeContextMenu,
  showContextMenu,
  type ContextMenuContext,
  type ContextMenuItemConfig,
  type PluginContextMenuItem,
} from './ui/contextMenus'
import {
  openPluginMenuManager,
  type PluginMenuManagerHost,
} from './extensions/pluginMenuManager'
import { getMermaidConfig } from './core/mermaidConfig'
import { CONFIG_BACKUP_FILE_EXT, formatBackupTimestamp } from './core/configBackup'
import { pluginNotice } from './core/pluginNotice'
import { shouldSanitizePreview } from './core/sanitize'
import { isLikelyLocalPath } from './core/pathUtils'
// 应用版本号（用于窗口标题/关于弹窗）

// UI 缩放与预览宽度（已拆分到 core/uiZoom.ts）
import { getUiZoom, setUiZoom, applyUiZoom, zoomIn, zoomOut, zoomReset, getPreviewWidth, setPreviewWidth, applyPreviewWidth, resetPreviewWidth, PREVIEW_WIDTH_STEP } from './core/uiZoom'
import { showZoomBubble, showWidthBubble, NotificationManager, showModeChangeNotification, updateSyncStatus } from './core/uiNotifications'
import type { NotificationType } from './core/uiNotifications'
import { initAutoSave, type AutoSaveHandles } from './core/autoSave'

// 滚动条自动隐藏
import { initAutoHideScrollbar, rescanScrollContainers } from './core/scrollbar'
import { applyPlainTextPaste, type PlainPasteEnv } from './core/plainPaste'

type Mode = 'edit' | 'preview'
// 最近文件最多条数
const RECENT_MAX = 5

// 渲染器（延迟初始化，首次进入预览时创建）
let md: MarkdownIt | null = null
let sanitizeHtml: ((html: string, cfg?: any) => string) | null = null
let katexCssLoaded = false
let hljsLoaded = false
let mermaidReady = false

// Mermaid 工具（已拆分到 core/mermaid.ts）
import { isMermaidCacheDisabled, getMermaidScale, setMermaidScaleClamped, adjustExistingMermaidSvgsForScale, exportMermaidViaDialog, createMermaidToolsFor, mermaidSvgCache, mermaidSvgCacheVersion, getCachedMermaidSvg, cacheMermaidSvg, normalizeMermaidSvg, postAttachMermaidSvgAdjust, invalidateMermaidSvgCache, MERMAID_SCALE_MIN, MERMAID_SCALE_MAX, MERMAID_SCALE_STEP } from './core/mermaid'
// 当前 PDF 预览 URL（iframe 使用），用于页内跳转
let _currentPdfSrcUrl: string | null = null
// 大纲缓存（Markdown/WYSIWYG）：避免重复重建 DOM
let _outlineLastSignature = ''
// PDF 目录缓存：按文件路径缓存解析结果与 mtime，用于自动失效
const _pdfOutlineCache = new Map<string, { mtime: number; items: Array<{ level: number; title: string; page: number }> }>()
// 所见模式：用于滚动同步的“源位锚点”表
// 旧所见模式已移除：不再维护锚点表

function hashMermaidCode(code: string): string {
  try {
    // WYSIWYG 情况下，在编辑未闭合的 ```mermaid 围栏内时，跳过 Mermaid 渲染以避免每次输入导致整屏重排/闪烁
    const _skipMermaid = (() => {
      if (!wysiwyg) return false
      try {
        const text = editor.value
        const caret = editor.selectionStart >>> 0
        const lines = text.split('\n')
        const caretLine = (() => { try { return text.slice(0, caret).split('\n').length - 1 } catch { return -1 } })()
        let inside = false
        let fenceCh = ''
        let fenceLang = ''
        for (let i = 0; i <= Math.min(Math.max(0, caretLine), lines.length - 1); i++) {
          const ln = lines[i]
          const m = ln.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
          if (m) {
            const ch = m[1][0]
            if (!inside) {
              inside = true
              fenceCh = ch
              fenceLang = (m[2] || '').trim().split(/\s+/)[0]?.toLowerCase() || ''
            } else if (ch === fenceCh) {
              inside = false
              fenceCh = ''
              fenceLang = ''
            }
          }
        }
        return !!(inside && fenceLang === 'mermaid')
      } catch { return false }
    })()
    if (_skipMermaid) { throw new Error('SKIP_MERMAID_RENDER_IN_WYSIWYG') }
    if (!code) return 'mmd-empty'
    let hash = 2166136261 >>> 0 // FNV-1a 32 位初始值
    for (let i = 0; i < code.length; i++) {
      hash ^= code.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
      function handleBeforeInput(ev: any) {
      // 记忆上次值与选区（用于 input 兜底计算差异）
      function rememberPrev() {
        try {
          const ta = getEditor(); if (!ta) return
          const w = window as any
          w._edPrevVal = String(ta.value || '')
          w._edPrevSelS = ta.selectionStart >>> 0
          w._edPrevSelE = ta.selectionEnd >>> 0
        } catch {}
      }

      function handleInput(ev: any) {
        try {
          const ta = getEditor(); if (!ta) return
          if (ev.target !== ta) return
          if (!isEditMode()) return
          const w = window as any
          const prev = String(w._edPrevVal ?? '')
          const ps = (w._edPrevSelS >>> 0) || 0
          const pe = (w._edPrevSelE >>> 0) || ps
          const cur = String(ta.value || '')
          const curS = ta.selectionStart >>> 0
          // 仅处理插入类（粘贴/输入/合成结束），删除等跳过
          if (cur.length >= prev.length) {
            const insertedLen = Math.max(0, curS - ps)
            const hadSel = (pe > ps)
            const inserted = (insertedLen > 0) ? cur.slice(ps, ps + insertedLen) : ''
            // 三连反引号围栏
            if (inserted === '```') {
              const before = prev.slice(0, ps)
              const mid = hadSel ? prev.slice(ps, pe) : ''
              const after = prev.slice(pe)
              const content = hadSel ? ('\n' + mid + '\n') : ('\n\n')
              ta.value = before + '```' + content + '```' + after
              const caret = hadSel ? (ps + content.length + 3) : (ps + 4)
              ta.selectionStart = ta.selectionEnd = caret
              try { dirty = true; refreshTitle(); refreshStatus() } catch {}
              if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
              rememberPrev();
              return
            }
            // 单个左标记：自动/环绕补全（含全角）
            if (inserted.length === 1) {
              const close = (openClose as any)[inserted]
              if (close) {
                if (hadSel) {
                  const before = prev.slice(0, ps)
                  const mid = prev.slice(ps, pe)
                  const after = prev.slice(pe)
                  ta.value = before + inserted + mid + close + after
                  ta.selectionStart = ps + 1; ta.selectionEnd = ps + 1 + mid.length
                } else {
                  // 光标插入：在当前结果右侧补一个闭合
                  const before = cur.slice(0, curS)
                  const after = cur.slice(curS)
                  ta.value = before + close + after
                  ta.selectionStart = ta.selectionEnd = curS
                }
                try { dirty = true; refreshTitle(); refreshStatus() } catch {}
                if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
                rememberPrev();
                return
              }
              // 右标记跳过
              if ((closers as any).has && (closers as any).has(inserted) && !hadSel) {
                const rightChar = inserted
                if (prev.slice(ps, ps + 1) === rightChar) {
                  ta.selectionStart = ta.selectionEnd = ps + 1
                  rememberPrev();
                  return
                }
              }
            }
          }
          // 默认：更新 prev 快照
          rememberPrev()
        } catch {}
      }

      // 初始快照：获取一次
      try { rememberPrev() } catch {}
        try {
          const ta = getEditor(); if (!ta) return
          if (ev.target !== ta) return
          if (!isEditMode()) return
          const it = (ev as any).inputType || ''
          if (it !== 'insertText' && it !== 'insertCompositionText') return
          const data = (ev as any).data as string || ''
          if (!data) return
          const val = String(ta.value || '')
          const s = ta.selectionStart >>> 0
          const epos = ta.selectionEnd >>> 0

          // 组合输入：三连反引号``` 直接围栏
          if (data === '```') {
            ev.preventDefault()
            const before = val.slice(0, s)
            const mid = val.slice(s, epos)
            const after = val.slice(epos)
            const content = (epos > s ? ('\n' + mid + '\n') : ('\n\n'))
            ta.value = before + '```' + content + '```' + after
            const caret = (epos > s) ? (s + content.length + 3) : (s + 4)
            ta.selectionStart = ta.selectionEnd = caret
            try { dirty = true; refreshTitle(); refreshStatus() } catch {}
            if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
            return
          }

          // 组合输入：跳过右侧闭合
          if (data.length === 1 && (closers as any).has && (closers as any).has(data) && s === epos && val[s] === data) {
            ev.preventDefault(); ta.selectionStart = ta.selectionEnd = s + 1; return
          }

          // 组合输入：通用成对/环绕（含全角左标记）
          if (data.length === 1) {
            const close = (openClose as any)[data]
            if (close) {
              ev.preventDefault()
              const before = val.slice(0, s)
              const mid = val.slice(s, epos)
              const after = val.slice(epos)
              if (epos > s) {
                ta.value = before + data + mid + close + after
                ta.selectionStart = s + 1; ta.selectionEnd = s + 1 + mid.length
              } else {
                ta.value = before + data + close + after
                ta.selectionStart = ta.selectionEnd = s + 1
              }
              try { dirty = true; refreshTitle(); refreshStatus() } catch {}
              if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
              return
            }
          }
        } catch {}
      }

    }
    return `mmd-${(hash >>> 0).toString(36)}`
  } catch {
    return 'mmd-fallback'
  }
}

// Mermaid 全局 API 注册（依赖模块级变量，保留在 main.ts）
try {
  if (typeof window !== 'undefined') {
    ;(window as any).invalidateMermaidSvgCache = invalidateMermaidSvgCache
    ;(window as any).isMermaidCacheDisabled = () => { try { return isMermaidCacheDisabled() } catch { return true } }
    ;(window as any).setDisableMermaidCache = (v: boolean) => {
      try { localStorage.setItem('flymd:disableMermaidCache', v ? '1' : '0') } catch {}
      try { invalidateMermaidSvgCache('toggle disable mermaid cache') } catch {}
      try { if (mode === 'preview') { void renderPreview() } else if (wysiwyg) { scheduleWysiwygRender() } } catch {}
    }
    ;(window as any).setMermaidScale = (n: number) => {
      try { const v = (!Number.isFinite(n) || n <= 0) ? '1' : String(n); localStorage.setItem('flymd:mermaidScale', v) } catch {}
      try { adjustExistingMermaidSvgsForScale() } catch {}
    }
    try { if (isMermaidCacheDisabled()) invalidateMermaidSvgCache('startup: cache disabled') } catch {}

    // 暴露创建工具条与导出能力给所见模式插件使用
    try { ;(window as any).createMermaidToolsFor = (svg: SVGElement) => createMermaidToolsFor(svg) } catch {}
    try { ;(window as any).exportMermaidFromElement = (svg: SVGElement, fmt?: 'svg'|'png') => { if (!svg) return; if (fmt) { if (fmt === 'svg') { void (async()=>{ const clone = svg.cloneNode(true) as SVGElement; if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns','http://www.w3.org/2000/svg'); const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` + new XMLSerializer().serializeToString(clone); const p = await save({ defaultPath: 'mermaid.svg', filters: [{name:'SVG',extensions:['svg']}] as any } as any); if (p) await writeTextFile(p, xml) })(); } else { void exportMermaidViaDialog(svg) } } else { void exportMermaidViaDialog(svg) } } } catch {}

    // 动态注入一条 CSS，确保 Mermaid SVG 在所有环境中自适应父容器宽度
    try {
      const id = 'flymd-mermaid-responsive-style'
      if (!document.getElementById(id)) {
        const style = document.createElement('style')
        style.id = id
        style.textContent = [
          '.preview-body svg[data-mmd-hash],',
          '.preview-body .mermaid svg,',
          '.preview-body svg { display:block; max-width:100%; height:auto; }'
        ].join('\n')
        document.head.appendChild(style)
      }
    } catch {}
  }
} catch {}

// 应用状态
let fileTreeReady = false
// Android：外置库误选到 Android/data/obb 时，卸载会被系统清空——必须强提示（且仅提示一次）
let _warnedUninstallUnsafeSafLibrary = false
let mode: Mode = 'edit'
// 所见即所得开关（Overlay 模式）
let wysiwyg = false
let wysiwygV2Active = false
// 模式切换时的滚动位置缓存（百分比 0-1）
let lastScrollPercent = 0
let _wysiwygRaf = 0
// 仅在按回车时触发渲染（可选开关，默认关闭）
let wysiwygEnterToRenderOnly = false
// 所见模式：针对行内 $ 与 代码围栏 ``` 的“闭合后需回车再渲染”延迟标记
let wysiwygHoldInlineDollarUntilEnter = false
let wysiwygHoldFenceUntilEnter = false

function shouldDeferWysiwygRender(): boolean {
  return !!(wysiwygEnterToRenderOnly || wysiwygHoldInlineDollarUntilEnter || wysiwygHoldFenceUntilEnter)
}

// 模式切换提示：在右下角通知区域显示当前模式
function notifyModeChange(): void {
  try {
    showModeChangeNotification(mode, !!wysiwyg)
  } catch {}
}
// 当前行高亮元素
let wysiwygLineEl: HTMLDivElement | null = null
// 点状光标元素与度量缓存
let wysiwygCaretEl: HTMLDivElement | null = null
let wysiwygStatusEl: HTMLDivElement | null = null
let _wysiwygCaretLineIndex = 0
let _wysiwygCaretVisualColumn = 0
let _caretCharWidth = 0
let _caretFontKey = ''
// 点状“光标”闪烁控制（仅所见模式预览中的点）
let _dotBlinkTimer: number | null = null
let _dotBlinkOn = true

function startDotBlink() {
  try {
    if (_dotBlinkTimer != null) return
    _dotBlinkOn = true
    _dotBlinkTimer = window.setInterval(() => {
      _dotBlinkOn = !_dotBlinkOn
      // 闪烁由 CSS 动画驱动；此计时器仅用于保持状态，可按需扩展
    }, 800)
  } catch {}
}

function stopDotBlink() {
  try {
    if (_dotBlinkTimer != null) { clearInterval(_dotBlinkTimer); _dotBlinkTimer = null }
    _dotBlinkOn = false
  } catch {}
}
// 库侧栏选中状态
let selectedFolderPath: string | null = null
let selectedNodeEl: HTMLElement | null = null
// 库面板停靠状态：true=固定在左侧并收缩编辑区；false=覆盖式抽屉
  let libraryDocked = true
  type LibrarySide = 'left' | 'right'
  let librarySide: LibrarySide = 'left'
  let libraryVisible = true
  // 大纲布局模式：embedded=嵌入库侧栏；left=库 | 大纲 | 编辑区；right=库 | 编辑区 | 大纲
  type OutlineLayout = 'embedded' | 'left' | 'right'
  let outlineLayout: OutlineLayout = 'embedded'
// 非固定模式下：离开侧栏后自动隐藏的延迟定时器
let _libLeaveTimer: number | null = null
// 便签模式：专注+阅读+无侧栏，顶部显示锁定/置顶按钮
let stickyNoteMode = false
let stickyNoteLocked = false   // 窗口位置锁定（禁止拖动）
let stickyNoteOnTop = false    // 窗口置顶
let stickyTodoAutoPreview = false // 便签快速待办编辑后是否需要自动返回阅读模式
let stickyNoteOpacity = STICKY_NOTE_DEFAULT_OPACITY   // 窗口透明度
let stickyNoteColor: StickyNoteColor = STICKY_NOTE_DEFAULT_COLOR  // 便签背景色
let stickyNoteReminders: StickyNoteReminderMap = {}   // 便签待办提醒状态（按文件+文本标记）
// 边缘唤醒热区元素（非固定且隐藏时显示，鼠标靠近自动展开库）
let _libEdgeEl: HTMLDivElement | null = null
let _libFloatToggleEl: HTMLButtonElement | null = null
function selectLibraryNode(el: HTMLElement | null, path: string | null, isDir: boolean) {
  try {
    if (selectedNodeEl) selectedNodeEl.classList.remove('selected')
    selectedNodeEl = el as any
    if (selectedNodeEl) selectedNodeEl.classList.add('selected')
    selectedFolderPath = (isDir && path) ? path : selectedFolderPath
  } catch {}
}

let currentFilePath: string | null = null
// YAML Front Matter 当前缓存，仅用于渲染/所见模式，源码始终保留完整文本
let currentFrontMatter: string | null = null
// 全局“未保存更改”标记（供关闭时提示与扩展查询）
let dirty = false // 是否有未保存更改（此处需加分号，避免下一行以括号开头被解析为对 false 的函数调用）
// 暴露一个轻量只读查询函数，避免直接访问变量引起耦合
;(window as any).flymdIsDirty = () => dirty
// 自动保存句柄（通过模块化实现，避免 main.ts 膨胀）
let _autoSaveHandles: AutoSaveHandles | null = null
function getAutoSave(): AutoSaveHandles {
  if (!_autoSaveHandles) {
    _autoSaveHandles = initAutoSave({
      getDirty: () => dirty,
      getCurrentFilePath: () => currentFilePath,
      saveFile: () => saveFile(),
      canWriteFile: () => typeof writeTextFile === 'function',
      getStore: () => store,
    })
  }
  return _autoSaveHandles
}

// 最近一次粘贴组合键：normal=Ctrl+V, plain=Ctrl+Shift+V；用于在 paste 事件中区分行为
let _lastPasteCombo: 'normal' | 'plain' | null = null

// 配置存储（使用 tauri store）
let store: Store | null = null
let uploaderEnabledSnapshot = false
// 配置备份（已拆分到 core/configBackup.ts）
import { CONFIG_BACKUP_VERSION, PLUGINS_DIR, SETTINGS_FILE_NAME, BACKUP_PREFIX_APPDATA, BACKUP_PREFIX_APPLOCAL, APP_LOCAL_EXCLUDE_ROOTS, normalizeBackupPath, bytesToBase64, base64ToBytes, getSettingsBaseDir, collectConfigBackupFiles, resolveBackupPath, ensureParentDirsForBackup, clearDirectory, clearAppLocalDataForRestore, type ConfigBackupEntry, type ConfigBackupPayload, type BackupPathInfo } from './core/configBackup'
import { load as yamlLoad } from 'js-yaml'
// 便携模式（已拆分到 core/portable.ts）
import { PORTABLE_BACKUP_FILENAME, getPortableBaseDir, getPortableDirAbsolute, joinPortableFile, exportPortableBackupSilent, readPortableBackupPayload } from './core/portable'

function isMobileUiFast(): boolean {
  try {
    // 优先使用平台集成层写入的 class（更可靠）
    if (document.body.classList.contains('platform-mobile')) return true
  } catch {}
  try {
    const ua = String(navigator?.userAgent || '')
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  } catch {
    return false
  }
}

async function isPortableModeEnabled(): Promise<boolean> {
  try {
    // 移动端：不支持便携模式（更不应该自动导入/覆盖配置）
    if (isMobileUiFast()) return false
    if (!store) return false
    const raw = await store.get('portableMode')
    return !!(raw as any)?.enabled
  } catch {
    return false
  }
}

async function setPortableModeEnabled(next: boolean): Promise<void> {
  try {
    if (isMobileUiFast()) return
    if (!store) return
    const raw = ((await store.get('portableMode')) as any) || {}
    raw.enabled = next
    await store.set('portableMode', raw)
    await store.save()
  } catch {}
}

// 便携模式：导入备份（依赖 store，保留在 main.ts）
async function importPortableBackupSilent(): Promise<boolean> {
  try {
    if (isMobileUiFast()) return false
    const payload = await readPortableBackupPayload()
    if (!payload) return false
    await restoreConfigFromPayload(payload)
    return true
  } catch (err) {
    console.warn('[Portable] 导入失败', err)
    return false
  }
}

async function maybeAutoImportPortableBackup(): Promise<void> {
  try {
    if (isMobileUiFast()) return
    // 1) 若不存在便携备份文件，直接跳过
    const payload = await readPortableBackupPayload()
    if (!payload) return

    // 2) 读取当前是否开启了便携模式
    const portableEnabled = await isPortableModeEnabled()

    // 3) 检查当前配置中是否已有库配置（用于判断是否为“新环境首次运行”）
    let hasLibraries = false
    try {
      const libs = await getLibraries()
      hasLibraries = Array.isArray(libs) && libs.length > 0
    } catch {}

    // 4) 触发自动导入的条件：
    //    - 情况 A：用户明确开启了便携模式（原有行为，保持不变）；
    //    - 情况 B：当前环境尚无库配置，但发现了便携备份（新机器首次运行单文件版时，自动从便携备份恢复）。
    if (!portableEnabled && hasLibraries) return

    await restoreConfigFromPayload(payload)
  } catch (err) {
    console.warn('[Portable] 自动导入异常', err)
  }
}

async function maybeAutoExportPortableBackup(): Promise<void> {
  try {
    if (isMobileUiFast()) return
    if (!(await isPortableModeEnabled())) return
    await exportPortableBackupSilent()
  } catch (err) {
    console.warn('[Portable] 自动导出异常', err)
  }
}

// 恢复配置（依赖 store，保留在 main.ts）
async function restoreConfigFromPayload(payload: ConfigBackupPayload): Promise<{ settings: boolean; pluginFiles: number }> {
  const files = Array.isArray(payload?.files) ? payload.files : []
  if (!files.length) throw new Error('备份文件为空')
  try {
    if (store) {
      await store.close()
    }
  } catch {}
  store = null
  let pluginFiles = 0
  let hasSettings = false
  let hasAppDataScope = false
  let hasAppLocalScope = false
  for (const entry of files) {
    const normalized = normalizeBackupPath(entry?.path || '')
    if (!normalized) continue
    if (normalized === SETTINGS_FILE_NAME || normalized.startsWith(BACKUP_PREFIX_APPDATA + '/')) hasSettings = true
    if (normalized.startsWith(`${BACKUP_PREFIX_APPLOCAL}/${PLUGINS_DIR}`) || normalized.startsWith('flymd/')) pluginFiles++
    if (normalized.startsWith(BACKUP_PREFIX_APPDATA + '/')) hasAppDataScope = true
    if (normalized.startsWith(BACKUP_PREFIX_APPLOCAL + '/')) hasAppLocalScope = true
  }
  if (hasAppDataScope) {
    await clearDirectory(getSettingsBaseDir(), '')
  }
  if (hasAppLocalScope) {
    await clearAppLocalDataForRestore()
  } else if (pluginFiles > 0) {
    await removePluginDir(PLUGINS_DIR)
  }
  for (const entry of files) {
    const info = resolveBackupPath(entry?.path || '')
    if (!info) continue
    const data = base64ToBytes(entry?.data || '')
    await ensureParentDirsForBackup(info)
    await writeFile(info.relPath as any, data, { baseDir: info.baseDir } as any)
  }
  try {
    setAppStore(null)
    store = await getAppStore()
    setAppStore(store)
    await store?.save()
  } catch {}
  return { settings: hasSettings, pluginFiles }
}
let _appLocalDataDirCached: string | null | undefined
async function getAppLocalDataDirCached(): Promise<string | null> {
  if (typeof _appLocalDataDirCached !== 'undefined') return _appLocalDataDirCached
  try {
    const mod: any = await import('@tauri-apps/api/path')
    if (mod && typeof mod.appLocalDataDir === 'function') {
      const dir = await mod.appLocalDataDir()
      if (dir && typeof dir === 'string') {
        _appLocalDataDirCached = dir.replace(/[\\/]+$/, '')
        return _appLocalDataDirCached
      }
    }
  } catch {}
  _appLocalDataDirCached = null
  return _appLocalDataDirCached
}
async function resolvePluginInstallAbsolute(dir: string): Promise<string | null> {
  try {
    const base = await getAppLocalDataDirCached()
    if (!base) return null
    const sep = base.includes('\\') ? '\\' : '/'
    const cleaned = String(dir || '').replace(/^[/\\]+/, '').replace(/[\\/]+/g, '/')
    if (!cleaned) return base
    return base + sep + cleaned.replace(/\//g, sep)
  } catch { return null }
}
function toPluginAssetUrl(absDir: string | null, relPath: string): string {
  try {
    if (!absDir) return ''
    let rel = String(relPath || '').trim()
    if (!rel) return ''
    rel = rel.replace(/^[/\\]+/, '').replace(/[\\/]+/g, '/')
    const sep = absDir.includes('\\') ? '\\' : '/'
    const abs = absDir + sep + rel.replace(/\//g, sep)
    return typeof convertFileSrc === 'function' ? convertFileSrc(abs) : abs
  } catch { return '' }
}
const builtinPlugins: InstalledPlugin[] = [
  { id: 'uploader-s3', name: '图床 (S3/R2)', version: 'builtin', enabled: undefined, dir: '', main: '', builtin: true, description: '粘贴/拖拽图片自动上传，支持 S3/R2 直连，使用设置中的凭据。' },
  { id: 'webdav-sync', name: 'WebDAV 同步', version: 'builtin', enabled: undefined, dir: '', main: '', builtin: true, description: 'F5/启动/关闭前同步，基于修改时间覆盖' }
]

async function readUploaderEnabledState(): Promise<boolean> {
  try {
    if (!store) return uploaderEnabledSnapshot
    const up = await store.get('uploader')
    if (up && typeof up === 'object') {
      uploaderEnabledSnapshot = !!(up as any).enabled
    }
    return uploaderEnabledSnapshot
  } catch {
    return uploaderEnabledSnapshot
  }
}

async function toggleUploaderEnabledFromMenu(): Promise<boolean> {
  uploaderEnabledSnapshot = await toggleUploaderEnabledFromMenuCore(
    {
      getStore: () => store,
      pluginNotice: (msg, level, ms) => pluginNotice(msg, level, ms),
    },
    uploaderEnabledSnapshot,
  )
  return uploaderEnabledSnapshot
}

async function handleManualSyncFromMenu(): Promise<void> {
  try {
    const result = await webdavSyncNow('manual')
    if (!result) {
      pluginNotice('同步失败', 'err', 2200)
      return
    }
    if (result.skipped) {
      pluginNotice('同步已跳过', 'ok', 1800)
      return
    }
    pluginNotice(`同步完成：上传${result.uploaded}，下载${result.downloaded}`, 'ok', 2200)
  } catch (err) {
    console.error('manual sync failed', err)
    const msg = (err && (err as any).message) ? (err as any).message : String(err || 'unknown')
    pluginNotice('同步失败：' + msg, 'err', 2600)
  }
}

async function handleOpenSyncLogFromMenu(): Promise<void> {
  try {
    await webdavOpenSyncLog()
  } catch (err) {
    console.error('open sync log failed', err)
    pluginNotice('打开同步日志失败', 'err', 2200)
  }
}

async function handleExportConfigFromMenu(): Promise<void> {
  try {
    if (store) {
      try { await store.save() } catch {}
    }
    const { files } = await collectConfigBackupFiles()
    if (!files.length) {
      pluginNotice('没有可导出的配置', 'err', 2200)
      return
    }
    const ts = formatBackupTimestamp(new Date())
    const defaultName = `flymd-config-${ts}.${CONFIG_BACKUP_FILE_EXT}`
    const target = await save({
      defaultPath: defaultName,
      filters: [{ name: 'flyMD 配置备份', extensions: [CONFIG_BACKUP_FILE_EXT, 'json'] }]
    } as any)
    if (!target) return
    const payload: ConfigBackupPayload = {
      version: CONFIG_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      files
    }
    await writeTextFile(target, JSON.stringify(payload, null, 2))
    pluginNotice('配置与日志已完整导出', 'ok', 2200)
  } catch (err) {
    console.error('export config failed', err)
    const msg = (err && (err as any).message) ? (err as any).message : String(err || 'unknown')
    pluginNotice('导出配置失败：' + msg, 'err', 3000)
  }
}

async function handleImportConfigFromMenu(): Promise<void> {
  try {
    const picked = await open({
      filters: [{ name: 'flyMD 配置备份', extensions: [CONFIG_BACKUP_FILE_EXT, 'json'] }]
    } as any)
    const path = Array.isArray(picked) ? (picked[0] || '') : (picked || '')
    if (!path) return
    const text = await readTextFile(path)
    let payload: ConfigBackupPayload | null = null
    try {
      payload = JSON.parse(text) as ConfigBackupPayload
    } catch {
      throw new Error('备份文件损坏或格式不正确')
    }
    if (!payload || typeof payload.version !== 'number' || payload.version < 1 || !Array.isArray(payload.files)) {
      throw new Error('备份文件不兼容')
    }
    const confirmed = await ask('导入配置会清空并覆盖当前所有 flyMD 配置、扩展、日志与缓存数据，并需要重启后生效，是否继续？')
    if (!confirmed) return
    const result = await restoreConfigFromPayload(payload)
    const restoredMsg = result.settings ? '配置/日志已恢复' : '文件已恢复'
    pluginNotice(`${restoredMsg}，请重启应用以确保生效`, 'ok', 2600)
    const restart = await ask('导入完成，是否立即重启应用？')
    if (restart) {
      try { location.reload() } catch {}
    }
  } catch (err) {
    console.error('import config failed', err)
    const msg = (err && (err as any).message) ? (err as any).message : String(err || 'unknown')
    pluginNotice('导入配置失败：' + msg, 'err', 3200)
  }
}

async function togglePortableModeFromMenu(): Promise<void> {
  try {
    if (isMobileUiFast()) return
    const enabled = await isPortableModeEnabled()
    const next = !enabled
    await setPortableModeEnabled(next)
    if (next) {
      // 显式提示：正在开启便携模式（导出配置可能需要时间）
      pluginNotice(t('portable.enabling') || '正在开启便携模式…', 'ok', 3000)
      await exportPortableBackupSilent()
      pluginNotice(t('portable.enabled') || '便携模式已开启，所有配置写入根目录方便携带', 'ok', 2000)
    } else {
      pluginNotice(t('portable.disabled') || '便携模式已关闭', 'ok', 2000)
    }
  } catch (err) {
    console.error('toggle portable mode failed', err)
    pluginNotice(t('portable.toggleFail') || '切换便携模式失败', 'err', 2200)
  }
}

// ============ 语音转文本（Android：录完再出字） ============

const AUDIO_TRANSCRIBE_PROXY_URL = 'https://flymd.llingfei.com/ai/audio_proxy.php'
const AUDIO_RECORD_FOLDER_URI_KEY = 'flymd_audio_record_folder_uri'
const FLYMD_CLIENT_TOKEN_SECRET = 'flymd-rolling-secret-v1'
const FLYMD_CLIENT_TOKEN_WINDOW_SECONDS = 120
const MANUAL_TRANSCRIBE_STORE_KEY = 'manual_transcribe'

type ManualTranscribeMode = 'official' | 'volc'
type ManualTranscribeConfig = {
  mode: ManualTranscribeMode
  volc?: {
    endpoint?: string
    appKey: string
    accessKey: string
    resourceId?: string
    language?: string
    enableDdc?: boolean
  }
}

async function manualTranscribeStoreGet(): Promise<ManualTranscribeConfig> {
  try {
    const store = await getAppStore()
    const raw = (await store.get(MANUAL_TRANSCRIBE_STORE_KEY)) as any
    const mode = String(raw?.mode || '').trim()
    if (mode === 'volc') return raw as any
  } catch {}
  return { mode: 'official' }
}

async function manualTranscribeStoreSet(patch: Partial<ManualTranscribeConfig>): Promise<void> {
  const store = await getAppStore()
  const prev = await manualTranscribeStoreGet()
  const next: ManualTranscribeConfig = { ...(prev as any), ...(patch as any) }
  await store.set(MANUAL_TRANSCRIBE_STORE_KEY, next as any)
}

function manualTranscribeProviderLabel(cfg: ManualTranscribeConfig): string {
  if (cfg?.mode === 'volc') return '火山引擎（用户自配，不计费）'
  return '硅基流动提供模型支持'
}

async function openManualTranscribeSettingsFromMenu(): Promise<void> {
  try {
    const cur = await manualTranscribeStoreGet()
    const curMode = cur?.mode === 'volc' ? 'volc' : 'official'
    const pick = String(prompt(
      '手动转写使用哪种接口？\n' +
      '0 = 官方默认（计费/走自带后端）\n' +
      '1 = 火山引擎（用户自配，不计费；仅影响：开始录音/录音文件转文本）\n\n' +
      `当前：${curMode === 'volc' ? '1' : '0'}\n` +
      '请输入 0 或 1：',
      curMode === 'volc' ? '1' : '0'
    ) || '').trim()
    if (!pick) return
    if (pick === '0') {
      await manualTranscribeStoreSet({ mode: 'official', volc: undefined })
      pluginNotice('手动转写已切回官方默认', 'ok', 2200)
      return
    }
    if (pick !== '1') {
      pluginNotice('输入无效：请输入 0 或 1', 'err', 2200)
      return
    }

    // 火山：参考 BiBi Keyboard（openspeech.bytedance.com 的 X-Api-* 头）
    const endpoint = String(prompt(
      '火山接口地址（可直接回车用默认）：',
      String(cur?.volc?.endpoint || 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash')
    ) || '').trim() || 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash'
    const appKey = String(prompt('X-Api-App-Key（必填）：', String(cur?.volc?.appKey || '')) || '').trim()
    if (!appKey) { pluginNotice('未填写 X-Api-App-Key', 'err', 2200); return }
    const accessKey = String(prompt('X-Api-Access-Key（必填）：', String(cur?.volc?.accessKey || '')) || '').trim()
    if (!accessKey) { pluginNotice('未填写 X-Api-Access-Key', 'err', 2200); return }
    const resourceId = String(prompt(
      'X-Api-Resource-Id（可回车用默认 volc.seedasr.auc）：',
      String(cur?.volc?.resourceId || 'volc.seedasr.auc')
    ) || '').trim() || 'volc.seedasr.auc'
    const language = String(prompt(
      'language（可选；留空=自动）：',
      String(cur?.volc?.language || '')
    ) || '').trim()
    const enableDdc = await confirmNative('启用 enable_ddc（语义顺滑）？\n确定：启用\n取消：关闭', '火山转写设置')

    await manualTranscribeStoreSet({
      mode: 'volc',
      volc: { endpoint, appKey, accessKey, resourceId, language, enableDdc }
    })
    pluginNotice('火山转写配置已保存（仅手动转写生效）', 'ok', 2600)
  } catch (e) {
    pluginNotice('打开转写设置失败：' + String((e as any)?.message || e || ''), 'err', 2600)
  }
}

type ActiveSpeechRecorder = {
  recorder: MediaRecorder
  stream: MediaStream
  chunks: BlobPart[]
  mimeType: string
  startedAt: number
}

let activeSpeechRecorder: ActiveSpeechRecorder | null = null
let transcribeAudioFileBusy = false

// Android：录音中的悬浮提示/一键停止
const SPEECH_RECORD_FAB_ID = 'flymd-speech-record-fab'
const SPEECH_RECORD_FAB_DEFAULT_TEXT = '录音（停止后转写）'
const BIBI_SPEECH_INSTALL_URL = 'https://bibi.brycewg.com/'
type SpeechRecordFabState = {
  el: HTMLButtonElement
  timeEl: HTMLSpanElement | null
  textEl: HTMLSpanElement | null
  pauseEl: HTMLSpanElement | null
  stopEl: HTMLSpanElement | null
  timer: number | null
  startedAt: number
}
let _speechRecordFab: SpeechRecordFabState | null = null

function formatSpeechRecordDuration(ms: number): string {
  const sec = Math.max(0, Math.floor((ms || 0) / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad2 = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`
  return `${pad2(m)}:${pad2(s)}`
}

function ensureSpeechRecordFab(): SpeechRecordFabState | null {
  try {
    let el = document.getElementById(SPEECH_RECORD_FAB_ID) as HTMLButtonElement | null
    if (!el) {
      el = document.createElement('button')
      el.id = SPEECH_RECORD_FAB_ID
      el.type = 'button'
      el.className = 'flymd-speech-record-fab'
      el.setAttribute('aria-label', '停止录音并转写')
      el.innerHTML = `
        <span class="flymd-rec-dot" aria-hidden="true"></span>
        <span class="flymd-rec-text">${SPEECH_RECORD_FAB_DEFAULT_TEXT}</span>
        <span class="flymd-rec-time">00:00</span>
        <span class="flymd-rec-pause" style="display:none">暂停</span>
        <span class="flymd-rec-stop">停止</span>
      `
      document.body.appendChild(el)
    }

    const timeEl = el.querySelector('.flymd-rec-time') as HTMLSpanElement | null
    const textEl = el.querySelector('.flymd-rec-text') as HTMLSpanElement | null
    const pauseEl = el.querySelector('.flymd-rec-pause') as HTMLSpanElement | null
    const stopEl = el.querySelector('.flymd-rec-stop') as HTMLSpanElement | null
    const state: SpeechRecordFabState = (_speechRecordFab && _speechRecordFab.el === el)
      ? _speechRecordFab
      : { el, timeEl, textEl, pauseEl, stopEl, timer: null, startedAt: 0 }
    state.timeEl = timeEl
    state.textEl = textEl
    state.pauseEl = pauseEl
    state.stopEl = stopEl
    _speechRecordFab = state

    try {
      const anyEl = el as any
      if (!anyEl.__flymdSpeechRecordFabBound) {
        anyEl.__flymdSpeechRecordFabBound = true
        el.addEventListener('click', (ev) => { void handleSpeechFabClick(ev as any) })
      }
    } catch {}

    return state
  } catch {
    return null
  }
}

function updateSpeechRecordFabNow(): void {
  try {
    const s = _speechRecordFab
    if (!s) return
    if (!document.body.contains(s.el)) return

    // 关键：虚拟键盘弹出时，避免悬浮按钮被键盘遮住
    try {
      const vv = (window as any).visualViewport as VisualViewport | undefined
      if (vv) {
        const kb = Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)))
        const bottom = kb > 80 ? (kb + 14) : 14
        s.el.style.bottom = `calc(env(safe-area-inset-bottom) + ${bottom}px)`
      }
    } catch {}

    if (s.timeEl) s.timeEl.textContent = formatSpeechRecordDuration(Date.now() - (s.startedAt || Date.now()))
  } catch {}
}

function setSpeechRecordFabVisible(visible: boolean, startedAt?: number, label?: string, ariaLabel?: string, modeTag?: string): void {
  try {
    // 只在 Android UI 显示；其他平台即使误触发也不挡内容
    if (!document.body.classList.contains('platform-android')) visible = false
    const s = ensureSpeechRecordFab()
    if (!s) return

    if (!visible) {
      try { s.el.classList.remove('show') } catch {}
      try { s.el.classList.remove('paused') } catch {}
      try { s.el.disabled = false } catch {}
      try { s.el.style.bottom = '' } catch {}
      try {
        const ds = (s.el as any).dataset as any
        if (ds) delete ds.mode
      } catch {}
      try { if (s.pauseEl) s.pauseEl.style.display = 'none' } catch {}
      try {
        if (s.timer != null) window.clearInterval(s.timer)
      } catch {}
      s.timer = null
      s.startedAt = 0
      return
    }

    s.startedAt = Number.isFinite(Number(startedAt)) ? Number(startedAt) : Date.now()
    try { if (s.textEl) s.textEl.textContent = (String(label || '').trim() || SPEECH_RECORD_FAB_DEFAULT_TEXT) } catch {}
    try {
      const al = String(ariaLabel || '').trim()
      if (al) s.el.setAttribute('aria-label', al)
    } catch {}
    try { ;(s.el as any).dataset.mode = String(modeTag || '').trim() } catch {}
    try { s.el.disabled = false } catch {}
    try { s.el.classList.add('show') } catch {}
    updateSpeechRecordFabNow()
    try {
      if (s.timer != null) window.clearInterval(s.timer)
    } catch {}
    s.timer = window.setInterval(() => updateSpeechRecordFabNow(), 500)
  } catch {}
}

async function stopSpeechRecordingAndTranscribeFromFab(): Promise<void> {
  try {
    if (!activeSpeechRecorder) {
      setSpeechRecordFabVisible(false)
      return
    }
    const s = _speechRecordFab
    try { if (s?.el) s.el.disabled = true } catch {}
    await stopSpeechRecordingAndTranscribe()
  } catch {}
}

// Android：系统 SpeechRecognizer 语音输入（边说边出字）
type ActiveAndroidSpeechInput = {
  sid: number
  startedAt: number
  pollTimer: number | null
  noticeId: string
  lastPartial: string
  stopping: boolean
}
let activeAndroidSpeechInput: ActiveAndroidSpeechInput | null = null

async function handleSpeechFabClick(ev?: MouseEvent): Promise<void> {
  try {
    const target = (ev?.target as HTMLElement | null) || null
    const clickedPause = !!(target && target.classList && target.classList.contains('flymd-rec-pause'))
    const clickedStop = !!(target && target.classList && target.classList.contains('flymd-rec-stop'))
    if (activeSpeechRecorder) {
      await stopSpeechRecordingAndTranscribeFromFab()
      return
    }
    if (activeAndroidSpeechInput) {
      await stopAndroidSpeechInputFromFab()
      return
    }
    if (activeAndroidAsrNote) {
      if (clickedStop) {
        await stopAndroidAsrNoteFromFab(true)
        return
      }
      // 点任意位置默认暂停/继续；点“暂停”也一样
      await toggleAndroidAsrNotePauseResume(clickedPause)
      return
    }
    setSpeechRecordFabVisible(false)
  } catch {}
}

async function toggleAndroidSpeechInputFromMenu(): Promise<void> {
  try {
    if (activeAndroidSpeechInput) {
      await stopAndroidSpeechInputFromMenu()
      return
    }
    await startAndroidSpeechInput()
  } catch {}
}

async function startAndroidSpeechInput(): Promise<void> {
  // 只做 Android
  try {
    const platform = await getPlatform()
    if (platform !== 'android') {
      pluginNotice('该功能仅 Android 可用', 'err', 2200)
      return
    }
  } catch {
    pluginNotice('该功能仅 Android 可用', 'err', 2200)
    return
  }

  // 不要同时占用麦克风（录音转写/语音输入互斥）
  if (activeSpeechRecorder) {
    pluginNotice('正在录音中：请先停止录音再使用语音输入', 'err', 3600)
    return
  }
  if (activeAndroidSpeechInput) {
    pluginNotice('语音输入已在进行中：点右下角“停止”即可结束', 'err', 3200)
    return
  }

  // 先显式请求麦克风权限（SpeechRecognizer 也需要）
  try {
    const ok = await invoke<boolean>('android_ensure_record_audio_permission', { timeoutMs: 60_000 } as any)
    if (!ok) {
      pluginNotice('麦克风权限未授予：请到系统设置开启麦克风权限后重试。', 'err', 4200)
      return
    }
  } catch (e) {
    pluginNotice('麦克风权限请求失败：' + String((e as any)?.message || e || ''), 'err', 4200)
    return
  }

  const noticeId = (() => { try { return NotificationManager.show('extension', '语音输入：准备中…', 0) } catch { return '' } })()

  let sid = 0
  try {
    sid = await invoke<number>('android_speech_start_listening', { timeoutMs: 8_000 } as any)
  } catch (e) {
    try { if (noticeId) NotificationManager.hide(noticeId) } catch {}
    pluginNotice('启动语音输入失败：' + String((e as any)?.message || e || ''), 'err', 3200)
    return
  }

  if (sid <= 0) {
    try { if (noticeId) NotificationManager.hide(noticeId) } catch {}
    if (sid === -1) {
      pluginNotice('系统语音识别不可用：将打开 BiBi 下载页', 'err', 4200)
      try { void openInBrowser(BIBI_SPEECH_INSTALL_URL) } catch {}
      return
    }
    if (sid === -2) {
      pluginNotice('语音输入正忙，请稍候重试', 'err', 2200)
      return
    }
    if (sid === -3) {
      pluginNotice('麦克风权限未授予：请到系统设置开启后重试', 'err', 4200)
      return
    }
    pluginNotice('启动语音输入失败（系统语音服务异常）', 'err', 3200)
    return
  }

  const session: ActiveAndroidSpeechInput = { sid, startedAt: Date.now(), pollTimer: null, noticeId, lastPartial: '', stopping: false }
  activeAndroidSpeechInput = session
  try { setSpeechRecordFabVisible(true, session.startedAt, '语音输入（BiBi）', '停止语音输入') } catch {}
  try { if (noticeId) NotificationManager.updateMessage(noticeId, '语音输入：请开始说话…') } catch {}

  // 轮询消费事件队列（Java->Rust->JS）
  try {
    session.pollTimer = window.setInterval(() => { void pollAndroidSpeechInputEventsOnce(session.sid) }, 220)
  } catch {}
}

async function stopAndroidSpeechInputFromFab(): Promise<void> {
  try {
    const s = activeAndroidSpeechInput
    if (!s) {
      setSpeechRecordFabVisible(false)
      return
    }
    const fab = _speechRecordFab
    try { if (fab?.el) fab.el.disabled = true } catch {}
    s.stopping = true
    try { if (s.noticeId) NotificationManager.updateMessage(s.noticeId, '语音输入：正在结束并识别…') } catch {}
    try { await invoke('android_speech_stop_listening', { sessionId: s.sid } as any) } catch {}
    // 兜底：长时间没有结果就取消，防止 UI 卡死
    setTimeout(() => {
      try {
        const cur = activeAndroidSpeechInput
        if (cur && cur.sid === s.sid) {
          void endAndroidSpeechInputSession(s.sid, true, '语音输入已取消')
        }
      } catch {}
    }, 8000)
  } catch {}
}

async function stopAndroidSpeechInputFromMenu(): Promise<void> {
  try {
    const s = activeAndroidSpeechInput
    if (!s) return
    s.stopping = true
    try { if (s.noticeId) NotificationManager.updateMessage(s.noticeId, '语音输入：正在结束并识别…') } catch {}
    try { await invoke('android_speech_stop_listening', { sessionId: s.sid } as any) } catch {}
    setTimeout(() => {
      try {
        const cur = activeAndroidSpeechInput
        if (cur && cur.sid === s.sid) {
          void endAndroidSpeechInputSession(s.sid, true, '语音输入已取消')
        }
      } catch {}
    }, 8000)
  } catch {}
}

async function endAndroidSpeechInputSession(sessionId: number, cancel: boolean, toast?: string): Promise<void> {
  const s = activeAndroidSpeechInput
  if (!s || s.sid !== sessionId) return
  activeAndroidSpeechInput = null
  try { if (s.pollTimer != null) window.clearInterval(s.pollTimer) } catch {}
  try { if (s.noticeId) NotificationManager.hide(s.noticeId) } catch {}
  try { setSpeechRecordFabVisible(false) } catch {}
  if (cancel) {
    try { await invoke('android_speech_cancel_listening', { sessionId } as any) } catch {}
  }
  if (toast) {
    try { pluginNotice(toast, 'ok', 1800) } catch {}
  }
}

function truncateSpeechHint(s: string, maxLen: number): string {
  try {
    const t = String(s || '').trim()
    if (!t) return ''
    if (t.length <= maxLen) return t
    return t.slice(0, Math.max(0, maxLen - 1)) + '…'
  } catch {
    return ''
  }
}

async function pollAndroidSpeechInputEventsOnce(sessionId: number): Promise<void> {
  const s = activeAndroidSpeechInput
  if (!s || s.sid !== sessionId) return

  let items: string[] = []
  try {
    items = await invoke<string[]>('android_speech_drain_events', { maxItems: 64 } as any)
  } catch {
    return
  }
  if (!items || !items.length) return

  for (const raw of items) {
    let ev: any = null
    try { ev = JSON.parse(String(raw || '')) } catch { ev = null }
    if (!ev || ev.sid !== sessionId) continue

    const t0 = String(ev.t || '')
    if (t0 === 'partial') {
      const text = String(ev.text || '').trim()
      if (!text) continue
      s.lastPartial = text
      try {
        if (s.noticeId) {
          const hint = truncateSpeechHint(text, 42)
          NotificationManager.updateMessage(s.noticeId, hint ? ('语音输入：' + hint) : '语音输入：识别中…')
        }
      } catch {}
      continue
    }

    if (t0 === 'final') {
      const text = String(ev.text || '').trim()
      try {
        if (text) {
          insertAtCursor(text)
          try { renderPreview() } catch {}
          try { pluginNotice('已插入语音文本', 'ok', 1200) } catch {}
        } else {
          try { pluginNotice('未识别到文字', 'err', 1600) } catch {}
        }
      } catch {}
      void endAndroidSpeechInputSession(sessionId, false)
      return
    }

    if (t0 === 'error') {
      try { pluginNotice('语音输入失败（系统语音服务错误）', 'err', 3200) } catch {}
      void endAndroidSpeechInputSession(sessionId, false)
      return
    }

    if (t0 === 'state') {
      const st = Number(ev.state || 0)
      const msg = String(ev.msg || '')
      if (st === 0) {
        // idle：没有 final 的话，说明被取消/超时/静默失败
        if (!s.stopping) {
          try { pluginNotice('语音输入已结束', 'ok', 1200) } catch {}
        }
        void endAndroidSpeechInputSession(sessionId, false)
        return
      }
      // recording/ready/begin/end/stop：仅更新提示
      try {
        if (s.noticeId) {
          const label = msg ? ('语音输入：' + msg) : '语音输入：进行中…'
          NotificationManager.updateMessage(s.noticeId, label)
        }
      } catch {}
    }
  }
}

// Android：自动语音笔记（火山流式 ASR，经由自建 WS 网关）
// 设计取舍：partial 会反复修正，所以用“覆盖式草稿段”写入编辑器，避免越说越重复。
type ActiveAndroidAsrNote = {
  notePath: string
  token: string
  wsUrl: string
  startedAt: number
  running: boolean
  paused: boolean
  ending: 'pause' | 'stop' | ''

  // WS 握手状态：必须先发 start（含 token），否则服务端会拒绝音频数据
  wsStarted: boolean
  // 服务端 ready（start 完成：已扣款/建 session），ready 前不发送音频，避免“请先发送 start”
  wsReady: boolean

  // 防锁屏（可选：浏览器/系统支持则保持屏幕常亮）
  wakeLock: any

  // 自动重连 + 心跳
  reconnectTries: number
  reconnectTimer: number | null
  pingTimer: number | null
  lastPongAt: number

  // 编辑器草稿段（partial 覆盖写这里）
  draftStart: number
  draftLen: number
  lastPartial: string

  // 音频采集与发送
  ws: WebSocket | null
  stream: MediaStream | null
  audioCtx: AudioContext | null
  sourceNode: MediaStreamAudioSourceNode | null
  processor: ScriptProcessorNode | null
  zeroGain: GainNode | null
  q: Uint8Array[]
  qLen: number

  // 保存节流
  lastSaveAt: number
  saveBusy: boolean
  saveTimer: number | null
}

let activeAndroidAsrNote: ActiveAndroidAsrNote | null = null

const ASR_BACKEND_BASE_DEFAULT = 'https://flymd.llingfei.com/asr'
const ANDROID_ASR_SAMPLE_RATE = 16000
const ANDROID_ASR_CHUNK_MS = 200
const ANDROID_ASR_CHUNK_BYTES = (ANDROID_ASR_SAMPLE_RATE * 2 * ANDROID_ASR_CHUNK_MS) / 1000 // 16k * 2B * 200ms = 6400

async function asrGetBaseUrl(): Promise<string> {
  // 预留：未来可放进设置里；目前先固定你的域名
  return ASR_BACKEND_BASE_DEFAULT
}

async function asrStoreGet(): Promise<any> {
  try {
    const store = await getAppStore()
    const raw = (await store.get('asr')) as any
    if (raw && typeof raw === 'object') return raw
  } catch {}
  return {}
}

async function asrStoreSet(patch: any): Promise<void> {
  try {
    const store = await getAppStore()
    const prev = await asrStoreGet()
    const next = { ...(prev || {}), ...(patch || {}) }
    await store.set('asr', next)
    await store.save()
  } catch {}
}

async function asrApi(path: string, opt?: { method?: string; token?: string; body?: any }): Promise<any> {
  const base = await asrGetBaseUrl()
  const url = base.replace(/\/+$/, '') + String(path || '')
  const method = String(opt?.method || 'GET').toUpperCase()
  const headers: Record<string, string> = {}
  if (opt?.token) headers['Authorization'] = 'Bearer ' + String(opt.token)
  const bodyObj = opt?.body || {}
  let body: any = undefined
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json; charset=utf-8'
    body = JSON.stringify(bodyObj)
  }
  // 好品味：优先走 tauri plugin-http，绕开 WebView CORS；失败再回退到 fetch
  let text = ''
  let status = 0
  try {
    const http = await getHttpClient()
    if (http && typeof http.fetch === 'function') {
      const req: any = { method, headers, responseType: http.ResponseType?.Text }
      if (method !== 'GET' && method !== 'HEAD') {
        req.body = (http.Body && typeof http.Body.json === 'function')
          ? http.Body.json(bodyObj)
          : body
      }
      const resp: any = await http.fetch(url, req)
      status = Number(resp?.status || 0) || 0
      const ok = resp?.ok === true || (status >= 200 && status < 300)
      text = typeof resp?.text === 'function' ? String(await resp.text()) : String(resp?.data || '')
      const data = (() => { try { return JSON.parse(text) } catch { return null } })()
      if (!ok) throw new Error(`HTTP ${status || 0}：${(data && data.error) ? String(data.error) : (text || 'unknown')}`)
      if (!data || typeof data !== 'object') throw new Error('后端返回非 JSON')
      if (data.ok === false) throw new Error(String(data.error || '请求失败'))
      return data
    }
  } catch {
    // 回退 fetch
  }
  const resp2 = await fetch(url, { method, headers, body })
  status = resp2.status
  text = await resp2.text()
  const data = (() => { try { return JSON.parse(text) } catch { return null } })()
  if (!resp2.ok) throw new Error(`HTTP ${status}：${(data && data.error) ? String(data.error) : (text || 'unknown')}`)
  if (!data || typeof data !== 'object') throw new Error('后端返回非 JSON')
  if (data.ok === false) throw new Error(String(data.error || '请求失败'))
  return data
}

async function asrEnsureTokenInteractive(): Promise<string | null> {
  // 先用已保存 token 试一下
  try {
    const saved = await asrStoreGet()
    const tok = String(saved?.token || '').trim()
    if (tok) {
      try {
        await asrApi('/api/auth/me/', { method: 'GET', token: tok })
        return tok
      } catch {
        await asrStoreSet({ token: '' })
      }
    }
  } catch {}

  const isLogin = await confirmNative('语音笔记服务未登录。\n确定：登录\n取消：注册', '自动语音笔记')
  const username = String(prompt('用户名（3~32）', '') || '').trim()
  if (!username) return null
  const password = String(prompt(isLogin ? '密码（6~64）' : '设置密码（6~64）', '') || '')
  if (!password) return null

  const apiPath = isLogin ? '/api/auth/login/' : '/api/auth/register/'
  const resp = await asrApi(apiPath, { method: 'POST', body: { username, password } })
  const tok = String(resp?.token || '').trim()
  if (!tok) throw new Error('登录失败：token 为空')
  await asrStoreSet({ token: tok, username })
  return tok
}

function asrTruncateHint(s: string, maxLen: number): string {
  try {
    const t = String(s || '').trim()
    if (!t) return ''
    if (t.length <= maxLen) return t
    return t.slice(0, Math.max(0, maxLen - 1)) + '…'
  } catch {
    return ''
  }
}

function floatToInt16Pcm(src: Float32Array): Int16Array {
  const out = new Int16Array(src.length)
  for (let i = 0; i < src.length; i++) {
    let v = src[i]
    if (v > 1) v = 1
    else if (v < -1) v = -1
    out[i] = v < 0 ? (v * 0x8000) : (v * 0x7fff)
  }
  return out
}

function resampleTo16kInt16(src: Float32Array, srcRate: number): Int16Array {
  const inRate = Number(srcRate) || ANDROID_ASR_SAMPLE_RATE
  if (inRate === ANDROID_ASR_SAMPLE_RATE) return floatToInt16Pcm(src)
  if (!src.length) return new Int16Array(0)

  const ratio = inRate / ANDROID_ASR_SAMPLE_RATE
  const outLen = Math.max(0, Math.floor(src.length / ratio))
  const out = new Int16Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio
    const idx = Math.floor(pos)
    const frac = pos - idx
    const s1 = src[idx] ?? 0
    const s2 = src[idx + 1] ?? s1
    let v = s1 + (s2 - s1) * frac
    if (v > 1) v = 1
    else if (v < -1) v = -1
    out[i] = v < 0 ? (v * 0x8000) : (v * 0x7fff)
  }
  return out
}

function asrFabSetPauseVisible(show: boolean, text: string, paused: boolean): void {
  try {
    const s = _speechRecordFab
    if (!s) return
    try { if (show && s.pauseEl) { s.pauseEl.style.display = ''; s.pauseEl.textContent = text } } catch {}
    try { if (!show && s.pauseEl) s.pauseEl.style.display = 'none' } catch {}
    try {
      if (paused) s.el.classList.add('paused')
      else s.el.classList.remove('paused')
    } catch {}
  } catch {}
}

function asrNoteUpdateDraft(note: ActiveAndroidAsrNote, text: string): void {
  try {
    const t = String(text || '')
    note.lastPartial = t
    if (note.draftStart < 0) return

    const start = Math.max(0, Math.min(editor.value.length, note.draftStart))
    const end = Math.max(start, Math.min(editor.value.length, start + Math.max(0, note.draftLen)))
    const val = editor.value
    editor.value = val.slice(0, start) + t + val.slice(end)
    note.draftStart = start
    note.draftLen = t.length
    const pos = start + note.draftLen
    try { editor.selectionStart = editor.selectionEnd = pos } catch {}
    // Android 上长文本时，textarea 偶发不跟随滚动；如果当前草稿插入点接近文末，强制滚到底让用户看到最新内容
    try {
      if (note.draftStart >= Math.max(0, editor.value.length - 4000)) {
        const bottom = Math.max(0, editor.scrollHeight - editor.clientHeight)
        if (bottom > 0) editor.scrollTop = bottom
      }
    } catch {}
    dirty = true
    refreshTitle()
    refreshStatus()

    // 悬浮条显示 partial（用户要看得到实时文字）
    try {
      const hint = asrTruncateTailHint(t, 28)
      const s = _speechRecordFab
      if (s?.textEl) s.textEl.textContent = hint ? ('语音笔记：' + hint) : '语音笔记：识别中…'
    } catch {}

    void asrNoteScheduleSave(note)
  } catch {}
}

function asrTruncateTailHint(s: string, maxLen: number): string {
  try {
    const t = String(s || '').trim()
    if (!t) return ''
    if (t.length <= maxLen) return t
    return '…' + t.slice(Math.max(0, t.length - Math.max(0, maxLen - 1)))
  } catch {
    return ''
  }
}

async function asrWakeLockAcquire(note: ActiveAndroidAsrNote): Promise<void> {
  try {
    const nav: any = navigator as any
    if (!nav || !nav.wakeLock || typeof nav.wakeLock.request !== 'function') return
    try { if (note.wakeLock && typeof note.wakeLock.release === 'function') note.wakeLock.release() } catch {}
    note.wakeLock = await nav.wakeLock.request('screen')
  } catch {}
}

function asrWakeLockRelease(note: ActiveAndroidAsrNote): void {
  try {
    const w = note.wakeLock
    note.wakeLock = null
    if (w && typeof w.release === 'function') w.release()
  } catch {}
}

function asrNoteClearTimers(note: ActiveAndroidAsrNote): void {
  try { if (note.reconnectTimer != null) window.clearTimeout(note.reconnectTimer) } catch {}
  note.reconnectTimer = null
  try { if (note.pingTimer != null) window.clearInterval(note.pingTimer) } catch {}
  note.pingTimer = null
}

function asrNoteStartPing(note: ActiveAndroidAsrNote): void {
  try {
    if (note.pingTimer != null) return
    note.lastPongAt = Date.now()
    note.pingTimer = window.setInterval(() => {
      try {
        if (!activeAndroidAsrNote || activeAndroidAsrNote !== note) return
        if (!note.running || note.ending) return
        const ws = note.ws
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        if (!note.wsReady) return
        ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }))

        // 超时直接触发重连：不靠系统报错
        const now = Date.now()
        if (now - (note.lastPongAt || 0) > 60000) {
          asrNoteScheduleReconnect(note, 'pong_timeout')
        }
      } catch {}
    }, 20000)
  } catch {}
}

function asrNoteCloseWs(note: ActiveAndroidAsrNote): void {
  try { note.wsReady = false } catch {}
  try { note.wsStarted = false } catch {}
  try {
    const ws = note.ws
    note.ws = null
    if (ws && ws.readyState === WebSocket.OPEN) ws.close()
  } catch {}
}

function asrNoteScheduleReconnect(note: ActiveAndroidAsrNote, reason: string): void {
  try {
    if (!activeAndroidAsrNote || activeAndroidAsrNote !== note) return
    if (!note.running || note.ending) return
    if (note.reconnectTimer != null) return

    const maxTries = 5
    if ((note.reconnectTries || 0) >= maxTries) {
      pluginNotice('语音笔记连接已断开：请点击继续重试', 'err', 3200)
      note.ending = note.ending || 'pause'
      void finishAndroidAsrNoteSession(note, true)
      return
    }

    note.reconnectTries = (note.reconnectTries || 0) + 1
    const base = 500
    const delay = Math.min(8000, base * Math.pow(2, note.reconnectTries - 1))
    note.reconnectTimer = window.setTimeout(() => {
      note.reconnectTimer = null
      void asrNoteReconnectNow(note, reason)
    }, delay)

    try {
      const s = _speechRecordFab
      if (s?.textEl) s.textEl.textContent = '语音笔记：网络波动，重连中…'
      asrFabSetPauseVisible(true, '暂停', false)
    } catch {}
  } catch {}
}

async function asrNoteReconnectNow(note: ActiveAndroidAsrNote, reason: string): Promise<void> {
  try {
    if (!activeAndroidAsrNote || activeAndroidAsrNote !== note) return
    if (!note.running || note.ending) return

    asrNoteClearTimers(note)
    asrNoteCloseWs(note)

    // 重新建连（会重新扣 hold；上一条连接会在服务端按 used_ms 结算并退回剩余）
    const ws = new WebSocket(note.wsUrl)
    note.ws = ws
    note.wsStarted = false
    note.wsReady = false

    ws.onopen = () => {
      let started = false
      try {
        const client = {
          platform: 'android',
          ver: APP_VERSION,
          device: String(navigator.userAgent || '').slice(0, 120),
          reconnect: { tries: note.reconnectTries, reason: String(reason || '') },
        }
        ws.send(JSON.stringify({ type: 'start', token: note.token, hold_ms: 120000, client, volc: { language: 'zh' } }))
        started = true
      } catch {}
      note.wsStarted = started
      try { const s = _speechRecordFab; if (s?.textEl) s.textEl.textContent = '语音笔记：准备中…' } catch {}
    }

    ws.onmessage = (ev) => {
      try {
        if (typeof ev.data !== 'string') return
        const msg = (() => { try { return JSON.parse(ev.data) } catch { return null } })()
        if (!msg || typeof msg !== 'object') return
        const t = String((msg as any).type || '')

        if (t === 'ready') {
          note.wsReady = true
          note.reconnectTries = 0
          asrNoteQueueFlush(note)
          asrNoteStartPing(note)
          try { const s = _speechRecordFab; if (s?.textEl) s.textEl.textContent = '语音笔记：请开始说话…' } catch {}
          return
        }
        if (t === 'pong') {
          note.lastPongAt = Date.now()
          return
        }
        if (t === 'partial') {
          const text = String((msg as any).text || '')
          if (text) asrNoteUpdateDraft(note, text)
          return
        }
        if (t === 'final') {
          const text = String((msg as any).text || '')
          if (text) asrNoteUpdateDraft(note, text)
          return
        }
        if (t === 'billing') return
        if (t === 'error') {
          const err = String((msg as any).error || '语音网关错误')
          if (/请先发送\\s*start/i.test(err)) {
            pluginNotice('语音笔记失败：请点击继续重试', 'err', 2600)
            note.ending = note.ending || 'pause'
            void finishAndroidAsrNoteSession(note, true)
            return
          }
          pluginNotice('语音笔记失败：' + err, 'err', 3200)
          note.ending = note.ending || 'pause'
          void finishAndroidAsrNoteSession(note, true)
          return
        }
        if (t === 'end') {
          void finishAndroidAsrNoteSession(note, false)
          return
        }
      } catch {}
    }

    ws.onerror = () => {
      asrNoteScheduleReconnect(note, 'ws_error')
    }

    ws.onclose = () => {
      if (!note.running) return
      if (note.ending) return
      asrNoteScheduleReconnect(note, 'ws_close')
    }
  } catch {}
}

async function asrNoteScheduleSave(note: ActiveAndroidAsrNote): Promise<void> {
  // 别傻到每个 partial 都写盘：节流一下，够“实时”也不炸 IO
  try {
    const now = Date.now()
    const gap = now - (note.lastSaveAt || 0)
    if (gap >= 3000) {
      note.lastSaveAt = now
      if (!note.saveBusy) {
        note.saveBusy = true
        try { await saveFile() } catch {}
        note.saveBusy = false
      }
      return
    }
    if (note.saveTimer != null) return
    note.saveTimer = window.setTimeout(() => {
      note.saveTimer = null
      void asrNoteScheduleSave(note)
    }, Math.max(200, 3000 - gap))
  } catch {}
}

function asrNoteStopAudioCapture(note: ActiveAndroidAsrNote): void {
  try { note.processor?.disconnect() } catch {}
  try { note.sourceNode?.disconnect() } catch {}
  try { note.zeroGain?.disconnect() } catch {}
  try { note.audioCtx?.close?.() } catch {}
  note.processor = null
  note.sourceNode = null
  note.zeroGain = null
  note.audioCtx = null
  try { note.stream?.getTracks?.().forEach(t => { try { t.stop() } catch {} }) } catch {}
  note.stream = null
}

function asrNoteQueuePush(note: ActiveAndroidAsrNote, bytes: Uint8Array): void {
  try {
    if (!bytes || !bytes.length) return
    note.q.push(bytes)
    note.qLen += bytes.length
    // 断网/重连时避免无限堆内存：最多缓存约 8 秒音频，超出就丢最旧的
    const maxBytes = ANDROID_ASR_CHUNK_BYTES * 40
    while (note.qLen > maxBytes && note.q.length > 1) {
      const head = note.q.shift()
      if (!head) break
      note.qLen -= head.length
    }
    asrNoteQueueFlush(note)
  } catch {}
}

function asrNoteQueueFlush(note: ActiveAndroidAsrNote): void {
  try {
    const ws = note.ws
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (!note.wsReady) return
    while (note.qLen >= ANDROID_ASR_CHUNK_BYTES) {
      const chunk = new Uint8Array(ANDROID_ASR_CHUNK_BYTES)
      let filled = 0
      while (filled < ANDROID_ASR_CHUNK_BYTES && note.q.length) {
        const head = note.q[0]
        const need = ANDROID_ASR_CHUNK_BYTES - filled
        if (head.length <= need) {
          chunk.set(head, filled)
          filled += head.length
          note.q.shift()
        } else {
          chunk.set(head.subarray(0, need), filled)
          filled += need
          note.q[0] = head.subarray(need)
        }
      }
      note.qLen -= ANDROID_ASR_CHUNK_BYTES
      try { ws.send(chunk) } catch {}
    }
  } catch {}
}

function asrNoteQueueFlushFinal(note: ActiveAndroidAsrNote): void {
  try {
    asrNoteQueueFlush(note)
    const ws = note.ws
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (!note.wsReady) return
    if (!note.qLen || !note.q.length) return

    const chunk = new Uint8Array(ANDROID_ASR_CHUNK_BYTES)
    let filled = 0
    while (filled < ANDROID_ASR_CHUNK_BYTES && note.q.length) {
      const head = note.q[0]
      const need = ANDROID_ASR_CHUNK_BYTES - filled
      if (head.length <= need) {
        chunk.set(head, filled)
        filled += head.length
        note.q.shift()
      } else {
        chunk.set(head.subarray(0, need), filled)
        filled += need
        note.q[0] = head.subarray(need)
      }
    }
    note.q = []
    note.qLen = 0
    if (filled > 0) {
      try { ws.send(chunk) } catch {}
    }
  } catch {}
}

async function startAndroidAsrNote(createNewFile: boolean): Promise<void> {
  // 只做 Android
  const platform = await getPlatform()
  if (platform !== 'android') {
    pluginNotice('该功能仅 Android 可用', 'err', 2200)
    return
  }
  if (activeSpeechRecorder) {
    pluginNotice('正在录音中：请先停止录音再使用自动语音笔记', 'err', 3600)
    return
  }
  if (activeAndroidSpeechInput) {
    pluginNotice('语音输入（BiBi）进行中：请先停止再使用自动语音笔记', 'err', 3600)
    return
  }

  // 权限与环境检查
  if (!window.isSecureContext) {
    pluginNotice('当前环境不是安全上下文：WebView 禁止录音（isSecureContext=false）', 'err', 3500)
    return
  }
  if (!(navigator as any)?.mediaDevices?.getUserMedia) {
    pluginNotice('当前环境不支持录音（缺少 getUserMedia）', 'err', 2500)
    return
  }

  try {
    const ok = await invoke<boolean>('android_ensure_record_audio_permission', { timeoutMs: 60_000 } as any)
    if (!ok) {
      pluginNotice('麦克风权限未授予：请到系统设置开启后重试', 'err', 4200)
      return
    }
  } catch (e) {
    pluginNotice('麦克风权限请求失败：' + String((e as any)?.message || e || ''), 'err', 4200)
    return
  }

  // 登录 + 读取余额/网关地址
  let token = ''
  try {
    const t = await asrEnsureTokenInteractive()
    if (!t) return
    token = t
  } catch (e) {
    pluginNotice('登录失败：' + String((e as any)?.message || e || ''), 'err', 3200)
    return
  }

  let status: any = null
  try {
    status = await asrApi('/api/billing/status/', { method: 'GET', token })
  } catch (e) {
    pluginNotice('后端不可用：' + String((e as any)?.message || e || ''), 'err', 3200)
    return
  }

  const balMs = Number(status?.billing?.balance_ms || 0) || 0
  const wsUrl = String(status?.billing?.ws?.url || '').trim()
  const payUrl = String(status?.billing?.pay?.url || '').trim()
  try {
    const balMinStr = String(status?.billing?.balance_min || '').trim()
    const priceStr = String(status?.billing?.price_cny_per_min || '').trim()
    if (balMinStr) pluginNotice(`语音笔记余额：${balMinStr} 分钟（${priceStr || '0.2'} 元/分钟）`, 'ok', 2200)
  } catch {}
  if (!wsUrl) {
    pluginNotice('网关地址为空：请检查后端配置', 'err', 3200)
    return
  }
  if (balMs <= 0) {
    const ok = await confirmNative('余额不足。\n确定：打开充值页面\n取消：我已有卡密，去兑换', '自动语音笔记')
    if (ok && payUrl) {
      try { void openInBrowser(payUrl) } catch {}
      pluginNotice('充值完成后，把卡密粘贴到“兑换卡密”里即可。', 'ok', 2600)
      return
    }
    const key = String(prompt('请输入充值卡密（支付页给你的卡号）', '') || '').trim()
    if (!key) return
    try {
      const r = await asrApi('/api/billing/redeem/', { method: 'POST', token, body: { token: key } })
      pluginNotice('充值成功，余额 ' + String(r?.balance_min || r?.billing?.balance_min || ''), 'ok', 2600)
      // 重新取一次状态
      try { status = await asrApi('/api/billing/status/', { method: 'GET', token }) } catch {}
    } catch (e) {
      pluginNotice('兑换失败：' + String((e as any)?.message || e || ''), 'err', 3200)
      return
    }
  }

  // 创建/打开笔记文件
  try {
    await ensureAndroidDefaultLibraryRoot()
  } catch {}
  if (createNewFile || !currentFilePath) {
    const root = await (async () => { try { return await getLibraryRoot() } catch { return '' } })()
    if (!root) {
      pluginNotice('未初始化库目录：请先打开一次“库”', 'err', 3000)
      return
    }
    const d = new Date()
    const pad2 = (n: number) => String(n).padStart(2, '0')
    const name = `语音笔记 ${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}.md`
    const p = await newFileSafeInTree(root, name)
    try {
      const title = `# 语音笔记 ${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}\n\n`
      await writeTextFileAnySafe(p, title)
    } catch {}
    await openFile2(p)
    mode = 'edit'
    preview.classList.add('hidden')
    try { editor.focus() } catch {}
  }

  // 准备草稿插入点：尽量从光标处开始，不去猜用户想要什么格式
  const startPos = (() => {
    try { return Math.max(0, Math.min(editor.value.length, editor.selectionStart)) } catch { return editor.value.length }
  })()

  const note: ActiveAndroidAsrNote = {
    notePath: String(currentFilePath || '').trim(),
    token,
    wsUrl,
    startedAt: Date.now(),
    running: true,
    paused: false,
    ending: '',
    wsStarted: false,
    wsReady: false,
    wakeLock: null,
    reconnectTries: 0,
    reconnectTimer: null,
    pingTimer: null,
    lastPongAt: Date.now(),
    draftStart: startPos,
    draftLen: 0,
    lastPartial: '',
    ws: null,
    stream: null,
    audioCtx: null,
    sourceNode: null,
    processor: null,
    zeroGain: null,
    q: [],
    qLen: 0,
    lastSaveAt: 0,
    saveBusy: false,
    saveTimer: null,
  }
  activeAndroidAsrNote = note
  void asrWakeLockAcquire(note)

  try {
    setSpeechRecordFabVisible(true, note.startedAt, '语音笔记：连接中…', '暂停/停止自动语音笔记', 'asr')
    asrFabSetPauseVisible(true, '暂停', false)
  } catch {}

  // 建连 WS
  const ws = new WebSocket(wsUrl)
  note.ws = ws

  ws.onopen = () => {
    let started = false
    try {
      const client = {
        platform: 'android',
        ver: APP_VERSION,
        device: String(navigator.userAgent || '').slice(0, 120),
      }
      ws.send(JSON.stringify({ type: 'start', token, hold_ms: 120000, client, volc: { language: 'zh' } }))
      started = true
    } catch {}
    try {
      if (!activeAndroidAsrNote || activeAndroidAsrNote !== note) return
      note.wsStarted = started
    } catch {}
    try { const s = _speechRecordFab; if (s?.textEl) s.textEl.textContent = '语音笔记：准备中…' } catch {}
  }

  ws.onmessage = (ev) => {
    try {
      if (typeof ev.data !== 'string') return
      const msg = (() => { try { return JSON.parse(ev.data) } catch { return null } })()
      if (!msg || typeof msg !== 'object') return
      const t = String((msg as any).type || '')

      if (t === 'ready') {
        note.wsReady = true
        note.reconnectTries = 0
        asrNoteQueueFlush(note)
        asrNoteStartPing(note)
        try { const s = _speechRecordFab; if (s?.textEl) s.textEl.textContent = '语音笔记：请开始说话…' } catch {}
        return
      }
      if (t === 'pong') {
        note.lastPongAt = Date.now()
        return
      }
      if (t === 'partial') {
        const text = String((msg as any).text || '')
        if (text) asrNoteUpdateDraft(note, text)
        return
      }
      if (t === 'final') {
        const text = String((msg as any).text || '')
        if (text) asrNoteUpdateDraft(note, text)
        return
      }
      if (t === 'billing') return
      if (t === 'error') {
        const err = String((msg as any).error || '语音网关错误')
        if (/请先发送\\s*start/i.test(err)) {
          pluginNotice('语音笔记失败：请点击继续重试', 'err', 2600)
          note.ending = note.ending || 'pause'
          void finishAndroidAsrNoteSession(note, true)
          return
        }
        pluginNotice('语音笔记失败：' + err, 'err', 3200)
        note.ending = note.ending || 'pause'
        void finishAndroidAsrNoteSession(note, true)
        return
      }
      if (t === 'end') {
        void finishAndroidAsrNoteSession(note, false)
        return
      }
    } catch {}
  }

  ws.onerror = () => {
    asrNoteScheduleReconnect(note, 'ws_error')
  }

  ws.onclose = () => {
    if (!note.running) return
    if (note.ending) return
    asrNoteScheduleReconnect(note, 'ws_close')
  }

  // 启动音频采集（PCM 16k/16bit/mono）
  let stream: MediaStream
  try {
    stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true })
  } catch (e) {
    pluginNotice('录音权限被拒绝：请到系统设置开启麦克风权限后重试。', 'err', 4000)
    await stopAndroidAsrNoteFromFab(true)
    return
  }
  note.stream = stream

  let audioCtx: AudioContext | null = null
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    audioCtx = new AC({ sampleRate: ANDROID_ASR_SAMPLE_RATE })
  } catch {
    try { audioCtx = new AudioContext() } catch { audioCtx = null }
  }
  if (!audioCtx) {
    pluginNotice('无法初始化音频处理（AudioContext 不可用）', 'err', 3200)
    await stopAndroidAsrNoteFromFab(true)
    return
  }
  note.audioCtx = audioCtx

  const sourceNode = audioCtx.createMediaStreamSource(stream)
  const processor = audioCtx.createScriptProcessor(4096, 1, 1)
  const zeroGain = audioCtx.createGain()
  zeroGain.gain.value = 0
  note.sourceNode = sourceNode
  note.processor = processor
  note.zeroGain = zeroGain

  processor.onaudioprocess = (e) => {
    try {
      if (!activeAndroidAsrNote || activeAndroidAsrNote !== note) return
      if (!note.running || note.ending) return
      const ch = e.inputBuffer.getChannelData(0)
      const pcm16 = resampleTo16kInt16(ch, audioCtx!.sampleRate)
      if (!pcm16.length) return
      const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength)
      asrNoteQueuePush(note, bytes)
    } catch {}
  }

  try {
    sourceNode.connect(processor)
    processor.connect(zeroGain)
    zeroGain.connect(audioCtx.destination)
  } catch {}
}

async function finishAndroidAsrNoteSession(note: ActiveAndroidAsrNote, forceStopWs: boolean): Promise<void> {
  try {
    asrNoteClearTimers(note)

    // 先停麦克风，别占着不放
    asrNoteStopAudioCapture(note)
    asrWakeLockRelease(note)

    // 如果 WS 还开着，尽量优雅结束（让服务端返 final/end 并结算）
    try {
      if (forceStopWs && note.ws && note.ws.readyState === WebSocket.OPEN) {
        note.ws.send(JSON.stringify({ type: 'stop' }))
      }
    } catch {}
    try {
      if (forceStopWs && note.ws) note.ws.close()
    } catch {}
    try { note.ws = null } catch {}
    try { note.wsStarted = false; note.wsReady = false } catch {}

    note.running = false

    // 保存一次，避免用户丢字
    try { await saveFile() } catch {}

    if (note.ending === 'stop') {
      activeAndroidAsrNote = null
      try { setSpeechRecordFabVisible(false) } catch {}
      pluginNotice('自动语音笔记已结束', 'ok', 1400)
      return
    }

    // pause：保留模式，可继续
    note.paused = true
    note.ending = ''
    try {
      const s = _speechRecordFab
      if (s?.textEl) s.textEl.textContent = '语音笔记：已暂停'
      asrFabSetPauseVisible(true, '继续', true)
    } catch {}
    pluginNotice('自动语音笔记已暂停', 'ok', 1200)
  } catch {}
}

async function toggleAndroidAsrNotePauseResume(clickedPause: boolean): Promise<void> {
  try {
    const note = activeAndroidAsrNote
    if (!note) return
    if (note.running) {
      // 暂停（断开连接）
      note.ending = 'pause'
      asrNoteQueueFlushFinal(note)
      try { note.ws?.send(JSON.stringify({ type: 'stop' })) } catch {}
      try { note.ws?.close() } catch {}
      await finishAndroidAsrNoteSession(note, false)
      return
    }
    // 继续：重新走一遍 start（不新建文件）
    note.paused = false
    await startAndroidAsrNote(false)
    return
  } catch {}
}

async function stopAndroidAsrNoteFromFab(exitMode: boolean): Promise<void> {
  try {
    const note = activeAndroidAsrNote
    if (!note) {
      setSpeechRecordFabVisible(false)
      return
    }
    note.ending = exitMode ? 'stop' : 'pause'
    asrNoteQueueFlushFinal(note)
    try { note.ws?.send(JSON.stringify({ type: 'stop' })) } catch {}
    try { note.ws?.close() } catch {}
    await finishAndroidAsrNoteSession(note, false)
  } catch {}
}

async function openAndroidAsrBillingEntry(): Promise<void> {
  try {
    const platform = await getPlatform()
    if (platform !== 'android') {
      pluginNotice('该功能仅 Android 可用', 'err', 2200)
      return
    }

    let token = ''
    try {
      const t = await asrEnsureTokenInteractive()
      if (!t) return
      token = t
    } catch (e) {
      pluginNotice('登录失败：' + String((e as any)?.message || e || ''), 'err', 3200)
      return
    }

    const me = await asrApi('/api/auth/me/', { method: 'GET', token })
    const username = String(me?.user?.username || '').trim()
    const balMin = String(me?.billing?.balance_min || '').trim() || '0.00'
    const price = String(me?.billing?.price_cny_per_min || '').trim() || '0.2000'
    const payUrl = String(me?.billing?.pay?.url || '').trim()

    const ok = await confirmNative(
      `语音笔记账号：${username || '未知'}\n余额：${balMin} 分钟\n单价：${price} 元/分钟\n\n确定：打开充值页面\n取消：兑换卡密`,
      '语音笔记余额/充值'
    )
    if (ok) {
      if (!payUrl) {
        pluginNotice('充值页面地址为空：请检查后端配置', 'err', 2600)
        return
      }
      try { void openInBrowser(payUrl) } catch {}
      return
    }

    const key = String(prompt('请输入充值卡密（支付页给你的卡号）', '') || '').trim()
    if (!key) return
    const r = await asrApi('/api/billing/redeem/', { method: 'POST', token, body: { token: key } })
    const nextMin = String(r?.balance_min || r?.billing?.balance_min || '').trim()
    pluginNotice('兑换成功，余额 ' + (nextMin || '已更新'), 'ok', 2600)
  } catch (e) {
    pluginNotice('操作失败：' + String((e as any)?.message || e || ''), 'err', 3200)
  }
}

async function toggleAndroidAsrNoteFromMenu(): Promise<void> {
  try {
    const note = activeAndroidAsrNote
    if (!note) {
      await startAndroidAsrNote(true)
      return
    }
    // 菜单只有一个入口：在运行中就是暂停；暂停中就是继续
    await toggleAndroidAsrNotePauseResume(true)
  } catch {}
}

function fnv1a32Hex(str: string): string {
  try {
    let hash = 0x811c9dc5
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i) & 0xff
      // 关键：必须用 imul 做 32-bit 乘法
      hash = Math.imul(hash, 0x01000193) >>> 0
    }
    return hash.toString(16).padStart(8, '0')
  } catch {
    return '00000000'
  }
}

function buildRollingClientToken(): string {
  const slice = Math.floor(Date.now() / 1000 / FLYMD_CLIENT_TOKEN_WINDOW_SECONDS)
  const base = `${FLYMD_CLIENT_TOKEN_SECRET}:${slice}:2pai`
  const partA = fnv1a32Hex(base)
  const partB = fnv1a32Hex(`${base}:${slice % 97}`)
  return `flymd-${partA}${partB}`
}

function guessAudioMimeType(name: string): string {
  const n = String(name || '').toLowerCase()
  if (n.endsWith('.mp3')) return 'audio/mpeg'
  if (n.endsWith('.m4a')) return 'audio/mp4'
  if (n.endsWith('.aac')) return 'audio/aac'
  if (n.endsWith('.wav')) return 'audio/wav'
  if (n.endsWith('.ogg')) return 'audio/ogg'
  if (n.endsWith('.webm')) return 'audio/webm'
  return 'application/octet-stream'
}

function pickRecorderMimeType(): string {
  try {
    const mr = (window as any).MediaRecorder
    if (!mr || typeof mr.isTypeSupported !== 'function') return ''
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ]
    for (const t of candidates) {
      try { if (mr.isTypeSupported(t)) return t } catch {}
    }
  } catch {}
  return ''
}

function makeRecordingFileName(mimeType: string): string {
  const now = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const ext =
    mimeType.includes('ogg') ? 'ogg'
      : mimeType.includes('mp4') ? 'm4a'
        : 'webm'
  return `flymd-record-${ts}.${ext}`
}

async function blobToBase64Payload(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('读取录音失败'))
      reader.onload = () => {
        const s = String(reader.result || '')
        const idx = s.indexOf('base64,')
        if (idx < 0) return reject(new Error('base64 编码失败'))
        resolve(s.slice(idx + 'base64,'.length))
      }
      reader.readAsDataURL(blob)
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e || 'blobToBase64 failed')))
    }
  })
}

async function ensureAndroidRecordFolderUri(): Promise<string | null> {
  try {
    const platform = await getPlatform()
    if (platform !== 'android') return null
  } catch {
    return null
  }

  const existing = String(localStorage.getItem(AUDIO_RECORD_FOLDER_URI_KEY) || '').trim()
  if (existing) return existing

  const ok = await confirmNative('首次使用需要选择一个目录用于保存录音兜底文件（建议选择“Download/下载”）。是否现在选择？', '录音保存目录')
  if (!ok) return null

  while (true) {
    let folder = ''
    try {
      folder = await safPickFolder(60_000)
    } catch (e) {
      const msg = String((e as any)?.message || e || '')
      if (/cancel/i.test(msg)) return null
      throw e
    }
    folder = String(folder || '').trim()
    if (!folder) return null

    try {
      if (isSafUninstallUnsafeFolder(folder)) {
        pluginNotice('你选的是 Android/data 或 Android/obb 这类目录：卸载应用会被系统清空。请重新选择 Download/下载。', 'err', 3500)
        continue
      }
    } catch {}

    try { await persistSafUriPermission(folder) } catch {}
    localStorage.setItem(AUDIO_RECORD_FOLDER_URI_KEY, folder)
    try {
      const hint = safLocationHint(folder) || safPrettyName(folder)
      if (hint) pluginNotice('录音保存目录已设置：' + hint, 'ok', 2500)
    } catch {}
    return folder
  }
}

async function saveRecordingBackupIfNeeded(blob: Blob, fileName: string, mimeType: string): Promise<void> {
  try {
    const platform = await getPlatform()
    if (platform !== 'android') return
  } catch {
    return
  }

  const folderUri = await ensureAndroidRecordFolderUri()
  if (!folderUri) {
    pluginNotice('未设置录音保存目录：将不会生成本地兜底文件。', 'err', 2600)
    return
  }

  const b64 = await blobToBase64Payload(blob)
  const uri = await safCreateFile(folderUri, fileName, mimeType)
  try { await persistSafUriPermission(uri) } catch {}
  await invoke('android_write_uri_base64', { uri, base64: b64 })
}

async function readAudioBlobFromPickedPath(path: string, nameHint: string): Promise<{ blob: Blob; mimeType: string; name: string }> {
  const p = String(path || '').trim()
  const name = String(nameHint || '').trim() || 'audio'
  const mimeType = guessAudioMimeType(name)
  if (!p) throw new Error('未选择音频文件')
  if (p.startsWith('content://')) {
    try { await invoke('android_persist_uri_permission', { uri: p }) } catch {}
    const b64 = await invoke<string>('android_read_uri_base64', { uri: p })
    const dataUrl = `data:${mimeType};base64,${b64}`
    const blob = await (await fetch(dataUrl)).blob()
    return { blob, mimeType, name }
  }
  const bytes = await readFile(p as any)
  return { blob: new Blob([bytes as any], { type: mimeType }), mimeType, name }
}

function makeUuid(): string {
  try {
    const c: any = (globalThis as any).crypto
    if (c && typeof c.randomUUID === 'function') return String(c.randomUUID())
  } catch {}
  // 兜底：不追求完美，只要足够随机即可
  const rnd = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
  return `${rnd()}-${rnd()}-${rnd()}-${rnd()}`
}

function pcm16ToWavBytes(pcm: Int16Array, sampleRate: number): Uint8Array {
  const dataSize = pcm.byteLength
  const buf = new ArrayBuffer(44 + dataSize)
  const dv = new DataView(buf)
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i) & 0xff) }

  writeStr(0, 'RIFF')
  dv.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  dv.setUint32(16, 16, true) // PCM
  dv.setUint16(20, 1, true) // audio format = PCM
  dv.setUint16(22, 1, true) // channels = 1
  dv.setUint32(24, sampleRate, true)
  dv.setUint32(28, sampleRate * 2, true) // byte rate = sr * ch * 2
  dv.setUint16(32, 2, true) // block align = ch * 2
  dv.setUint16(34, 16, true) // bits per sample
  writeStr(36, 'data')
  dv.setUint32(40, dataSize, true)

  const out = new Uint8Array(buf)
  out.set(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength), 44)
  return out
}

async function decodeAudioDataCompat(ctx: AudioContext, buf: ArrayBuffer): Promise<AudioBuffer> {
  return await new Promise((resolve, reject) => {
    try {
      const anyCtx: any = ctx as any
      const p = anyCtx.decodeAudioData(buf, (ab: AudioBuffer) => resolve(ab), (e: any) => reject(e))
      if (p && typeof p.then === 'function') p.then(resolve, reject)
    } catch (e) {
      reject(e)
    }
  })
}

async function audioBlobToWav16kBase64(blob: Blob): Promise<{ base64: string; durationSec: number }> {
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
  if (!Ctx) throw new Error('当前环境不支持音频解码（缺少 AudioContext）')
  const ctx: AudioContext = new Ctx()
  try {
    const ab = await blob.arrayBuffer()
    const audioBuf = await decodeAudioDataCompat(ctx, ab.slice(0))
    const durationSec = Number(audioBuf.duration || 0) || 0
    if (!Number.isFinite(durationSec) || durationSec <= 0) throw new Error('音频时长无效')
    if (durationSec > 60 * 60) throw new Error('音频过长（超过 1 小时），请分段后再转写')

    // 合成单声道
    const len = audioBuf.length
    const chs = audioBuf.numberOfChannels || 1
    let mono: Float32Array
    if (chs <= 1) {
      mono = audioBuf.getChannelData(0).slice(0)
    } else {
      mono = new Float32Array(len)
      for (let c = 0; c < chs; c++) {
        const src = audioBuf.getChannelData(c)
        for (let i = 0; i < len; i++) mono[i] += (src[i] || 0)
      }
      for (let i = 0; i < len; i++) mono[i] /= chs
    }

    const pcm16 = resampleTo16kInt16(mono, audioBuf.sampleRate || ANDROID_ASR_SAMPLE_RATE)
    const wav = pcm16ToWavBytes(pcm16, ANDROID_ASR_SAMPLE_RATE)
    const wavBlob = new Blob([wav], { type: 'audio/wav' })
    const base64 = await blobToBase64Payload(wavBlob)
    if (!base64) throw new Error('音频编码失败（base64 为空）')
    return { base64, durationSec }
  } finally {
    try { await (ctx as any).close?.() } catch {}
  }
}

async function volcTranscribeWav16kBase64(
  base64Wav: string,
  cfg: NonNullable<ManualTranscribeConfig['volc']>
): Promise<string> {
  const endpoint = String(cfg.endpoint || '').trim() || 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash'
  const appKey = String(cfg.appKey || '').trim()
  const accessKey = String(cfg.accessKey || '').trim()
  const resourceId = String(cfg.resourceId || '').trim() || 'volc.seedasr.auc'
  if (!appKey || !accessKey) throw new Error('火山配置缺失：X-Api-App-Key / X-Api-Access-Key')

  const bodyObj: any = {
    user: { uid: appKey },
    audio: { data: base64Wav, format: 'wav', rate: ANDROID_ASR_SAMPLE_RATE, bits: 16, channel: 1 },
    request: {
      model_name: 'bigmodel',
      enable_itn: true,
      enable_punc: true,
      enable_ddc: cfg.enableDdc !== false,
    },
  }
  const lang = String(cfg.language || '').trim()
  if (lang) bodyObj.audio.language = lang

  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Api-App-Key': appKey,
    'X-Api-Access-Key': accessKey,
    'X-Api-Resource-Id': resourceId,
    'X-Api-Request-Id': makeUuid(),
    'X-Api-Sequence': '-1',
  }

  // 优先走 tauri plugin-http，绕开 WebView CORS；失败再回退到 fetch
  let text = ''
  let status = 0
  try {
    const http = await getHttpClient()
    if (http && typeof http.fetch === 'function') {
      const req: any = { method: 'POST', headers, responseType: http.ResponseType?.Text }
      req.body = (http.Body && typeof http.Body.json === 'function') ? http.Body.json(bodyObj) : JSON.stringify(bodyObj)
      const resp: any = await http.fetch(endpoint, req)
      status = Number(resp?.status || 0) || 0
      const ok = resp?.ok === true || (status >= 200 && status < 300)
      text = typeof resp?.text === 'function' ? String(await resp.text()) : String(resp?.data || '')
      if (!ok) throw new Error(`HTTP ${status || 0}：${text || 'unknown'}`)
    } else {
      throw new Error('no http client')
    }
  } catch {
    const resp2 = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(bodyObj) })
    status = resp2.status
    text = await resp2.text()
    if (!resp2.ok) throw new Error(`HTTP ${status}：${text || 'unknown'}`)
  }

  const data = (() => { try { return JSON.parse(text) } catch { return null } })()
  const out = String((data && data.result && (data.result.text ?? data.result?.Text)) || '').trim()
  if (!out) throw new Error('火山转写结果为空')
  return out
}

async function transcribeAudioBlob(blob: Blob, name: string, mimeType: string): Promise<string> {
  const cfg = await manualTranscribeStoreGet()
  if (cfg.mode === 'volc') {
    const v = cfg.volc
    if (!v || !String(v.appKey || '').trim() || !String(v.accessKey || '').trim()) {
      // 不破坏用户：配置不完整则回退官方默认
      pluginNotice('火山配置不完整：已回退官方默认转写（可在“更多 → 转写设置”里配置）', 'err', 3200)
    } else {
      const wav = await audioBlobToWav16kBase64(blob)
      return await volcTranscribeWav16kBase64(wav.base64, v)
    }
  }

  // 官方默认：走自带后端（proxy.php）
  const fallbackName = String(name || '').trim() || ((blob instanceof File) ? String((blob as any).name || '') : '') || 'audio'
  const fallbackType = String(mimeType || '').trim() || String((blob as any)?.type || '') || 'application/octet-stream'
  const file = (() => {
    try {
      if (blob instanceof File) {
        const sameName = !!fallbackName && blob.name === fallbackName
        const sameType = !!fallbackType && blob.type === fallbackType
        if (sameName && sameType) return blob
        return new File([blob], fallbackName, { type: fallbackType })
      }
    } catch {}
    return new File([blob], fallbackName, { type: fallbackType })
  })()
  const form = new FormData()
  form.append('file', file)
  const headers: Record<string, string> = { 'X-Flymd-Token': buildRollingClientToken() }
  const resp = await fetch(AUDIO_TRANSCRIBE_PROXY_URL, { method: 'POST', headers, body: form })
  const text = await resp.text()
  if (!resp.ok) throw new Error(`转写失败（HTTP ${resp.status}）：${text || 'unknown'}`)
  const data = (() => { try { return JSON.parse(text) } catch { return null } })()
  const out = String((data && (data.text ?? data?.data?.text)) || '').trim()
  if (!out) throw new Error('转写结果为空')
  return out
}

async function maybeOrganizeTranscription(rawText: string): Promise<void> {
  const api = pluginHost?.getPluginAPI?.('ai-assistant')
  if (!api || typeof api.callAI !== 'function') return
  const ok = await confirmNative('检测到已安装 AI 助手：是否整理刚刚的录音文本？', '整理录音文本')
  if (!ok) return
  const prompt =
    '请把下面这段“语音转写文本”整理成可读的中文内容：\n' +
    '- 补全标点与分段\n' +
    '- 修正常见口语/同音错字（不要编造不存在的信息）\n' +
    '- 输出尽量简洁，可包含：标题（可选）、要点、行动项（如有）\n\n' +
    '原文：\n' + rawText
  const organized = String(await api.callAI(prompt, {
    system: '你是专业的中文文字整理助手，输出要清晰、保守、不要臆造事实。',
  }) || '').trim()
  if (!organized) return
  insertAtCursor('\n\n' + organized)
  try { renderPreview() } catch {}
}

async function transcribeFromAudioFileMenu(): Promise<void> {
  const cfg = await (async () => { try { return await manualTranscribeStoreGet() } catch { return { mode: 'official' as const } } })()
  const providerLabel = manualTranscribeProviderLabel(cfg as any)
  if (transcribeAudioFileBusy) {
    pluginNotice(`正在转写音频（${providerLabel}），请稍候…`, 'err', 2000)
    return
  }
  transcribeAudioFileBusy = true
  const noticeId = (() => { try { return NotificationManager.show('sync', '请选择音频文件…', 0) } catch { return '' } })()
  let noticeHideScheduled = false
  try {
    const platform = await (async () => { try { return await getPlatform() } catch { return '' } })()

    let blob: Blob
    let mimeType = ''
    let name = 'audio'

    if (platform === 'android') {
      // Android：优先使用 <input type="file">，避免某些 WebView/插件首轮选择不回调导致“第二次才触发两次”的诡异行为。
      const picked = await pickAudioFileFromInput()
      if (!picked) return
      name = String((picked as any)?.name || '').trim() || 'audio'
      mimeType = String((picked as any)?.type || '').trim() || guessAudioMimeType(name)
      blob = picked
    } else {
      const sel = await open({
        multiple: false,
        filters: [
          { name: 'Audio', extensions: ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'webm'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      if (!sel) return
      const path = typeof sel === 'string' ? sel : ((sel as any)?.path ?? (sel as any)?.filePath ?? String(sel))
      name = (() => {
        const p = String(path || '')
        const base = p.split(/[/\\]/).pop() || ''
        return base || 'audio'
      })()
      const r = await readAudioBlobFromPickedPath(path, name)
      blob = r.blob
      mimeType = r.mimeType
      name = r.name
    }

    try { if (noticeId) NotificationManager.updateMessage(noticeId, `正在转写音频（${providerLabel}）…`) } catch {}
    const out = await transcribeAudioBlob(blob, name, mimeType)
    insertAtCursor(out)
    try { renderPreview() } catch {}
    await maybeOrganizeTranscription(out)
    try {
      if (noticeId) {
        NotificationManager.updateMessage(noticeId, '转写完成')
        noticeHideScheduled = true
        window.setTimeout(() => { try { NotificationManager.hide(noticeId) } catch {} }, 800)
      }
    } catch {}
  } catch (e) {
    console.error('录音文件转写失败', e)
    const msg = '转写失败：' + String((e as any)?.message || e || '')
    try {
      if (noticeId) {
        NotificationManager.updateMessage(noticeId, msg)
        noticeHideScheduled = true
        window.setTimeout(() => { try { NotificationManager.hide(noticeId) } catch {} }, 3200)
      } else {
        pluginNotice(msg, 'err', 3200)
      }
    } catch {
      pluginNotice(msg, 'err', 3200)
    }
  } finally {
    transcribeAudioFileBusy = false
    try { if (noticeId && !noticeHideScheduled) NotificationManager.hide(noticeId) } catch {}
  }
}

async function toggleRecordAndTranscribeMenu(): Promise<void> {
  try {
    // 停止并转写
    if (activeSpeechRecorder) {
      await stopSpeechRecordingAndTranscribe()
      return
    }

    // 开始录音
    if (!window.isSecureContext) {
      pluginNotice('当前环境不是安全上下文：WebView 禁止录音（isSecureContext=false）', 'err', 3500)
      return
    }
    if (!(navigator as any)?.mediaDevices?.getUserMedia) {
      pluginNotice('当前环境不支持录音（缺少 getUserMedia）', 'err', 2500)
      return
    }
    if (typeof (window as any).MediaRecorder !== 'function') {
      pluginNotice('当前环境不支持录音（缺少 MediaRecorder）', 'err', 2500)
      return
    }

    // Android：先显式请求系统麦克风权限（部分 WebView 不会自动弹权限框，导致 getUserMedia 静默拒绝）
    try {
      const platform = await getPlatform()
      if (platform === 'android') {
        const ok = await invoke<boolean>('android_ensure_record_audio_permission', { timeoutMs: 60_000 } as any)
        if (!ok) {
          pluginNotice('麦克风权限未授予：请到系统设置开启麦克风权限后重试。', 'err', 4200)
          return
        }
      }
    } catch (e) {
      pluginNotice('麦克风权限请求失败：' + String((e as any)?.message || e || ''), 'err', 4200)
      return
    }

    // Android：先确保兜底目录可用（用户取消则不开始录音）
    try {
      const platform = await getPlatform()
      if (platform === 'android') {
        const folder = await ensureAndroidRecordFolderUri()
        if (!folder) return
      }
    } catch {}

    let stream: MediaStream
    try {
      stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      const msg = String((e as any)?.message || e || '')
      // Android/WebView 常见：未声明 RECORD_AUDIO 或用户拒绝授权
      pluginNotice('录音权限被拒绝：请到系统设置开启麦克风权限后重试。' + (msg ? `（${msg}）` : ''), 'err', 4000)
      return
    }

    const mimeType = pickRecorderMimeType()
    const chunks: BlobPart[] = []
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    } catch (e) {
      // 兜底：如果 MediaRecorder 初始化失败，也要立刻释放麦克风
      try { stream.getTracks().forEach(t => { try { t.stop() } catch {} }) } catch {}
      throw e
    }

    activeSpeechRecorder = { recorder, stream, chunks, mimeType: mimeType || '', startedAt: Date.now() }

    recorder.addEventListener('dataavailable', (ev: any) => {
      try { if (ev?.data && ev.data.size > 0) chunks.push(ev.data) } catch {}
    })

    recorder.addEventListener('stop', () => {
      void (async () => {
        // 无论如何先关掉“正在录音”的 UI
        try { setSpeechRecordFabVisible(false) } catch {}
        // 某些 WebView 下可能会“意外 stop”，这里兜底把状态归零，避免菜单仍显示“停止录音”
        try {
          if (activeSpeechRecorder && activeSpeechRecorder.recorder === recorder) {
            activeSpeechRecorder = null
          }
        } catch {}
        const local = { chunks: chunks.slice(), mimeType: mimeType || recorder.mimeType || 'audio/webm' }
        try { stream.getTracks().forEach(t => { try { t.stop() } catch {} }) } catch {}
        try {
          const blob = new Blob(local.chunks, { type: local.mimeType })
          const name = makeRecordingFileName(local.mimeType)
          pluginNotice('录音已停止：正在保存并转写…', 'ok', 2200)
          await saveRecordingBackupIfNeeded(blob, name, local.mimeType)
          const out = await transcribeAudioBlob(blob, name, local.mimeType)
          insertAtCursor(out)
          try { renderPreview() } catch {}
          await maybeOrganizeTranscription(out)
        } catch (e) {
          console.error('录音转写失败', e)
          pluginNotice('录音转写失败：' + String((e as any)?.message || e || ''), 'err', 3200)
        }
      })()
    })

    // 极少数 WebView：录音器内部错误后不会抛异常，只发 error 事件
    try {
      recorder.addEventListener('error', (ev: any) => {
        try { setSpeechRecordFabVisible(false) } catch {}
        try {
          if (activeSpeechRecorder && activeSpeechRecorder.recorder === recorder) activeSpeechRecorder = null
        } catch {}
        try { stream.getTracks().forEach(t => { try { t.stop() } catch {} }) } catch {}
        try {
          const msg = String((ev as any)?.error?.message || (ev as any)?.message || '')
          pluginNotice('录音异常中断' + (msg ? `：${msg}` : ''), 'err', 3200)
        } catch {}
      })
    } catch {}

    recorder.start()
    try {
      const cfg = await manualTranscribeStoreGet()
      const label = manualTranscribeProviderLabel(cfg)
      setSpeechRecordFabVisible(true, activeSpeechRecorder.startedAt, `录音（${label}）`, '停止录音并转写', 'rec')
    } catch {
      try { setSpeechRecordFabVisible(true, activeSpeechRecorder.startedAt) } catch {}
    }
    pluginNotice('已开始录音。点右下角悬浮按钮“停止”即可结束并转写。', 'ok', 3500)
  } catch (e) {
    console.error('录音流程异常', e)
    // 防止“录音未真正开始”却残留 active recorder/麦克风占用
    try { setSpeechRecordFabVisible(false) } catch {}
    try {
      const r = activeSpeechRecorder
      activeSpeechRecorder = null
      try { r?.recorder?.stop?.() } catch {}
      try { r?.stream?.getTracks?.().forEach((t: any) => { try { t.stop() } catch {} }) } catch {}
    } catch {}
    pluginNotice('录音失败：' + String((e as any)?.message || e || ''), 'err', 3200)
  }
}

async function stopSpeechRecordingAndTranscribe(): Promise<void> {
  try {
    const r = activeSpeechRecorder
    if (!r) {
      try { setSpeechRecordFabVisible(false) } catch {}
      return
    }
    activeSpeechRecorder = null
    try { setSpeechRecordFabVisible(false) } catch {}
    try { r.recorder.stop() } catch {
      // stop 失败也要尽量释放麦克风，避免用户以为“还在录音”
      try { r.stream.getTracks().forEach(t => { try { t.stop() } catch {} }) } catch {}
    }
  } catch {}
}

async function buildBuiltinContextMenuItems(ctx: ContextMenuContext): Promise<ContextMenuItemConfig[]> {
  const items: ContextMenuItemConfig[] = []
  const syncCfg = await (async () => { try { return await getWebdavSyncConfig() } catch { return null as any } })()
  const syncEnabled = !!syncCfg?.enabled
  const syncConfigured = await (async () => { try { return await isWebdavConfiguredForActiveLibrary() } catch { return false } })()
  let syncTooltip = ''
  if (!syncConfigured) syncTooltip = t('sync.tooltip.notConfigured') || '当前库未配置 WebDAV，同步已禁用'
  else if (!syncEnabled) syncTooltip = t('sync.tooltip.disabled') || '已配置 WebDAV，但同步未启用'
  // 编辑器内置：纯文本粘贴（忽略 HTML / 图片 等富文本）
  items.push({
    label: t('ctx.pastePlain') || '纯文本粘贴',
    icon: '📋',
    tooltip: '忽略 HTML/图片 等富文本，仅插入纯文本内容',
    condition: (c) => c.mode === 'edit' || c.mode === 'wysiwyg',
    onClick: async () => {
      try {
        let text = ''
        try {
          const nav = navigator as any
          if (nav.clipboard && typeof nav.clipboard.readText === 'function') {
            text = await nav.clipboard.readText()
          }
        } catch {}
        if (!text) {
          try {
            alert('无法读取剪贴板内容，请使用 Ctrl+Shift+V 进行纯文本粘贴')
          } catch {}
          return
        }
        const env: PlainPasteEnv = {
          insertAtCursor: (t) => insertAtCursor(t),
          isPreviewMode: () => mode === 'preview',
          isWysiwygMode: () => wysiwyg,
          renderPreview: () => renderPreview(),
          scheduleWysiwygRender: () => scheduleWysiwygRender(),
        }
        await applyPlainTextPaste(text, env)
      } catch {}
    },
  })
  items.push({
    label: t('sync.now') || '立即同步',
    icon: '🔁',
    tooltip: syncTooltip || undefined,
    disabled: !syncEnabled || !syncConfigured,
    onClick: async () => { await handleManualSyncFromMenu() }
  })
  items.push({
    label: t('sync.openlog') || '打开同步日志',
    icon: '📘',
    onClick: async () => { await handleOpenSyncLogFromMenu() }
  })
  const enabled = await readUploaderEnabledState()
  items.push({
    label: t('menu.uploader') || '图床上传',
    note: enabled ? '已开启' : '未开启',
    icon: '🖼️',
    onClick: async () => { await toggleUploaderEnabledFromMenu() }
  })
  // 右键图片：手动上传当前图片到图床（不依赖全局开关）
  try {
    const target = ctx.targetElement as HTMLElement | undefined | null
    const img = target?.closest('img') as HTMLImageElement | null
    if (img && (ctx.mode === 'preview' || ctx.mode === 'wysiwyg')) {
      items.push({
        label: '上传此图片到图床',
        icon: '☁️',
        tooltip: '即使关闭自动图床，也可单独上传当前图片；上传后会生成 Markdown 并复制到剪贴板',
        onClick: async (c) => {
          await uploadImageFromContextMenu(c)
        },
      })
    }
  } catch {}
  return items
}

// ============ 右键菜单系统 ============

// 构建右键菜单上下文
function buildContextMenuContextFromTarget(targetElement: HTMLElement | null): ContextMenuContext {
  try {
    const sel = editor.selectionStart || 0
    const end = editor.selectionEnd || 0
    let text = editor.value.slice(Math.min(sel, end), Math.max(sel, end))
    if (wysiwygV2Active) {
      try {
        const wysSel = String(wysiwygV2GetSelectedText() || '')
        text = wysSel
      } catch {}
    }
    return {
      selectedText: text,
      cursorPosition: sel,
      mode: wysiwygV2Active ? 'wysiwyg' : mode,
      filePath: currentFilePath,
      targetElement: targetElement || null,
    }
  } catch {
    return {
      selectedText: '',
      cursorPosition: 0,
      mode: mode,
      filePath: currentFilePath,
      targetElement: targetElement || null,
    }
  }
}

function buildContextMenuContext(e: MouseEvent): ContextMenuContext {
  return buildContextMenuContextFromTarget((e.target as HTMLElement | null) || null)
}

function escapeAttrValue(input: string): string {
  try {
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  } catch {
    return ''
  }
}

// 初始化右键菜单监听
function initContextMenuListener() {
  try {
    // 移动端：双击呼出右键菜单（不劫持长按，避免和系统选字冲突）
    // 说明：这里的“右键菜单”是 flymd 的自定义菜单（移动端表现为底部动作面板）
    const installMobileDoubleTap = (
      getTargetElement: (ev: TouchEvent) => HTMLElement | null,
      shouldHandle: (target: HTMLElement | null) => boolean,
    ) => {
      let lastAt = 0
      let lastX = 0
      let lastY = 0
      const maxGapMs = 320
      const maxDistPx = 22

      const onTouchEnd = (ev: TouchEvent) => {
        try {
          const isMobileUi = document.body.classList.contains('platform-mobile')
          if (!isMobileUi) return
          if ((ev.touches && ev.touches.length) || (ev.changedTouches && ev.changedTouches.length !== 1)) return

          const t = ev.changedTouches[0]
          const x = t?.clientX ?? 0
          const y = t?.clientY ?? 0
          const now = Date.now()
          const targetEl = getTargetElement(ev)
          if (!shouldHandle(targetEl)) {
            lastAt = 0
            return
          }

          const dt = now - lastAt
          const dx = x - lastX
          const dy = y - lastY
          const distOk = (dx * dx + dy * dy) <= (maxDistPx * maxDistPx)

          if (lastAt > 0 && dt > 0 && dt <= maxGapMs && distOk) {
            lastAt = 0
            lastX = 0
            lastY = 0
            // 源码模式 textarea：别阻止默认行为（否则可能影响系统选字）
            if (targetEl !== editor) {
              try { ev.preventDefault() } catch {}
            }
            try { ev.stopPropagation() } catch {}

            // 让系统先完成选字/更新 selection，再读 selectedText
            setTimeout(() => {
              try {
                const ctx = buildContextMenuContextFromTarget(targetEl)
                void showContextMenu(x, y, ctx, {
                  pluginItems: pluginContextMenuItems,
                  buildBuiltinItems: buildBuiltinContextMenuItems,
                })
              } catch {}
            }, 0)
            return
          }

          lastAt = now
          lastX = x
          lastY = y
        } catch {}
      }

      document.addEventListener('touchend', onTouchEnd, { passive: false, capture: true })
    }

    // 仅在编辑/预览/所见区域内响应双击；点到顶栏/按钮等交互控件则不触发
    const shouldHandleDoubleTap = (target: HTMLElement | null) => {
      try {
        if (!target) return false
        // 源码模式：允许在编辑器 textarea 双击呼出（用于扩展右键菜单）
        if (target === editor) return true
        if (target.closest('.window-controls, .menu-item, button, a, input, textarea, [data-tauri-drag-ignore]')) return false
        const inPreview = !!target.closest?.('.preview')
        const inWysiwyg = !!target.closest?.('#md-wysiwyg-root')
        if (inPreview || inWysiwyg) return true
        return false
      } catch {
        return false
      }
    }

    // 预览/所见：双击呼出菜单（用于插件右键菜单、图片上传等）
    installMobileDoubleTap(
      (ev) => (ev.target as HTMLElement | null),
      shouldHandleDoubleTap,
    )

    // 监听编辑器的右键事件
    editor.addEventListener('contextmenu', (e) => {
      if (e.shiftKey) return
      // 移动端：长按通常用于系统文本选择，拦截会和选字冲突；仅“真实右键”(鼠标)才弹自定义菜单
      const isMobileUi = document.body.classList.contains('platform-mobile')
      if (isMobileUi && e.button !== 2) return
      try { e.preventDefault() } catch {}
      const ctx = buildContextMenuContext(e)
      void showContextMenu(e.clientX, e.clientY, ctx, {
        pluginItems: pluginContextMenuItems,
        buildBuiltinItems: buildBuiltinContextMenuItems,
      })
    })

    // 监听预览区域的右键事件
    const preview = document.querySelector('.preview') as HTMLElement
    if (preview) {
      preview.addEventListener('contextmenu', (e) => {
        if (e.shiftKey) return
        // 移动端：文本长按交给系统；若命中图片等非文本目标，才弹自定义菜单（用于“上传此图片”等）
        const isMobileUi = document.body.classList.contains('platform-mobile')
        if (isMobileUi && e.button !== 2) {
          const target = (e.target as HTMLElement | null)
          const img = target?.closest?.('img') as HTMLImageElement | null
          if (!img) return
        }
        try { e.preventDefault() } catch {}
        const ctx = buildContextMenuContext(e)
        void showContextMenu(e.clientX, e.clientY, ctx, {
          pluginItems: pluginContextMenuItems,
          buildBuiltinItems: buildBuiltinContextMenuItems,
        })
      })
    }

    document.addEventListener('contextmenu', (e) => {
      if (!wysiwygV2Active) return
      if (e.shiftKey) return
      const root = document.getElementById('md-wysiwyg-root') as HTMLElement | null
      if (!root || !root.contains(e.target as Node)) return
      const isMobileUi = document.body.classList.contains('platform-mobile')
      if (isMobileUi && (e as MouseEvent).button !== 2) {
        const target = (e.target as HTMLElement | null)
        const img = target?.closest?.('img') as HTMLImageElement | null
        if (!img) return
      }
      try { e.preventDefault() } catch {}
      const ctx = buildContextMenuContext(e)
      void showContextMenu(e.clientX, e.clientY, ctx, {
        pluginItems: pluginContextMenuItems,
        buildBuiltinItems: buildBuiltinContextMenuItems,
      })
    }, true)
  } catch (err) {
    console.error('初始化右键菜单监听失败:', err)
  }
}

// ============ 右键菜单系统结束 ============

// 获取扩展卡片在统一网格中的排序序号（越小越靠前）
function getPluginOrder(id: string, name?: string, bias = 0): number {
  try {
    const key = id || ''
    if (key && Object.prototype.hasOwnProperty.call(_extGlobalOrder, key)) {
      return _extGlobalOrder[key]
    }
    const base = 50_000 + bias
    const label = String(name || id || '').toLowerCase()
    if (!label) return base
    const ch = label.charCodeAt(0)
    return base + (Number.isFinite(ch) ? ch : 0)
  } catch {
    return 99_999
  }
}

// 文档阅读/编辑位置持久化（最小实现）
type DocPos = {
  pos: number
  end?: number
  scroll: number
  pscroll: number
  mode: Mode | 'wysiwyg'
  ts: number
}
let _docPosSaveTimer: number | null = null
async function getDocPosMap(): Promise<Record<string, DocPos>> {
  try {
    if (!store) return {}
    const m = await store.get('docPos')
    return (m && typeof m === 'object') ? (m as Record<string, DocPos>) : {}
  } catch { return {} }
}
async function saveCurrentDocPosNow() {
  try {
    if (!currentFilePath) return
    const map = await getDocPosMap()
    map[currentFilePath] = {
      pos: editor.selectionStart >>> 0,
      end: editor.selectionEnd >>> 0,
      scroll: editor.scrollTop >>> 0,
      pscroll: preview.scrollTop >>> 0,
      mode: (wysiwyg ? 'wysiwyg' : mode),
      ts: Date.now(),
    }
    if (store) {
      await store.set('docPos', map)
      await store.save()
    }
  } catch {}
}
function scheduleSaveDocPos() {
  try {
    if (_docPosSaveTimer != null) { clearTimeout(_docPosSaveTimer); _docPosSaveTimer = null }
    _docPosSaveTimer = window.setTimeout(() => { void saveCurrentDocPosNow() }, 400)
  } catch {}
}
async function restoreDocPosIfAny(path?: string) {
  try {
    const p = (path || currentFilePath || '') as string
    if (!p) return
    const map = await getDocPosMap()
    const s = map[p]
    if (!s) return
    // 恢复编辑器光标与滚动
    try {
      const st = Math.max(0, Math.min(editor.value.length, s.pos >>> 0))
      const ed = Math.max(0, Math.min(editor.value.length, (s.end ?? st) >>> 0))
      editor.selectionStart = st
      editor.selectionEnd = ed
      editor.scrollTop = Math.max(0, s.scroll >>> 0)
      refreshStatus()
    } catch {}
    // 恢复预览滚动（需在预览渲染后调用）
    try { preview.scrollTop = Math.max(0, s.pscroll >>> 0) } catch {}
  } catch {}
}

// 日志系统（已拆分到 core/logger.ts）
import { appendLog, logInfo, logWarn, logDebug } from './core/logger'

// 统一确认弹框：优先使用 Tauri 原生 ask；浏览器环境回退到 window.confirm
async function confirmNative(message: string, title = '确认') : Promise<boolean> {
  try {
    if (isTauriRuntime() && typeof ask === 'function') {
      try {
        const ok = await ask(message, { title })
        return !!ok
      } catch {}
    }
    // 浏览器环境或 ask 不可用时的降级
    try {
      if (typeof confirm === 'function') return !!confirm(message)
    } catch {}
    // 最安全的默认：不执行破坏性操作
    return false
  } catch {
    return false
  }
}

function showError(msg: string, err?: unknown) {
  void appendLog('ERROR', msg, err)
  // 确保 status 元素存在后才更新
  const statusEl = document.getElementById('status')
  if (statusEl) {
    statusEl.textContent = `错误: ${msg}`
  } else {
    console.error('错误:', msg, err)
  }
  ;(() => {
    try {
      const statusEl2 = document.getElementById('status')
      if (statusEl2) {
        let __text = `错误: ${msg}`
        try {
          const __detail = (err instanceof Error)
            ? err.message
            : (typeof err === 'string' ? err : (err ? JSON.stringify(err) : ''))
          if (__detail) __text += ` - ${__detail}`
        } catch {}
        statusEl2.textContent = __text
      }
    } catch {}
  })()
}

function guard<T extends (...args: any[]) => any>(fn: T) {
  return (...args: Parameters<T>) => {
    try {
      const r = fn(...args)
      if (r && typeof (r as any).then === 'function') {
        ;(r as Promise<any>).catch((e) => showError('处理事件失败', e))
      }
    } catch (e) {
      showError('处理事件异常', e)
    }
  }
}

// UI 结构搭建
const app = document.getElementById('app')!
app.innerHTML = `
  <div class="titlebar">
    <div class="menubar">
      <!-- 顶级菜单：文件 / 模式（参考 Windows 文本菜单） -->
      <div class="menu-item" id="btn-open" title="${t('menu.file')}">${t('menu.file')}</div>
      <div class="menu-item" id="btn-mode" title="${t('menu.mode')}">${t('menu.mode')}</div>
      <!-- 旧按钮保留但隐藏，避免破坏现有逻辑引用 -->
      <div class="menu-item" id="btn-new" style="display:none;" title="${t('file.new')} (Ctrl+N)">${t('file.new')}</div>
      <div class="menu-item" id="btn-save" style="display:none;" title="${t('file.save')} (Ctrl+S)">${t('file.save')}</div>
      <div class="menu-item" id="btn-saveas" style="display:none;" title="${t('file.saveas')} (Ctrl+Shift+S)">${t('file.saveas')}</div>
      <div class="menu-item" id="btn-toggle" style="display:none;" title="${t('mode.edit')}/${t('mode.read')} (Ctrl+E)">${t('mode.read')}</div>
      <div class="menu-item" id="btn-theme" title="${t('menu.theme.tooltip')}">${t('menu.theme')}</div>
      <div class="menu-item" id="btn-extensions" title="${t('menu.extensions')}">${t('menu.extensions')}</div>
    </div>
    <!-- 右侧工具栏（仅移动端显示） -->
    <div class="mobile-toolbar" id="mobile-toolbar">
      <button class="toolbar-btn" id="btn-mode-toggle" title="${t('mode.edit')}/${t('mode.read')}">源码</button>
      <button class="toolbar-btn" id="btn-undo" title="撤销">↶</button>
      <button class="toolbar-btn" id="btn-redo" title="重做">↷</button>
      <button class="toolbar-btn" id="btn-save-mobile" title="${t('file.save')}">💾</button>
      <button class="toolbar-btn" id="btn-find" title="查找">🔍</button>
    </div>
    <div class="filename" id="filename">${t('filename.untitled')}</div>
    <div class="menu-item" id="btn-mobile-menu" title="${t('menu.more')}">${t('menu.more')}</div>
    <div class="window-controls" id="window-controls">
      <button class="window-btn window-minimize" id="window-minimize" title="最小化">-</button>
      <button class="window-btn window-maximize" id="window-maximize" title="最大化">+</button>
      <button class="window-btn window-close" id="window-close" title="关闭">x</button>
    </div>
  </div>
  <div class="focus-trigger-zone" id="focus-trigger-zone"></div>
  <div class="container">
    <textarea id="editor" class="editor" spellcheck="false" placeholder="${t('editor.placeholder')}"></textarea>
    <div id="preview" class="preview hidden"></div>
    <div class="statusbar" id="status">${fmtStatus(1,1)}</div>
    <div class="notification-container" id="notification-container"></div>
    <div class="status-zoom" id="status-zoom"><span id="zoom-label">100%</span> <button id="zoom-reset" title="重置缩放">重置</button></div>
  </div>
`
try { logInfo('打点:DOM就绪') } catch {}

// 性能标记：DOM 就绪
performance.mark('flymd-dom-ready')

// 初始化平台适配（Android 支持）
const _platformIntegrationReady = initPlatformIntegration().catch((e) => {
  console.error('[Platform] Initialization failed:', e)
})
// 初始化平台类（用于 CSS 平台适配，Windows 显示窗口控制按钮）
try { initPlatformClass() } catch {}
// 移动端：根据 visualViewport 自动计算"键盘占用高度"，用于底部菜单避开输入法遮挡
try { installMobileKeyboardInsetCssVar() } catch {}
// 移动端：先把顶栏文字替换成图标；事件绑定在 bindEvents() 内完成，避免作用域/初始化顺序问题
try { if (isMobileUiFast()) initMobileIcons() } catch {}
// 应用已保存主题并挂载主题 UI
try { applySavedTheme() } catch {}
try { initThemeUI() } catch {}
// 将专注模式切换函数暴露到全局，供主题面板调用
;(window as any).flymdToggleFocusMode = async (enabled: boolean) => {
  try {
    await toggleFocusMode(enabled)
    try { updateFocusSidebarBg() } catch {}
  } catch {}
}
// 将紧凑标题栏切换函数暴露到全局，供主题面板调用
;(window as any).flymdSetCompactTitlebar = async (enabled: boolean) => {
  try {
    await setCompactTitlebar(enabled, store, true)
  } catch {}
}
// 初始化专注模式事件
try { initFocusModeEvents() } catch {}
// 初始化窗口拖拽（为 mac / Linux 上的紧凑标题栏补齐拖动支持）
try { initWindowDrag() } catch {}
// 初始化窗口边缘 resize（decorations: false 时提供窗口调整大小功能）
try { initWindowResize() } catch {}
// 恢复专注模式状态（需要等 store 初始化后执行，见下方 store 初始化处）

const editor = document.getElementById('editor') as HTMLTextAreaElement
const preview = document.getElementById('preview') as HTMLDivElement
const filenameLabel = document.getElementById('filename') as HTMLDivElement
// 窗口控制按钮（紧凑标题栏模式使用）
try {
  const minBtn = document.getElementById('window-minimize') as HTMLButtonElement | null
  const maxBtn = document.getElementById('window-maximize') as HTMLButtonElement | null
  const closeBtn = document.getElementById('window-close') as HTMLButtonElement | null
  if (minBtn) {
    minBtn.addEventListener('click', async () => {
      try { await getCurrentWindow().minimize() } catch {}
    })
  }
  if (maxBtn) {
    maxBtn.addEventListener('click', async () => {
      try {
        const win = getCurrentWindow()
        const isMax = await win.isMaximized()
        if (isMax) {
          await win.unmaximize()
          maxBtn.textContent = '+'
          maxBtn.title = '最大化'
        } else {
          await win.maximize()
          maxBtn.textContent = '+'
          maxBtn.title = '还原'
        }
      } catch {}
    })
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', async () => {
      try {
        const win = getCurrentWindow()
        await win.close()
      } catch {}
    })
  }
} catch {}
// 任务列表：扫描与回写（阅读模式）
let _taskMapLast: Array<{ line: number; ch: number }> = []
let _taskEventsBound = false

try {
  // 便签快速待办：编辑框失焦或按下回车后自动返回阅读模式（仅在从阅读模式触发的待办插入场景生效）
  editor.addEventListener('blur', () => {
    if (!stickyNoteMode || !stickyTodoAutoPreview) return
    void maybeAutoReturnStickyPreview()
  })
  editor.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!stickyNoteMode || !stickyTodoAutoPreview) return
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // 不干扰原有回车行为，只在事件后异步切回阅读模式
      setTimeout(() => { void maybeAutoReturnStickyPreview() }, 0)
    }
  })
} catch {}

function scanTaskList(md: string): Array<{ line: number; ch: number }> {
  try {
    const lines = String(md || '').split('\n')
    const out: Array<{ line: number; ch: number }> = []
    let fenceOpen = false
    let fenceCh = ''
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i]
      const mFence = s.match(/^ {0,3}(`{3,}|~{3,})/)
      if (mFence) {
        const ch = mFence[1][0]
        if (!fenceOpen) { fenceOpen = true; fenceCh = ch } else if (ch === fenceCh) { fenceOpen = false; fenceCh = '' }
      }
      if (fenceOpen) continue
      const m = s.match(/^(\s*)(?:[-+*]|\d+[.)])\s+\[( |x|X)\]\s+/)
      if (!m) continue
      const start = m[1].length
      const bpos = s.indexOf('[', start) + 1
      if (bpos <= 0) continue
      out.push({ line: i, ch: bpos })
    }
    return out
  } catch { return [] }
}

function onTaskCheckboxChange(ev: Event) {
  try {
    if (wysiwyg) return
    const el = ev.target as HTMLInputElement | null
    if (!el || el.type !== 'checkbox') return
    if (!(el.classList && el.classList.contains('task-list-item-checkbox'))) return
    const id = Number((el as any).dataset?.taskId ?? -1)
    if (!Number.isFinite(id) || id < 0) return
    const map = _taskMapLast || []
    const m = map[id]
    if (!m) return
    const content = String((editor as HTMLTextAreaElement).value || '')
    const lines = content.split('\n')
    const ln = lines[m.line] || ''
    const idx = m.ch >>> 0
    if (!(idx > 0 && idx < ln.length)) return
    const before = ln.slice(0, idx)
    const after = ln.slice(idx + 1)
    const nextCh = el.checked ? 'x' : ' '
    lines[m.line] = before + nextCh + after
    ;(editor as HTMLTextAreaElement).value = lines.join('\n')
    try { (window as any).dirty = true } catch {}
    try { refreshTitle(); refreshStatus() } catch {}
    // 立即更新删除线样式（无需等待 renderPreview）
    try {
      const listItem = el.closest('li.task-list-item') as HTMLElement | null
      if (listItem) {
        if (el.checked) {
          listItem.style.textDecoration = 'line-through'
          listItem.style.opacity = '0.65'
        } else {
          listItem.style.textDecoration = ''
          listItem.style.opacity = ''
        }
      }
    } catch {}
    try { renderPreview() } catch {}
    try { if (currentFilePath) { void saveFile() } else { void saveAs() } } catch {}
  } catch {}
}
const status = document.getElementById('status') as HTMLDivElement

// 所见模式：输入即渲染 + 覆盖式同窗显示
function syncScrollEditorToPreview() { /* overlay removed */ }

function scheduleWysiwygRender() {
  try {
    if (!wysiwyg || !wysiwygV2Active) return
    if (_wysiwygRaf) cancelAnimationFrame(_wysiwygRaf)
    _wysiwygRaf = requestAnimationFrame(() => {
      _wysiwygRaf = 0
      try {
        const value = String((editor as HTMLTextAreaElement).value || '')
        const { body } = splitYamlFrontMatter(value)
        void wysiwygV2ReplaceAll(body)
      } catch {}
    })
  } catch {}
}

// YAML Front Matter 解析：仅检测文首形如
// ---
// key: value
// ---
// 的块；否则一律视为普通 Markdown，避免误伤旧文档
function splitYamlFrontMatter(raw: string): { frontMatter: string | null; body: string } {
  try {
    if (!raw) return { frontMatter: null, body: '' }
    let text = String(raw)
    // 处理 UTF-8 BOM，保留给正文
    let bom = ''
    if (text.charCodeAt(0) === 0xfeff) {
      bom = '\uFEFF'
      text = text.slice(1)
    }
    const lines = text.split('\n')
    if (lines.length < 3) return { frontMatter: null, body: raw }
    if (lines[0].trim() !== '---') return { frontMatter: null, body: raw }
    let end = -1
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') { end = i; break }
    }
    if (end < 0) return { frontMatter: null, body: raw }
    // 至少有一行看起来像 "key: value" 才认为是 YAML
    let looksYaml = false
    for (let i = 1; i < end; i++) {
      const s = lines[i].trim()
      if (!s || s.startsWith('#')) continue
      if (/^[A-Za-z0-9_.-]+\s*:/.test(s)) { looksYaml = true; break }
    }
    if (!looksYaml) return { frontMatter: null, body: raw }
    const fmLines = lines.slice(0, end + 1)
    const bodyLines = lines.slice(end + 1)
    let fmText = fmLines.join('\n')
    let bodyText = bodyLines.join('\n')
    // 常见写法：头部后空一行，渲染时剥掉这行
    bodyText = bodyText.replace(/^\r?\n/, '')
    if (bom) bodyText = bom + bodyText
    if (!fmText.endsWith('\n')) fmText += '\n'
    return { frontMatter: fmText, body: bodyText }
  } catch {
    return { frontMatter: null, body: raw }
  }
}

// 阅读模式元数据：预览顶部的 Front Matter 简要视图与开关
let previewMetaVisible = true
try {
  const v = localStorage.getItem('flymd:preview:showMeta')
  if (v === '0' || (v && v.toLowerCase() === 'false')) previewMetaVisible = false
} catch {}

function setPreviewMetaVisible(v: boolean) {
  previewMetaVisible = v
  try { localStorage.setItem('flymd:preview:showMeta', v ? '1' : '0') } catch {}
}

function parseFrontMatterMeta(fm: string | null): any | null {
  if (!fm) return null
  try {
    let s = String(fm)
    s = s.replace(/^\uFEFF?---\s*\r?\n?/, '')
    s = s.replace(/\r?\n---\s*$/, '')
    const doc = yamlLoad(s)
    if (!doc || typeof doc !== 'object') return null
    return doc
  } catch {
    return null
  }
}
// 暴露到全局，供所见模式在粘贴 URL 时复用同一套抓取标题逻辑
try { (window as any).flymdFetchPageTitle = fetchPageTitle } catch {}

function injectPreviewMeta(container: HTMLDivElement, meta: any | null) {
  if (!meta || typeof meta !== 'object') return
  const m: any = meta

  const title = (typeof m.title === 'string' && m.title.trim())
    || (currentFilePath ? (currentFilePath.split(/[\\/]+/).pop() || '') : '')
  const cats = Array.isArray(m.categories)
    ? m.categories.map((x: any) => String(x || '').trim()).filter(Boolean)
    : (m.category ? [String(m.category || '').trim()] : [])
  const tags = Array.isArray(m.tags)
    ? m.tags.map((x: any) => String(x || '').trim()).filter(Boolean)
    : []
  const status = typeof m.status === 'string' ? m.status : (m.draft === true ? 'draft' : '')
  const slug = (m.slug || m.typechoSlug) ? String(m.slug || m.typechoSlug || '') : ''
  const id = (m.typechoId || m.id || m.cid) ? String(m.typechoId || m.id || m.cid || '') : ''
  const dateRaw = m.date || m.dateCreated || m.created || m.typechoUpdatedAt || ''
  const source = typeof m.source === 'string' ? m.source : ''

  const metaRoot = document.createElement('div')
  metaRoot.className = 'preview-meta'
  if (!previewMetaVisible) metaRoot.classList.add('collapsed')

  const header = document.createElement('div')
  header.className = 'preview-meta-header'

  const titleEl = document.createElement('div')
  titleEl.className = 'preview-meta-title'
  if (title) titleEl.textContent = title

  const toggleBtn = document.createElement('button')
  toggleBtn.type = 'button'
  toggleBtn.className = 'preview-meta-toggle'
  const syncToggleText = () => {
    toggleBtn.textContent = previewMetaVisible ? '隐藏元数据' : '显示元数据'
  }
  syncToggleText()
  toggleBtn.addEventListener('click', () => {
    const now = !previewMetaVisible
    setPreviewMetaVisible(now)
    if (now) metaRoot.classList.remove('collapsed')
    else metaRoot.classList.add('collapsed')
    syncToggleText()
  })

  header.appendChild(titleEl)
  header.appendChild(toggleBtn)
  metaRoot.appendChild(header)

  const body = document.createElement('div')
  body.className = 'preview-meta-body'

  const addRow = (label: string, value: string | string[]) => {
    if (Array.isArray(value)) {
      if (!value.length) return
    } else {
      if (!value || !String(value).trim()) return
    }
    const row = document.createElement('div')
    row.className = 'preview-meta-row'
    const lab = document.createElement('span')
    lab.className = 'preview-meta-label'
    lab.textContent = label
    row.appendChild(lab)
    const val = document.createElement('span')
    val.className = 'preview-meta-value'
    if (Array.isArray(value)) {
      for (const it of value) {
        const chipText = String(it || '').trim()
        if (!chipText) continue
        const chip = document.createElement('span')
        chip.className = 'preview-meta-chip'
        chip.textContent = chipText
        val.appendChild(chip)
      }
    } else {
      val.textContent = String(value)
    }
    row.appendChild(val)
    body.appendChild(row)
  }

  if (cats.length) addRow('分类', cats)
  if (tags.length) addRow('标签', tags)
  if (status) addRow('状态', status)
  if (slug) addRow('Slug', slug)
  if (id) addRow('ID', id)
  if (dateRaw) addRow('时间', String(dateRaw))
  if (source) addRow('来源', source)

  if (body.children.length > 0) {
    metaRoot.appendChild(body)
  }

  container.insertBefore(metaRoot, container.firstChild)
}

// 轻渲染：仅生成安全的 HTML，不执行 Mermaid/代码高亮等重块
async function renderPreviewLight() {
  await ensureRenderer()
  let raw = editor.value
  try {
    if (wysiwyg && mode !== 'preview') {
      const st = editor.selectionStart >>> 0
      const before = raw.slice(0, st)
      const after = raw.slice(st)
      const lineStart = before.lastIndexOf('\n') + 1
      const curLine = before.slice(lineStart)
      const fenceRE = /^ {0,3}(```+|~~~+)/
      const preText = raw.slice(0, lineStart)
      const preLines = preText.split('\n')
      let insideFence = false
      let fenceCh = ''
      for (const ln of preLines) {
        const m = ln.match(fenceRE)
        if (m) {
          const ch = m[1][0]
          if (!insideFence) { insideFence = true; fenceCh = ch }
          else if (ch === fenceCh) { insideFence = false; fenceCh = '' }
        }
      }
      const isFenceLine = fenceRE.test(curLine)
      let injectAt = st
      if (st === lineStart) {
        const mBQ = curLine.match(/^ {0,3}> ?/)
        const mH = curLine.match(/^ {0,3}#{1,6} +/)
        const mUL = curLine.match(/^ {0,3}[-*+] +/)
        const mOL = curLine.match(/^ {0,3}\d+\. +/)
        const prefixLen = (mBQ?.[0]?.length || mH?.[0]?.length || mUL?.[0]?.length || mOL?.[0]?.length || 0)
        if (prefixLen > 0) injectAt = lineStart + prefixLen
      }
      if (isFenceLine) {
        const m = curLine.match(fenceRE)
        if (m) {
          const ch = m[1][0]
          if (!insideFence) { injectAt = lineStart + m[0].length }
          else if (ch === fenceCh) { injectAt = -1 }
        }
      }
      if (injectAt >= 0) {
        const dotStr = insideFence && !isFenceLine ? '_' : '<span class="caret-dot">_</span>'
        raw = raw.slice(0, injectAt) + dotStr + raw.slice(injectAt)
      }
      try {
        const lines = raw.split('\n')
        // 对未闭合 fenced 与单 $ 进行最小阻断，避免即时渲染抖动
        let openFenceIdx = -1
        let openFenceChar = ''
        for (let i = 0; i < lines.length; i++) {
          const m = lines[i].match(/^ {0,3}(`{3,}|~{3,})/)
          if (m) {
            const ch = m[1][0]
            if (openFenceIdx < 0) { openFenceIdx = i; openFenceChar = ch }
            else if (ch === openFenceChar) { openFenceIdx = -1; openFenceChar = '' }
          }
        }
        if (openFenceIdx >= 0) {
          lines[openFenceIdx] = lines[openFenceIdx].replace(/^(\s*)(`{3,}|~{3,})/, (_all, s: string, fence: string) => s + fence[0] + '\u200B' + fence.slice(1))
        }
        const curIdx = (() => { try { return before.split('\n').length - 1 } catch { return -1 } })()
        if (curIdx >= 0 && curIdx < lines.length) {
          const line = lines[curIdx]
          const singlePos: number[] = []
          for (let i = 0; i < line.length; i++) {
            if (line[i] !== '$') continue
            if (i + 1 < line.length && line[i + 1] === '$') { i++; continue }
            let bs = 0
            for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) bs++
            if ((bs & 1) === 1) continue
            singlePos.push(i)
          }
          if ((singlePos.length & 1) === 1) {
            const idx = singlePos[singlePos.length - 1]
            lines[curIdx] = line.slice(0, idx + 1) + '\u200B' + line.slice(idx + 1)
          }
        }
        raw = lines.join('\n')
      } catch {}
    }
  } catch {}
  // 轻渲染预览：只渲染正文部分，忽略 YAML Front Matter
  try {
    const { body } = splitYamlFrontMatter(raw)
    raw = body
  } catch {}
  // Excel 公式里的 `$` 不是行内数学分隔符：先转义，避免 KaTeX 把整行当数学渲染
  raw = protectExcelDollarRefs(raw)
  const html = md!.render(raw)
  // 方案 A：占位符机制不需要 DOMPurify
  // KaTeX 占位符（data-math 属性）是安全的，后续会用 KaTeX.render() 替换
  const safe = html
  // 渲染 .md-math-* 占位符为 KaTeX
  try {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = safe
    try {
      const mathNodes = Array.from(tempDiv.querySelectorAll('.md-math-inline, .md-math-block')) as HTMLElement[]
      if (mathNodes.length > 0) {
        // 使用所见模式的导入方式
        const katex = await import('katex')

        if (!katexCssLoaded) {
          await import('katex/dist/katex.min.css')
          katexCssLoaded = true

          // 手动注入关键 CSS 规则（同阅读模式）
          const criticalStyle = document.createElement('style')
          criticalStyle.textContent = `
            /* KaTeX critical styles for production build */
            .katex { font-size: 1em; text-indent: 0; text-rendering: auto; }
            .katex svg { display: inline-block; position: relative; width: 100%; height: 100%; }
            .katex svg path { fill: currentColor; }
            .katex .hide-tail { overflow: hidden; }
            .md-math-inline .katex { display: inline-block; }
            .md-math-block .katex { display: block; text-align: center; }
          `
          document.head.appendChild(criticalStyle)
        }

        // 渲染每个数学节点
        for (const el of mathNodes) {
          try {
            const value = el.getAttribute('data-math') || ''
            const displayMode = el.classList.contains('md-math-block')

            // 清空元素
            el.innerHTML = ''

            // 使用 katex.default.render()（与所见模式相同）
            katex.default.render(value, el, {
              throwOnError: false,
              displayMode: displayMode,
            })
          } catch (e) {
            console.error('[KaTeX 导出] 渲染单个公式失败:', e)
            el.textContent = el.getAttribute('data-math') || ''
          }
        }
      }
    } catch (mainErr) {
      console.error('[KaTeX 导出] 主流程崩溃:', mainErr)
    }
    try { preview.innerHTML = `<div class="preview-body">${tempDiv.innerHTML}</div>` } catch {}
  } catch {
    // 回退：如果 KaTeX 渲染失败，使用原始 HTML
    try { preview.innerHTML = `<div class="preview-body">${safe}</div>` } catch {}
  }
  // 轻渲染后也生成锚点，提升滚动同步体验
  // 旧所见模式移除：不再重建锚点表
}

// 供所见 V2 调用：将粘贴/拖拽的图片保存到本地，并返回可写入 Markdown 的路径（自动生成不重复文件名）
async function saveImageToLocalAndGetPath(file: File, fname: string): Promise<string | null> {
  return await saveImageToLocalAndGetPathCore(
    {
      getEditorValue: () => editor.value,
      setEditorValue: (v: string) => { editor.value = v },
      insertAtCursor: (text: string) => insertAtCursor(text),
      markDirtyAndRefresh: () => {
        dirty = true
        refreshTitle()
        refreshStatus()
      },
      getCurrentFilePath: () => currentFilePath,
      ensureDir: async (dir: string) => { try { await ensureDir(dir) } catch {} },
      writeBinaryFile: async (path: string, bytes: Uint8Array) => { await writeFile(path as any, bytes as any) },
      exists: async (p: string) => !!(await exists(p as any)),
      isTauriRuntime: () => isTauriRuntime(),
      getAlwaysSaveLocalImages: () => getAlwaysSaveLocalImages(),
      getUploaderConfig: () => getUploaderConfig(),
      getTranscodePrefs: () => getTranscodePrefs(),
      getDefaultPasteDir: () => getDefaultPasteDir(),
      getUserPicturesDir: () => getUserPicturesDir(),
    },
    file,
    fname,
  )
}

async function setWysiwygEnabled(enable: boolean) {
  try {
    if (wysiwyg === enable) return
    saveScrollPosition()  // 保存当前滚动位置到全局缓存
    wysiwyg = enable
    const container = document.querySelector('.container') as HTMLDivElement | null
    // 旧所见模式已移除：不要再添加 .wysiwyg，否则容器会被隐藏
    if (container) container.classList.remove('wysiwyg')
    // 先进入 loading 状态：不隐藏编辑器，避免空白期
    if (container && wysiwyg) { mode = 'edit'; container.classList.add('wysiwyg-v2'); container.classList.add('wysiwyg-v2-loading') }
    if (container && !wysiwyg) { container.classList.remove('wysiwyg-v2-loading'); container.classList.remove('wysiwyg-v2') }
  if (wysiwyg) {
      // 优先启用 V2：真实所见编辑视图
      try {
        console.log('[WYSIWYG] Enabling V2, editor.value length:', (editor.value || '').length)
        let root = document.getElementById('md-wysiwyg-root') as HTMLDivElement | null
        if (!root) {
          root = document.createElement('div')
          root.id = 'md-wysiwyg-root'
          const host = document.querySelector('.container') as HTMLDivElement | null
          if (host) host.appendChild(root)
        }
        // 确保 .scrollView 滚动容器存在（所见模式的实际滚动宿主）
        let scrollView = root.querySelector('.scrollView') as HTMLDivElement | null
        if (!scrollView) {
          scrollView = document.createElement('div')
          scrollView.className = 'scrollView'
          // 清空 root 并添加 scrollView
          root.innerHTML = ''
          root.appendChild(scrollView)
        }
        // 给 scrollView 一个占位提示，避免用户误以为空白
        try { if (scrollView) scrollView.textContent = '正在加载所见编辑器…' } catch {}
        // 调用 enableWysiwygV2 来创建/更新编辑器（会自动处理清理和重建）
        const __st = (editor as HTMLTextAreaElement).selectionStart >>> 0
        let __mdInit = (editor as HTMLTextAreaElement).value
        // 保留原有换行补两个空格的逻辑（行首/行尾软换行处理）
        try {
          if (__st > 0 && __mdInit[__st - 1] === '\n' && (__st < 2 || __mdInit[__st - 2] !== '\n')) {
            const before = __mdInit.slice(0, __st - 1)
            const after = __mdInit.slice(__st - 1)
            if (!/  $/.test(before)) { __mdInit = before + '  ' + after }
          }
        } catch {}
        // 剥离 YAML Front Matter：所见模式只编辑正文，但保存时拼回头部，保证文件内容零破坏
        const fmSplit = splitYamlFrontMatter(__mdInit)
        currentFrontMatter = fmSplit.frontMatter
        const __mdInitBody = fmSplit.body
        await enableWysiwygV2(scrollView!, __mdInitBody, (mdNext) => {
          try {
            const bodyNext = String(mdNext || '').replace(/\u2003/g, '&emsp;')
            const fm = currentFrontMatter || ''
            const combined = fm ? fm + bodyNext : bodyNext
            if (combined !== editor.value) {
              editor.value = combined
              dirty = true
              refreshTitle()
              refreshStatus()
              // 通用“内容变更钩子”：供插件在所见模式内容落盘后执行额外逻辑
              try {
                const hook = (window as any).flymdPiclistAutoUpload
                if (typeof hook === 'function') hook()
              } catch {}
            }
          } catch {}
        })
        wysiwygV2Active = true
        if (container) { container.classList.remove('wysiwyg-v2-loading'); container.classList.add('wysiwyg-v2'); }
        // 所见模式启用后应用当前缩放
        try { applyUiZoom() } catch {}
        // 更新外圈UI颜色（标题栏、侧栏等）跟随所见模式背景
        try { updateChromeColorsForMode('wysiwyg') } catch {}
        try { if (root) (root as HTMLElement).style.display = 'block' } catch {}
        try { preview.classList.add('hidden') } catch {}
        // 根据“库是否固定”应用布局：WYSIWYG V2 在固定库时仍占满全宽
        try { applyLibraryLayout() } catch {}
        // 移除旧滚轮处理器
        try { if (_wheelHandlerRef) { container?.removeEventListener('wheel', _wheelHandlerRef as any); _wheelHandlerRef = null } } catch {}
        // 取消右下角提示信息，避免遮挡与视觉噪声
        // 确保富文本视图获得焦点
        setTimeout(() => {
          try {
            const pm = root!.querySelector('.ProseMirror') as HTMLElement | null
            pm?.focus()
          } catch {}
        }, 0)
        // 若大纲面板当前可见，切换到所见模式后立即刷新大纲，并绑定观察/滚动
        try {
          const outline = document.getElementById('lib-outline') as HTMLDivElement | null
          if (outline && !outline.classList.contains('hidden')) {
            _outlineLastSignature = ''
            renderOutlinePanel()
            ensureOutlineObserverBound()
            bindOutlineScrollSync()
          }
        } catch {}
        restoreScrollPosition(3, 100)  // 带重试机制恢复滚动位置
        // 重新扫描滚动容器（确保 WYSIWYG 的 .scrollView 滚动监听器生效）
        try { rescanScrollContainers() } catch {}
        return
      } catch (e) {
        console.error('启用所见V2失败，将回退到旧模式', e)
        wysiwygV2Active = false
        // 若 V2 启动失败，需确保 loading 态与 v2 类被清理，避免根容器保持隐藏导致“空白/不可编辑”
        try {
          const container2 = document.querySelector('.container') as HTMLDivElement | null
          container2?.classList.remove('wysiwyg-v2-loading')
          container2?.classList.remove('wysiwyg-v2')
        } catch {}
      }
      // 进入所见模式时，清理一次延迟标记，避免历史状态影响
      wysiwygHoldInlineDollarUntilEnter = false
      wysiwygHoldFenceUntilEnter = false
      // 使用点状光标替代系统竖线光标
      try { if (container) container.classList.add('no-caret') } catch {}
      try { preview.classList.remove('hidden') } catch {}
      try { if (wysiwygStatusEl) wysiwygStatusEl.classList.add('show') } catch {}
      await renderPreview()
      try { updateWysiwygVirtualPadding() } catch {}
      syncScrollEditorToPreview()
      updateWysiwygLineHighlight(); updateWysiwygCaretDot(); startDotBlink()
    } else {
      if (wysiwygV2Active) {
        try { await disableWysiwygV2() } catch {}
        wysiwygV2Active = false
        if (container) container.classList.remove('wysiwyg-v2')
        // 右下角提示已取消，无需移除
      }
      try { applyLibraryLayout() } catch {}
      // 更新外圈UI颜色（标题栏、侧栏等）跟随当前模式背景
      try { updateChromeColorsForMode(mode === 'preview' ? 'preview' : 'edit') } catch {}
      if (mode !== 'preview') { try { preview.classList.add('hidden') } catch {} } else { try { preview.classList.remove('hidden') } catch {} }
      try { if (container) container.classList.remove('no-caret') } catch {}
      try { if (wysiwygStatusEl) wysiwygStatusEl.classList.remove('show') } catch {}
      // 退出所见后确保编辑器可编辑并聚焦
      try { (editor as HTMLTextAreaElement).disabled = false; (editor as HTMLTextAreaElement).style.pointerEvents = 'auto'; (editor as HTMLTextAreaElement).focus() } catch {}
      if (wysiwygLineEl) wysiwygLineEl.classList.remove('show')
      if (wysiwygCaretEl) wysiwygCaretEl.classList.remove('show')
      // 退出所见模式时清理延迟标记
      wysiwygHoldInlineDollarUntilEnter = false
      wysiwygHoldFenceUntilEnter = false
      stopDotBlink()
      // 若大纲面板当前可见，退出所见模式后也立即刷新大纲并绑定预览滚动同步
      try {
        const outline = document.getElementById('lib-outline') as HTMLDivElement | null
        if (outline && !outline.classList.contains('hidden')) {
          _outlineLastSignature = ''
          // 预览渲染可能稍后完成，延迟一次以确保提取到标题
          setTimeout(() => { try { renderOutlinePanel(); bindOutlineScrollSync() } catch {} }, 0)
        }
      } catch {}
      try { (editor as any).style.paddingBottom = '40px' } catch {}
      restoreScrollPosition(2, 50)  // 带重试机制恢复滚动位置
    }
    // 更新按钮提示（统一为简单说明，移除无用快捷键提示）
    try {
      const b = document.getElementById('btn-wysiwyg') as HTMLDivElement | null
      if (b) b.title = (wysiwyg ? '\u9000\u51fa' : '\u5f00\u542f') + '\u6240\u89c1\u6a21\u5f0f (Ctrl+W)'
    } catch {}
    // 触发模式变更事件（专注模式侧栏背景跟随）
    try { window.dispatchEvent(new CustomEvent('flymd:mode:changed', { detail: { wysiwyg } })) } catch {}
  } catch {}
}

async function toggleWysiwyg() {
  await setWysiwygEnabled(!wysiwyg)
  try { notifyModeChange() } catch {}
}

function updateWysiwygLineHighlight() {
  try {
    if (!wysiwyg || !wysiwygLineEl) return
    const st = editor.selectionStart >>> 0
    const before = editor.value.slice(0, st)
    const lineIdx = before.split('\n').length - 1
    _wysiwygCaretLineIndex = lineIdx
    const style = window.getComputedStyle(editor)
    let lh = parseFloat(style.lineHeight || '')
    if (!lh || Number.isNaN(lh)) {
      const fs = parseFloat(style.fontSize || '16') || 16
      lh = fs * 1.6
    }
    const padTop = parseFloat(style.paddingTop || '0') || 0
    const top = Math.max(0, Math.round(padTop + lineIdx * lh - editor.scrollTop))
    wysiwygLineEl.style.top = `${top}px`
    wysiwygLineEl.style.height = `${lh}px`
    // 不再显示高亮行，只更新位置（如需恢复，改为添加 show 类）
  } catch {}
}

function measureCharWidth(): number {
  try {
    const style = window.getComputedStyle(editor)
    const font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} / ${style.lineHeight} ${style.fontFamily}`
    if (_caretCharWidth > 0 && _caretFontKey === font) return _caretCharWidth
    const canvas = (measureCharWidth as any)._c || document.createElement('canvas')
    ;(measureCharWidth as any)._c = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return _caretCharWidth || 8
    ctx.font = font
    // 使用 '0' 作为等宽参考字符
    const w = ctx.measureText('0').width
    if (w && w > 0) { _caretCharWidth = w; _caretFontKey = font }
    return _caretCharWidth || 8
  } catch { return _caretCharWidth || 8 }
}

// ����ģʽ������Ҫ�����滬���ƶ���꣬�������ƶ����еļ�����λ���ĳߴ硣
function advanceVisualColumn(column: number, code: number): number {
  if (code === 13 /* \r */) return column
  if (code === 9 /* \t */) {
    const modulo = column % 4
    const step = modulo === 0 ? 4 : 4 - modulo
    return column + step
  }
  return column + 1
}

function calcVisualColumn(segment: string): number {
  let col = 0
  for (let i = 0; i < segment.length; i++) {
    col = advanceVisualColumn(col, segment.charCodeAt(i))
  }
  return col
}

function offsetForVisualColumn(line: string, column: number): number {
  if (!Number.isFinite(column) || column <= 0) return 0
  let col = 0
  for (let i = 0; i < line.length; i++) {
    const code = line.charCodeAt(i)
    const next = advanceVisualColumn(col, code)
    if (next >= column) return i + 1
    col = next
  }
  return line.length
}

function moveWysiwygCaretByLines(deltaLines: number, preferredColumn?: number): number {
  try {
    if (!wysiwyg) return 0
    if (!Number.isFinite(deltaLines) || deltaLines === 0) return 0
    if (editor.selectionStart !== editor.selectionEnd) return 0
    const value = editor.value
    if (!value) return 0
    const len = value.length
    let pos = editor.selectionStart >>> 0
    let lineStart = pos
    while (lineStart > 0 && value.charCodeAt(lineStart - 1) !== 10) lineStart--
    const currentSegment = value.slice(lineStart, pos)
    let column = Number.isFinite(preferredColumn) ? Number(preferredColumn) : calcVisualColumn(currentSegment)
    if (!Number.isFinite(column) || column < 0) column = 0
    const steps = deltaLines > 0 ? Math.floor(deltaLines) : Math.ceil(deltaLines)
    if (steps === 0) return 0
    let moved = 0
    if (steps > 0) {
      let remaining = steps
      while (remaining > 0) {
        const nextNl = value.indexOf('\n', lineStart)
        if (nextNl < 0) { lineStart = len; break }
        lineStart = nextNl + 1
        moved++
        remaining--
      }
    } else {
      let remaining = steps
      while (remaining < 0) {
        if (lineStart <= 0) { lineStart = 0; break }
        const prevNl = value.lastIndexOf('\n', Math.max(0, lineStart - 2))
        lineStart = prevNl >= 0 ? prevNl + 1 : 0
        moved--
        remaining++
      }
    }
    if (moved === 0) return 0
    let lineEnd = value.indexOf('\n', lineStart)
    if (lineEnd < 0) lineEnd = len
    const targetLine = value.slice(lineStart, lineEnd)
    const offset = offsetForVisualColumn(targetLine, column)
    const newPos = lineStart + offset
    editor.selectionStart = editor.selectionEnd = newPos
    return moved
  } catch { return 0 }
}

function updateWysiwygCaretDot() {
  try {
    if (!wysiwyg || !wysiwygCaretEl) return
    // 方案A：使用原生系统光标，禁用自定义覆盖光标
    try { wysiwygCaretEl.classList.remove('show') } catch {}
    const st = editor.selectionStart >>> 0
    const before = editor.value.slice(0, st)
    const style = window.getComputedStyle(editor)
    // 行高
    let lh = parseFloat(style.lineHeight || '')
    if (!lh || Number.isNaN(lh)) { const fs = parseFloat(style.fontSize || '16') || 16; lh = fs * 1.6 }
    const padTop = parseFloat(style.paddingTop || '0') || 0
    const padLeft = parseFloat(style.paddingLeft || '0') || 0
    // 计算当前行与列
    const lastNl = before.lastIndexOf('\n')
    const colStr = lastNl >= 0 ? before.slice(lastNl + 1) : before
    const lineIdx = before.split('\n').length - 1
    // 制表符按 4 个空格估算
    const tab4 = (s: string) => s.replace(/\t/g, '    ')
    const colLen = tab4(colStr).length
    _wysiwygCaretVisualColumn = colLen
    const ch = measureCharWidth()
    const top = Math.max(0, Math.round(padTop + lineIdx * lh - editor.scrollTop))
    const left = Math.max(0, Math.round(padLeft + colLen * ch - editor.scrollLeft))
    // 将光标放在当前行底部，并略微向下微调
    const caretH = (() => { try { return parseFloat(window.getComputedStyle(wysiwygCaretEl).height || '2') || 2 } catch { return 2 } })()
    const baseNudge = 1 // 像素级微调，使光标更贴近底部
    wysiwygCaretEl.style.top = `${Math.max(0, Math.round(top + lh - caretH + baseNudge))}px`
    wysiwygCaretEl.style.left = `${left}px`
    wysiwygCaretEl.classList.add('show')
  } catch {}
}

function updateWysiwygVirtualPadding() {
  try {
    const base = 40 // 与 CSS 中 editor 底部 padding 对齐
    if (!wysiwyg) { try { (editor as any).style.paddingBottom = base + "px" } catch {} ; return }
    const er = Math.max(0, editor.scrollHeight - editor.clientHeight)
    const pr = Math.max(0, preview.scrollHeight - preview.clientHeight)
    const need = Math.max(0, pr - er)
    const pb = Math.min(100000, Math.round(base + need))
    try { (editor as any).style.paddingBottom = pb + "px" } catch {}
  } catch {}
}


// 所见模式：输入 ``` 后自动补一个换行，避免预览代码块遮挡模拟光标
// WYSIWYG 
// 在所见模式下，确保预览中的“模拟光标 _”可见
function ensureWysiwygCaretDotInView() {
  try {
    if (!wysiwyg) return
    const dot = preview.querySelector('.caret-dot') as HTMLElement | null
    if (!dot) return
    const pv = preview.getBoundingClientRect()
    const dr = dot.getBoundingClientRect()
    const margin = 10
    if (dr.top < pv.top + margin) {
      preview.scrollTop += dr.top - (pv.top + margin)
    } else if (dr.bottom > pv.bottom - margin) {
      preview.scrollTop += dr.bottom - (pv.bottom - margin)
    }
  } catch {}
}

function autoNewlineAfterBackticksInWysiwyg() {
  try {
    if (!wysiwyg) return
    const pos = editor.selectionStart >>> 0
    if (pos < 3) return
    const last3 = editor.value.slice(pos - 3, pos)
    if (last3 === '```' || last3 === '~~~') {
      const v = editor.value
      // 判断是否为“闭合围栏”：需要位于行首（至多 3 个空格）并且之前处于围栏内部，且围栏字符一致
      const before = v.slice(0, pos)
      const lineStart = before.lastIndexOf('\n') + 1
      const curLine = before.slice(lineStart)
      const fenceRE = /^ {0,3}(```+|~~~+)/
      const preText = v.slice(0, lineStart)
      const preLines = preText.split('\n')
      let insideFence = false
      let fenceCh = ''
      for (const ln of preLines) {
        const m = ln.match(fenceRE)
        if (m) {
          const ch = m[1][0]
          if (!insideFence) { insideFence = true; fenceCh = ch }
          else if (ch === fenceCh) { insideFence = false; fenceCh = '' }
        }
      }
      const m2 = curLine.match(fenceRE)
      const isClosing = !!(m2 && insideFence && m2[1][0] === last3[0])

      // 在光标处插入换行，但将光标保持在换行前，便于继续输入语言标识（如 ```js\n）
      editor.value = v.slice(0, pos) + '\n' + v.slice(pos)
      editor.selectionStart = editor.selectionEnd = pos
      dirty = true
      refreshTitle()

      // 若检测到闭合，则开启“需回车再渲染”的围栏延迟
      if (isClosing) {
        wysiwygHoldFenceUntilEnter = true
      }
    }
  } catch {}
}

// 所见模式：行内数学 $...$ 闭合后，自动在光标处后插入至少 2 个换行，避免新内容与公式渲染重叠
function autoNewlineAfterInlineDollarInWysiwyg() {
  try {
    if (!wysiwyg) return
    const pos = editor.selectionStart >>> 0
    if (pos < 1) return
    const v = editor.value
    // 仅在最新输入字符为 $ 时判定
    if (v[pos - 1] !== '$') return
    // 若是 $$（块级），不处理
    if (pos >= 2 && v[pos - 2] === '$') return

    // 判断是否在代码围栏内，是则不处理
    const before = v.slice(0, pos)
    const lineStart = before.lastIndexOf('\n') + 1
    const fenceRE = /^ {0,3}(```+|~~~+)/
    const preText = v.slice(0, lineStart)
    const preLines = preText.split('\n')
    let insideFence = false
    let fenceCh = ''
    for (const ln of preLines) {
      const m = ln.match(fenceRE)
      if (m) {
        const ch = m[1][0]
        if (!insideFence) { insideFence = true; fenceCh = ch }
        else if (ch === fenceCh) { insideFence = false; fenceCh = '' }
      }
    }
    if (insideFence) return

    // 当前整行（用于检测行内 $ 奇偶）
    const lineEnd = (() => { const i = v.indexOf('\n', lineStart); return i < 0 ? v.length : i })()
    const line = v.slice(lineStart, lineEnd)
    const upto = v.slice(lineStart, pos) // 行首到光标（含刚输入的 $）

    // 统计“未被转义、且不是 $$ 的单个 $”数量
    let singles = 0
    let lastIdx = -1
    for (let i = 0; i < upto.length; i++) {
      if (upto[i] !== '$') continue
      // 跳过 $$（块级）
      if (i + 1 < upto.length && upto[i + 1] === '$') { i++; continue }
      // 跳过转义 \$（奇数个反斜杠）
      let bs = 0
      for (let j = i - 1; j >= 0 && upto[j] === '\\'; j--) bs++
      if ((bs & 1) === 1) continue
      singles++
      lastIdx = i
    }

    // 若刚好闭合（奇->偶）且最后一个单 $ 就是刚输入的这个
    if (singles % 2 === 0 && lastIdx === upto.length - 1) {
      // 行内数学已闭合：延迟渲染，待用户按下回车键后再渲染
      wysiwygHoldInlineDollarUntilEnter = true
      // 仅在当前位置之后补足至少 2 个换行
      let have = 0
      for (let i = pos; i < v.length && i < pos + 3; i++) { if (v[i] === '\n') have++; else break }
      const need = Math.max(0, 3 - have)
      if (need > 0) {
        const ins = '\n'.repeat(need)
        editor.value = v.slice(0, pos) + ins + v.slice(pos)
        const newPos = pos + ins.length
        editor.selectionStart = editor.selectionEnd = newPos
        dirty = true
        refreshTitle()
        refreshStatus()
      }
    }
  } catch {}
}

// 动态添加菜单栏补充项（库 / 关于 / 语言等）
const menubar = document.querySelector('.menubar') as HTMLDivElement
if (menubar) {
  // 顶级“文件”按钮文案统一走 i18n
  const btnOpen0 = document.getElementById('btn-open') as HTMLDivElement | null
  if (btnOpen0) { btnOpen0.textContent = t('menu.file'); btnOpen0.title = t('menu.file') }

  // 扩展按钮（如未在首屏模板中渲染，则此处补充）
  try {
    const exists = document.getElementById('btn-extensions') as HTMLDivElement | null
    if (!exists) {
      const extBtn = document.createElement('div')
      extBtn.id = 'btn-extensions'
      extBtn.className = 'menu-item'
      extBtn.title = t('menu.extensions')
      extBtn.textContent = t('menu.extensions')
      menubar.appendChild(extBtn)
    }
  } catch {}

  // “库”按钮：插入到“文件”按钮左侧
  const libBtn = document.createElement('div')
  libBtn.id = 'btn-library'
  libBtn.className = 'menu-item'
  libBtn.title = t('lib.menu')
  libBtn.textContent = t('lib.menu')
  const openBtnRef = document.getElementById('btn-open') as HTMLDivElement | null
  if (openBtnRef && openBtnRef.parentElement === menubar) {
    menubar.insertBefore(libBtn, openBtnRef)
  } else {
    menubar.insertBefore(libBtn, menubar.firstChild)
  }

  // 确保“新建”按钮紧随库按钮之后
  try {
    const newBtnRef = document.getElementById('btn-new') as HTMLDivElement | null
    if (newBtnRef && newBtnRef.parentElement === menubar) {
      menubar.insertBefore(newBtnRef, libBtn.nextSibling)
    }
  } catch {}

  // 关于 / 更新按钮
  const aboutBtn = document.createElement('div')
  aboutBtn.id = 'btn-about'
  aboutBtn.className = 'menu-item'
  aboutBtn.title = t('menu.about')
  aboutBtn.textContent = t('menu.about')
  const updBtn = document.createElement('div')
  updBtn.id = 'btn-update'
  updBtn.className = 'menu-item'
  updBtn.title = t('menu.update')
  updBtn.textContent = t('menu.update')
  menubar.appendChild(updBtn)
  menubar.appendChild(aboutBtn)

  // 语言切换按钮：移动到标题栏右侧（紧随文件名之后）
  const langBtn = document.createElement('div')
  langBtn.id = 'btn-lang'
  langBtn.className = 'menu-item'
  langBtn.title = t('menu.language')
  langBtn.textContent = '🌍'
  try {
    const titlebar = document.querySelector('.titlebar') as HTMLDivElement | null
    const extBtn = document.getElementById('btn-extensions') as HTMLDivElement | null
    const themeBtn = document.getElementById('btn-theme') as HTMLDivElement | null
    const fileNameEl = document.querySelector('.titlebar .filename') as HTMLDivElement | null
    if (titlebar && extBtn) {
      try { extBtn.remove() } catch {}
      if (themeBtn) { try { themeBtn.remove() } catch {} }
      if (fileNameEl && fileNameEl.parentElement === titlebar) {
        // 顺序：主题 | 扩展 | 语言
        titlebar.insertBefore(extBtn, fileNameEl.nextSibling)
        if (themeBtn) titlebar.insertBefore(themeBtn, extBtn)
        titlebar.insertBefore(langBtn, extBtn.nextSibling)
      } else {
        if (themeBtn) titlebar.appendChild(themeBtn)
        titlebar.appendChild(extBtn)
        titlebar.appendChild(langBtn)
      }
    } else if (titlebar) {
      // 兜底：找不到扩展按钮时，将语言图标与主题放在文件名后
      if (fileNameEl && fileNameEl.parentElement === titlebar) {
        if (themeBtn) titlebar.insertBefore(themeBtn, fileNameEl.nextSibling)
        titlebar.insertBefore(langBtn, (themeBtn || fileNameEl).nextSibling)
      } else {
        if (themeBtn) titlebar.appendChild(themeBtn)
        titlebar.appendChild(langBtn)
      }
    } else {
      // 再兜底：仍未获取到 titlebar，则临时放回 menubar 末尾
      if (themeBtn) menubar.appendChild(themeBtn)
      menubar.appendChild(langBtn)
    }
  } catch {}
}
const containerEl = document.querySelector('.container') as HTMLDivElement
// Ctrl/Cmd + 滚轮：缩放/放大编辑、预览、所见模式字号；Shift + 滚轮：调整阅读宽度
try {
  const wheelZoom = (e: WheelEvent) => {
    try {
      const dyRaw = e.deltaY
      const dxRaw = e.deltaX
      const dy = (Math.abs(dyRaw) >= Math.abs(dxRaw) ? dyRaw : dxRaw) || 0
      // Ctrl/Cmd + 滚轮：优先处理，避免与其他组合键冲突
      if (e.ctrlKey || e.metaKey) {
        if (!dy) return
        e.preventDefault()
        if (dy < 0) zoomIn(); else if (dy > 0) zoomOut()
        showZoomBubble()
        return
      }
      // Shift + 滚轮：调整阅读/所见最大宽度（部分系统下 Shift 会把滚轮映射为横向滚动，需要兼容 deltaX）
      if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (!dy) return
        e.preventDefault()
        const cur = getPreviewWidth()
        const delta = dy < 0 ? PREVIEW_WIDTH_STEP : -PREVIEW_WIDTH_STEP
        setPreviewWidth(cur + delta)
        showWidthBubble()
        return
      }
    } catch {}
  }
  // 容器上监听，passive: false 以便阻止默认行为（浏览器页面缩放）
  if (containerEl) containerEl.addEventListener('wheel', wheelZoom, { passive: false })
  // 绑定“重置缩放”按钮
  try {
    const btn = document.getElementById('zoom-reset') as HTMLButtonElement | null
    if (btn) btn.addEventListener('click', () => { try { zoomReset() } catch {} })
  } catch {}
} catch {}

// 初始化应用缩放：读取已保存缩放并应用到编辑/预览/WYSIWYG
try { applyUiZoom() } catch {}
// 初始化阅读/所见宽度：读取已保存宽度并应用到预览/所见容器
try { applyPreviewWidth() } catch {}

let _wheelHandlerRef: ((e: WheelEvent)=>void) | null = null
  if (containerEl) {
  // 修复在所见模式中滚轮无法滚动编辑区的问题：
  // 在容器层捕获 wheel 事件，直接驱动 textarea 的滚动并同步预览
  // 旧所见模式移除：不再绑定容器层滚轮处理器
  // 所见模式：当前行高亮覆盖层
  try {
    wysiwygLineEl = document.createElement('div') as HTMLDivElement
    wysiwygLineEl.id = 'wysiwyg-line'
    wysiwygLineEl.className = 'wysiwyg-line'
    containerEl.appendChild(wysiwygLineEl)
    wysiwygCaretEl = document.createElement('div') as HTMLDivElement
wysiwygCaretEl.id = 'wysiwyg-caret'
    wysiwygCaretEl.className = 'wysiwyg-caret'
    containerEl.appendChild(wysiwygCaretEl)
    // 旧所见模式移除：不再创建覆盖部件
  } catch {}
  const panel = document.createElement('div')
  panel.id = 'recent-panel'
  panel.className = 'recent-panel hidden'
  containerEl.appendChild(panel)

  // �ĵ��ⲿ(�ⲿ)
    const library = document.createElement('div')
  library.id = 'library'
  library.className = 'library hidden side-left'
  library.innerHTML = `
    <div class="lib-header">
      <div class="lib-title-row">
        <button class="lib-choose-btn" id="lib-choose">${t('lib.choose')}</button>
        <div class="lib-name" id="lib-path"></div>
        <button class="lib-toggle-btn" id="lib-toggle">&lt;</button>
      </div>
      <div class="lib-actions">
        <button class="lib-action-btn active" id="lib-tab-files">${t('tab.files')}</button>
        <button class="lib-action-btn" id="lib-tab-outline">${t('tab.outline')}</button>
        <button class="lib-action-btn" id="lib-refresh">${t('lib.refresh')}</button>
        <button class="lib-action-btn" id="lib-side">${t('lib.side.left')}</button>
        <button class="lib-action-btn" id="lib-pin">${t('lib.pin.auto')}</button>
      </div>
      <div class="lib-search">
        <input class="lib-search-input" id="lib-search" type="text" placeholder="搜索文件…" />
        <button class="lib-search-clear" id="lib-search-clear" title="清空">×</button>
      </div>
    </div>
    <div class="lib-search-results hidden" id="lib-search-results"></div>
    <div class="lib-tree" id="lib-tree"></div>
    <div class="lib-outline hidden" id="lib-outline"></div>
  `
  containerEl.appendChild(library)
  // 创建边缘唤醒热区（默认隐藏）
  try {
    // 移动端：左边缘误触太多，禁用“边缘唤醒库侧栏”，只允许通过菜单栏“库”按钮展开。
    if (!isMobileUiFast()) {
      _libEdgeEl = document.createElement('div') as HTMLDivElement
      _libEdgeEl.id = 'lib-edge'
      _libEdgeEl.style.position = 'absolute'
      _libEdgeEl.style.left = '0'
      _libEdgeEl.style.top = '0'
      _libEdgeEl.style.bottom = '0'
      _libEdgeEl.style.width = '36px' // 热区宽度：原 6px，向内扩大 30px
      _libEdgeEl.style.zIndex = '14'
      _libEdgeEl.style.pointerEvents = 'auto'
      _libEdgeEl.style.background = 'transparent'
      _libEdgeEl.style.display = 'none'
      _libEdgeEl.addEventListener('mouseenter', () => { try { if (!libraryDocked) showLibrary(true, false) } catch {} })
      containerEl.appendChild(_libEdgeEl)
    }
  } catch {}
  try {
    const elPath = library.querySelector('#lib-path') as HTMLDivElement | null
    // 去除"未选择库目录"默认提示，保持为空，避免长期提示误导
    if (elPath) elPath.textContent = ''
    // 初次渲染尝试同步库路径显示（若已存在旧配置）
    try { void refreshLibraryUiAndTree(false) } catch {}
    // 绑定标签页切换：目录 / 大纲
      const tabFiles = library.querySelector('#lib-tab-files') as HTMLButtonElement | null
      const tabOutline = library.querySelector('#lib-tab-outline') as HTMLButtonElement | null
      const treeEl = library.querySelector('#lib-tree') as HTMLDivElement | null
      const outlineEl = document.getElementById('lib-outline') as HTMLDivElement | null
      const searchRowEl = library.querySelector('.lib-search') as HTMLDivElement | null
      const searchInput = library.querySelector('#lib-search') as HTMLInputElement | null
      const searchClear = library.querySelector('#lib-search-clear') as HTMLButtonElement | null
      const searchResultsEl = library.querySelector('#lib-search-results') as HTMLDivElement | null
      let _libSearchTimer: number | null = null
      let _libSearchToken = 0

      const clearLibSearchView = () => {
        try {
          if (searchResultsEl) searchResultsEl.classList.add('hidden')
          if (treeEl) treeEl.classList.remove('hidden')
        } catch {}
      }

      const renderLibSearchResults = (items: LibrarySearchResult[]) => {
        if (!searchResultsEl) return
        try {
          searchResultsEl.innerHTML = ''
          if (!items || items.length === 0) {
            const empty = document.createElement('div')
            empty.className = 'lib-search-empty'
            empty.textContent = '未找到匹配文件'
            searchResultsEl.appendChild(empty)
            return
          }
          for (const it of items) {
            const row = document.createElement('div')
            row.className = 'lib-search-item'
            row.dataset.path = it.path

            const nameEl = document.createElement('div')
            nameEl.className = 'name'
            nameEl.textContent = it.name

            const relEl = document.createElement('div')
            relEl.className = 'rel'
            relEl.textContent = it.relative

            row.appendChild(nameEl)
            row.appendChild(relEl)
            row.addEventListener('click', () => {
              try { void openFile2(it.path) } catch {}
            })
            searchResultsEl.appendChild(row)
          }
        } catch {}
      }

      const scheduleLibSearch = (termRaw: string) => {
        const term = String(termRaw || '').trim()
        if (!term) {
          clearLibSearchView()
          return
        }
        if (!searchResultsEl || !treeEl) return

        // 进入搜索视图
        try {
          treeEl.classList.add('hidden')
          searchResultsEl.classList.remove('hidden')
          searchResultsEl.textContent = '搜索中…'
        } catch {}

        if (_libSearchTimer != null) {
          try { clearTimeout(_libSearchTimer) } catch {}
          _libSearchTimer = null
        }
        const token = ++_libSearchToken
        _libSearchTimer = window.setTimeout(async () => {
          _libSearchTimer = null
          try {
            const root = await getLibraryRoot()
            if (!root) {
              if (searchResultsEl) searchResultsEl.textContent = '当前未打开任何库'
              return
            }
            const list = await searchLibraryFilesByName(root, term, { maxResults: 200 })
            if (token !== _libSearchToken) return
            renderLibSearchResults(list)
          } catch {
            try { if (searchResultsEl) searchResultsEl.textContent = '搜索失败' } catch {}
          }
        }, 200)
      }

      // 搜索输入绑定
      searchInput?.addEventListener('input', () => {
        try { scheduleLibSearch(searchInput.value) } catch {}
      })
      searchInput?.addEventListener('keydown', (ev) => {
        try {
          if (ev.key !== 'Escape') return
          ev.preventDefault()
          if (searchInput) searchInput.value = ''
          clearLibSearchView()
          try { searchInput.blur() } catch {}
        } catch {}
      })
      searchClear?.addEventListener('click', () => {
        try {
          if (searchInput) searchInput.value = ''
          clearLibSearchView()
          try { searchInput?.focus() } catch {}
        } catch {}
      })
      function activateLibTab(kind: 'files' | 'outline') {
        try {
          tabFiles?.classList.toggle('active', kind === 'files')
          tabOutline?.classList.toggle('active', kind === 'outline')
          // 搜索只在“目录”页可用
          if (searchRowEl) searchRowEl.classList.toggle('hidden', kind !== 'files')
          if (kind !== 'files') {
            // 切到大纲：隐藏搜索结果，避免覆盖大纲面板
            try { if (searchResultsEl) searchResultsEl.classList.add('hidden') } catch {}
          } else {
            // 切回目录：若有搜索词则恢复搜索视图
            try { scheduleLibSearch(String(searchInput?.value || '')) } catch {}
          }
          if (treeEl) {
            const hasSearch = kind === 'files' && !!String(searchInput?.value || '').trim()
            const hideTree = ((outlineLayout === 'embedded') && (kind !== 'files')) || hasSearch
            treeEl.classList.toggle('hidden', hideTree)
          }
          if (outlineEl) {
            const hideOutline = (outlineLayout === 'embedded') && (kind !== 'outline')
            outlineEl.classList.toggle('hidden', hideOutline)
          }
          if (kind === 'outline') { try { renderOutlinePanel() } catch {} }
        } catch {}
      }
      tabFiles?.addEventListener('click', () => activateLibTab('files'))
      tabOutline?.addEventListener('click', () => activateLibTab('outline'))
      // 大纲标签右键菜单：选择“嵌入 / 剥离 / 右侧”三种布局
      tabOutline?.addEventListener('contextmenu', (ev) => {
        try { ev.preventDefault() } catch {}
        try { showOutlineLayoutMenu(ev.clientX, ev.clientY) } catch {}
      })
    // 绑定固定/自动切换按钮
      const elPin = library.querySelector('#lib-pin') as HTMLButtonElement | null
    if (elPin) {
      ;(async () => { try { libraryDocked = await getLibraryDocked(); elPin.textContent = libraryDocked ? t('lib.pin.auto') : t('lib.pin.fixed'); applyLibraryLayout() } catch {} })()
      elPin.addEventListener('click', () => { void setLibraryDocked(!libraryDocked) })
    }
      const elSide = library.querySelector('#lib-side') as HTMLButtonElement | null
    if (elSide) {
      updateLibrarySideButton()
      elSide.addEventListener('click', () => {
        void setLibrarySide(librarySide === 'left' ? 'right' : 'left')
      })
    }
        // 绑定侧栏收起/展开按钮
        const elToggle = library.querySelector('#lib-toggle') as HTMLButtonElement | null
        if (elToggle) {
          elToggle.addEventListener('click', () => {
            try {
              showLibrary(false)
            } catch {}
          })
        }
  } catch {}
  // 创建浮动展开按钮（侧栏隐藏时显示，仅在专注模式）
  try {
    // 移动端：库侧栏只允许通过菜单栏“库”按钮展开，避免额外入口导致误触。
    if (!isMobileUiFast()) {
      const floatToggle = document.createElement('button')
      floatToggle.id = 'lib-float-toggle'
      floatToggle.className = 'lib-float-toggle side-left'
      floatToggle.innerHTML = '&gt;'
      floatToggle.title = '展开侧栏'
      floatToggle.addEventListener('click', () => {
        try {
          showLibrary(true, false)
        } catch {}
      })
      containerEl.appendChild(floatToggle)
      _libFloatToggleEl = floatToggle
      // 初始化状态：如果侧栏此刻是隐藏的，直接显示展开按钮
      try {
        const isHidden = library.classList.contains('hidden')
        floatToggle.classList.toggle('show', isHidden)
      } catch {}
      // 监听侧栏显示/隐藏状态，切换浮动按钮显示
      const observer = new MutationObserver(() => {
        try {
          const isHidden = library.classList.contains('hidden')
          floatToggle.classList.toggle('show', isHidden)
        } catch {}
      })
      observer.observe(library, { attributes: true, attributeFilter: ['class'] })
    }
  } catch {}
  // 恢复库侧栏上次的可见状态
  ;(async () => {
    try {
      const visible = await getLibraryVisible()
      libraryVisible = visible
      showLibrary(visible, false)
    } catch {
      showLibrary(libraryVisible, false)
    }
  })()
        // 重新创建关于对话框并挂载
        const about = document.createElement('div')
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
  try { initAboutOverlay() } catch {}

    // 插入链接对话框：初始化并挂载到容器
    const link = document.createElement('div')
    link.id = 'link-overlay'
    link.className = 'link-overlay hidden'
  link.innerHTML = `
      <div class="link-dialog" role="dialog" aria-modal="true" aria-labelledby="link-title">
        <div class="link-header">
          <div id="link-title">${t('dlg.link')}</div>
          <button id="link-close" class="about-close" title="${t('about.close')}">×</button>
        </div>
        <form class="link-body" id="link-form">
          <label class="link-field">
            <span>${t('dlg.text')}</span>
            <input id="link-text" type="text" placeholder="${t('dlg.link.text.ph')}" />
          </label>
          <label class="link-field">
            <span>${t('dlg.url')}</span>
            <input id="link-url" type="text" placeholder="${t('dlg.url.ph')}" />
          </label>
          <div class="link-actions">
            <button type="button" id="link-cancel">${t('dlg.cancel')}</button>
            <button type="submit" id="link-ok">${t('dlg.insert')}</button>
          </div>
        </form>
    </div>
  `
  containerEl.appendChild(link)

  // 重命名对话框（样式复用“插入链接”对话框风格）
  const rename = document.createElement('div')
  rename.id = 'rename-overlay'
  rename.className = 'link-overlay hidden'
  rename.innerHTML = `
      <div class="link-dialog" role="dialog" aria-modal="true" aria-labelledby="rename-title">
        <div class="link-header">
          <div id="rename-title">${t('dlg.rename')}</div>
          <button id="rename-close" class="about-close" title="${t('about.close')}">×</button>
        </div>
        <form class="link-body" id="rename-form">
          <label class="link-field">
            <span>${t('dlg.name')}</span>
            <input id="rename-text" type="text" placeholder="${t('dlg.name.ph')}" />
          </label>
          <label class="link-field">
            <span>${t('dlg.ext')}</span>
            <input id="rename-ext" type="text" disabled />
          </label>
          <div class="link-actions">
            <button type="button" id="rename-cancel">${t('dlg.cancel')}</button>
            <button type="submit" id="rename-ok">${t('dlg.ok')}</button>
          </div>
        </form>
    </div>
  `
  containerEl.appendChild(rename)

  // 图床设置对话框
  const upl = document.createElement('div')
  upl.id = 'uploader-overlay'
  upl.className = 'upl-overlay hidden'
  upl.innerHTML = `
    <div class="upl-dialog" role="dialog" aria-modal="true" aria-labelledby="upl-title">
      <div class="upl-header">
        <div id="upl-title">${t('upl.title')}</div>
        <button id="upl-close" class="about-close" title="${t('about.close')}">×</button>
      </div>
      <div class="upl-desc">${t('upl.desc')}</div>
      <form class="upl-body" id="upl-form">
        <div class="upl-grid">
          <div class="upl-section-title">${t('upl.section.basic')}</div>
          <label for="upl-enabled">${t('upl.enable')}</label>
          <div class="upl-field">
            <label class="switch">
              <input id="upl-enabled" type="checkbox" />
              <span class="trk"></span><span class="kn"></span>
            </label>
          </div>
          <label for="upl-always-local">${t('upl.alwaysLocal')}</label>
          <div class="upl-field">
            <label class="switch">
              <input id="upl-always-local" type="checkbox" />
              <span class="trk"></span><span class="kn"></span>
            </label>
            <div class="upl-hint">${t('upl.hint.alwaysLocal')}</div>
          </div>
          <label for="upl-ak">${t('upl.ak')}</label>
          <div class="upl-field"><input id="upl-ak" type="text" placeholder="${t('upl.ak.ph')}" /></div>
          <label for="upl-sk">${t('upl.sk')}</label>
          <div class="upl-field"><input id="upl-sk" type="password" placeholder="${t('upl.sk.ph')}" /></div>
          <label for="upl-bucket">${t('upl.bucket')}</label>
          <div class="upl-field"><input id="upl-bucket" type="text" placeholder="${t('upl.bucket.ph')}" /></div>
          <label for="upl-endpoint">${t('upl.endpoint')}</label>
          <div class="upl-field">
            <input id="upl-endpoint" type="url" placeholder="${t('upl.endpoint.ph')}" />
            <div class="upl-hint">${t('upl.endpoint.hint')}</div>
          </div>
          <label for="upl-region">${t('upl.region')}</label>
          <div class="upl-field"><input id="upl-region" type="text" placeholder="${t('upl.region.ph')}" /></div>
          <div class="upl-section-title">${t('upl.section.access')}</div>
          <label for="upl-domain">${t('upl.domain')}</label>
          <div class="upl-field">
            <input id="upl-domain" type="url" placeholder="${t('upl.domain.ph')}" />
            <div class="upl-hint">${t('upl.domain.hint')}</div>
          </div>
          <label for="upl-template">${t('upl.template')}</label>
          <div class="upl-field">
            <input id="upl-template" type="text" placeholder="${t('upl.template.ph')}" />
            <div class="upl-hint">${t('upl.template.hint')}</div>
          </div>
          <div class="upl-section-title">${t('upl.section.advanced')}</div>
          <label for="upl-pathstyle">${t('upl.pathstyle')}</label>
          <div class="upl-field"><input id="upl-pathstyle" type="checkbox" /></div>
          <label for="upl-acl">${t('upl.acl')}</label>
          <div class="upl-field"><input id="upl-acl" type="checkbox" checked /></div>
          <label for="upl-webp-enable">${t('upl.webp.enable')}</label>
          <div class="upl-field">
            <label class="switch">
              <input id="upl-webp-enable" type="checkbox" />
              <span class="trk"></span><span class="kn"></span>
            </label>
          </div>
          <label for="upl-webp-quality">${t('upl.webp.quality')}</label>
          <div class="upl-field">
            <div style="display:flex;align-items:center;gap:8px;min-width:220px;">
              <input id="upl-webp-quality" type="range" min="0.6" max="0.95" step="0.01" value="0.85" />
              <span id="upl-webp-quality-val">0.85</span>
            </div>
            <div class="upl-hint" id="upl-webp-quality-hint">${t('upl.webp.quality.hint')}</div>
          </div>
          <label for="upl-webp-local">${t('upl.webp.local')}</label>
          <div class="upl-field">
            <label class="switch">
              <input id="upl-webp-local" type="checkbox" />
              <span class="trk"></span><span class="kn"></span>
            </label>
          </div>
        </div>
        <div class="upl-actions">
          <div id="upl-test-result"></div>
          <button type="button" id="upl-test" class="btn-secondary">${t('dlg.test')}</button>
          <button type="button" id="upl-cancel" class="btn-secondary">${t('dlg.cancel')}</button>
          <button type="submit" id="upl-save" class="btn-primary">${t('file.save')}</button>
        </div>
      </form>
    </div>
  `
  containerEl.appendChild(upl)
  }

// 插入链接 / 重命名 对话框逻辑已拆分到 ./ui/linkDialogs
// 更新标题和未保存标记
function refreshTitle() {
  // 以文件名为主；未保存附加 *；悬浮显示完整路径；同步 OS 窗口标题
  const full = currentFilePath || ''
  const name = (() => {
    if (!full) return t('filename.untitled')
    // SAF：content://.../primary%3Axxx%2Ffoo.md 这种不要直接展示给用户看
    if (full.startsWith('content://')) {
      const pretty = safPrettyName(full)
      return pretty || t('filename.untitled')
    }
    return full.split(/[/\\]/).pop() || t('filename.untitled')
  })()
  const label = name + (dirty ? ' *' : '')
  filenameLabel.textContent = label
  try { filenameLabel.title = full || name } catch {}
  document.title = label
  const osTitle = `${label} - 飞速MarkDown`
  try { void getCurrentWindow().setTitle(osTitle).catch(() => {}) } catch {}
  // 内容变化时刷新大纲（包括所见模式）
  try { scheduleOutlineUpdate() } catch {}
}

// 更新状态栏（行列字）
function refreshStatus() {
  const pos = editor.selectionStart
  const until = editor.value.slice(0, pos)
  const lines = until.split(/\n/)
  const row = lines.length
  const col = (lines[lines.length - 1] || '').length + 1
  const chars = editor.value.length
  status.textContent = fmtStatus(row, col) + `, 字 ${chars}`
}

// 初始化存储（Tauri Store），失败则退化为内存模式
async function initStore() {
  try {
    console.log('初始化应用存储...')
    // 关键：全应用只使用一个 Store 实例，避免多实例并发写导致配置覆盖/损坏
    store = await getAppStore()
    setAppStore(store)
    console.log('存储初始化成功')
    void logInfo('应用存储初始化成功')
    return true
  } catch (error) {
    console.error('存储初始化失败:', error)
    console.warn('将以无持久化（内存）模式运行')
    void logWarn('存储初始化失败：使用内存模式', error)
    // Android 上常见：应用被系统强杀时，写入中断导致 store 文件损坏/空文件，
    // 下次启动 Store.load 直接抛错 -> 永久退化为“内存模式”，用户就会感觉“怎么都保存不了设置”。
    // 这里做一次修复尝试：把损坏文件备份走，然后重建一个新的 store。
    try {
      const baseDir = getSettingsBaseDir()
      const existsStoreFile = await exists(SETTINGS_FILE_NAME as any, { baseDir } as any)
      if (existsStoreFile) {
        const ts = Date.now()
        const backup = `flymd-settings.corrupt-${ts}.json`
        try {
          await rename(SETTINGS_FILE_NAME as any, backup as any, { baseDir } as any)
        } catch {
          try { await remove(SETTINGS_FILE_NAME as any, { baseDir } as any) } catch {}
        }
      }
      setAppStore(null)
      store = await getAppStore()
      setAppStore(store)
      try { await store.save() } catch {}
      console.warn('存储已重建：原配置文件疑似损坏，已备份为 flymd-settings.corrupt-*.json')
      void logWarn('存储损坏已重建', error)
      return true
    } catch {}
    return false
  }
}

// 延迟加载高亮库并创建 markdown-it
// 任务列表（阅读模式）：将 "- [ ]" / "- [x]" 渲染为复选框
function applyMdTaskListPlugin(md: any) {
  try {
    md.core.ruler.after('inline', 'task-list', function (state: any) {
      try {
        const tokens = state.tokens || []
        const TokenCtor = state.Token
        for (let i = 0; i < tokens.length; i++) {
          const tInline = tokens[i]
          if (!tInline || tInline.type !== 'inline') continue
          // 寻找前置 list_item_open（兼容是否有 paragraph_open）
          let liIdx = -1
          const tPrev = tokens[i - 1]
          const tPrev2 = tokens[i - 2]
          if (tPrev && tPrev.type === 'paragraph_open' && tPrev2 && tPrev2.type === 'list_item_open') liIdx = i - 2
          else if (tPrev && tPrev.type === 'list_item_open') liIdx = i - 1
          if (liIdx < 0) continue
          const tLiOpen = tokens[liIdx]
          const children = (tInline.children || [])
          if (children.length === 0) continue
          const first = children[0]
          if (!first || first.type !== 'text') continue
          const m = (first.content || '').match(/^(\s*)\[( |x|X)\]\s+/)
          if (!m) continue
          try { tLiOpen.attrJoin('class', 'task-list-item') } catch {}
          try {
            const level = tLiOpen.level - 1
            for (let j = liIdx - 1; j >= 0; j--) {
              const tj = tokens[j]
              if (!tj) continue
              if ((tj.type === 'bullet_list_open' || tj.type === 'ordered_list_open') && tj.level === level) { try { tj.attrJoin('class', 'task-list') } catch {}; break }
            }
          } catch {}
          try {
            first.content = (first.content || '').replace(/^(\s*)\[(?: |x|X)\]\s+/, '')
            const box = new TokenCtor('html_inline', '', 0)
            const checked = (m[2] || '').toLowerCase() === 'x'
            box.content = `<input class="task-list-item-checkbox" type="checkbox"${checked ? ' checked' : ''}>`
            children.unshift(box)
            tInline.children = children
          } catch {}
        }
      } catch {}
      return false
    })
  } catch {}
}
async function ensureRenderer() {
  if (md) return
  if (!hljsLoaded) {
    // 按需加载 markdown-it 与 highlight.js
    const [{ default: MarkdownItCtor }, hljs] = await Promise.all([
      import('markdown-it'),
      import('highlight.js')
    ])
    hljsLoaded = true
    md = new MarkdownItCtor({
      html: true,
      linkify: true,
      breaks: true, // 单个换行渲染为 <br>，与所见模式的“回车即提行”保持一致
      highlight(code, lang) {
        // Mermaid 代码块保留为占位容器，稍后由 mermaid 渲染
        if (lang && lang.toLowerCase() === 'mermaid') {
          const esc = code.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]!))
          return `<pre class="mermaid">${esc}</pre>`
        }
        try {
          if (lang && hljs.default.getLanguage(lang)) {
            const r = hljs.default.highlight(code, { language: lang, ignoreIllegals: true })
            return `<pre><code class="hljs language-${lang}">${r.value}</code></pre>`
          }
        } catch {}
        const esc = code.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]!))
        return `<pre><code class="hljs">${esc}</code></pre>`
      }
    })
    // 启用脚注支持（[^1] / [^name] 语法）
    try {
      const footnoteMod = await import('./plugins/markdownItFootnote')
      const applyFootnote = (footnoteMod as any).default as ((m: any) => void) | undefined
      if (typeof applyFootnote === 'function') applyFootnote(md)
    } catch (e) {
      console.warn('markdown-it-footnote 加载失败：', e)
    }
    // 启用 KaTeX 支持（$...$ / $$...$$）
    try {
      const katexPlugin = (await import('./plugins/markdownItKatex')).default as any
      if (typeof katexPlugin === 'function') md.use(katexPlugin)
      try { applyMdTaskListPlugin(md) } catch {}
    } catch (e) {
      console.warn('markdown-it-katex 加载失败：', e)
    }

    // 表格横向滚动支持：为所有表格添加包装器
    md.renderer.rules.table_open = () => '<div class="table-wrapper">\n<table>\n'
    md.renderer.rules.table_close = () => '</table>\n</div>\n'
  }
}

// 渲染预览（带安全消毒）
async function renderPreview() {
  console.log('=== 开始渲染预览 ===')
  // 首次预览开始打点
  try { if (!(renderPreview as any)._firstLogged) { (renderPreview as any)._firstLogged = true; logInfo('打点:首次预览开始') } } catch {}
  await ensureRenderer()
  let raw = editor.value
  // 所见模式：用一个“.”标记插入点，优先不破坏 Markdown 结构
  try {
    if (wysiwyg && mode !== 'preview') {
      const st = editor.selectionStart >>> 0
      const before = raw.slice(0, st)
      const after = raw.slice(st)
      const lineStart = before.lastIndexOf('\n') + 1
      const curLine = before.slice(lineStart)
      const fenceRE = /^ {0,3}(```+|~~~+)/
      // 计算在光标之前是否处于围栏代码块内
      const preText = raw.slice(0, lineStart)
      const preLines = preText.split('\n')
      let insideFence = false
      let fenceCh = ''
      for (const ln of preLines) {
        const m = ln.match(fenceRE)
        if (m) {
          const ch = m[1][0]
          if (!insideFence) { insideFence = true; fenceCh = ch }
          else if (ch === fenceCh) { insideFence = false; fenceCh = '' }
        }
      }
      const isFenceLine = fenceRE.test(curLine)
      let injectAt = st
      // 行首：将点放在不破坏语法的前缀之后
      if (st === lineStart) {
        const mBQ = curLine.match(/^ {0,3}> ?/)
        const mH = curLine.match(/^ {0,3}#{1,6} +/)
        const mUL = curLine.match(/^ {0,3}[-*+] +/)
        const mOL = curLine.match(/^ {0,3}\d+\. +/)
        const prefixLen = (mBQ?.[0]?.length || mH?.[0]?.length || mUL?.[0]?.length || mOL?.[0]?.length || 0)
        if (prefixLen > 0) injectAt = lineStart + prefixLen
      }
      // 围栏行：开围栏行→围栏符之后；关围栏行→跳过
      if (isFenceLine) {
        const m = curLine.match(fenceRE)
        if (m) {
          const ch = m[1][0]
          if (!insideFence) {
            injectAt = lineStart + m[0].length
          } else if (ch === fenceCh) {
            injectAt = -1
          }
        }
      }
      if (injectAt >= 0) {
        // 使用下划线 '_' 作为可见“光标”；代码块中用纯 '_'，其他位置用 span 包裹以实现闪烁
        const dotStr = insideFence && !isFenceLine ? '_' : '<span class="caret-dot">_</span>'
        raw = raw.slice(0, injectAt) + dotStr + raw.slice(injectAt)
      }
      try {
        const lines = raw.split('\n')
        let openFenceIdx = -1
        let openFenceChar = ''
        for (let i = 0; i < lines.length; i++) {
          const m = lines[i].match(/^ {0,3}(`{3,}|~{3,})/)
          if (m) {
            const ch = m[1][0]
            if (openFenceIdx < 0) { openFenceIdx = i; openFenceChar = ch }
            else if (ch === openFenceChar) { openFenceIdx = -1; openFenceChar = '' }
          }
        }
        if (openFenceIdx >= 0) {
          lines[openFenceIdx] = lines[openFenceIdx].replace(/^(\s*)(`{3,}|~{3,})/, (_all, s: string, fence: string) => {
            return s + fence[0] + '\u200B' + fence.slice(1)
          })
        }
        let openMathIdx = -1
        for (let i = 0; i < lines.length; i++) {
          if (/^ {0,3}\$\$/.test(lines[i])) {
            if (openMathIdx < 0) openMathIdx = i
            else openMathIdx = -1
          }
        }
        if (openMathIdx >= 0) {
          lines[openMathIdx] = lines[openMathIdx].replace(/^(\s*)\$\$/, (_all, s: string) => s + '$\u200B$')
        }

        // 3) 当前行：未闭合的单个 $（行内数学）
        try {
          if (!insideFence && !isFenceLine) {
            const curIdx = (() => { try { return before.split('\n').length - 1 } catch { return -1 } })()
            if (curIdx >= 0 && curIdx < lines.length) {
              const line = lines[curIdx]
              const singlePos: number[] = []
              for (let i = 0; i < line.length; i++) {
                if (line[i] !== '$') continue
                // 跳过 $$（块级）
                if (i + 1 < line.length && line[i + 1] === '$') { i++; continue }
                // 跳过转义 \$（奇数个反斜杠）
                let bs = 0
                for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) bs++
                if ((bs & 1) === 1) continue
                singlePos.push(i)
              }
              if ((singlePos.length & 1) === 1) {
                const idx = singlePos[singlePos.length - 1]
                // 在单个 $ 后插入零宽字符，阻断 markdown-it-katex 的行内渲染识别
                lines[curIdx] = line.slice(0, idx + 1) + '\u200B' + line.slice(idx + 1)
              }
            }
          }
        } catch {}
        raw = lines.join('\n')
      } catch {}
    }
  } catch {}
  // 阅读模式/所见模式预览：渲染时剥离 YAML Front Matter，仅显示正文；若存在 Front Matter，则解析用于预览元数据条
  let previewMeta: any | null = null
  try {
    const r = splitYamlFrontMatter(raw)
    previewMeta = parseFrontMatterMeta(r.frontMatter)
    raw = r.body
  } catch {}
  // Excel 公式里的 `$` 不是行内数学分隔符：先转义，避免 KaTeX 把整段当数学渲染
  raw = protectExcelDollarRefs(raw)
  const html = md!.render(raw)
  // 按需加载 KaTeX 样式：检测渲染结果是否包含 katex 片段
  try {
    if (!katexCssLoaded && /katex/.test(html)) {
      await import('katex/dist/katex.min.css')
      katexCssLoaded = true
    }
  } catch {}
  console.log('Markdown 渲染后的 HTML 片段:', html.substring(0, 500))

  // 方案 A：占位符机制不需要 DOMPurify
  // KaTeX 占位符（data-math 属性）是安全的，后续会用 KaTeX.render() 替换
  const safe = html
  // WYSIWYG 防闪烁：使用离屏容器完成 Mermaid 替换后一次性提交
  try {
    preview.classList.add('rendering')
    const buf = document.createElement('div') as HTMLDivElement
    buf.className = 'preview-body'
    buf.innerHTML = safe
    // 与所见模式一致：在消毒之后，用 KaTeX 对占位元素进行实际渲染
    // 🔍 添加可视化调试面板
    // 【方案：使用与所见模式完全相同的方式】
    // 所见模式工作正常，直接复制其成功方案
    // 渲染 KaTeX 数学公式（阅读模式）
    try {
      const mathNodes = Array.from(buf.querySelectorAll('.md-math-inline, .md-math-block')) as HTMLElement[]

      if (mathNodes.length > 0) {
        // 使用所见模式的导入方式
        const katex = await import('katex')

        // 加载 CSS（只加载一次）
        if (!katexCssLoaded) {
          await import('katex/dist/katex.min.css')
          katexCssLoaded = true

          // 手动注入关键 CSS 规则以确保根号等符号正确显示
          // 这是必需的，因为在 Tauri 生产构建中动态 CSS 可能无法完全应用
          const criticalStyle = document.createElement('style')
          criticalStyle.textContent = `
            /* KaTeX critical styles for production build */
            .katex {
              font-size: 1em;
              text-indent: 0;
              text-rendering: auto;
            }
            .katex svg {
              display: inline-block;
              position: relative;
              width: 100%;
              height: 100%;
            }
            .katex svg path {
              fill: currentColor;
            }
            .katex .hide-tail {
              overflow: hidden;
            }
            .md-math-inline .katex {
              display: inline-block;
            }
            .md-math-block .katex {
              display: block;
              text-align: center;
            }
          `
          document.head.appendChild(criticalStyle)
        }

        // 渲染每个数学节点
        for (const el of mathNodes) {
          try {
            const value = el.getAttribute('data-math') || ''
            const displayMode = el.classList.contains('md-math-block')

            // 清空元素
            el.innerHTML = ''

            // 使用 katex.default.render()（与所见模式相同）
            katex.default.render(value, el, {
              throwOnError: false,
              displayMode: displayMode,
            })
          } catch (e) {
            // 渲染失败时回退到纯文本
            el.textContent = el.getAttribute('data-math') || ''
          }
        }
      }
    } catch (mainErr) {
      console.error('[KaTeX 阅读模式] 渲染失败:', mainErr)
    }
    // 任务列表映射与事件绑定（仅阅读模式）
    try {
      if (!wysiwyg) {
        const _rawForTasks = (editor as HTMLTextAreaElement).value
        const taskMapNow = scanTaskList(_rawForTasks)
        const boxes = Array.from(buf.querySelectorAll('input.task-list-item-checkbox')) as HTMLInputElement[]
        boxes.forEach((el, i) => { try { (el as HTMLInputElement).setAttribute('type','checkbox') } catch {}; try { (el as any).dataset.taskId = String(i) } catch {} })
        _taskMapLast = taskMapNow
        if (!_taskEventsBound) { try { preview.addEventListener('click', onTaskCheckboxChange as any, true); preview.addEventListener('change', onTaskCheckboxChange, true) } catch {} ; _taskEventsBound = true }
      }
    } catch {}
    try {
      const codeBlocks = buf.querySelectorAll('pre > code.language-mermaid') as NodeListOf<HTMLElement>
      try { console.log('[预处理] language-mermaid 代码块数量:', codeBlocks.length) } catch {}
      codeBlocks.forEach((code) => {
        try {
          const pre = code.parentElement as HTMLElement
          const text = code.textContent || ''
          const div = document.createElement('div')
          div.className = 'mermaid'
          div.textContent = text
          pre.replaceWith(div)
        } catch {}
      })
    } catch {}
    try {
      const preMermaid = buf.querySelectorAll('pre.mermaid')
      try { console.log('[预处理] pre.mermaid 元素数量:', preMermaid.length) } catch {}
      preMermaid.forEach((pre) => {
        try {
          const text = pre.textContent || ''
          const div = document.createElement('div')
          div.className = 'mermaid'
          div.textContent = text
          pre.replaceWith(div)
        } catch {}
      })
    } catch {}
    try {
      const nodes = Array.from(buf.querySelectorAll('.mermaid')) as HTMLElement[]
      try { console.log('[预处理] 准备渲染 Mermaid 节点:', nodes.length) } catch {}
      if (nodes.length > 0) {
        let mermaid: any
        try { mermaid = (await import('mermaid')).default } catch (e1) { try { mermaid = (await import('mermaid/dist/mermaid.esm.mjs')).default } catch (e2) { throw e2 } }
        if (!mermaidReady) {
          mermaid.initialize(getMermaidConfig());
          mermaidReady = true
        }
        for (let i = 0; i < nodes.length; i++) {
          const el = nodes[i]
          const code = el.textContent || ''
          const hash = hashMermaidCode(code)
          const desiredId = `${hash}-${mermaidSvgCacheVersion}-${i}`
          try {
            let svgMarkup = getCachedMermaidSvg(code, desiredId)
            if (!svgMarkup) {
              const renderId = `${hash}-${Date.now()}-${i}`
              const { svg } = await mermaid.render(renderId, code)
              cacheMermaidSvg(code, svg, renderId)
              svgMarkup = svg.split(renderId).join(desiredId)
            }
            const wrap = document.createElement('div')
            wrap.innerHTML = svgMarkup || ''
            const svgEl = wrap.firstElementChild as SVGElement | null
            if (svgEl) {
              try { normalizeMermaidSvg(svgEl) } catch {}
              if (!svgEl.id) svgEl.id = desiredId
              const fig = document.createElement('div')
              fig.className = 'mmd-figure'
              fig.appendChild(svgEl)
              try { fig.appendChild(createMermaidToolsFor(svgEl)) } catch {}
              el.replaceWith(fig)
              try { postAttachMermaidSvgAdjust(svgEl) } catch {}
            }
          } catch {}
        }
      }
    } catch {}
    // 一次性替换预览 DOM
    try {
      try { injectPreviewMeta(buf, previewMeta) } catch {}
      preview.innerHTML = ''
      preview.appendChild(buf)
      // 预览脚注增强：跳转 + 悬浮
      try {
        const footnoteMod = await import('./plugins/markdownItFootnote')
        const enhance = (footnoteMod as any).enhanceFootnotes as ((root: HTMLElement) => void) | undefined
        if (typeof enhance === 'function') enhance(preview)
      } catch {}
      try { decorateCodeBlocks(preview) } catch {}
      // 便签模式：为待办项添加推送和提醒按钮，并自动调整窗口高度
      try { if (stickyNoteMode) { addStickyTodoButtons(); scheduleAdjustStickyHeight() } } catch {}
      // 预览更新后自动刷新大纲（节流由内部逻辑与渲染频率保障）
      try { renderOutlinePanel() } catch {}
    } catch {}
  } catch {} finally { try { preview.classList.remove('rendering') } catch {} }
  // 重新计算所见模式锚点表
  try { if (wysiwyg) { _wysiwygAnchors = buildAnchors(preview) } } catch {}
  // 所见模式下，确保“模拟光标 _”在预览区可见
  // 旧所见模式移除：不再调整模拟光标
  // 外链安全属性
  preview.querySelectorAll('a[href]').forEach((a) => {
    const el = a as HTMLAnchorElement
    const href = el.getAttribute('href') || ''
    // 脚注/反向脚注链接：保持为页内跳转，不改 target
    if (href.startsWith('#fn') || href.startsWith('#fnref')) return
    el.target = '_blank'
    el.rel = 'noopener noreferrer'
  })
  // 处理本地图片路径为 asset: URL，确保在 Tauri 中可显示
  try {
    const base = currentFilePath ? currentFilePath.replace(/[\\/][^\\/]*$/, '') : null
    preview.querySelectorAll('img[src]').forEach((img) => {
      // WYSIWYG: nudge caret after image render when editor has no scroll space
      try {
        const el = img as HTMLImageElement
        const maybeNudge = () => {
          try { updateWysiwygVirtualPadding() } catch {}
          try { if (_nudgedCaretForThisRender) return; if (!wysiwyg) return } catch { return }
          try {
            const er = Math.max(0, editor.scrollHeight - editor.clientHeight)
            const pr = Math.max(0, preview.scrollHeight - preview.clientHeight)
            if (er <= 0 && pr > 0 && editor.selectionStart === editor.selectionEnd) {
              const st = window.getComputedStyle(editor)
              const fs = parseFloat(st.fontSize || '16') || 16
              const v = parseFloat(st.lineHeight || '')
              const lh = (Number.isFinite(v) && v > 0 ? v : fs * 1.6)
              const approx = Math.round(((el.clientHeight || 0) / (lh || 16)) * 0.3)
              const lines = Math.max(4, Math.min(12, approx || 0))
              const moved = moveWysiwygCaretByLines(lines, _wysiwygCaretVisualColumn)
              if (moved !== 0) { _nudgedCaretForThisRender = true; updateWysiwygLineHighlight(); updateWysiwygCaretDot(); startDotBlink(); try { ensureWysiwygCaretDotInView() } catch {} }
            }
          } catch {}
        }
        if (el.complete) { setTimeout(maybeNudge, 0) } else { el.addEventListener('load', () => setTimeout(maybeNudge, 0), { once: true }) }
      } catch {}
      try {
        const el = img as HTMLImageElement
        const src = el.getAttribute('src') || ''
        let srcDec = src
        try {
          // 尽力解码 URL 编码的反斜杠（%5C）与其它字符，便于后续本地路径识别
          srcDec = decodeURIComponent(src)
        } catch {}
        // 跳过已可用的协议
        if (/^(data:|blob:|asset:|https?:)/i.test(src)) return
        const isWinDrive = /^[a-zA-Z]:/.test(srcDec)
        const isUNC = /^\\\\/.test(srcDec)
        const isUnixAbs = /^\//.test(srcDec)
        // base 不存在且既不是绝对路径、UNC、Windows 盘符，也不是 file: 时，直接忽略
        if (!base && !(isWinDrive || isUNC || isUnixAbs || /^file:/i.test(src) || /^(?:%5[cC]){2}/.test(src))) return
        let abs: string
        if (isWinDrive || isUNC || isUnixAbs) {
          abs = srcDec
          if (isWinDrive) {
            // 统一 Windows 盘符路径分隔符
            abs = abs.replace(/\//g, '\\')
          }
          if (isUNC) {
            // 确保 UNC 使用反斜杠
            abs = abs.replace(/\//g, '\\')
          }
        } else if (/^(?:%5[cC]){2}/.test(src)) {
          // 处理被编码的 UNC：%5C%5Cserver%5Cshare%5C...
          try {
            const unc = decodeURIComponent(src)
            abs = unc.replace(/\//g, '\\')
          } catch { abs = src.replace(/%5[cC]/g, '\\') }
        } else if (/^file:/i.test(src)) {
          // 处理 file:// 形式，本地文件 URI 转为本地系统路径
          try {
            const u = new URL(src)
            let p = u.pathname || ''
            // Windows 场景：/D:/path => D:/path
            if (/^\/[a-zA-Z]:\//.test(p)) p = p.slice(1)
            p = decodeURIComponent(p)
            // 统一为 Windows 反斜杠，交由 convertFileSrc 处理
            if (/^[a-zA-Z]:\//.test(p)) p = p.replace(/\//g, '\\')
            abs = p
          } catch {
            abs = src.replace(/^file:\/\//i, '')
          }
        } else {
          const sep = base.includes('\\') ? '\\' : '/'
          const parts = (base + sep + src).split(/[\\/]+/)
          const stack: string[] = []
          for (const p of parts) {
            if (!p || p === '.') continue
            if (p === '..') { stack.pop(); continue }
            stack.push(p)
          }
          abs = base.includes('\\') ? stack.join('\\') : '/' + stack.join('/')
        }
        // 先监听错误，若 asset: 加载失败则回退为 data: URL
        let triedFallback = false
        const onError = async () => {
          if (triedFallback) return
          triedFallback = true
          try {
            if (typeof readFile !== 'function') return
            const bytes = await readFile(abs as any)
            // 通过 Blob+FileReader 转 data URL，避免手写 base64
            const mime = (() => {
              const m = (abs || '').toLowerCase().match(/\.([a-z0-9]+)$/)
              switch (m?.[1]) {
                case 'jpg':
                case 'jpeg': return 'image/jpeg'
                case 'png': return 'image/png'
                case 'gif': return 'image/gif'
                case 'webp': return 'image/webp'
                case 'bmp': return 'image/bmp'
                case 'avif': return 'image/avif'
                case 'ico': return 'image/x-icon'
                case 'svg': return 'image/svg+xml'
                default: return 'application/octet-stream'
              }
            })()
            const blob = new Blob([bytes], { type: mime })
            const dataUrl = await new Promise<string>((resolve, reject) => {
              try {
                const fr = new FileReader()
                fr.onerror = () => reject(fr.error || new Error('读取图片失败'))
                fr.onload = () => resolve(String(fr.result || ''))
                fr.readAsDataURL(blob)
              } catch (e) { reject(e as any) }
            })
            el.src = dataUrl
          } catch {}
        }
        el.addEventListener('error', onError, { once: true })

        const url = typeof convertFileSrc === 'function' ? convertFileSrc(abs) : abs
          try { (el as any).setAttribute('data-abs-path', abs) } catch {}
          try { if (typeof src === 'string') (el as any).setAttribute('data-raw-src', src) } catch {}
        el.src = url
      } catch {}
    })
  } catch {}

  // Mermaid 渲染：标准化为 <div class="mermaid"> 后逐个渲染为 SVG
  try {
    console.log('=== 开始 Mermaid 渲染流程 ===')
    // 情况1：<pre><code class="language-mermaid">...</code></pre>
    const codeBlocks = preview.querySelectorAll('pre > code.language-mermaid')
    console.log('找到 language-mermaid 代码块数量:', codeBlocks.length)
    codeBlocks.forEach((code) => {
      try {
        const pre = code.parentElement as HTMLElement
        const text = code.textContent || ''
        const div = document.createElement('div')
        div.className = 'mermaid'
        div.textContent = text
        pre.replaceWith(div)
      } catch {}
    })

    // 情况2：<pre class="mermaid">...</pre>
    const preMermaid = preview.querySelectorAll('pre.mermaid')
    console.log('找到 pre.mermaid 元素数量:', preMermaid.length)
    preMermaid.forEach((pre) => {
      try {
        const text = pre.textContent || ''
        const div = document.createElement('div')
        div.className = 'mermaid'
        div.textContent = text
        pre.replaceWith(div)
      } catch {}
    })

    const nodes = Array.from(preview.querySelectorAll('.mermaid')) as HTMLElement[]
    console.log(`找到 ${nodes.length} 个 Mermaid 节点`)
    if (nodes.length > 0) {
      let mermaid: any
      try {
        mermaid = (await import('mermaid')).default
      } catch (e1) {
        if (!wysiwyg) console.warn('加载 mermaid 失败，尝试 ESM 备用路径...', e1)
        try {
          mermaid = (await import('mermaid/dist/mermaid.esm.mjs')).default
        } catch (e2) {
          console.error('mermaid ESM 备用路径也加载失败', e2)
          throw e2
        }
      }
      // 所见模式下，进一步静默 mermaid 的 parseError 回调，避免控制台噪音
      try {
        if (wysiwyg) {
          try { (mermaid as any).parseError = () => {} } catch {}
          try { if ((mermaid as any).mermaidAPI) (mermaid as any).mermaidAPI.parseError = () => {} } catch {}
        }
      } catch {}
      if (!mermaidReady) {
        // 初始化 Mermaid；所见模式下降低日志级别，避免错误信息干扰输入体验
        mermaid.initialize(getMermaidConfig())
        mermaidReady = true
        console.log('Mermaid 已初始化')
        try { decorateCodeBlocks(preview) } catch {}
      } else {
        // 已初始化时，动态调整主题（切换所见/预览模式或夜间模式时生效）
        try {
          mermaid.initialize(getMermaidConfig())
        } catch {}
      }
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i]
        const code = el.textContent || ''
        const hash = hashMermaidCode(code)
        const desiredId = `${hash}-${mermaidSvgCacheVersion}-${i}`
        console.log(`渲染 Mermaid 图表 ${i + 1}:`, code.substring(0, 50))
        try {
          let svgMarkup = getCachedMermaidSvg(code, desiredId)
          let cacheHit = false
          if (svgMarkup) {
            cacheHit = true
            console.log(`Mermaid 图表 ${i + 1} 使用缓存，ID: ${desiredId}`)
          } else {
            const renderId = `${hash}-${Date.now()}-${i}`
            const { svg } = await mermaid.render(renderId, code)
            cacheMermaidSvg(code, svg, renderId)
            svgMarkup = svg.split(renderId).join(desiredId)
            console.log(`Mermaid 图表 ${i + 1} 首次渲染完成，缓存已更新`)
          }
          const wrap = document.createElement('div')
          wrap.innerHTML = svgMarkup || ''
          const svgEl = wrap.firstElementChild as SVGElement | null
          console.log(`Mermaid 图表 ${i + 1} SVG 元素:`, svgEl?.tagName, svgEl?.getAttribute('viewBox'))
          if (svgEl) { try { normalizeMermaidSvg(svgEl) } catch {}
            svgEl.setAttribute('data-mmd-hash', hash)
            svgEl.setAttribute('data-mmd-cache', cacheHit ? 'hit' : 'miss')
            if (!svgEl.id) svgEl.id = desiredId
            const fig = document.createElement('div')
            fig.className = 'mmd-figure'
            fig.appendChild(svgEl)
            try { fig.appendChild(createMermaidToolsFor(svgEl)) } catch {}
            el.replaceWith(fig)
            try { postAttachMermaidSvgAdjust(svgEl) } catch {}
            console.log(`Mermaid 图表 ${i + 1} 已插入 DOM（${cacheHit ? '缓存命中' : '新渲染'}）`)
            setTimeout(() => {
              const check = document.querySelector(`#${svgEl.id}`)
              console.log(`Mermaid 图表 ${i + 1} 检查 DOM 中是否存在:`, check ? '存在' : '不存在')
            }, 100)
          } else {
            throw new Error('生成的 SVG 节点为空')
          }
        } catch (err) {
          // 所见模式：完全静默；预览模式保留错误提示
          if (!wysiwyg) {
            console.error('Mermaid 单图渲染失败：', err)
            el.innerHTML = `<div style=\"color: red; border: 1px solid red; padding: 10px;\">Mermaid 渲染错误: ${err}</div>`
          }
        }
      }
    }
  } catch (e) {
    // 所见模式：完全静默；预览模式保留错误日志
    if (!wysiwyg) console.error('Mermaid 渲染失败：', e)
  }

  // 阅读/预览模式：在 Mermaid 渲染完成后统一依据当前全局缩放重算一次 SVG 宽度
  // 等价于用户手动点击一次工具条上的“R”，但不会修改缩放值本身，避免每次打开都需要手动复位
  try {
    if (!wysiwyg) adjustExistingMermaidSvgsForScale()
  } catch {}

  // 代码块装饰：委托到统一的 decorateCodeBlocks，避免重复实现导致行为不一致
  try { decorateCodeBlocks(preview) } catch {}

  // 首次预览完成打点
  try { if (!(renderPreview as any)._firstDone) { (renderPreview as any)._firstDone = true; logInfo('打点:首次预览完成') } } catch {}
}

// 拖拽支持：
function extIsImage(name: string): boolean {
  return /\.(png|jpe?g|gif|svg|webp|bmp|avif)$/i.test(name)
}

function insertAtCursor(text: string) {
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const val = editor.value
  editor.value = val.slice(0, start) + text + val.slice(end)
  const pos = start + text.length
  editor.selectionStart = editor.selectionEnd = pos
  dirty = true
  refreshTitle()
  refreshStatus()
}

// 文本格式化与插入工具
function wrapSelection(before: string, after: string, placeholder = '') {
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const val = editor.value
  const selected = val.slice(start, end) || placeholder
  const insert = `${before}${selected}${after}`
  editor.value = val.slice(0, start) + insert + val.slice(end)
  const selStart = start + before.length
  const selEnd = selStart + selected.length
  editor.selectionStart = selStart
  editor.selectionEnd = selEnd
  dirty = true
  refreshTitle()
  refreshStatus()
}

async function formatBold() {
  if (wysiwygV2Active) {
    try {
      // 所见模式 V2：直接在 Milkdown 内部对选区应用加粗命令，避免重置整个文档导致光标跳转
      await wysiwygV2ToggleBold()
      return
    } catch {}
  }
  wrapSelection('**', '**', '加粗文本')
}
async function formatItalic() {
  if (wysiwygV2Active) {
    try {
      // 所见模式 V2：直接在 Milkdown 内部对选区应用斜体命令
      await wysiwygV2ToggleItalic()
      return
    } catch {}
  }
  wrapSelection('*', '*', '斜体文本')
}
async function insertLink() {
  if (wysiwygV2Active) {
    const selectedText = wysiwygV2GetSelectedText()
    const preset = selectedText || '链接文本'
    const result = await openLinkDialog(preset, 'https://')
    if (!result || !result.url) return
    // 所见模式：传入 label，让内部根据“是否有选区”决定是覆盖选区还是插入一段新文本
    await wysiwygV2ApplyLink(result.url, result.label)
    return
  }
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const val = editor.value
  const labelPreset = val.slice(start, end) || '链接文本'
  const result = await openLinkDialog(labelPreset, 'https://')
  if (!result || !result.url) return
  const insert = `[${result.label}](${result.url})`
  editor.value = val.slice(0, start) + insert + val.slice(end)
  const pos = start + insert.length
  editor.selectionStart = editor.selectionEnd = pos
  dirty = true
  refreshTitle()
  refreshStatus()
}

async function fileToDataUrl(file: File): Promise<string> {
  // 使用 FileReader 生成 data URL，避免手动拼接带来的内存与性能问题
  return await new Promise<string>((resolve, reject) => {
    try {
      const fr = new FileReader()
      fr.onerror = () => reject(fr.error || new Error('读取文件失败'))
      fr.onload = () => resolve(String(fr.result || ''))
      fr.readAsDataURL(file)
    } catch (e) {
      reject(e as any)
    }
  })
}

// 粘贴/拖拽上传核心模块包装
const _imageUploader = createImageUploader({
  getEditorValue: () => editor.value,
  setEditorValue: (v: string) => { editor.value = v },
  getMode: () => mode,
  isWysiwyg: () => !!wysiwyg,
  renderPreview: () => { void renderPreview() },
  scheduleWysiwygRender: () => { try { scheduleWysiwygRender() } catch {} },
  markDirtyAndRefresh: () => {
    dirty = true
    refreshTitle()
    refreshStatus()
  },
  insertAtCursor: (text: string) => insertAtCursor(text),
  getCurrentFilePath: () => currentFilePath,
  isTauriRuntime: () => isTauriRuntime(),
  ensureDir: async (dir: string) => { try { await ensureDir(dir) } catch {} },
  getDefaultPasteDir: () => getDefaultPasteDir(),
  getUserPicturesDir: () => getUserPicturesDir(),
  getAlwaysSaveLocalImages: () => getAlwaysSaveLocalImages(),
  getUploaderConfig: () => getUploaderConfig(),
  getTranscodePrefs: () => getTranscodePrefs(),
  writeBinaryFile: async (path: string, bytes: Uint8Array) => { await writeFile(path as any, bytes as any) },
  fileToDataUrl: (f: File) => fileToDataUrl(f),
  transcodeToWebpIfNeeded: (blob, fname, quality, opts) => transcodeToWebpIfNeeded(blob, fname, quality, opts),
})

// 移动端“手动选择图片插入”：只要图床配置齐全就尝试上传（不要求额外打开 enabled 开关）
const _imageUploaderManualPick = createImageUploader({
  getEditorValue: () => editor.value,
  setEditorValue: (v: string) => { editor.value = v },
  getMode: () => mode,
  isWysiwyg: () => !!wysiwyg,
  renderPreview: () => { void renderPreview() },
  scheduleWysiwygRender: () => { try { scheduleWysiwygRender() } catch {} },
  markDirtyAndRefresh: () => {
    dirty = true
    refreshTitle()
    refreshStatus()
  },
  insertAtCursor: (text: string) => insertAtCursor(text),
  getCurrentFilePath: () => currentFilePath,
  isTauriRuntime: () => isTauriRuntime(),
  ensureDir: async (dir: string) => { try { await ensureDir(dir) } catch {} },
  getDefaultPasteDir: () => getDefaultPasteDir(),
  getUserPicturesDir: () => getUserPicturesDir(),
  getAlwaysSaveLocalImages: () => getAlwaysSaveLocalImages(),
  getUploaderConfig: () => getUploaderConfigAllowDisabled(),
  getTranscodePrefs: () => getTranscodePrefs(),
  writeBinaryFile: async (path: string, bytes: Uint8Array) => { await writeFile(path as any, bytes as any) },
  fileToDataUrl: (f: File) => fileToDataUrl(f),
  transcodeToWebpIfNeeded: (blob, fname, quality, opts) => transcodeToWebpIfNeeded(blob, fname, quality, opts),
})

// 运行时环境检测（是否在 Tauri 中）
function isTauriRuntime(): boolean {
  try {
    // Tauri v1/v2 均可通过以下全局标记判断
    // @ts-ignore
    return typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__)
  } catch { return false }
}

function setUpdateBadge(on: boolean, tip?: string) {
  try {
    const btn = document.getElementById('btn-update') as HTMLDivElement | null
    if (!btn) return
    if (on) {
      btn.classList.add('has-update')
      if (tip) btn.title = tip
    } else {
      btn.classList.remove('has-update')
    }
  } catch {}
}


async function checkUpdateInteractive() {
  try {
    // 使用通知系统显示检查进度
    const checkingId = NotificationManager.show('appUpdate', '正在检查更新…', 0)
    const resp = await invoke('check_update', { force: true, include_prerelease: false }) as any as CheckUpdateResp

    // 隐藏检查中的通知
    NotificationManager.hide(checkingId)

    if (!resp || !resp.hasUpdate) {
      setUpdateBadge(false)
      // 显示"已是最新版本"通知（5秒后消失）
      NotificationManager.show('appUpdate', `已是最新版本 v${APP_VERSION}`, 5000)
      return
    }

    setUpdateBadge(true, `发现新版本 v${resp.latest}`)
    const USE_OVERLAY_UPDATE = true; if (USE_OVERLAY_UPDATE) { await showUpdateOverlay(resp); return }
    // Windows：自动下载并运行；Linux：展示两个下载链接（依据后端返回的资产类型判断）
    if (resp.assetWin) {
      if (!resp.assetWin) {
        NotificationManager.show('appUpdate', '发现新版本，但未找到 Windows 安装包', 5000)
        await openInBrowser(resp.htmlUrl)
        return
      }
      const ok = await confirmNative(`发现新版本 v${resp.latest}（当前 v${resp.current}）\n是否立即下载并安装？`, '更新')
      if (!ok) {
        NotificationManager.show('appUpdate', '已取消更新', 3000)
        return
      }
      try {
        const downloadId = NotificationManager.show('appUpdate', '正在下载安装包…', 0)
        let savePath = ''
        {
          const direct = resp.assetWin.directUrl
          // 优先直连，其次备用代理
          const urls = [
            direct,
            'https://ghfast.top/' + direct,
            'https://gh-proxy.com/' + direct,
            'https://cdn.gh-proxy.com/' + direct,
            'https://edgeone.gh-proxy.com/' + direct,
          ]
          let ok = false
          for (const u of urls) {
            try {
              // 传 useProxy: false，避免后端二次拼接代理
              savePath = await invoke('download_file', { url: u, useProxy: false }) as any as string
              ok = true
              break
            } catch {}
          }
          if (!ok) throw new Error('all proxies failed')
        }
        NotificationManager.hide(downloadId)
        NotificationManager.show('appUpdate', '下载完成，正在启动安装…', 5000)
        try {
          await invoke('run_installer', { path: savePath })
          NotificationManager.show('appUpdate', '已启动安装程序，即将关闭…', 3000)
          setTimeout(() => { try { void getCurrentWindow().destroy() } catch {} }, 800)
        } catch (e) {
          showUpdateDownloadedOverlay(savePath, resp)
        }
      } catch (e) {
        NotificationManager.show('appUpdate', '下载或启动安装失败，将打开发布页', 5000)
        await openInBrowser(resp.htmlUrl)
      }
      return
    }
    // macOS：自动下载并打开（根据返回的双资产选择）
    if (resp.assetMacosArm || resp.assetMacosX64) {
      const a = (resp.assetMacosArm || resp.assetMacosX64) as UpdateAssetInfo
      const ok = await confirmNative(`发现新版本 v${resp.latest}（当前 v${resp.current}）\n是否立即下载并安装？`, '更新')
      if (!ok) {
        NotificationManager.show('appUpdate', '已取消更新', 3000)
        return
      }
      try {
        const downloadId = NotificationManager.show('appUpdate', '正在下载安装包…', 0)
        let savePath = ''
        {
          const direct = a.directUrl
          const urls = [
            direct,
            'https://ghfast.top/' + direct,
            'https://gh-proxy.com/' + direct,
            'https://cdn.gh-proxy.com/' + direct,
            'https://edgeone.gh-proxy.com/' + direct,
          ]
          let ok = false
          for (const u of urls) {
            try {
              savePath = await invoke('download_file', { url: u, useProxy: false }) as any as string
              ok = true
              break
            } catch {}
          }
          if (!ok) throw new Error('all proxies failed')
        }
        NotificationManager.hide(downloadId)
        NotificationManager.show('appUpdate', '下载完成，正在打开…', 5000)
        try {
          await openPath(savePath)
        } catch {
          showUpdateDownloadedOverlay(savePath, resp as any)
        }
      } catch (e) {
        NotificationManager.show('appUpdate', '下载或打开失败，将打开发布页', 5000)
        await openInBrowser(resp.htmlUrl)
      }
      return
    }

    // Android：下载 APK 并调用系统安装器
    if (resp.assetAndroid) {
      const a = resp.assetAndroid
      const ok = await confirmNative(`发现新版本 v${resp.latest}（当前 v${resp.current}）\n是否立即下载并安装？`, '更新')
      if (!ok) {
        NotificationManager.show('appUpdate', '已取消更新', 3000)
        return
      }
      try {
        const downloadId = NotificationManager.show('appUpdate', '正在下载安装包…', 0)
        let savePath = ''
        {
          const direct = a.directUrl
          // 优先直连，其次备用代理（与 PC 一致）
          const urls = [
            direct,
            'https://ghfast.top/' + direct,
            'https://gh-proxy.com/' + direct,
            'https://cdn.gh-proxy.com/' + direct,
            'https://edgeone.gh-proxy.com/' + direct,
          ]
          let ok = false
          for (const u of urls) {
            try {
              savePath = await invoke('download_file', { url: u, useProxy: false }) as any as string
              ok = true
              break
            } catch {}
          }
          if (!ok) throw new Error('all proxies failed')
        }
        NotificationManager.hide(downloadId)
        NotificationManager.show('appUpdate', '下载完成，正在启动安装…', 5000)
        try {
          await invoke('install_apk', { path: savePath })
          NotificationManager.show('appUpdate', '已启动安装程序', 3000)
        } catch (e) {
          // 安装失败，显示文件位置
          NotificationManager.show('appUpdate', `安装失败，APK 已保存至: ${savePath}`, 10000)
        }
      } catch (e) {
        NotificationManager.show('appUpdate', '下载失败，将打开发布页', 5000)
        await openInBrowser(resp.htmlUrl)
      }
      return
    }

    // Linux：展示选择
    showUpdateOverlayLinux(resp)
  } catch (e) {
    upMsg('检查更新失败')
  }
}


// Windows：下载并尝试安装（直连/代理轮试），失败时弹出失败提示
async function downloadAndInstallWin(asset: UpdateAssetInfo, resp: CheckUpdateResp) {
  try {
    upMsg('正在下载安装包…')
    let savePath = ''
    const direct = asset.directUrl
    const urls = [
      direct,
      'https://ghfast.top/' + direct,
      'https://gh-proxy.com/' + direct,
      'https://cdn.gh-proxy.com/' + direct,
      'https://edgeone.gh-proxy.com/' + direct,
    ]
    let ok = false
    for (const u of urls) {
      try {
        // 传 useProxy: false，避免后端二次拼接代理
        savePath = await (invoke as any)('download_file', { url: u, useProxy: false }) as string
        ok = true
        break
      } catch {}
    }
    if (!ok) throw new Error('all proxies failed')
    upMsg('下载完成，正在启动安装…')
    try {
      await (invoke as any)('run_installer', { path: savePath })
      upMsg('已启动安装程序，即将关闭…')
      try { setTimeout(() => { try { void getCurrentWindow().destroy() } catch {} }, 800) } catch {}
    } catch (e) {
      // 安装启动失败 → 弹失败窗口
      showInstallFailedOverlay(savePath, resp)
    }
  } catch (e) {
    upMsg('下载或启动安装失败，将打开发布页')
    try { await openInBrowser(resp.htmlUrl) } catch {}
  }
}

// 统一的更新弹窗：展示 notes，并按平台提供操作按钮
async function showUpdateOverlay(resp: CheckUpdateResp) {
  const ov = ensureUpdateOverlay()
  const body = ov.querySelector('#update-body') as HTMLDivElement
  const act = ov.querySelector('#update-actions') as HTMLDivElement
  const extra = await loadUpdateExtra().catch(() => null)
  body.innerHTML = await renderUpdateDetailsHTML(resp, extra)
  act.innerHTML = ''
  const mkBtn = (label: string, onClick: () => void) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', onClick); act.appendChild(b); return b }

  // Windows：立即更新 + 发布页
  if (resp.assetWin) {
    { const b = mkBtn('立即更新', () => { ov.classList.add('hidden'); void downloadAndInstallWin(resp.assetWin!, resp) }); try { b.classList.add('btn-primary') } catch {} }
    { const b = mkBtn('发布页', () => { void openInBrowser(resp.htmlUrl) }); try { b.classList.add('btn-secondary') } catch {} }
    ov.classList.remove('hidden')
    return
  }
  // macOS：若提供资产，直接下载后 open；否则仅发布页
  if (resp.assetMacosArm || resp.assetMacosX64) {
    const a = (resp.assetMacosArm || resp.assetMacosX64) as UpdateAssetInfo
    { const b = mkBtn('立即更新', async () => {
      ov.classList.add('hidden')
      try {
        upMsg('正在下载安装包…')
        let savePath = ''
        const direct = a.directUrl
        const urls = [direct, 'https://ghfast.top/' + direct, 'https://gh-proxy.com/' + direct, 'https://cdn.gh-proxy.com/' + direct, 'https://edgeone.gh-proxy.com/' + direct]
        let ok = false
        for (const u of urls) { try { savePath = await (invoke as any)('download_file', { url: u, useProxy: false }) as string; ok = true; break } catch {} }
        if (!ok) throw new Error('all proxies failed')
        upMsg('下载完成，正在打开…')
        try { await openPath(savePath) } catch { showInstallFailedOverlay(savePath, resp) }
      } catch { try { await openInBrowser(resp.htmlUrl) } catch {} }
    }); try { b.classList.add('btn-primary') } catch {} }
    { const b = mkBtn('发布页', () => { void openInBrowser(resp.htmlUrl) }); try { b.classList.add('btn-secondary') } catch {} }
    ov.classList.remove('hidden')
    return
  }
  // Android：浏览器下载 APK（直连/镜像）+ 发布页
  if (resp.assetAndroid) {
    const a = resp.assetAndroid as UpdateAssetInfo
    { const b = mkBtn('浏览器下载', () => { void openInBrowser(a.directUrl) }); try { b.classList.add('btn-primary') } catch {} }
    { const b = mkBtn('镜像下载', () => { void openInBrowser('https://ghfast.top/' + a.directUrl) }); try { b.classList.add('btn-secondary') } catch {} }
    { const b = mkBtn('发布页', () => { void openInBrowser(resp.htmlUrl) }); try { b.classList.add('btn-secondary') } catch {} }
    ov.classList.remove('hidden')
    return
  }
  // Linux：沿用现有按钮组
  showUpdateOverlayLinux(resp)
}

function checkUpdateSilentOnceAfterStartup() {
  try {
    setTimeout(async () => {
      try {
        const resp = await invoke('check_update', { force: false, include_prerelease: false }) as any as CheckUpdateResp
        if (resp && resp.hasUpdate) {
          setUpdateBadge(true, `发现新版本 v${resp.latest}`)
          // 显示应用更新通知（10秒后自动消失，点击打开更新对话框）
          NotificationManager.show('appUpdate', `发现新版本 v${resp.latest}，点击查看详情`, 10000, () => {
            showUpdateOverlay(resp)
          })
        }
      } catch {
        // 静默失败不提示
      }
    }, 5000)
  } catch {}
}

// 获取当前模式的滚动百分比
function getScrollPercent(): number {
  try {
    if (wysiwyg) {
      const el = (document.querySelector('#md-wysiwyg-root .scrollView') || document.getElementById('md-wysiwyg-root')) as HTMLElement | null
      if (!el) return 0
      const max = el.scrollHeight - el.clientHeight
      return max > 0 ? el.scrollTop / max : 0
    }
    if (mode === 'preview') {
      const max = preview.scrollHeight - preview.clientHeight
      return max > 0 ? preview.scrollTop / max : 0
    }
    const max = editor.scrollHeight - editor.clientHeight
    return max > 0 ? editor.scrollTop / max : 0
  } catch {
    return 0
  }
}

// 设置当前模式的滚动百分比
function setScrollPercent(percent: number) {
  try {
    const p = Math.max(0, Math.min(1, percent))
    if (wysiwyg) {
      const el = (document.querySelector('#md-wysiwyg-root .scrollView') || document.getElementById('md-wysiwyg-root')) as HTMLElement | null
      if (el) el.scrollTop = p * (el.scrollHeight - el.clientHeight)
    } else if (mode === 'preview') {
      preview.scrollTop = p * (preview.scrollHeight - preview.clientHeight)
    } else {
      editor.scrollTop = p * (editor.scrollHeight - editor.clientHeight)
    }
    // 防御性修复：确保页面本身不会被滚动（长文本时可能出现异常）
    try { document.documentElement.scrollTop = 0 } catch {}
    try { document.body.scrollTop = 0 } catch {}
  } catch {}
}

// 保存当前滚动位置到全局缓存
function saveScrollPosition() {
  lastScrollPercent = getScrollPercent()
}

// 恢复滚动位置（带重试机制确保DOM就绪）
function restoreScrollPosition(retries = 3, delay = 50) {
  const apply = () => setScrollPercent(lastScrollPercent)
  apply()  // 立即尝试一次
  if (retries > 0) {
    // 延迟重试，应对DOM未完全就绪的情况
    setTimeout(() => apply(), delay)
    if (retries > 1) setTimeout(() => apply(), delay * 2)
    if (retries > 2) setTimeout(() => apply(), delay * 4)
  }
}

// 切换模式
async function toggleMode() {
  saveScrollPosition()  // 保存当前滚动位置到全局缓存
  mode = mode === 'edit' ? 'preview' : 'edit'
  if (mode === 'preview') {
    try { updateWysiwygVirtualPadding() } catch {}
    try { preview.classList.remove('hidden') } catch {}
    try { await renderPreview() } catch {}
    restoreScrollPosition(2, 50)  // 带重试机制恢复滚动位置
  } else {
    if (!wysiwyg) try { preview.classList.add('hidden') } catch {}
    try { editor.focus() } catch {}
    restoreScrollPosition()  // 带重试机制恢复滚动位置
  }
  ;(document.getElementById('btn-toggle') as HTMLButtonElement).textContent = mode === 'edit' ? '阅读' : '源码'
  // 模式切换后，如大纲面板可见，强制按当前模式重建一次大纲
  try {
    const outline = document.getElementById('lib-outline') as HTMLDivElement | null
    if (outline && !outline.classList.contains('hidden')) {
      _outlineLastSignature = ''
      renderOutlinePanel()
      if (mode !== 'edit') bindOutlineScrollSync()
    }
  } catch {}
  // 触发模式变更事件（专注模式侧栏背景跟随）
  try { window.dispatchEvent(new CustomEvent('flymd:mode:changed', { detail: { mode } })) } catch {}
  try { notifyModeChange() } catch {}
}

// 提取 Ctrl+E 的切换逻辑，供快捷键和其它入口共用
async function handleToggleModeShortcut() {
  if (wysiwyg) {
    try { await setWysiwygEnabled(false) } catch {}
    try { notifyModeChange() } catch {}
    // 更新专注模式侧栏背景色
    setTimeout(() => updateFocusSidebarBg(), 100)
    return
  }
  await toggleMode()
  // 更新专注模式侧栏背景色
  setTimeout(() => updateFocusSidebarBg(), 100)
}

// 打开文件
async function openFile(preset?: string) {
  try {
    // 切换前不再在未选择目标时询问，改在明确了目标文件后判断是否需要保存

    if (!preset) {
      // 检查 Tauri API 是否可用
      if (typeof open !== 'function') {
        alert('文件打开功能需要在 Tauri 应用中使用')
        return
      }
    }

    // 兼容 macOS 场景：部分环境下 multiple:false 仍可能返回数组；若为数组取首个
     let selected: any = preset ?? (await open({ multiple: false, filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }] }))
    if (!selected) return
    if (Array.isArray(selected)) {
      if (selected.length < 1) return
      selected = selected[0]
    }
    const selectedPath = (typeof selected === 'string')
      ? selected
      : ((selected as any)?.path ?? (selected as any)?.filePath ?? String(selected))






    logInfo('���ļ�', { path: selectedPath })
    // 读取文件内容：优先使用 fs 插件；若因路径权限受限（forbidden path）则回退到自定义后端命令
    let content: string
    try {
      content = await readTextFileAnySafe(selectedPath as any)
    } catch (e: any) {
      const msg = (e && (e.message || e.toString?.())) ? String(e.message || e.toString()) : ''
      if (/forbidden\s*path/i.test(msg) || /not\s*allowed/i.test(msg)) {
        try {
          content = await invoke<string>('read_text_file_any', { path: selectedPath })
        } catch (e2) {
          throw e2
        }
      } else {
        throw e
      }
    }
    editor.value = content
    currentFilePath = selectedPath
    dirty = false
    refreshTitle()
    refreshStatus()
    await switchToPreviewAfterOpen()
    // 打开后恢复上次阅读/编辑位置
    await restoreDocPosIfAny(selectedPath)
    await pushRecent(currentFilePath)
    await renderRecentPanel(false)
    logInfo('�ļ����سɹ�', { path: selectedPath, size: content.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('invoke') || msg.includes('Tauri')) {
      alert('此功能需要在 Tauri 桌面应用中使用\n当前运行在浏览器环境')
    }
    showError('打开文件失败', error)
  }
}

// 全新的文件打开实现（避免历史遗留的路径处理问题）
async function openFile2(preset?: unknown) {
  try {
    // 如果是事件对象（点击/键盘），忽略它，相当于未传入预设路径
    if (preset && typeof preset === 'object') {
      const evt = preset as any
      if ('isTrusted' in evt || 'target' in evt || typeof evt?.preventDefault === 'function') {
        preset = undefined
      }
    }

    if (!preset && dirty) {
      const confirmed = await confirmNative('当前文件尚未保存，是否放弃更改并继续打开？', '打开文件')
      if (!confirmed) { logDebug('用户取消打开文件操作（未保存）'); return }
    }

    if (!preset) {
      if (typeof open !== 'function') {
        alert('文件打开功能需要在 Tauri 应用中使用')
        return
      }
    }

    // 兼容 macOS 场景：部分环境下 multiple:false 仍可能返回数组；若为数组取首个
    let selected: any = (typeof preset === 'string')
      ? preset
      : (await open({ multiple: false, filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
        { name: 'PDF', extensions: ['pdf'] },
      ] }))
    if (!selected) return
    if (Array.isArray(selected)) { if (selected.length < 1) return; selected = selected[0] }

    const selectedPath = normalizePath(selected)
    // 同一文件且当前存在未保存内容时，避免误覆盖编辑态
    const currentPathNormalized = currentFilePath ? normalizePath(currentFilePath) : ''
    const reopeningSameFile = !!currentPathNormalized && currentPathNormalized === selectedPath
    if (reopeningSameFile && dirty) {
      const shouldReload = await confirmNative('当前文档存在未保存的更改，重新加载将放弃这些内容，是否继续？', '重新加载文档')
      if (!shouldReload) {
        logDebug('openFile2.skipSameFileReload', { selectedPath })
        return
      }
    }
    logDebug('openFile2.selected', { typeof: typeof selected, selected })
    logDebug('openFile2.normalizedPath', { typeof: typeof selectedPath, selectedPath })

    // 记录当前是否处于所见模式，以便在打开新文档后按需恢复
    const wasWysiwyg = !!wysiwyg

    // 若当前有未保存更改，且目标文件不同，则先询问是否保存
    if (dirty && selectedPath && selectedPath !== currentFilePath) {
      const doSave = await confirmNative('当前文档已修改，是否保存后再切换？', '切换文档')
      if (doSave) {
        await saveFile()
      }
      // 选择“否”时直接继续切换；取消由 confirmNative 返回 false 的语义中无法区分“否/取消”，因此默认视为不保存继续
    }

    // PDF 预览分支：在读取文本前拦截处理
    try {
      const ext = (selectedPath.split(/\./).pop() || '').toLowerCase()
      if (ext === 'pdf') {
        currentFilePath = selectedPath as any
        dirty = false
        refreshTitle()
        try { (editor as HTMLTextAreaElement).value = '' } catch {}
        // 首选 convertFileSrc 以便 WebView 内置 PDF 查看器接管
        let srcUrl: string = typeof convertFileSrc === 'function' ? convertFileSrc(selectedPath) : (selectedPath as any)
        _currentPdfSrcUrl = srcUrl
        preview.innerHTML = `
          <div class="pdf-preview" style="width:100%;height:100%;">
            <iframe src="${srcUrl}" title="PDF 预览" style="width:100%;height:100%;border:0;" allow="fullscreen"></iframe>
          </div>
        `
        // 若当前处于所见模式，关闭所见，确保 PDF 预览正常显示
        try { if (wysiwyg) { await setWysiwygEnabled(false) } } catch {}
        mode = 'preview'
        try { preview.classList.remove('hidden') } catch {}
        try { syncToggleButton() } catch {}
        try { notifyModeChange() } catch {}
        await pushRecent(currentFilePath)
        await renderRecentPanel(false)
        logInfo('PDF 预览就绪', { path: selectedPath })
        return
      }
    } catch {}

    // 读取文件内容：优先使用 fs 插件；若因路径权限受限（forbidden path / not allowed）回退到后端命令
    _currentPdfSrcUrl = null
    let content: string
    try {
      content = await readTextFileAnySafe(selectedPath as any)
    } catch (e: any) {
      const msg = (e && (e.message || (e.toString?.()))) ? String(e.message || e.toString()) : ''
      const isForbidden = /forbidden\s*path/i.test(msg) || /not\s*allowed/i.test(msg) || /EACCES|EPERM|Access\s*Denied/i.test(msg)
      if (isForbidden && typeof invoke === 'function') {
        // 使用后端无范围限制的读取作为兜底
        content = await invoke<string>('read_text_file_any', { path: selectedPath })
      } else {
        throw e
      }
    }
    editor.value = content
    currentFilePath = selectedPath
    dirty = false
    refreshTitle()
    refreshStatus()

    // 若之前处于所见模式，先关闭所见（包括 V2），避免跨文档复用同一 Milkdown 实例导致状态错乱
    if (wasWysiwyg) {
      try { await setWysiwygEnabled(false) } catch {}
    }

    // 打开后默认进入预览模式
    await switchToPreviewAfterOpen()

    // 检查“默认所见模式”设置，并结合之前是否处于所见模式，决定是否自动重新启用
    try {
      const WYSIWYG_DEFAULT_KEY = 'flymd:wysiwyg:default'
      const wysiwygDefault = localStorage.getItem(WYSIWYG_DEFAULT_KEY) === 'true'
      const shouldEnableWysiwyg = wysiwygDefault || wasWysiwyg
      if (shouldEnableWysiwyg && !wysiwyg) {
        // 延迟一小段时间，确保预览已渲染，再切换到所见 V2
        setTimeout(async () => {
          try {
            await setWysiwygEnabled(true)
            console.log('[WYSIWYG] 打开文档后自动启用所见模式', { wysiwygDefault, wasWysiwyg })
          } catch (e) {
            console.error('[WYSIWYG] 打开文档后启用所见模式失败:', e)
          }
        }, 100)
      }
    } catch (e) {
      console.error('[WYSIWYG] 检查默认所见模式设置失败:', e)
    }

    // 恢复上次阅读/编辑位置（编辑器光标/滚动与预览滚动）
    await restoreDocPosIfAny(selectedPath)
    await pushRecent(currentFilePath)
    await renderRecentPanel(false)
    logInfo('文件打开成功', { path: selectedPath, size: content.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('invoke') || msg.includes('Tauri')) {
      alert('此功能需要在 Tauri 桌面应用中使用\n当前运行在浏览器环境')
    }
    showError('打开文件失败', error)
  }
}

// 保存文件
async function saveFile() {
  try {
    if (!currentFilePath) {
      await saveAs()
      return
    }

    // 检查 Tauri API
    if (typeof writeTextFile !== 'function') {
      alert('文件保存功能需要在 Tauri 应用中使用')
      return
    }

    logInfo('保存文件', { path: currentFilePath })
    try {
      await writeTextFileAnySafe(currentFilePath, editor.value)
    } catch (e: any) {
      const msg = (e && (e.message || (e.toString?.()))) ? String(e.message || e.toString()) : ''
      const isForbidden = /forbidden\s*path/i.test(msg) || /not\s*allowed/i.test(msg) || /EACCES|EPERM|Access\s*Denied/i.test(msg)
      if (isForbidden && typeof invoke === 'function') {
        await invoke('write_text_file_any', { path: currentFilePath, content: editor.value })
      } else {
        throw e
      }
    }
    dirty = false
    refreshTitle()
    // 通知标签系统文件已保存
    window.dispatchEvent(new CustomEvent('flymd-file-saved'))
    await pushRecent(currentFilePath)
    await renderRecentPanel(false)
    logInfo('文件保存成功', { path: currentFilePath, size: editor.value.length })
    status.textContent = '文件已保存'
    setTimeout(() => refreshStatus(), 2000)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('invoke') || msg.includes('Tauri')) {
      alert('此功能需要在 Tauri 桌面应用中使用\n当前运行在浏览器环境')
    }
    showError('保存文件失败', error)
  }
}

async function exportCurrentDocToPdf(target: string): Promise<void> {
  const out = String(target || '').trim()
  if (!out) throw new Error('导出 PDF 目标路径为空')
  if (typeof writeFile !== 'function') {
    alert('导出 PDF 功能需要在 Tauri 应用中使用')
    throw new Error('writeFile not available')
  }
  status.textContent = '正在导出 PDF...'
  await renderPreview()
  const el = preview.querySelector('.preview-body') as HTMLElement | null
  if (!el) throw new Error('未找到预览内容容器')
  const { exportPdf } = await import('./exporters/pdf')
  const bytes = await exportPdf(el, {})
  await writeFile(out as any, bytes as any)
  status.textContent = '已导出'
  setTimeout(() => refreshStatus(), 2000)
}

// 另存为
async function saveAs() {
  try {
    // 检查 Tauri API
    if (typeof save !== 'function') {
      alert('文件保存功能需要在 Tauri 应用中使用')
      return
    }

    const guessName = () => {
      try {
        if (currentFilePath) {
          const s = String(currentFilePath)
          const parts = s.replace(/\\/g, '/').split('/')
          const last = parts[parts.length - 1] || ''
          if (last) return last
        }
      } catch {}
      return 'untitled.md'
    }

    const joinPath = (dir: string, name: string) => {
      const d = String(dir || '').trim().replace(/[\\/]+$/, '')
      const n = String(name || '').trim().replace(/^[\\/]+/, '')
      if (!d) return n
      const sep = d.includes('\\') ? '\\' : '/'
      return d + sep + n
    }

    // 让“另存为”默认落在当前库目录（仅对普通路径有效；content:// 目录无法作为 defaultPath）
    let defaultPath: string | undefined = undefined
    try {
      const name = guessName()
      const root = await getLibraryRoot()
      const isContent = (p: string | null) => !!(p && typeof p === 'string' && p.startsWith('content://'))
      if (!isContent(currentFilePath as any) && currentFilePath) {
        const p = String(currentFilePath)
        const dir = p.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
        if (dir) defaultPath = joinPath(dir, name)
      } else if (root && !isContent(root)) {
        defaultPath = joinPath(root, name)
      } else {
        defaultPath = name
      }
    } catch {}

    const target = await save({
      defaultPath,
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Word (DOCX)', extensions: ['docx'] },
        { name: 'WPS', extensions: ['wps'] },
      ]
    })
    if (!target) {
      logDebug('用户取消另存为操作')
      return
    }
    logInfo('另存为文件', { path: target })
    // 导出分支：根据扩展名处理 PDF/DOCX/WPS
    const ext = (() => { const m = String(target).toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ''; })();
    if (ext === 'pdf' || ext === 'docx' || ext === 'wps') {
      try {
        if (ext === 'pdf') {
          status.textContent = '正在导出 PDF...';
          await renderPreview();
          const el = preview.querySelector('.preview-body') as HTMLElement | null;
          if (!el) throw new Error('未找到预览内容容器');
          const { exportPdf } = await import('./exporters/pdf');
          const bytes = await exportPdf(el, {});
          await writeFile(target as any, bytes as any);
        } else {
          status.textContent = '正在导出 ' + ext.toUpperCase() + '...';
          await renderPreview();
          const el = preview.querySelector('.preview-body') as HTMLElement | null;
          if (!el) throw new Error('未找到预览内容容器');
          const html = el.outerHTML;
          if (ext === 'docx') {
            const { exportDocx } = await import('./exporters/docx');
            const bytes = await exportDocx(el as any, {});
            await writeFile(target as any, bytes as any);
          } else {
            const { exportWps } = await import('./exporters/wps');
            const bytes = await exportWps(html as any, {});
            await writeFile(target as any, bytes as any);
          }
        }
        currentFilePath = target;
        dirty = false;
        refreshTitle();
        await pushRecent(currentFilePath);
        await renderRecentPanel(false);
        logInfo('文件导出成功', { path: target, ext });
        status.textContent = '已导出';
        setTimeout(() => refreshStatus(), 2000);
        return;
      } catch (e) {
        showError('导出失败', e);
        return;
      }
    }
    try {
      await writeTextFileAnySafe(target, editor.value)
    } catch (e: any) {
      const msg = (e && (e.message || (e.toString?.()))) ? String(e.message || e.toString()) : ''
      const isForbidden = /forbidden\s*path/i.test(msg) || /not\s*allowed/i.test(msg) || /EACCES|EPERM|Access\s*Denied/i.test(msg)
      if (isForbidden && typeof invoke === 'function') {
        await invoke('write_text_file_any', { path: target, content: editor.value })
      } else {
        throw e
      }
    }
    currentFilePath = target
    dirty = false
    refreshTitle()
    await pushRecent(currentFilePath)
    await renderRecentPanel(false)
    logInfo('文件另存为成功', { path: target, size: editor.value.length })
    status.textContent = '文件已保存'
    setTimeout(() => refreshStatus(), 2000)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('invoke') || msg.includes('Tauri')) {
      alert('此功能需要在 Tauri 桌面应用中使用\n当前运行在浏览器环境')
    }
    showError('另存为失败', error)
  }
}

// 新建
async function newFile() {
  if (dirty) {
    const saveIt = await confirmNative('当前文档已修改，是否保存后再新建？', '新建文件')
    if (saveIt) { await saveFile() }
    // 选择否/取消：继续新建但不保存（confirmNative 无法区分，按否处理）
  }
  editor.value = ''
  currentFilePath = null
  dirty = false
  refreshTitle()
  refreshStatus()
  if (mode === 'preview') {
          await renderPreview()
  } else if (wysiwyg) {
    scheduleWysiwygRender()
  }
}

// 最近文件管理
async function getRecent(): Promise<string[]> {
  if (!store) return []
  try {
    const value = (await store.get('recent')) as string[] | undefined
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

async function pushRecent(path: string) {
  if (!store) return
  try {
    const list = await getRecent()
    const filtered = [path, ...list.filter((p) => p !== path)].slice(0, RECENT_MAX)
    await store.set('recent', filtered)
    await store.save()
  } catch (e) {
    console.warn('保存最近文件失败:', e)
  }
}

// 渲染/切换 最近文件 面板
async function renderRecentPanel(toggle = true) {
  const panel = document.getElementById('recent-panel') as HTMLDivElement
  if (!panel) return
  const recents = await getRecent()
  if (recents.length === 0) {
    panel.innerHTML = '<div class="empty">暂时没有最近文件</div>'
  } else {
    panel.innerHTML = recents
      .filter(p => p != null && typeof p === 'string')
      .map(
        (p, idx) =>
          `<div class=\"item\" data-path=\"${p.replace(/\"/g, '&quot;')}\">` +
          `${idx + 1}. ${p.split(/[/\\\\]/).pop()}` +
          `<div class=\"path\">${p}</div>` +
          `</div>`
      )
      .join('')
  }
  // 绑定点击
  panel.querySelectorAll('.item').forEach((el) => {
    el.addEventListener('click', async () => {
      const p = (el as HTMLDivElement).dataset.path!
      await openFile2(p)
      panel.classList.add('hidden')
    })
  })
  if (toggle) panel.classList.toggle('hidden')
}

// 同步预览/编辑按钮文案，避免编码问题
function syncToggleButton() {
  try {
    const btn = document.getElementById('btn-toggle') as HTMLButtonElement | null
    if (btn) btn.textContent = mode === 'edit' ? '\u9884\u89c8' : '\u7f16\u8f91'
  } catch {}
}

// 打开文件后强制切换为预览模式
async function switchToPreviewAfterOpen() {
  try {
    // 所见模式会在外部显式关闭/重新开启，这里只负责普通预览
    if (wysiwyg) return

    // 如果开启了“默认源码模式”，则保持源码编辑视图，不自动切到预览
    try {
      const SOURCEMODE_DEFAULT_KEY = 'flymd:sourcemode:default'
      const sourcemodeDefault = localStorage.getItem(SOURCEMODE_DEFAULT_KEY) === 'true'
      if (sourcemodeDefault) {
        mode = 'edit'
        try { preview.classList.add('hidden') } catch {}
        try { syncToggleButton() } catch {}
        try { notifyModeChange() } catch {}
        return
      }
    } catch {}

    mode = 'preview'
    try { await renderPreview() } catch (e) { try { showError('预览渲染失败', e) } catch {} }
    try { preview.classList.remove('hidden') } catch {}
    try { syncToggleButton() } catch {}
  } catch {}
}

// 绑定事件


// 显示/隐藏 关于 弹窗
async function getLibraryRoot(): Promise<string | null> {
  // 统一通过 utils 获取当前激活库（兼容 legacy）
  try { return await getActiveLibraryRoot() } catch { return null }
}

async function setLibraryRoot(p: string) {
  // 兼容旧代码：设置库路径即插入/更新库并设为激活
  try { await upsertLibrary({ root: p }) } catch {}
}

// —— 大纲滚动同步 ——
let _outlineScrollBound = false
let _outlineActiveId = ''
let _outlineRaf = 0
function getOutlineContext(): { mode: 'wysiwyg'|'preview'|'source'; scrollEl: HTMLElement | null; bodyEl: HTMLElement | null; heads: HTMLElement[] } {
  try {
    if (wysiwyg) {
      const rootEl = document.getElementById('md-wysiwyg-root') as HTMLElement | null
      const scrollEl = (document.querySelector('#md-wysiwyg-root .scrollView') as HTMLElement | null) || rootEl
      const bodyEl = document.querySelector('#md-wysiwyg-root .ProseMirror') as HTMLElement | null
      const heads = bodyEl ? Array.from(bodyEl.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[] : []
      if (scrollEl && bodyEl) return { mode: 'wysiwyg', scrollEl, bodyEl, heads }
    }
  } catch {}
  try {
    const scrollEl = document.querySelector('.preview') as HTMLElement | null
    const bodyEl = document.querySelector('.preview .preview-body') as HTMLElement | null
    const heads = bodyEl ? Array.from(bodyEl.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[] : []
    if (scrollEl && bodyEl) return { mode: 'preview', scrollEl, bodyEl, heads }
  } catch {}
  return { mode: 'source', scrollEl: null, bodyEl: null, heads: [] }
}
let _outlineScrollBoundPreview = false
let _outlineScrollBoundWysiwyg = false
function bindOutlineScrollSync() {
  const prev = document.querySelector('.preview') as HTMLElement | null
  if (prev && !_outlineScrollBoundPreview) { prev.addEventListener('scroll', onOutlineScroll, { passive: true }); _outlineScrollBoundPreview = true }
  const wysi = document.getElementById('md-wysiwyg-root') as HTMLElement | null
  const wysiScroll = (document.querySelector('#md-wysiwyg-root .scrollView') as HTMLElement | null) || wysi
  if (wysiScroll && !_outlineScrollBoundWysiwyg) { wysiScroll.addEventListener('scroll', onOutlineScroll, { passive: true }); _outlineScrollBoundWysiwyg = true }
  _outlineScrollBound = _outlineScrollBoundPreview || _outlineScrollBoundWysiwyg
}
function onOutlineScroll() {
  if (_outlineRaf) cancelAnimationFrame(_outlineRaf)
  _outlineRaf = requestAnimationFrame(() => { try { updateOutlineActive() } catch {} })
}
function updateOutlineActive() {
  try {
    const { scrollEl: pv, bodyEl: body } = getOutlineContext()
    const outline = document.getElementById('lib-outline') as HTMLDivElement | null
    if (!pv || !body || !outline || outline.classList.contains('hidden')) return
    const heads = Array.from(body.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[]
    if (heads.length === 0) return
    const pvRect = pv.getBoundingClientRect()
    const threshold = pvRect.top + 60
    let active: HTMLElement | null = null
    for (const h of heads) { const r = h.getBoundingClientRect(); if (r.top <= threshold) active = h; else break }
    if (!active) active = heads[0]
    const id = active.getAttribute('id') || ''
    if (!id || id === _outlineActiveId) return
    _outlineActiveId = id
    outline.querySelectorAll('.ol-item').forEach((el) => { (el as HTMLDivElement).classList.toggle('active', (el as HTMLDivElement).dataset.id === id) })
  } catch {}
}

// —— 大纲面板：从预览或源码提取 H1~H6，生成可点击目录 ——
function renderOutlinePanel() {
  try {
    const outline = document.getElementById('lib-outline') as HTMLDivElement | null
    if (!outline) return
    // PDF：优先读取书签目录
    try { if ((currentFilePath || '').toLowerCase().endsWith('.pdf')) { void renderPdfOutline(outline); return } } catch {}
    // 优先从当前上下文（WYSIWYG/预览）提取标题（仅在对应模式下启用）
    const ctx = getOutlineContext()
    const heads = ctx.heads
    // level: 标题级别；id: DOM 锚点或逻辑标识；text: 显示文本；offset: 源码中的大致字符偏移（仅源码模式下用于跳转）
    const items: { level: number; id: string; text: string; offset?: number }[] = []
    const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5\s-]/gi,'').replace(/\s+/g,'-').slice(0,64) || ('toc-' + Math.random().toString(36).slice(2))
    const useDomHeads = (wysiwyg || mode === 'preview') && heads.length > 0
    if (useDomHeads) {
      heads.forEach((h, idx) => {
        const tag = (h.tagName || 'H1').toUpperCase()
        const level = Math.min(6, Math.max(1, Number(tag.replace('H','')) || 1))
        let id = h.getAttribute('id') || ''
        const text = (h.textContent || '').trim() || ('标题 ' + (idx+1))
        if (!id) { id = slug(text + '-' + idx); try { h.setAttribute('id', id) } catch {} }
        items.push({ level, id, text })
      })
    } else {
      // 退化：从源码扫描 # 标题行
      const src = editor?.value || ''
      const lines = src.split(/\n/)
      let offset = 0
      lines.forEach((ln, i) => {
        const m = ln.match(/^(#{1,6})\s+(.+?)\s*$/)
        if (m) {
          const level = m[1].length
          const text = m[2].trim()
          const id = slug(text + '-' + i)
          // 记录标题在源码中的大致字符偏移，用于源码模式下跳转
          items.push({ level, id, text, offset })
        }
        // \n 按单字符累计；Windows 下的 \r\n 中 \r 已在 ln 末尾
        offset += ln.length + 1
      })
    }
    if (items.length === 0) { outline.innerHTML = '<div class="empty">未检测到标题</div>'; return }

    // 缓存命中：若本次大纲签名与上次相同，跳过重建，仅更新高亮
    try {
      const sig = JSON.stringify(items.map(it => [it.level, it.id, it.text]))
      if (sig === _outlineLastSignature && outline.childElementCount > 0) {
        updateOutlineActive();
        return
      }
      _outlineLastSignature = sig
    } catch {}

    // 计算是否有子级（用于折叠/展开，限制到 H1/H2）
    const hasChild = new Map<string, boolean>()
    for (let i = 0; i < items.length; i++) {
      const cur = items[i]
      if (cur.level > 2) continue
      let child = false
      for (let j = i + 1; j < items.length; j++) { if (items[j].level > cur.level) { child = true; break } if (items[j].level <= cur.level) break }
      hasChild.set(cur.id, child)
    }

    outline.innerHTML = items.map((it, idx) => {
      const tg = (it.level <= 2 && hasChild.get(it.id)) ? `<span class=\"ol-tg\" data-idx=\"${idx}\">▾</span>` : `<span class=\"ol-tg\"></span>`
      const off = (typeof it.offset === 'number' && it.offset >= 0) ? ` data-offset=\"${it.offset}\"` : ''
      return `<div class=\"ol-item lvl-${it.level}\" data-id=\"${it.id}\" data-idx=\"${idx}\"${off}>${tg}${it.text}</div>`
    }).join('')

    // 折叠状态记忆（基于当前文件路径）
    const key = 'outline-collapsed:' + (currentFilePath || 'untitled')
    const _raw = (() => { try { return localStorage.getItem(key) } catch { return null } })()
    const collapsed = new Set<string>(_raw ? (() => { try { return JSON.parse(_raw!) } catch { return [] } })() : [])
    const saveCollapsed = () => { try { localStorage.setItem(key, JSON.stringify(Array.from(collapsed))) } catch {} }

    // 应用折叠：根据被折叠的 id 隐藏其后代
    function applyCollapse() {
      try {
        const nodes = Array.from(outline.querySelectorAll('.ol-item')) as HTMLDivElement[]
        // 先全部显示
        nodes.forEach(n => n.classList.remove('hidden'))
        // 逐个处理折叠项
        nodes.forEach((n) => {
          const id = n.dataset.id || ''
          if (!id || !collapsed.has(id)) return
          const m1 = n.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
          for (let i = (parseInt(n.dataset.idx||'-1',10) + 1); i < nodes.length; i++) {
            const m = nodes[i]
            const m2 = m.className.match(/lvl-(\d)/); const lv = parseInt((m2?.[1]||'6'),10)
            if (lv <= level) break
            m.classList.add('hidden')
          }
        })
      } catch {}
    }

    // 折叠/展开切换
    outline.querySelectorAll('.ol-tg').forEach((tgEl) => {
      tgEl.addEventListener('click', (ev) => {
        ev.stopPropagation()
        const el = (tgEl as HTMLElement).closest('.ol-item') as HTMLDivElement | null
        if (!el) return
        const id = el.dataset.id || ''
        const m1 = el.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
        if (!id || level > 2) return
        if (collapsed.has(id)) { collapsed.delete(id); (tgEl as HTMLElement).textContent = '▾' } else { collapsed.add(id); (tgEl as HTMLElement).textContent = '▸' }
        saveCollapsed(); applyCollapse()
      })
    })

    // 点击跳转
    outline.querySelectorAll('.ol-item').forEach((el) => {
      el.addEventListener('click', () => {
        const div = el as HTMLDivElement
        const id = div.dataset.id || ''
        const offsetStr = div.dataset.offset

        // 所见 / 阅读模式：保持原有行为，滚动到预览/WYSIWYG 中的 DOM 标题
        if (wysiwyg || mode === 'preview') {
          if (!id) return
          try {
            const target = document.getElementById(id)
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          } catch {}
          return
        }

        // 源码模式：根据源码中的字符偏移跳转到 textarea
        if (typeof offsetStr === 'string' && offsetStr !== '') {
          const off = Number(offsetStr)
          if (!Number.isFinite(off) || off < 0) return
          try {
            const ta = editor as HTMLTextAreaElement
            const text = String(ta.value || '')
            const len = text.length >>> 0
            const caret = Math.max(0, Math.min(off, len))
            ta.selectionStart = caret
            ta.selectionEnd = caret
            try { ta.focus() } catch {}
            if (len > 0 && ta.scrollHeight > ta.clientHeight + 4) {
              const linesBefore = text.slice(0, caret).split('\n').length
              const totalLines = text.split('\n').length
              const lineRatio = (linesBefore - 1) / Math.max(1, totalLines - 1)
              const targetY = lineRatio * ta.scrollHeight
              ta.scrollTop = Math.max(0, targetY - ta.clientHeight * 0.3)
            }
          } catch {}
        }
      })
    })

    applyCollapse()
    // 初始高亮与绑定滚动同步 + WYSIWYG 观察
    setTimeout(() => { try { updateOutlineActive(); bindOutlineScrollSync(); ensureOutlineObserverBound() } catch {} }, 0)
  } catch {}
}

// —— PDF 书签目录（按需加载 PDF.js；失败则给出提示，不影响其它场景） ——
async function renderPdfOutline(outlineEl: HTMLDivElement) {
  try {
    outlineEl.innerHTML = '<div class="empty">正在读取 PDF 目录…</div>'
    logDebug('PDF 目录：开始解析', { path: currentFilePath })
    // 动态加载 pdfjs-dist（若未安装或打包，则静默失败）
    let pdfjsMod: any = null
    try { pdfjsMod = await import('pdfjs-dist'); logDebug('PDF 目录：模块已加载', Object.keys(pdfjsMod||{})) } catch (e) {
      outlineEl.innerHTML = '<div class="empty">未安装 pdfjs-dist，无法读取目录</div>'
      logWarn('PDF 目录：加载 pdfjs-dist 失败', e)
      return
    }
    const pdfjs: any = (pdfjsMod && (pdfjsMod as any).getDocument) ? pdfjsMod : ((pdfjsMod && (pdfjsMod as any).default) ? (pdfjsMod as any).default : pdfjsMod)
    // 优先使用 bundler worker（模块化），若失败则回退为禁用 worker
    try {
      const workerMod: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')
      const WorkerCtor: any = workerMod?.default || workerMod
      const worker: Worker = new WorkerCtor()
      if ((pdfjs as any).GlobalWorkerOptions) {
        ;(pdfjs as any).GlobalWorkerOptions.workerPort = worker
        logDebug('PDF 目录：workerPort 已设置')
      }
    } catch (e) {
      logWarn('PDF 目录：workerPort 设置失败（将尝试禁用 worker）', e)
      try { if ((pdfjs as any).GlobalWorkerOptions) (pdfjs as any).GlobalWorkerOptions.workerSrc = null } catch {}
    }
    // 读取本地 PDF 二进制
    let bytes: Uint8Array
    try { bytes = await readFile(currentFilePath as any) as any; logDebug('PDF 目录：读取字节成功', { bytes: bytes?.length }) } catch (e) {
      outlineEl.innerHTML = '<div class="empty">无法读取 PDF 文件</div>'
      logWarn('PDF 目录：读取文件失败', e)
      return
    }
    // 缓存命中直接渲染（mtime 自动失效）
    try {
      const key = String(currentFilePath || '')
      if (false && key && _pdfOutlineCache.has(key)) {
        // 获取当前 mtime
        let curMtime = 0
        try { const st = await stat(currentFilePath as any); const cand = (st as any)?.mtimeMs ?? (st as any)?.mtime ?? (st as any)?.modifiedAt; curMtime = Number(cand) || 0 } catch {}
        const cached = _pdfOutlineCache.get(key)!
        if (cached && cached.items && cached.items.length > 0 && cached.mtime === curMtime) {
          const items = cached.items
          // 构建大纲（带折叠）并绑定点击
          // 计算是否有子级（用于折叠/展开，限制到 level<=2）
          const hasChild = new Map<string, boolean>()
          for (let i = 0; i < items.length; i++) {
            const cur = items[i]
            if (cur.level > 2) continue
            let child = false
            for (let j = i + 1; j < items.length; j++) { if (items[j].level > cur.level) { child = true; break } if (items[j].level <= cur.level) break }
            hasChild.set(`${i}`, child)
          }
          const keyCollapse = 'outline-collapsed:' + key
          let collapsed = new Set<string>()
          try { const raw = localStorage.getItem(keyCollapse); if (raw) collapsed = new Set(JSON.parse(raw)) } catch {}
          const saveCollapsed = () => { try { localStorage.setItem(keyCollapse, JSON.stringify(Array.from(collapsed))) } catch {} }
          outlineEl.innerHTML = items.map((it, idx) => {
            const tg = (it.level <= 2 && hasChild.get(String(idx))) ? `<span class=\\"ol-tg\\" data-idx=\\"${idx}\\">▾</span>` : `<span class=\\"ol-tg\\"></span>`
            return `<div class=\\"ol-item lvl-${it.level}\\" data-page=\\"${it.page}\\" data-idx=\\"${idx}\\">${tg}${it.title}</div>`
          }).join('')
          // 应用折叠
          const applyCollapse = () => {
            try {
              const nodes = Array.from(outlineEl.querySelectorAll('.ol-item')) as HTMLDivElement[]
              nodes.forEach(n => n.classList.remove('hidden'))
              nodes.forEach((n) => {
                const idx = n.dataset.idx || ''
                if (!idx || !collapsed.has(idx)) return
                const m1 = n.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
                for (let i = (parseInt(idx||'-1',10) + 1); i < nodes.length; i++) {
                  const m = nodes[i]
                  const m2 = m.className.match(/lvl-(\d)/); const lv = parseInt((m2?.[1]||'6'),10)
                  if (lv <= level) break
                  m.classList.add('hidden')
                }
              })
            } catch {}
          }
          const existingToggleHandler = (outlineEl as any)._pdfToggleHandler
          if (existingToggleHandler) {
            outlineEl.removeEventListener('click', existingToggleHandler)
          }
          const toggleHandler = (ev: Event) => {
            const tgEl = (ev.target as HTMLElement)
            if (!tgEl.classList.contains('ol-tg')) return
            ev.stopPropagation()
            const el = tgEl.closest('.ol-item') as HTMLDivElement | null
            if (!el) return
            const idx = el.dataset.idx || ''
            const m1 = el.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
            if (!idx || level > 2) return
            if (collapsed.has(idx)) { collapsed.delete(idx); tgEl.textContent = '▾' } else { collapsed.add(idx); tgEl.textContent = '▸' }
            saveCollapsed(); applyCollapse()
          }
          ;(outlineEl as any)._pdfToggleHandler = toggleHandler
          outlineEl.addEventListener('click', toggleHandler)
          bindPdfOutlineClicks(outlineEl)
          applyCollapse()
          logDebug('PDF 目录：使用缓存', { count: items.length })
          return
        }
      }
    } catch {}

    // 加载文档并提取 outline
    const task = (pdfjs as any).getDocument ? (pdfjs as any).getDocument({ data: bytes, disableWorker: true }) : null
    if (!task) { outlineEl.innerHTML = '<div class="empty">PDF.js 不可用</div>'; logWarn('PDF 目录：getDocument 不可用'); return }
    const doc = (task as any).promise ? await (task as any).promise : await task
    logDebug('PDF 目录：文档已打开', { numPages: doc?.numPages })
    const outline = await doc.getOutline(); logDebug('PDF 目录：outline 获取成功', { count: outline?.length })
    if (!outline || outline.length === 0) { outlineEl.innerHTML = '<div class="empty">此 PDF 未提供目录（书签）</div>'; return }
    // 展平目录，解析页码
    const items: { level: number; title: string; page: number }[] = []
    async function walk(nodes: any[], level: number) {
      for (const n of nodes || []) {
        const title = String(n?.title || '').trim() || '无标题'
        let page = 1
        try {
          const destName = n?.dest
          let dest: any = destName
          if (typeof destName === 'string') dest = await doc.getDestination(destName)
          const ref = Array.isArray(dest) ? dest[0] : null
          if (ref) { const idx = await doc.getPageIndex(ref); page = (idx >>> 0) + 1 } else { logDebug('PDF 目录：无 ref，使用默认页', { title }) }
        } catch (e) { logWarn('PDF 目录：解析书签页码失败', { title, err: String(e) }) }
        items.push({ level, title, page })
        if (Array.isArray(n?.items) && n.items.length > 0) { await walk(n.items, Math.min(6, level + 1)) }
      }
    }
    await walk(outline, 1)
    if (items.length === 0) { outlineEl.innerHTML = '<div class="empty">目录为空</div>'; logWarn('PDF 目录：目录为空'); return }
    // PDF 目录缓存复用
    // 写入缓存（含 mtime）
    try {
      const k = String(currentFilePath || '')
      if (k) {
        let curMtime = 0
        try { const st = await stat(currentFilePath as any); const cand = (st as any)?.mtimeMs ?? (st as any)?.mtime ?? (st as any)?.modifiedAt; curMtime = Number(cand) || 0 } catch {}
        _pdfOutlineCache.set(k, { mtime: curMtime, items: items.slice() })
      }
    } catch {}

    // 构建大纲（带折叠/展开与记忆）
    const hasChild = new Map<string, boolean>()
    for (let i = 0; i < items.length; i++) {
      const cur = items[i]
      if (cur.level > 2) continue
      let child = false
      for (let j = i + 1; j < items.length; j++) { if (items[j].level > cur.level) { child = true; break } if (items[j].level <= cur.level) break }
      hasChild.set(`${i}`, child)
    }
    const keyCollapse = 'outline-collapsed:' + (currentFilePath || '')
    let collapsed = new Set<string>()
    try { const raw = localStorage.getItem(keyCollapse); if (raw) collapsed = new Set(JSON.parse(raw)) } catch {}
    const saveCollapsed = () => { try { localStorage.setItem(keyCollapse, JSON.stringify(Array.from(collapsed))) } catch {} }
    outlineEl.innerHTML = items.map((it, idx) => {
      const tg = (it.level <= 2 && hasChild.get(String(idx))) ? `<span class=\"ol-tg\" data-idx=\"${idx}\">▾</span>` : `<span class=\"ol-tg\"></span>`
      return `<div class=\"ol-item lvl-${it.level}\" data-page=\"${it.page}\" data-idx=\"${idx}\">${tg}${it.title}</div>`
    }).join('')
    function navigatePdfPage(page) {
      try {
        const iframe = document.querySelector('.pdf-preview iframe')
        if (!iframe) { logWarn('PDF 目录：未找到 iframe'); return }
        const cur = iframe.src || _currentPdfSrcUrl || ''
        if (!cur) { logWarn('PDF 目录：无有效 iframe.src/base'); return }
        const baseNoHash = cur.split('#')[0]
        // 1) 尝试仅修改 hash
        try { if (iframe.contentWindow) { iframe.contentWindow.location.hash = '#page=' + page; logDebug('PDF 目录：hash 导航', { page }) } } catch {}
        // 2) 直接设置 src
        const next = baseNoHash + '#page=' + page
        try { iframe.src = next; logDebug('PDF 目录：src 导航', { page, next }) } catch {}
        // 3) 硬刷新防缓存
        setTimeout(() => {
          try {
            const again = document.querySelector('.pdf-preview iframe')
            if (!again) return
            const hard = baseNoHash + '?_=' + Date.now() + '#page=' + page
            again.src = hard
            logDebug('PDF 目录：硬刷新导航', { page, hard })
          } catch {}
        }, 80)
      } catch (e) { logWarn('PDF 目录：导航异常', e) }
    }
    // 应用折叠
    const applyCollapse = () => {
      try {
        const nodes = Array.from(outlineEl.querySelectorAll('.ol-item')) as HTMLDivElement[]
        nodes.forEach(n => n.classList.remove('hidden'))
        nodes.forEach((n) => {
          const idx = n.dataset.idx || ''
          if (!idx || !collapsed.has(idx)) return
          const m1 = n.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
          for (let i = (parseInt(idx||'-1',10) + 1); i < nodes.length; i++) {
            const m = nodes[i]
            const m2 = m.className.match(/lvl-(\d)/); const lv = parseInt((m2?.[1]||'6'),10)
            if (lv <= level) break
            m.classList.add('hidden')
          }
        })
      } catch {}
    }
    const existingToggleHandler = (outlineEl as any)._pdfToggleHandler
    if (existingToggleHandler) {
      outlineEl.removeEventListener('click', existingToggleHandler)
    }
    const toggleHandler = (ev: Event) => {
      const tgEl = (ev.target as HTMLElement)
      if (!tgEl.classList.contains('ol-tg')) return
      ev.stopPropagation()
      const el = tgEl.closest('.ol-item') as HTMLDivElement | null
      if (!el) return
      const idx = el.dataset.idx || ''
      const m1 = el.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
      if (!idx || level > 2) return
      if (collapsed.has(idx)) { collapsed.delete(idx); tgEl.textContent = '▾' } else { collapsed.add(idx); tgEl.textContent = '▸' }
      saveCollapsed(); applyCollapse()
    }
    ;(outlineEl as any)._pdfToggleHandler = toggleHandler
    outlineEl.addEventListener('click', toggleHandler)
    bindPdfOutlineClicks(outlineEl)
    applyCollapse()
  } catch (e) {
    try { outlineEl.innerHTML = '<div class="empty">读取 PDF 目录失败</div>' } catch {}
    logWarn('PDF 目录：异常', e)
  }
}

function bindPdfOutlineClicks(outlineEl: HTMLDivElement) {
  try {
    const existingHandler = (outlineEl as any)._pdfOutlineClickHandler
    if (existingHandler) {
      outlineEl.removeEventListener('click', existingHandler)
    }
    const handler = (e: Event) => {
      const clickedEl = e.target as HTMLElement
      if (clickedEl.classList.contains('ol-tg')) return
      const target = clickedEl.closest('.ol-item') as HTMLDivElement | null
      if (!target) return
      const p = Number(target.dataset.page || '1') || 1
      try {
        const iframe = document.querySelector('.pdf-preview iframe') as HTMLIFrameElement | null
        if (!iframe) { logWarn('PDF 目录：未找到 iframe'); return }
        const cur = iframe.src || _currentPdfSrcUrl || ''
        if (!cur) { logWarn('PDF 目录：无有效 iframe.src/base'); return }
        const baseNoHash = cur.split('#')[0]
        try { if (iframe.contentWindow) { iframe.contentWindow.location.hash = '#page=' + p; logDebug('PDF 目录：hash 导航', { page: p }) } } catch {}
        const next = baseNoHash + '#page=' + p
        try { iframe.src = next; logDebug('PDF 目录：src 导航', { page: p, next }) } catch {}
        setTimeout(() => {
          try {
            const again = document.querySelector('.pdf-preview iframe') as HTMLIFrameElement | null
            if (!again) return
            const hard = baseNoHash + '?_=' + Date.now() + '#page=' + p
            again.src = hard
            logDebug('PDF 目录：硬刷新导航', { page: p, hard })
          } catch {}
        }, 80)
      } catch (e) { logWarn('PDF 目录：导航异常', e) }
    }
    ;(outlineEl as any)._pdfOutlineClickHandler = handler
    outlineEl.addEventListener('click', handler)
  } catch {}
}

// 监听 WYSIWYG 内容变更以自动刷新大纲（仅在“所见模式 + 大纲页签可见”时节流刷新）
let _outlineObserverBound = false
let _outlineObserver: MutationObserver | null = null
let _outlineUpdateTimer = 0
function scheduleOutlineUpdate() {
  if (_outlineUpdateTimer) { clearTimeout(_outlineUpdateTimer); _outlineUpdateTimer = 0 }
  _outlineUpdateTimer = window.setTimeout(() => {
    _outlineUpdateTimer = 0
    try {
      const outline = document.getElementById('lib-outline') as HTMLDivElement | null
      if (outline && !outline.classList.contains('hidden')) renderOutlinePanel()
    } catch {}
  }, 200)
}
function scheduleOutlineUpdateFromSource() {
  if (wysiwyg || mode !== 'edit') return
  scheduleOutlineUpdate()
}
function ensureOutlineObserverBound() {
  if (_outlineObserverBound) return
  try {
    const bodyEl = document.querySelector('#md-wysiwyg-root .ProseMirror') as HTMLElement | null
    if (!bodyEl) return
    _outlineObserver = new MutationObserver(() => {
      scheduleOutlineUpdate()
    })
    _outlineObserver.observe(bodyEl, { childList: true, subtree: true, characterData: true })
    _outlineObserverBound = true
  } catch {}
}

// 粘贴图片默认保存目录（无打开文件时使用）
async function getDefaultPasteDir(): Promise<string | null> {
  try {
    if (!store) return null
    const val = await store.get('defaultPasteDir')
    return (typeof val === 'string' && val) ? val : null
  } catch { return null }
}

async function setDefaultPasteDir(p: string) {
  try {
    if (!store) return
    await store.set('defaultPasteDir', p)
    await store.save()
  } catch {}
}

// 读取直连 S3/R2 上传配置（最小实现）
async function getUploaderConfig(): Promise<UploaderConfig | null> {
  try {
    if (!store) return null
    const up = await store.get('uploader')
    if (!up || typeof up !== 'object') return null
    const o = up as any
    const cfg: UploaderConfig = {
      enabled: !!o.enabled,
      accessKeyId: String(o.accessKeyId || ''),
      secretAccessKey: String(o.secretAccessKey || ''),
      bucket: String(o.bucket || ''),
      region: typeof o.region === 'string' ? o.region : undefined,
      endpoint: typeof o.endpoint === 'string' ? o.endpoint : undefined,
      customDomain: typeof o.customDomain === 'string' ? o.customDomain : undefined,
      keyTemplate: typeof o.keyTemplate === 'string' ? o.keyTemplate : '{year}/{month}{fileName}{md5}.{extName}',
      aclPublicRead: o.aclPublicRead !== false,
      forcePathStyle: o.forcePathStyle !== false,
      convertToWebp: !!o.convertToWebp,
      webpQuality: (typeof o.webpQuality === 'number' ? o.webpQuality : 0.85),
      saveLocalAsWebp: !!o.saveLocalAsWebp,
    }
    if (!cfg.enabled) return null
    if (!cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) return null
    return cfg
  } catch { return null }
}

// 图床配置读取（允许 enabled=false 的情况）：用于“手动插入图片”这种显式动作
async function getUploaderConfigAllowDisabled(): Promise<UploaderConfig | null> {
  try {
    if (!store) return null
    const up = await store.get('uploader')
    if (!up || typeof up !== 'object') return null
    const o = up as any
    const cfg: UploaderConfig = {
      enabled: true,
      accessKeyId: String(o.accessKeyId || ''),
      secretAccessKey: String(o.secretAccessKey || ''),
      bucket: String(o.bucket || ''),
      region: typeof o.region === 'string' ? o.region : undefined,
      endpoint: typeof o.endpoint === 'string' ? o.endpoint : undefined,
      customDomain: typeof o.customDomain === 'string' ? o.customDomain : undefined,
      keyTemplate: typeof o.keyTemplate === 'string' ? o.keyTemplate : '{year}/{month}{fileName}{md5}.{extName}',
      aclPublicRead: o.aclPublicRead !== false,
      forcePathStyle: o.forcePathStyle !== false,
      convertToWebp: !!o.convertToWebp,
      webpQuality: (typeof o.webpQuality === 'number' ? o.webpQuality : 0.85),
      saveLocalAsWebp: !!o.saveLocalAsWebp,
    }
    if (!cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) return null
    return cfg
  } catch { return null }
}

// 将获取上传配置的方法暴露到全局，供所见 V2 的上传插件使用
try {
  if (typeof window !== 'undefined') {
    ;(window as any).flymdGetUploaderConfig = getUploaderConfig
    ;(window as any).flymdGetCurrentFilePath = () => currentFilePath
    ;(window as any).flymdGetDefaultPasteDir = () => getDefaultPasteDir()
    ;(window as any).flymdAlwaysSaveLocalImages = () => getAlwaysSaveLocalImages()
    ;(window as any).flymdSaveImageToLocalAndGetPath = (file: File, name: string) => saveImageToLocalAndGetPath(file, name)
  }
} catch {}

// 暴露标签系统需要的函数（包装器模式）
try {
  if (typeof window !== 'undefined') {
    // 状态获取/设置
    ;(window as any).flymdSetCurrentFilePath = (path: string | null) => { currentFilePath = path }
    ;(window as any).flymdSetDirty = (d: boolean) => { dirty = d; refreshTitle() }
    ;(window as any).flymdGetMode = () => mode
    ;(window as any).flymdSetMode = (m: Mode) => {
      mode = m
      if (mode === 'preview') {
        try { preview.classList.remove('hidden') } catch {}
      } else {
        if (!wysiwyg) try { preview.classList.add('hidden') } catch {}
      }
      try {
        (document.getElementById('btn-toggle') as HTMLButtonElement).textContent = mode === 'edit' ? '阅读' : '源码'
      } catch {}
    }
    ;(window as any).flymdGetWysiwygEnabled = () => wysiwyg
    ;(window as any).flymdGetEditorContent = () => editor?.value ?? ''
    // UI 刷新
    ;(window as any).flymdRefreshTitle = () => refreshTitle()
    ;(window as any).flymdRefreshPreview = () => { try { renderPreview() } catch {} }
    ;(window as any).flymdRefreshFileTree = async () => {
      try {
        await fileTree.refresh()
      } catch (e) {
        console.error('[文件树] 手动刷新失败:', e)
      }
    }
    // 模式切换快捷逻辑（等价于 Ctrl+E）
    ;(window as any).flymdToggleModeShortcut = () => handleToggleModeShortcut()
    // 文件操作
    ;(window as any).flymdOpenFile = openFile2
    ;(window as any).flymdNewFile = newFile
    ;(window as any).flymdSaveFile = saveFile
    // WebDAV：移动端 FAB 需要的快捷入口
    ;(window as any).flymdWebdavSyncNow = async () => {
      try {
        await handleManualSyncFromMenu()
      } catch (e) {
        console.error('[WebDAV] 立即同步失败', e)
      }
    }
    ;(window as any).flymdWebdavOpenSettings = () => {
      try {
        void openWebdavSyncDialog()
      } catch (e) {
        console.error('[WebDAV] 打开设置失败', e)
      }
    }
    // 移动端：提供一个“更多操作”入口，避免长按与系统选字冲突
    ;(window as any).flymdOpenContextMenu = () => {
      try {
        const target = (document.activeElement as HTMLElement | null) || (editor as any)
        const ctx = buildContextMenuContext(({ target } as any) as MouseEvent)
        void showContextMenu(0, 0, ctx, {
          pluginItems: pluginContextMenuItems,
          buildBuiltinItems: buildBuiltinContextMenuItems,
        })
      } catch {}
    }

    // 移动端：双击空白区触发右键菜单
    ;(function initMobileDoubleTapContextMenu() {
      const isMobileUi = () => document.body.classList.contains('platform-mobile')
      if (!isMobileUi()) return

      let lastTapTime = 0
      let lastTapX = 0
      let lastTapY = 0
      const TAP_THRESHOLD = 300   // 双击时间阈值 ms
      const MOVE_THRESHOLD = 30   // 位置容差 px

      const handleDoubleTap = (e: TouchEvent) => {
        if (!isMobileUi()) return

        const now = Date.now()
        const touch = e.changedTouches[0]
        if (!touch) return
        const { clientX, clientY } = touch

        const timeDiff = now - lastTapTime
        const xDiff = Math.abs(clientX - lastTapX)
        const yDiff = Math.abs(clientY - lastTapY)

        if (timeDiff < TAP_THRESHOLD && xDiff < MOVE_THRESHOLD && yDiff < MOVE_THRESHOLD) {
          // 检测到双击，延迟检查是否有文字被选中
          setTimeout(() => {
            const sel = window.getSelection()
            const selectedText = sel?.toString()?.trim() || ''

            // 无选区 → 触发右键菜单
            if (!selectedText) {
              const ed = document.getElementById('editor') as HTMLTextAreaElement | null
              if (document.activeElement === ed) {
                const start = ed?.selectionStart || 0
                const end = ed?.selectionEnd || 0
                if (start === end) {
                  ;(window as any).flymdOpenContextMenu?.()
                }
              } else {
                ;(window as any).flymdOpenContextMenu?.()
              }
            }
            // 有选区 → 不触发，保留双击选词行为
          }, 50)

          lastTapTime = 0  // 重置，避免三击误触发
        } else {
          lastTapTime = now
          lastTapX = clientX
          lastTapY = clientY
        }
      }

      // 绑定编辑器
      editor.addEventListener('touchend', handleDoubleTap, { passive: true })

      // 绑定预览区
      const preview = document.querySelector('.preview')
      preview?.addEventListener('touchend', handleDoubleTap, { passive: true })

      // 动态绑定所见模式
      const bindWysiwyg = () => {
        const root = document.getElementById('md-wysiwyg-root')
        if (root && !(root as any).__dblTapBound) {
          root.addEventListener('touchend', handleDoubleTap, { passive: true })
          ;(root as any).__dblTapBound = true
        }
      }
      bindWysiwyg()
      new MutationObserver(bindWysiwyg).observe(document.body, { childList: true, subtree: true })
    })()

    ;(window as any).flymdRenamePathWithDialog = (path: string) => renamePathWithDialog(path)
    ;(window as any).flymdRenameCurrentFileForTypecho = async (id: string, title: string) => {
      try {
        if (!currentFilePath) return null
        const idStr = String(id || '').trim()
        const baseTitle = String(title || '').trim()
        let safeTitle = baseTitle || idStr || '未命名'
        safeTitle = safeTitle
          .replace(/[\\/:*?"<>|]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '')
        if (!safeTitle) safeTitle = idStr || 'untitled'
        const core = idStr ? `${idStr}-${safeTitle}` : safeTitle
        const m = currentFilePath.match(/(\.[^\\/\\.]+)$/)
        const ext = m ? m[1] : ''
        const newName = core + ext
        const newPath = await renameFileSafe(currentFilePath, newName)
        currentFilePath = newPath as any
        refreshTitle()
        const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
        if (treeEl && fileTreeReady) {
          try { await fileTree.refresh() } catch {}
        }
        return newPath
      } catch (e) {
        console.error('[Typecho] 自动重命名当前文件失败', e)
        return null
      }
    }
    ;(window as any).flymdOpenInNewInstance = async (path: string) => {
      try { await openPath(path) } catch {}
    }
    // 便签模式：以新实例打开并自动进入便签模式
    ;(window as any).flymdCreateStickyNote = async (path: string) => {
      try {
        await invoke('open_as_sticky_note', { path })
      } catch (e) {
        console.error('[便签] 创建便签失败:', e)
        throw e
      }
    }
    // 确认对话框
    ;(window as any).flymdConfirmNative = confirmNative
    // 所见模式内容替换：仅在 V2 已启用且当前处于所见模式时才生效
    ;(window as any).flymdWysiwygV2ReplaceAll = async (md: string) => {
      try {
        if (!wysiwyg || !wysiwygV2Active) return
        await wysiwygV2ReplaceAll(String(md || ''))
      } catch {}
    }
  }
} catch {}

// 暴露通知管理器供其他模块使用
try {
  ;(window as any).NotificationManager = NotificationManager
} catch {}

// 读取“总是保存到本地”配置
async function getAlwaysSaveLocalImages(): Promise<boolean> {
  try {
    if (!store) return false
    const up = await store.get('uploader')
    if (!up || typeof up !== 'object') return false
    return !!(up as any).alwaysLocal
  } catch { return false }
}

// 读取图片转码偏好（即使未启用图床也可读取）
async function getTranscodePrefs(): Promise<{ convertToWebp: boolean; webpQuality: number; saveLocalAsWebp: boolean }> {
  try {
    if (!store) return { convertToWebp: false, webpQuality: 0.85, saveLocalAsWebp: false }
    const up = await store.get('uploader')
    const o = (up && typeof up === 'object') ? (up as any) : null
    return {
      convertToWebp: !!o?.convertToWebp,
      webpQuality: (typeof o?.webpQuality === 'number' ? o.webpQuality : 0.85),
      saveLocalAsWebp: !!o?.saveLocalAsWebp,
    }
  } catch { return { convertToWebp: false, webpQuality: 0.85, saveLocalAsWebp: false } }
}


// 抓取网页 <title>，用于将纯 URL 粘贴转换为 [标题](url)
async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const html = await fetchTextSmart(url)
    if (!html) return null
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (!m) return null
    let title = m[1] || ''
    // 归一化空白，避免标题里带有多行/多空格
    title = title.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (!title) return null
    return title
  } catch {
    return null
  }
}

// 图床设置对话框入口：委托给独立 UI 模块，减少 main.ts 体积
async function openUploaderDialog(): Promise<void> {
  await openUploaderDialogInternal({
    getStore: () => store,
    showError,
    setUploaderEnabledSnapshot(enabled: boolean) {
      uploaderEnabledSnapshot = enabled
    },
  })
}

function updateLibrarySideButton() {
  try {
    const btn = document.getElementById('lib-side') as HTMLButtonElement | null
    if (!btn) return
    btn.textContent = t(librarySide === 'right' ? 'lib.side.right' : 'lib.side.left')
    btn.title = t('lib.side.toggle')
  } catch {}
}

function syncLibraryEdgeState(libVisible: boolean) {
  try {
    if (!_libEdgeEl) return
    _libEdgeEl.style.display = (!libraryDocked && !libVisible) ? 'block' : 'none'
    if (librarySide === 'right') {
      _libEdgeEl.style.left = ''
      _libEdgeEl.style.right = '0'
    } else {
      _libEdgeEl.style.left = '0'
      _libEdgeEl.style.right = ''
    }
  } catch {}
}

function syncLibraryFloatToggle() {
  try {
    if (!_libFloatToggleEl) {
      return
    }
    _libFloatToggleEl.classList.toggle('side-right', librarySide === 'right')
    _libFloatToggleEl.classList.toggle('side-left', librarySide !== 'right')
    _libFloatToggleEl.innerHTML = librarySide === 'right' ? '&lt;' : '&gt;'
  } catch {}
}

  // 根据当前大纲布局模式应用布局（大纲剥离/嵌入）
function applyOutlineLayout() {
  try {
      const container = document.querySelector('.container') as HTMLDivElement | null
      const libraryEl = document.getElementById('library') as HTMLDivElement | null
      const outlineEl = document.getElementById('lib-outline') as HTMLDivElement | null
      if (!container || !outlineEl) return
      // 默认：嵌入库侧栏（与旧行为一致）
      if (outlineLayout === 'embedded') {
        if (libraryEl && outlineEl.parentElement !== libraryEl) {
          libraryEl.appendChild(outlineEl)
        }
        outlineEl.classList.remove('outline-floating', 'side-left', 'side-right')
        container.classList.remove('with-outline-left', 'with-outline-right')
        notifyWorkspaceLayoutChanged()
        return
      }
      // 剥离：挂到容器下作为独立列
      if (outlineEl.parentElement !== container) {
        container.appendChild(outlineEl)
      }
      outlineEl.classList.add('outline-floating')
      const isLeft = outlineLayout === 'left'
      outlineEl.classList.toggle('side-left', isLeft)
      outlineEl.classList.toggle('side-right', !isLeft)
      container.classList.toggle('with-outline-left', isLeft)
      container.classList.toggle('with-outline-right', !isLeft)
      notifyWorkspaceLayoutChanged()
    } catch {}
  }

  // 布局变化通知：供插件/外部代码在库/大纲/Panel 变化时重新计算工作区
  function notifyWorkspaceLayoutChanged(): void {
    try {
      const winAny = window as any
      const fn = winAny && winAny.__onWorkspaceLayoutChanged
      if (typeof fn === 'function') fn()
    } catch {}
  }

  // 库面板显示/隐藏：使用覆盖式抽屉，不再改动容器布局（避免编辑区被右移抖动）
  function applyLibraryLayout() {
  let visible = false
  try {
    const lib = document.getElementById('library') as HTMLDivElement | null
    const container = document.querySelector('.container') as HTMLDivElement | null
    if (lib) {
      lib.classList.toggle('side-right', librarySide === 'right')
      lib.classList.toggle('side-left', librarySide !== 'right')
      const toggleBtn = document.getElementById('lib-toggle') as HTMLButtonElement | null
      if (toggleBtn) toggleBtn.textContent = librarySide === 'right' ? '>' : '<'
      visible = !lib.classList.contains('hidden')
    }
      if (container) {
        container.classList.remove('with-library-left', 'with-library-right')
        if (visible && libraryDocked) {
          container.classList.add('with-library')
          container.classList.add(librarySide === 'right' ? 'with-library-right' : 'with-library-left')
        } else {
          container.classList.remove('with-library')
        }
      }
    } catch {}
    // 库布局变化后，同步更新大纲布局（用于处理“库固定/位置改变时大纲列位置更新”）
    try { applyOutlineLayout() } catch {}
    notifyWorkspaceLayoutChanged()
  syncLibraryEdgeState(visible)
  syncLibraryFloatToggle()
  syncCustomTitlebarPlacement()
}

  // 库面板显示/隐藏：使用覆盖式抽屉为默认；若开启“固定”，则并排显示
  function showLibrary(show: boolean, persist = true) {
  libraryVisible = !!show
  const lib = document.getElementById('library') as HTMLDivElement | null
  if (!lib) return
  lib.classList.toggle('hidden', !show)
    applyLibraryLayout()
  if (show && !fileTreeReady) {
    void (async () => {
      try { await refreshLibraryUiAndTree(true) } catch {}
    })()
  }
  // 非固定模式：绑定悬停离开自动隐藏
  if (show && !libraryDocked) {
    try {
      // 仅绑定一次
      if (!(lib as any)._hoverBound) {
        const onEnter = () => { if (_libLeaveTimer != null) { clearTimeout(_libLeaveTimer); _libLeaveTimer = null } }
        const onLeave = (ev: MouseEvent) => {
          try {
            if (libraryDocked) return
            const rt = ev.relatedTarget as Node | null
            if (rt && lib.contains(rt)) return
            if (_libLeaveTimer != null) { clearTimeout(_libLeaveTimer); _libLeaveTimer = null }
            _libLeaveTimer = window.setTimeout(() => {
              try { if (!libraryDocked && lib && !lib.matches(':hover')) showLibrary(false, false) } catch {}
            }, 200)
          } catch {}
        }
        lib.addEventListener('mouseenter', onEnter)
        lib.addEventListener('mouseleave', onLeave)
        ;(lib as any)._hoverBound = true
      }
    } catch {}
  }
    // 更新边缘热区可见性
    try {
      const libVisible = !lib.classList.contains('hidden')
      syncLibraryEdgeState(libVisible)
    } catch {}
  if (persist) { void persistLibraryVisible() }
}

  async function setLibraryDocked(docked: boolean, persist = true) {
  libraryDocked = !!docked
    try { if (persist && store) { await store.set('libraryDocked', libraryDocked); await store.save() } } catch {}
  // 更新按钮文案
  try {
    const btn = document.getElementById('lib-pin') as HTMLButtonElement | null
    if (btn) btn.textContent = libraryDocked ? t('lib.pin.auto') : t('lib.pin.fixed')
  } catch {}
    applyLibraryLayout()
  // 若当前已显示且切到“非固定”，补绑定悬停自动隐藏
  try {
    const lib = document.getElementById('library') as HTMLDivElement | null
    if (lib && !lib.classList.contains('hidden') && !libraryDocked) showLibrary(true, false)
  } catch {}
}

async function getLibraryDocked(): Promise<boolean> {
  try { if (!store) return libraryDocked; const v = await store.get('libraryDocked'); return !!v } catch { return libraryDocked }
}

async function persistLibraryVisible() {
  try { if (!store) return; await store.set('libraryVisible', libraryVisible); await store.save() } catch {}
}

  async function getLibraryVisible(): Promise<boolean> {
  try {
    if (!store) return libraryVisible
    const v = await store.get('libraryVisible')
    if (typeof v === 'boolean') return v
  } catch {}
    return true
  }

  const OUTLINE_LAYOUT_KEY = 'outlineLayout'

  // 大纲布局：右键菜单 UI（挂在“大纲”标签上）
  function showOutlineLayoutMenu(x: number, y: number) {
    try {
      const existing = document.getElementById('outline-layout-menu') as HTMLDivElement | null
      if (existing && existing.parentElement) existing.parentElement.removeChild(existing)
      const menu = document.createElement('div')
      menu.id = 'outline-layout-menu'
      menu.style.position = 'fixed'
      menu.style.zIndex = '99999'
      menu.style.left = `${x}px`
      menu.style.top = `${y}px`
      menu.style.background = 'var(--bg)'
      menu.style.border = '1px solid var(--border)'
      menu.style.borderRadius = '8px'
      menu.style.padding = '4px 0'
      menu.style.boxShadow = '0 8px 24px rgba(15,23,42,0.2)'
      menu.style.minWidth = '140px'
      menu.style.fontSize = '12px'
      const makeItem = (label: string, mode: OutlineLayout) => {
        const item = document.createElement('div')
        item.textContent = label
        item.style.padding = '6px 12px'
        item.style.cursor = 'pointer'
        item.style.whiteSpace = 'nowrap'
        item.style.color = 'var(--fg)'
        if (outlineLayout === mode) {
          item.style.fontWeight = '600'
        }
        item.addEventListener('mouseenter', () => { item.style.background = 'rgba(148,163,184,0.16)' })
        item.addEventListener('mouseleave', () => { item.style.background = 'transparent' })
        item.addEventListener('click', () => {
          try { void setOutlineLayout(mode) } catch {}
          try {
            if (menu.parentElement) menu.parentElement.removeChild(menu)
          } catch {}
        })
        return item
      }
      menu.appendChild(makeItem('嵌入侧栏', 'embedded'))
      menu.appendChild(makeItem('剥离（库 | 大纲 | 编辑区）', 'left'))
      menu.appendChild(makeItem('右侧（库 | 编辑区 | 大纲）', 'right'))
      const close = () => {
        try {
          document.removeEventListener('click', onDocClick, true)
          document.removeEventListener('contextmenu', onDocCtx, true)
          if (menu.parentElement) menu.parentElement.removeChild(menu)
        } catch {}
      }
      const onDocClick = (ev: MouseEvent) => {
        try {
          if (menu.contains(ev.target as Node)) return
        } catch {}
        close()
      }
      const onDocCtx = (ev: MouseEvent) => {
        try {
          if (menu.contains(ev.target as Node)) return
        } catch {}
        close()
      }
      document.addEventListener('click', onDocClick, true)
      document.addEventListener('contextmenu', onDocCtx, true)
      document.body.appendChild(menu)
    } catch {}
  }

  async function setOutlineLayout(mode: OutlineLayout, persist = true): Promise<void> {
    outlineLayout = mode
    try {
      if (persist && store) {
        await store.set(OUTLINE_LAYOUT_KEY, outlineLayout)
        await store.save()
      }
    } catch {}
    applyOutlineLayout()
    // 剥离模式下，确保目录和大纲同时可见
    try {
      const library = document.getElementById('library') as HTMLDivElement | null
      const treeEl = library?.querySelector('#lib-tree') as HTMLDivElement | null
      const outlineEl = document.getElementById('lib-outline') as HTMLDivElement | null
      if (outlineLayout !== 'embedded') {
        if (treeEl) treeEl.classList.remove('hidden')
        if (outlineEl) outlineEl.classList.remove('hidden')
      }
    } catch {}
  }

  async function getOutlineLayout(): Promise<OutlineLayout> {
    try {
      if (!store) return outlineLayout
      const v = await store.get(OUTLINE_LAYOUT_KEY)
      if (v === 'embedded' || v === 'left' || v === 'right') return v
    } catch {}
    return outlineLayout
  }

  async function setLibrarySide(side: LibrarySide, persist = true) {
  librarySide = side === 'right' ? 'right' : 'left'
    try { if (persist && store) { await store.set('librarySide', librarySide); await store.save() } } catch {}
    updateLibrarySideButton()
    applyLibraryLayout()
  }

async function getLibrarySide(): Promise<LibrarySide> {
  try {
    if (!store) return librarySide
    const v = await store.get('librarySide')
    if (v === 'left' || v === 'right') return v
  } catch {}
  return librarySide
}

// ========== 专注模式（Focus Mode）==========
// 隐藏顶栏，鼠标移到顶部边缘时自动显示

function initFocusModeEvents() {
  // 将 DOM 事件绑定的具体实现拆分到 modes/focusModeUi.ts，降低 main.ts 复杂度
  initFocusModeEventsImpl({
    isFocusModeEnabled,
    setFocusModeFlag,
    getMode: () => mode,
    setMode: (m) => { mode = m },
    getWysiwyg: () => wysiwyg,
    setWysiwygEnabled,
    getStickyNoteMode: () => stickyNoteMode,
    getPreviewElement: () => preview,
    syncToggleButton: () => { try { syncToggleButton() } catch {} },
    notifyModeChange: () => { try { notifyModeChange() } catch {} },
    updateFocusSidebarBg: () => { try { updateFocusSidebarBg() } catch {} },
  })
}

// 平台类初始化：为 body 添加平台标识类，用于 CSS 平台适配
function initPlatformClass() {
  const platform = (navigator.platform || '').toLowerCase()
  if (platform.includes('win')) {
    document.body.classList.add('platform-windows')
  } else if (platform.includes('mac')) {
    document.body.classList.add('platform-mac')
  } else if (platform.includes('linux')) {
    document.body.classList.add('platform-linux')
  }
}

// 窗口拖拽初始化：为 mac / Linux 上的紧凑标题栏补齐拖动支持
function initWindowDrag() {
  const titlebar = document.querySelector('.titlebar') as HTMLElement | null
  if (!titlebar) return

  const platform = (navigator.platform || '').toLowerCase()
  const isMac = platform.includes('mac')
  const isLinux = platform.includes('linux')
  // Windows 上原生 + -webkit-app-region 已足够，这里只为 mac/Linux 打补丁
  if (!isMac && !isLinux) return

  const shouldIgnoreTarget = (target: EventTarget | null): boolean => {
    const el = target as HTMLElement | null
    if (!el) return false
    return !!el.closest('.window-controls, .menu-item, button, a, input, textarea, [data-tauri-drag-ignore]')
  }

  titlebar.addEventListener('mousedown', (ev: MouseEvent) => {
    if (ev.button !== 0) return
    // 便签锁定或未开启紧凑/专注标题栏时，不处理拖动
    if (stickyNoteLocked) return
    if (!(isCompactTitlebarEnabled() || isFocusModeEnabled() || stickyNoteMode)) return
    if (shouldIgnoreTarget(ev.target)) return
    try {
      const win = getCurrentWindow()
      void win.startDragging()
    } catch {}
  })
}

// 窗口边缘 resize 初始化：为 decorations: false 时提供窗口调整大小功能
function initWindowResize() {
  // 创建 resize handles 容器
  const container = document.createElement('div')
  container.className = 'window-resize-handles'

  // 创建 8 个 resize handles（四边 + 四角）
  const handles = ['top', 'bottom', 'left', 'right', 'corner-nw', 'corner-ne', 'corner-sw', 'corner-se']
  handles.forEach(dir => {
    const handle = document.createElement('div')
    handle.className = `window-resize-handle ${dir}`
    handle.dataset.resizeDir = dir
    container.appendChild(handle)
  })
  document.body.appendChild(container)

  // resize 状态
  let resizing = false
  let startX = 0
  let startY = 0
  let startWidth = 0
  let startHeight = 0
  let startPosX = 0
  let startPosY = 0
  let direction = ''
  const MIN_WIDTH = 600
  const MIN_HEIGHT = 400

  // mousedown：开始 resize
  container.addEventListener('mousedown', async (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.classList.contains('window-resize-handle')) return

    e.preventDefault()
    e.stopPropagation()

    resizing = true
    direction = target.dataset.resizeDir || ''
    startX = e.screenX
    startY = e.screenY

    try {
      const win = getCurrentWindow()
      const size = await win.innerSize()
      const pos = await win.outerPosition()
      startWidth = size.width
      startHeight = size.height
      startPosX = pos.x
      startPosY = pos.y
    } catch {}
  })

  // mousemove：执行 resize
  document.addEventListener('mousemove', async (e: MouseEvent) => {
    if (!resizing) return

    const deltaX = e.screenX - startX
    const deltaY = e.screenY - startY

    let newWidth = startWidth
    let newHeight = startHeight
    let newX = startPosX
    let newY = startPosY

    // 根据方向计算新尺寸和位置
    if (direction.includes('right') || direction === 'corner-ne' || direction === 'corner-se') {
      newWidth = Math.max(MIN_WIDTH, startWidth + deltaX)
    }
    if (direction.includes('left') || direction === 'corner-nw' || direction === 'corner-sw') {
      const widthDelta = Math.min(deltaX, startWidth - MIN_WIDTH)
      newWidth = startWidth - widthDelta
      newX = startPosX + widthDelta
    }
    if (direction.includes('bottom') || direction === 'corner-sw' || direction === 'corner-se') {
      newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY)
    }
    if (direction.includes('top') || direction === 'corner-nw' || direction === 'corner-ne') {
      const heightDelta = Math.min(deltaY, startHeight - MIN_HEIGHT)
      newHeight = startHeight - heightDelta
      newY = startPosY + heightDelta
    }

    try {
      const win = getCurrentWindow()
      // 先设置位置（如果需要），再设置尺寸
      if (newX !== startPosX || newY !== startPosY) {
        await win.setPosition({ type: 'Physical', x: Math.round(newX), y: Math.round(newY) })
      }
      await win.setSize({ type: 'Physical', width: Math.round(newWidth), height: Math.round(newHeight) })
    } catch {}
  })

  // mouseup：结束 resize
  document.addEventListener('mouseup', () => {
    resizing = false
    direction = ''
  })
}

// 更新专注模式下侧栏背景色：跟随编辑区背景色和网格设置
function updateFocusSidebarBg() {
  updateFocusSidebarBgImpl({
    isFocusModeEnabled,
    getMode: () => mode,
    getWysiwyg: () => wysiwyg,
  })
}

// 便签配置宿主：封装配置读写与外观控制
const stickyNotePrefsHost: StickyNotePrefsHost = createStickyNotePrefsHost({
  appLocalDataDir,
  readTextFileAnySafe,
  writeTextFileAnySafe,
  getStore: () => store,
  getOpacity: () => stickyNoteOpacity,
  setOpacity: (v) => { stickyNoteOpacity = v },
  getColor: () => stickyNoteColor,
  setColor: (c) => { stickyNoteColor = c },
  getReminders: () => stickyNoteReminders,
  setReminders: (m) => { stickyNoteReminders = m },
})

const loadStickyNotePrefs = stickyNotePrefsHost.loadStickyNotePrefs
const saveStickyNotePrefs = stickyNotePrefsHost.saveStickyNotePrefs
const setStickyNoteOpacity = stickyNotePrefsHost.setStickyNoteOpacity
const setStickyNoteColor = stickyNotePrefsHost.setStickyNoteColor
const toggleStickyOpacitySlider = stickyNotePrefsHost.toggleStickyOpacitySlider
const toggleStickyColorPicker = stickyNotePrefsHost.toggleStickyColorPicker

// 监听模式切换事件，更新专注模式侧栏背景和外圈UI颜色
window.addEventListener('flymd:mode:changed', (ev: Event) => {
  try { updateFocusSidebarBg() } catch {}
  // 更新外圈UI颜色（标题栏、侧栏等）跟随当前模式背景
  try {
    const detail = (ev as CustomEvent).detail || {}
    // 优先使用事件携带的模式信息，否则使用全局 mode/wysiwyg 状态
    let currentMode: 'edit' | 'wysiwyg' | 'preview' = 'edit'
    if (detail.wysiwyg === true) {
      currentMode = 'wysiwyg'
    } else if (detail.mode === 'preview' || (typeof detail.mode === 'undefined' && mode === 'preview')) {
      currentMode = 'preview'
    } else if (detail.wysiwyg === false && wysiwyg === false) {
      currentMode = mode === 'preview' ? 'preview' : 'edit'
    }
    updateChromeColorsForMode(currentMode)
  } catch {}
})
// 监听主题变更事件，更新专注模式侧栏背景
window.addEventListener('flymd:theme:changed', () => updateFocusSidebarBg())

// 监听夜间模式切换事件，重置 mermaid 并刷新预览
window.addEventListener('flymd:darkmode:changed', async () => {
  try {
    // 重置 mermaid 初始化状态，下次渲染时会使用新的主题配置
    mermaidReady = false
    // 清除 mermaid SVG 缓存，避免使用旧主题的缓存
    try { invalidateMermaidSvgCache() } catch {}
    // 根据当前模式刷新预览
    if (mode === 'preview') {
      await renderPreview()
    } else if (wysiwyg) {
      scheduleWysiwygRender()
    }
  } catch {}
})

// 暴露 updateFocusSidebarBg 到全局，供其他模块调用
;(window as any).updateFocusSidebarBg = () => {
  try { updateFocusSidebarBg() } catch {}
}

// ========== 专注模式结束 ==========

// ========== 便签模式 ==========
// 便签 UI 行为：通过 modes/stickyNoteUi.ts 集中实现，main.ts 只注入状态与依赖
const stickyNoteUi: StickyNoteUiHandles = createStickyNoteUi({
  getMode: () => mode,
  setMode: (m) => { mode = m },
  getStickyNoteMode: () => stickyNoteMode,
  getStickyTodoAutoPreview: () => stickyTodoAutoPreview,
  setStickyTodoAutoPreview: (v) => { stickyTodoAutoPreview = v },
  isWysiwygActive: () => !!wysiwyg || !!wysiwygV2Active,
  getEditor: () => editor,
  getPreview: () => preview,
  markDirtyAndRefresh: () => {
    try {
      dirty = true
      refreshTitle()
      refreshStatus()
    } catch {}
  },
  renderPreview: () => renderPreview(),
  syncToggleButton: () => { try { syncToggleButton() } catch {} },
  notifyModeChange: () => { try { notifyModeChange() } catch {} },
  getStickyNoteLocked: () => stickyNoteLocked,
  setStickyNoteLocked: (v) => { stickyNoteLocked = v },
  getStickyNoteOnTop: () => stickyNoteOnTop,
  setStickyNoteOnTop: (v) => { stickyNoteOnTop = v },
  getCurrentWindow,
  importDpi: () => import('@tauri-apps/api/dpi'),
  toggleStickyOpacitySlider,
  toggleStickyColorPicker,
})

const {
  getStickyLockIcon,
  getStickyTopIcon,
  getStickyOpacityIcon,
  getStickyColorIcon,
  getStickyEditIcon,
  maybeAutoReturnStickyPreview,
  addStickyTodoLine,
  toggleStickyEditMode,
  toggleStickyWindowLock,
  toggleStickyWindowOnTop,
  adjustStickyWindowHeight,
  scheduleAdjustStickyHeight,
  createStickyNoteControls,
} = stickyNoteUi

// 便签待办按钮与推送/提醒逻辑仍保留在 main.ts，避免在首次拆分时引入过多依赖注入

// 便签模式：为待办项添加推送和提醒按钮
function addStickyTodoButtons() {
  try {
    // 获取预览区所有待办项
    const taskItems = preview.querySelectorAll('li.task-list-item') as NodeListOf<HTMLLIElement>
    if (!taskItems || taskItems.length === 0) return
    const fileKey = currentFilePath || ''

    taskItems.forEach((item, index) => {
      // 避免重复添加按钮
      if (item.querySelector('.sticky-todo-actions')) return

      // 获取复选框
      const checkbox = item.querySelector('input.task-list-item-checkbox') as HTMLInputElement | null

      // 获取原始完整文本（包含时间）
      const fullText = item.textContent?.trim() || ''

      // 提取时间信息
      const timePattern = /@\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(:\d{2})?/
      const timeMatch = fullText.match(timePattern)
      const datetimeText = timeMatch ? timeMatch[0] : ''

      // 移除时间后的文本
      const textWithoutTime = datetimeText ? fullText.replace(timePattern, '').trim() : fullText

      // 重构DOM结构
      try {
        // 清空item内容（保留复选框）
        const childNodes = Array.from(item.childNodes)
        childNodes.forEach(node => {
          if (node !== checkbox) {
            node.remove()
          }
        })

        // 创建内容容器
        const contentDiv = document.createElement('span')
        contentDiv.className = 'task-content'
        contentDiv.textContent = textWithoutTime
        item.appendChild(contentDiv)

        // 如果有时间，添加时间图标
        if (datetimeText) {
          const timeIcon = document.createElement('span')
          timeIcon.className = 'task-time-icon'
          timeIcon.textContent = '🕐'
          item.appendChild(timeIcon)
        }
      } catch (e) {
        console.error('[便签模式] 重构DOM失败:', e)
      }

      // 创建按钮容器
      const actionsDiv = document.createElement('span')
      actionsDiv.className = 'sticky-todo-actions'

      // 推送按钮
      const pushBtn = document.createElement('button')
      pushBtn.className = 'sticky-todo-btn sticky-todo-push-btn'
      pushBtn.title = '推送到 xxtui'
      pushBtn.innerHTML = '📤'
      pushBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        await handleStickyTodoPush(fullText, index)
      })

      // 创建提醒按钮
      const reminderBtn = document.createElement('button')
      reminderBtn.className = 'sticky-todo-btn sticky-todo-reminder-btn'
      // 若已有持久化提醒标记，则使用“已创建”状态
      const hasReminder = !!(fileKey && stickyNoteReminders[fileKey] && stickyNoteReminders[fileKey][fullText])
      if (hasReminder) {
        reminderBtn.title = '已创建提醒'
        reminderBtn.innerHTML = '🔔'
        reminderBtn.classList.add('sticky-todo-reminder-created')
      } else {
        reminderBtn.title = '创建提醒 (@时间)'
        reminderBtn.innerHTML = '⏰'
      }
      reminderBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        await handleStickyTodoReminder(fullText, index, reminderBtn)
      })

      actionsDiv.appendChild(pushBtn)
      actionsDiv.appendChild(reminderBtn)
      item.appendChild(actionsDiv)

      // 创建tooltip显示完整内容
      try {
        const tooltip = document.createElement('div')
        tooltip.className = 'task-tooltip'

        // 如果有时间，显示"内容 + 时间"，否则只显示内容
        if (datetimeText) {
          tooltip.textContent = `${textWithoutTime} ${datetimeText}`
        } else {
          tooltip.textContent = textWithoutTime
        }

        item.appendChild(tooltip)
      } catch (e) {
        console.error('[便签模式] 创建tooltip失败:', e)
      }
    })
  } catch (e) {
    console.error('[便签模式] 添加待办按钮失败:', e)
  }
}

// 处理便签模式待办项推送
async function handleStickyTodoPush(todoText: string, index: number) {
  try {
    const api = pluginHost.getPluginAPI('xxtui-todo-push')
    if (!api || !api.pushToXxtui) {
      alert('xxtui 插件未安装或未启用\n\n请在"插件"菜单中启用 xxtui 插件')
      return
    }

    // 调用推送 API
    const success = await api.pushToXxtui('[TODO]', todoText)
    if (success) {
      // 显示成功提示
      pluginNotice('推送成功', 'ok', 2000)
    } else {
      alert('推送失败，请检查 xxtui 配置\n\n请在"插件"菜单 → "待办" → "设置"中配置 API Key')
    }
  } catch (e) {
    console.error('[便签模式] 推送失败:', e)
    alert('推送失败: ' + (e instanceof Error ? e.message : String(e)))
  }
}

// 处理便签模式待办项创建提醒
async function handleStickyTodoReminder(todoText: string, index: number, btn?: HTMLButtonElement) {
  try {
    const api = pluginHost.getPluginAPI('xxtui-todo-push')
    if (!api || !api.parseAndCreateReminders) {
      alert('xxtui 插件未安装或未启用\n\n请在"插件"菜单中启用 xxtui 插件')
      return
    }

    // 将单条待办文本包装成完整格式，以便插件解析
    const todoMarkdown = `- [ ] ${todoText}`
    const result = await api.parseAndCreateReminders(todoMarkdown)

    if (result.success > 0) {
      pluginNotice(`创建提醒成功: ${result.success} 条`, 'ok', 2000)
      // 本地标记：当前条目已创建提醒，仅影响本次预览会话
      try {
        if (btn) {
          btn.innerHTML = '🔔'
          btn.title = '已创建提醒'
          btn.classList.add('sticky-todo-reminder-created')
        }
        const fileKey = currentFilePath || ''
        if (fileKey) {
          if (!stickyNoteReminders[fileKey]) stickyNoteReminders[fileKey] = {}
          stickyNoteReminders[fileKey][todoText] = true
          await saveStickyNotePrefs({ opacity: stickyNoteOpacity, color: stickyNoteColor, reminders: stickyNoteReminders })
        }
      } catch {}
    } else if (!todoText.includes('@')) {
      alert('请在待办内容中添加 @时间 格式，例如：\n\n• 开会 @明天 下午3点\n• 写周报 @2025-11-21 09:00\n• 打电话 @2小时后')
    } else {
      alert('创建提醒失败，请检查时间格式')
    }
  } catch (e) {
    console.error('[便签模式] 创建提醒失败:', e)
    alert('创建提醒失败: ' + (e instanceof Error ? e.message : String(e)))
  }
}

// 便签模式运行时依赖：由 stickyNote.ts 统一驱动模式切换与窗口行为
const stickyNoteModeDeps: StickyNoteModeDeps = {
  loadPrefs: () => loadStickyNotePrefs(),
  getStore: () => store,
  getMode: () => mode,
  setMode: (m) => { mode = m },
  isWysiwygActive: () => !!wysiwyg || !!wysiwygV2Active,
  disableWysiwyg: () => setWysiwygEnabled(false),
  renderPreview: () => renderPreview(),
  showPreviewPanel: (show) => {
    try {
      preview.classList.toggle('hidden', !show)
    } catch {}
  },
  syncToggleButton: () => {
    try { syncToggleButton() } catch {}
  },
  openFile: (filePath) => openFile2(filePath),
  toggleFocusMode: (enable) => toggleFocusMode(enable),
  showLibrary: (show, focus) => showLibrary(show, focus),
  createControls: () => createStickyNoteControls(),
  forceLightTheme: () => {
    try { document.body.classList.remove('dark-mode') } catch {}
  },
  addBodyStickyClass: () => {
    try { document.body.classList.add('sticky-note-mode') } catch {}
  },
  applyAppearance: (color, opacity) => applyStickyNoteAppearance(color, opacity),
  scheduleAdjustHeight: () => { scheduleAdjustStickyHeight() },
  getCurrentWindow: () => getCurrentWindow(),
  currentMonitor: () => currentMonitor(),
  importDpi: () => import('@tauri-apps/api/dpi'),
  getScreenSize: () => {
    try {
      const screenW = window?.screen?.availWidth || window?.screen?.width
      const screenH = window?.screen?.availHeight || window?.screen?.height
      if (!screenW || !screenH) return null
      return { width: screenW, height: screenH }
    } catch {
      return null
    }
  },
  logError: (scope, e) => {
    console.error('[便签模式] ' + scope + ':', e)
  },
}

// 进入便签模式
async function enterStickyNoteMode(filePath: string) {
  stickyNoteMode = true
  try {
    const result: StickyNoteModeResult = await enterStickyNoteModeCore(stickyNoteModeDeps, filePath)
    stickyNoteOpacity = result.opacity
    stickyNoteColor = result.color
  } catch (e) {
    console.error('[便签模式] 进入便签模式失败:', e)
  }
}

// ========== 便签模式结束 ==========

// 恢复便签前的窗口大小和位置（供下次正常启动或关闭便签窗口时使用）
async function restoreWindowStateBeforeSticky(): Promise<void> {
  const deps: StickyNoteWindowDeps = {
    getStore: () => store,
    getCurrentWindow,
    importDpi: () => import('@tauri-apps/api/dpi'),
  }
  await restoreWindowStateBeforeStickyCore(deps)
}

// 退出便签模式时恢复全局状态标志（供关闭后新实例正确启动）
function resetStickyModeFlags(): void {
  try {
    stickyNoteMode = false
    stickyNoteLocked = false
    stickyNoteOnTop = false
    stickyTodoAutoPreview = false
    document.body.classList.remove('sticky-note-mode')
    try { document.documentElement.style.removeProperty('--sticky-opacity') } catch {}
  } catch {}
}

// 兜底：如果检测到窗口尺寸异常偏小，则恢复到 960x640
  async function ensureMinWindowSize(): Promise<void> {
    try {
      const win = getCurrentWindow()
      const size = await win.innerSize()
      const minW = 960
      const minH = 640
      let targetW = size.width
      let targetH = size.height

      // 下限：至少保持默认窗口大小
      if (targetW < minW) targetW = minW
      if (targetH < minH) targetH = minH

      // 上限：使用 Rust 侧计算的虚拟桌面尺寸（多屏合并），避免无限变大的异常窗口
      let maxW = 0
      let maxH = 0
      try {
        const screen = await invoke('get_virtual_screen_size') as { width?: number; height?: number } | null
        if (screen && typeof screen.width === 'number' && typeof screen.height === 'number') {
          maxW = screen.width
          maxH = screen.height
        }
      } catch {
        // 若获取失败，则退化为仅做下限保护，保持旧版本行为
      }
      if (maxW > 0 && targetW > maxW) targetW = maxW
      if (maxH > 0 && targetH > maxH) targetH = maxH

    if (targetW !== size.width || targetH !== size.height) {
      const { LogicalSize } = await import('@tauri-apps/api/dpi')
      await win.setSize(new LogicalSize(targetW, targetH))
    }
  } catch {}
}

// 兜底：启动时将窗口居中显示
async function centerWindow(): Promise<void> {
  try {
    const win = getCurrentWindow()
    const size = await win.innerSize()
    const screenW = window?.screen?.availWidth || window?.screen?.width || 0
    const screenH = window?.screen?.availHeight || window?.screen?.height || 0
    if (!screenW || !screenH) return
    const x = Math.max(0, Math.round((screenW - size.width) / 2))
    const y = Math.max(0, Math.round((screenH - size.height) / 2))
    const { LogicalPosition } = await import('@tauri-apps/api/dpi')
    await win.setPosition(new LogicalPosition(x, y))
  } catch {}
}

// 兜底：强制退出专注模式，恢复原生标题栏（等价于“手动切换一次专注模式再切回来”的效果）
// 已迁移到 modes/focusModeHost.ts：此处仅保留引用（函数签名不变）

async function pickLibraryRoot(): Promise<string | null> {
  try {
    // Android：不再直接让用户选“系统目录作为库”（Scoped Storage + SAF 目录遍历还没全量接入）。
    // 先用应用私有目录下的子文件夹作为库根目录；外置目录通过 SAF 以 content:// URI 方式接入。
    const platform = await (async () => {
      try { return await invoke<string>('get_platform') } catch { return '' }
    })()
    const ua = String(navigator?.userAgent || '')
    const isAndroid = platform === 'android' || /Android/i.test(ua)
    if (isAndroid) {
      // 选择库类型：外置（SAF）或本地（应用私有目录）
      // 注意：外置库如果误选到 Android/data 或 Android/obb 下，系统会在卸载时清空该目录（事故）
      const useSaf = await confirmNative(
        '是否选择外置文件夹作为库？\n确定：外置（SAF，不要选 Android/data/obb，否则卸载会删除）\n取消：本地（应用私有目录）',
        '新增库',
      )
      if (useSaf) {
        let uri = ''
        try {
          uri = normalizePath(await safPickFolder()) || ''
        } catch (e) {
          const msg = String((e as any)?.message || e || '')
          if (/cancel/i.test(msg) || /canceled/i.test(msg) || /cancellation/i.test(msg)) return null
          showError('选择外置文件夹失败', e)
          return null
        }
        if (!uri || !uri.startsWith('content://')) {
          alert('请选择外置存储中的文件夹（SAF）')
          return null
        }
        if (isSafUninstallUnsafeFolder(uri)) {
          alert('你选的是 Android/data 或 Android/obb 下的目录。\n这类目录属于应用专用外部目录，系统会在卸载应用时自动清空。\n请在“下载/文档/存储根目录”下新建一个文件夹再选择。')
          return null
        }
        try { await persistSafUriPermission(uri) } catch {}
        const rawName = await openRenameDialog('外置库', '')
        const name = (rawName || '').trim() || '外置库'
        await upsertLibrary({ id: `android-saf-${Date.now()}`, name, root: uri })
        return uri
      }

      const base = (await appLocalDataDir()).replace(/[\\/]+$/, '')
      const sep = base.includes('\\') ? '\\' : '/'
      const join = (a: string, b: string) => (a.endsWith(sep) ? a + b : a + sep + b)
      const libsRoot = join(join(base, 'flymd'), 'library')
      await mkdir(libsRoot as any, { recursive: true } as any)

      const rawName = await openRenameDialog('新建库', '')
      const name = (rawName || '').trim() || '本地库'
      const safeBase = name
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim() || ('lib-' + Date.now())

      let dirName = safeBase
      let root = join(libsRoot, dirName)
      let n = 1
      while (await exists(root)) {
        n += 1
        dirName = `${safeBase}-${n}`
        root = join(libsRoot, dirName)
      }
      await mkdir(root as any, { recursive: true } as any)
      await upsertLibrary({ id: `android-${Date.now()}`, name, root })
      return root
    }

    // iOS/其他移动端：暂未实现目录作为库
    try {
      if (/iPhone|iPad|iPod|webOS|IEMobile|Opera Mini/i.test(ua)) {
        alert('移动端暂不支持通过“系统目录选择”来新增库。')
        return null
      }
    } catch {}

    const sel = await open({ directory: true, multiple: false } as any)
    if (!sel) return null
    const p = normalizePath(sel)
    if (!p) return null
    await setLibraryRoot(p)
    return p
  } catch (e) {
    showError('选择库目录失败', e)
    return null
  }
}

// Android：从外置文件夹（SAF）导入为一个“本地库”（避免把 content:// 当成普通路径导致全盘崩溃）
async function importAndroidSafFolderAsLocalLibrary(): Promise<void> {
  try {
    const platform = await (async () => {
      try { return await invoke<string>('get_platform') } catch { return '' }
    })()
    if (platform !== 'android') {
      alert('仅 Android 可用')
      return
    }

    let uri = ''
    try {
      uri = normalizePath(await safPickFolder()) || ''
    } catch (e) {
      const msg = String((e as any)?.message || e || '')
      if (/cancel/i.test(msg) || /canceled/i.test(msg) || /cancellation/i.test(msg)) return
      throw e
    }
    if (!uri || !uri.startsWith('content://')) {
      alert('请选择外置存储中的文件夹（SAF）')
      return
    }
    if (isSafUninstallUnsafeFolder(uri)) {
      const ok = await confirmNative('你选的是 Android/data 或 Android/obb 下的目录。\n这类目录卸载会被系统清空。\n仍要继续从该目录“导入到本地库”吗？', '确认')
      if (!ok) return
    }
    try { await persistSafUriPermission(uri) } catch {}

    // 目标：AppLocalData/flymd/library/<name>（新库）
    const base = (await appLocalDataDir()).replace(/[\\/]+$/, '')
    const sep = base.includes('\\') ? '\\' : '/'
    const join = (a: string, b: string) => (a.endsWith(sep) ? a + b : a + sep + b)
    const libsRoot = join(join(base, 'flymd'), 'library')
    await mkdir(libsRoot as any, { recursive: true } as any)

    const rawName = await openRenameDialog('导入库', '')
    const name = (rawName || '').trim() || '导入库'
    const safeBase =
      name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() || ('import-' + Date.now())

    let dirName = safeBase
    let root = join(libsRoot, dirName)
    let n = 1
    while (await exists(root)) {
      n += 1
      dirName = `${safeBase}-${n}`
      root = join(libsRoot, dirName)
    }
    await mkdir(root as any, { recursive: true } as any)

    const skipDir = (d: string) => {
      const s = String(d || '').trim()
      if (!s) return true
      if (s === '.' || s === '..') return true
      if (s === '.git' || s === 'node_modules' || s === '.flymd') return true
      return false
    }

    const sanitizeLocalName = (s: string) =>
      String(s || '')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()

    const uniqueLocalPath = async (dir: string, fileName: string): Promise<string> => {
      const baseName = sanitizeLocalName(fileName) || 'untitled.md'
      const m = baseName.match(/^(.*?)(\.[^.]+)?$/)
      const stem = m?.[1] || baseName
      const ext = m?.[2] || ''
      let cur = baseName
      let i = 1
      while (await exists(dir + sep + cur)) {
        i += 1
        cur = `${stem}-${i}${ext}`
      }
      return dir + sep + cur
    }

    let copied = 0
    const copyDir = async (fromUri: string, toDir: string, depth = 0): Promise<void> => {
      if (depth > 32) return
      const ents = await safListDir(fromUri)
      for (const it of ents) {
        const name2 = String(it?.name || '').trim()
        const p2 = String(it?.path || '').trim()
        if (!name2 || !p2) continue
        if (it.isDir) {
          if (skipDir(name2)) continue
          const childDirName = sanitizeLocalName(name2)
          if (!childDirName) continue
          const nextLocal = toDir + sep + childDirName
          try { await mkdir(nextLocal as any, { recursive: true } as any) } catch {}
          // eslint-disable-next-line no-await-in-loop
          await copyDir(p2, nextLocal, depth + 1)
          continue
        }
        // 只导入“库支持的文档”；pdf 属于二进制，当前不导入（后续需要 bytes 读写）
        if (!isSupportedDoc(name2) || /\.pdf$/i.test(name2)) continue
        let text = ''
        try {
          // eslint-disable-next-line no-await-in-loop
          text = await readTextFileAnySafe(p2)
        } catch {
          continue
        }
        const dst = await uniqueLocalPath(toDir, name2)
        try {
          // eslint-disable-next-line no-await-in-loop
          await writeTextFile(dst as any, text, {} as any)
          copied += 1
        } catch {}
      }
    }

    await copyDir(uri, root, 0)
    await upsertLibrary({ id: `android-import-${Date.now()}`, name, root })

    try { alert(`导入完成：${copied} 个文件`) } catch {}
    await refreshLibraryUiAndTree(true)
  } catch (e) {
    showError('导入外置文件夹失败', e)
  }
}

// 通用重命名帮助函数：弹出对话框并在文件树/当前文档中同步路径
async function renamePathWithDialog(path: string): Promise<string | null> {
  try {
    const base = path.replace(/[\\/][^\\/]*$/, '')
    const oldFull = path.split(/[\\/]+/).pop() || ''
    const m = oldFull.match(/^(.*?)(\.[^.]+)?$/)
    const oldStem = (m?.[1] || oldFull)
    const oldExt = (m?.[2] || '')
    const newStem = await openRenameDialog(oldStem, oldExt)
    if (!newStem || newStem === oldStem) return null
    const name = newStem + oldExt

    // SAF：content:// URI 只能走 android_saf_rename（renameFileSafe 已兜底）
    if (String(path).startsWith('content://')) {
      const next = await renameFileSafe(path, name)
      if (currentFilePath === path) {
        currentFilePath = next as any
        refreshTitle()
      }
      // 通知其他模块：某个文件已从 path 重命名到 next
      try {
        window.dispatchEvent(new CustomEvent('flymd-file-renamed', { detail: { src: path, dst: next } }))
      } catch {}
      const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
      if (treeEl && fileTreeReady) {
        try { await fileTree.refresh() } catch {}
      }
      try {
        const nodes = Array.from(((document.getElementById('lib-tree') || document.body).querySelectorAll('.lib-node') as any)) as HTMLElement[]
        const node = nodes.find(n => (n as any).dataset?.path === next)
        if (node) node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      } catch {}
      return next
    }

    const dst = base + (base.includes('\\') ? '\\' : '/') + name
    if (await exists(dst)) {
      alert('同名已存在')
      return null
    }
    await moveFileSafe(path, dst)
    if (currentFilePath === path) {
      currentFilePath = dst as any
      refreshTitle()
    }
    // 通知其他模块：某个文件已从 path 重命名/移动到 dst
    try {
      window.dispatchEvent(new CustomEvent('flymd-file-renamed', { detail: { src: path, dst } }))
    } catch {}
    const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
    if (treeEl && !fileTreeReady) {
      await fileTree.init(treeEl, {
        getRoot: getLibraryRoot,
        onOpenFile: async (p: string) => { await openFile2(p) },
        onOpenNewFile: async (p: string) => {
          await openFile2(p)
          mode = 'edit'
          preview.classList.add('hidden')
          try { (editor as HTMLTextAreaElement).focus() } catch {}
        },
        onMoved: async (src: string, dst2: string) => {
          try {
            if (currentFilePath === src) {
              currentFilePath = dst2 as any
              refreshTitle()
            }
          } catch {}
        }
      })
      fileTreeReady = true
    } else if (treeEl) {
      await fileTree.refresh()
    }
    try {
      const nodes = Array.from(((document.getElementById('lib-tree') || document.body).querySelectorAll('.lib-node') as any)) as HTMLElement[]
      const node = nodes.find(n => (n as any).dataset?.path === dst)
      if (node) node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    } catch {}
    return dst
  } catch (e) {
    showError('重命名失败', e)
    return null
  }
}

// 安全删除：优先直接删除；若为目录或遇到占用异常，尝试递归删除目录内容后再删
async function deleteFileSafe(p: string, permanent = false): Promise<void> {
  console.log('[deleteFileSafe] 开始删除:', { path: p, permanent })

  // SAF：content:// URI 删除（目录需要递归清空）
  if (String(p).startsWith('content://')) {
    try { await persistSafUriPermission(p) } catch {}
    try {
      const children = await safListDir(p)
      for (const it of children || []) {
        const child = String((it as any)?.path || '').trim()
        if (!child) continue
        // eslint-disable-next-line no-await-in-loop
        await deleteFileSafe(child, true)
      }
    } catch {
      // 不是目录或列目录失败：按文件删除
    }
    await safDelete(p)
    return
  }

  // 第一步：尝试移至回收站（如果不是永久删除）
  if (!permanent && typeof invoke === 'function') {
    try {
      console.log('[deleteFileSafe] 调用 move_to_trash')
      await invoke('move_to_trash', { path: p })
      // 验证删除是否成功
      const stillExists = await exists(p)
      console.log('[deleteFileSafe] 回收站删除后检查文件是否存在:', stillExists)
      if (!stillExists) {
        console.log('[deleteFileSafe] 文件已成功移至回收站')
        return
      }
      console.warn('[deleteFileSafe] 文件移至回收站后仍然存在，尝试永久删除')
    } catch (e) {
      console.warn('[deleteFileSafe] 移至回收站失败，尝试永久删除:', e)
    }
  }

  // 第二步：永久删除（带重试机制）
  const maxRetries = 3
  let lastError: any = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 尝试直接删除
      await remove(p)

      // 验证删除是否成功
      const stillExists = await exists(p)
      if (!stillExists) return

      // 文件仍存在，可能需要递归删除目录
      const st: any = await stat(p)
      if (st?.isDirectory) {
        // 递归删除目录中的所有子项
        const ents = (await readDir(p, { recursive: false } as any)) as any[]
        for (const it of ents) {
          const child = typeof it?.path === 'string' ? it.path : (p + (p.includes('\\') ? '\\' : '/') + (it?.name || ''))
          await deleteFileSafe(child, true) // 递归时直接永久删除
        }
        // 删除空目录
        await remove(p)
      } else if (typeof invoke === 'function') {
        // 文件删除失败，尝试后端强制删除
        await invoke('force_remove_path', { path: p })
      }

      // 最终验证
      const finalCheck = await exists(p)
      if (!finalCheck) return

      throw new Error('文件仍然存在（可能被其他程序占用）')
    } catch (e) {
      lastError = e
      // 如果还有重试机会，等待后重试
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
        continue
      }
      // 最后一次尝试也失败了
      throw e
    }
  }

  throw lastError ?? new Error('删除失败')
}

async function renderDir(container: HTMLDivElement, dir: string) {
  container.innerHTML = ''
  const entries = await listDirOnce(dir)
  for (const e of entries) {
    if (e.isDir) {
      const row = document.createElement('div')
      row.className = 'lib-node lib-dir'
      row.innerHTML = `<svg class="lib-tg" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg><svg class="lib-ico lib-ico-folder" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a 2 2 0 0 1 2-2h4l2 2h8a 2 2 0 0 1 2 2v7a 2 2 0 0 1-2 2H5a 2 2 0 0 1-2-2V7z"/></svg><span class="lib-name">${e.name}</span>`
      ;(row as any).dataset.path = e.path
      const kids = document.createElement('div')
      kids.className = 'lib-children'
      kids.style.display = 'none'
      container.appendChild(row)
      row.addEventListener('dragover', (ev) => {
        ev.preventDefault()
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
        row.classList.add('selected')
      })
      row.addEventListener('dragleave', () => { row.classList.remove('selected') })
      row.addEventListener('drop', async (ev) => { try { ev.preventDefault(); row.classList.remove('selected'); const src = ev.dataTransfer?.getData('text/plain') || ''; if (!src) return; const base = e.path; const sep = base.includes('\\\\') ? '\\\\' : '/'; const dst = base + sep + (src.split(/[\\\\/]+/).pop() || ''); if (src === dst) return; const root = await getLibraryRoot(); if (!root || !isInside(root, src) || !isInside(root, dst)) { alert('仅允许在库目录内移动'); return } if (await exists(dst)) { const ok = await ask('目标已存在，是否覆盖？'); if (!ok) return } await moveFileSafe(src, dst); if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null; if (treeEl && !fileTreeReady) { await fileTree.init(treeEl, { getRoot: getLibraryRoot, onOpenFile: async (p: string) => { await openFile2(p) }, onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} } }); fileTreeReady = true } else if (treeEl) { await fileTree.refresh() } } catch (e) { showError('移动失败', e) } })
      container.appendChild(kids)
      let expanded = false
      row.addEventListener('click', async () => {
         selectLibraryNode(row, e.path, true)
        expanded = !expanded
        kids.style.display = expanded ? '' : 'none'
        row.classList.toggle('expanded', expanded)
        if (expanded && kids.childElementCount === 0) {
          await renderDir(kids as HTMLDivElement, e.path)
        }
      })
    } else {
      const row = document.createElement('div')
      const ext = (e.name.split('.').pop() || '').toLowerCase()
      row.className = 'lib-node lib-file file-ext-' + ext
      row.innerHTML = `<img class="lib-ico lib-ico-app" src="${appIconUrl}" alt=""/><span class="lib-name">${e.name}</span>`
       row.setAttribute('draggable','true')
       row.addEventListener('dragstart', (ev) => { try { ev.dataTransfer?.setData('text/plain', e.path) } catch {} })
      row.title = e.path
       ;(row as any).dataset.path = e.path
       row.setAttribute('draggable','true')
       row.addEventListener('dragstart', (ev) => { try { ev.dataTransfer?.setData('text/plain', e.path); if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move' } catch {} })
      row.addEventListener('click', async () => {
        selectLibraryNode(row, e.path, false)
        await openFile2(e.path)
      })
      container.appendChild(row)
    }
  }
}

// 顶级菜单下拉（参考库右键菜单的样式实现，纯 JS 内联样式，避免全局 CSS 入侵）
type TopMenuItemSpec = { label: string; accel?: string; action: () => void; disabled?: boolean }
// 顶部下拉菜单：全局文档级点击处理器引用，避免重复绑定与交叉干扰
let _topMenuDocHandler: ((ev: MouseEvent) => void) | null = null

function getMobileKeyboardInsetBottomPx(): number {
  try {
    const vv = (window as any).visualViewport as VisualViewport | undefined
    if (!vv) return 0
    const inset = window.innerHeight - (vv.height + vv.offsetTop)
    if (!Number.isFinite(inset)) return 0
    return Math.max(0, Math.round(inset))
  } catch {
    return 0
  }
}

function installMobileKeyboardInsetCssVar(): void {
  try {
    const root = document.documentElement
    const vv = (window as any).visualViewport as VisualViewport | undefined
    if (!root || !vv) return

    let raf = 0
    const update = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        try {
          const px = getMobileKeyboardInsetBottomPx()
          root.style.setProperty('--flymd-kb-inset-bottom', px ? (px + 'px') : '0px')
        } catch {}
      })
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    document.addEventListener('focusin', update, true)
    document.addEventListener('focusout', update, true)
    update()
  } catch {}
}

function showTopMenu(anchor: HTMLElement, items: TopMenuItemSpec[]) {
  try {
    const isMobileUi = document.body.classList.contains('platform-mobile')
    let menu = document.getElementById('top-ctx') as HTMLDivElement | null
    if (!menu) {
      menu = document.createElement('div') as HTMLDivElement
      menu.id = 'top-ctx'
      // 用 fixed，避免移动端/缩放下绝对定位跑偏
      menu.style.position = 'fixed'
      menu.style.zIndex = '9999'
      menu.style.background = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#fff'
      menu.style.color = getComputedStyle(document.documentElement).getPropertyValue('--fg') || '#111'
      menu.style.border = '1px solid ' + (getComputedStyle(document.documentElement).getPropertyValue('--border') || '#e5e7eb')
      menu.style.borderRadius = '8px'
      menu.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
      menu.style.minWidth = '200px'
      menu.style.padding = '6px 0'
      menu.addEventListener('click', (e) => e.stopPropagation())
      document.body.appendChild(menu)
    }
    // 切换菜单前移除上一次绑定的文档级点击处理器，防止“打开新菜单时被上一次处理器立刻关闭”
    if (_topMenuDocHandler) {
      try { document.removeEventListener('click', _topMenuDocHandler) } catch {}
      _topMenuDocHandler = null
    }

    const hide = () => {
      if (menu) menu.style.display = 'none'
      if (_topMenuDocHandler) {
        try { document.removeEventListener('click', _topMenuDocHandler) } catch {}
        _topMenuDocHandler = null
      }
    }
    const onDoc = () => hide()
    _topMenuDocHandler = onDoc
    menu.innerHTML = ''
    const mkRow = (spec: TopMenuItemSpec) => {
      const row = document.createElement('div') as HTMLDivElement
      row.style.display = 'flex'
      row.style.alignItems = 'center'
      row.style.justifyContent = 'space-between'
      row.style.gap = '16px'
      row.style.padding = isMobileUi ? '12px 14px' : '6px 12px'
      row.style.fontSize = isMobileUi ? '15px' : '13px'
      row.style.cursor = spec.disabled ? 'not-allowed' : 'pointer'
      const l = document.createElement('span')
      l.textContent = spec.label
      const r = document.createElement('span')
      r.textContent = spec.accel || ''
      r.style.opacity = '0.7'
      row.appendChild(l)
      row.appendChild(r)
      if (!spec.disabled) {
        // 移动端没有 hover，别绑无意义事件
        if (!isMobileUi) {
          row.addEventListener('mouseenter', () => row.style.background = 'rgba(127,127,127,0.12)')
          row.addEventListener('mouseleave', () => row.style.background = 'transparent')
        }
        row.addEventListener('click', () => { try { spec.action() } finally { hide() } })
      } else {
        row.style.opacity = '0.5'
      }
      return row
    }
    for (const it of items) menu.appendChild(mkRow(it))

    if (isMobileUi) {
      // 移动端：底部动作面板，避免被状态栏遮挡
      menu.style.left = '8px'
      menu.style.right = '8px'
      menu.style.bottom = 'calc(env(safe-area-inset-bottom) + var(--flymd-kb-inset-bottom, 0px) + 8px)'
      menu.style.top = 'auto'
      menu.style.minWidth = 'unset'
      menu.style.maxHeight = '60vh'
      menu.style.overflow = 'auto'
      menu.style.borderRadius = '14px'
    } else {
      // 桌面端：锚点左下
      const rc = anchor.getBoundingClientRect()
      const left = Math.max(0, Math.min(rc.left, window.innerWidth - (menu.offsetWidth || 220)))
      const top = Math.min(window.innerHeight - 10, rc.bottom)
      menu.style.right = 'auto'
      menu.style.bottom = 'auto'
      menu.style.left = left + 'px'
      menu.style.top = top + 'px'
      menu.style.maxHeight = 'unset'
      menu.style.overflow = 'visible'
      menu.style.borderRadius = '8px'
      menu.style.minWidth = '200px'
    }
    menu.style.display = 'block'
    // 推迟到当前点击事件冒泡结束后再绑定，以避免本次点击导致立刻关闭
    setTimeout(() => { if (_topMenuDocHandler) document.addEventListener('click', _topMenuDocHandler) }, 0)
  } catch {}
}

function showFileMenu() {
  const anchor = document.getElementById('btn-open') as HTMLDivElement | null
  if (!anchor) return
  void (async () => {
    const autoSave = getAutoSave()
    const autoSaveEnabled = autoSave.isEnabled()
    let portableEnabled = false
    try {
      if (!isMobileUiFast()) portableEnabled = await isPortableModeEnabled()
    } catch {}
    const items: TopMenuItemSpec[] = [
      { label: t('file.open'), accel: 'Ctrl+O', action: () => { void openFile2() } },
      // “最近文件”入口移入 文件 菜单
      { label: t('menu.recent'), accel: 'Ctrl+Shift+R', action: () => { void renderRecentPanel(true) } },
      {
        // 启用时在前面加上对勾
        label: `${autoSaveEnabled ? '✔ ' : ''}${t('file.autosave')}`,
        accel: '60s',
        action: () => { autoSave.toggle() },
      },
      { label: t('file.save'), accel: 'Ctrl+S', action: () => { void saveFile() } },
      { label: t('file.saveas'), accel: 'Ctrl+Shift+S', action: () => { void saveAs() } },
    ]
    // 移动端不提供：便携模式/配置导入导出（避免误触与启动时覆盖配置）
    if (!isMobileUiFast()) {
      // 配置相关操作移动到“文件”菜单
      items.push({
        label: t('menu.exportConfig') || '导出配置',
        accel: '',
        action: () => { void handleExportConfigFromMenu() },
      })
      items.push({
        label: t('menu.importConfig') || '导入配置',
        accel: '',
        action: () => { void handleImportConfigFromMenu() },
      })
      items.push({
        label: `${portableEnabled ? '✔ ' : ''}${t('menu.portableMode') || '便携模式'}`,
        accel: '',
        action: () => { void togglePortableModeFromMenu() },
      })
    }
    showTopMenu(anchor, items)
  })()
}

function showModeMenu() {
  const anchor = document.getElementById('btn-mode') as HTMLDivElement | null
  if (!anchor) return
  const flymd = (window as any)
  const splitEnabled = !!flymd.flymdGetSplitPreviewEnabled?.()
  showTopMenu(anchor, [
    { label: t('mode.edit'), accel: 'Ctrl+E', action: async () => {
      saveScrollPosition()
      if (wysiwyg) {
        try { await setWysiwygEnabled(false) } catch {}
        restoreScrollPosition()
        try { notifyModeChange() } catch {}
        return
      }
      if (mode !== 'edit') {
        mode = 'edit'
        try { preview.classList.add('hidden') } catch {}
        try { editor.focus() } catch {}
        try { syncToggleButton() } catch {}
        try { updateChromeColorsForMode('edit') } catch {}
        restoreScrollPosition()
        try { notifyModeChange() } catch {}
      }
    } },
    { label: t('mode.read'), accel: 'Ctrl+R', action: async () => {
      saveScrollPosition()
      const wasWysiwyg = wysiwyg
      if (wasWysiwyg) { try { await setWysiwygEnabled(false) } catch {} }
      mode = 'preview'
      try { preview.classList.remove('hidden') } catch {}
      try { await renderPreview() } catch {}
      try { syncToggleButton() } catch {}
      try { updateChromeColorsForMode('preview') } catch {}
      restoreScrollPosition()
      try { notifyModeChange() } catch {}
    } },
    { label: t('mode.wysiwyg'), accel: 'Ctrl+W', action: async () => {
      try { await setWysiwygEnabled(true) } catch {}
      try { notifyModeChange() } catch {}
    } },
    {
      label: `${splitEnabled ? '✓ ' : ''}源码 + 阅读分屏`,
      accel: 'Ctrl+Shift+E',
      action: () => {
        try {
          const fm = (window as any)
          if (typeof fm.flymdToggleSplitPreview === 'function') {
            fm.flymdToggleSplitPreview()
          } else {
            alert('当前环境不支持分屏功能')
          }
        } catch {}
      }
    },
  ])
}

async function pickImageFilesFromInput(): Promise<File[]> {
  return await new Promise<File[]>((resolve) => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = true
      input.style.position = 'fixed'
      input.style.left = '-9999px'
      input.style.top = '-9999px'
      const cleanup = () => {
        try { input.value = '' } catch {}
        try { input.remove() } catch {}
      }
      input.addEventListener(
        'change',
        () => {
          try {
            const arr = Array.from(input.files || [])
            cleanup()
            resolve(arr)
          } catch {
            cleanup()
            resolve([])
          }
        },
        { once: true },
      )
      document.body.appendChild(input)
      input.click()
      // 某些 WebView 下用户取消不会触发 change，这里给一个温和兜底
      window.setTimeout(() => {
        try {
          if (document.body.contains(input)) {
            cleanup()
            resolve([])
          }
        } catch {}
      }, 90_000)
    } catch {
      resolve([])
    }
  })
}

async function pickAudioFileFromInput(): Promise<File | null> {
  return await new Promise<File | null>((resolve) => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'audio/*,.mp3,.wav,.webm,.opus,.pcm'
      input.multiple = false
      input.style.position = 'fixed'
      input.style.left = '-9999px'
      input.style.top = '-9999px'
      const cleanup = () => {
        try { input.value = '' } catch {}
        try { input.remove() } catch {}
      }
      input.addEventListener(
        'change',
        () => {
          try {
            const f = (input.files && input.files[0]) ? input.files[0] : null
            cleanup()
            resolve(f)
          } catch {
            cleanup()
            resolve(null)
          }
        },
        { once: true },
      )
      document.body.appendChild(input)
      input.click()
      // 某些 WebView 下用户取消不会触发 change，这里给一个温和兜底
      window.setTimeout(() => {
        try {
          if (document.body.contains(input)) {
            cleanup()
            resolve(null)
          }
        } catch {}
      }, 90_000)
    } catch {
      resolve(null)
    }
  })
}

async function handleMobileInsertImages(): Promise<void> {
  try {
    const files = await pickImageFilesFromInput()
    if (!files.length) return
    for (const f of files) {
      const name = (f && (f as any).name) ? String((f as any).name) : 'image'
      await _imageUploaderManualPick.startAsyncUploadFromFile(f, name)
    }
  } catch (e) {
    console.warn('移动端插入图片失败', e)
    pluginNotice('插入图片失败', 'err', 2200)
  }
}

function showMobileQuickMenu() {
  const anchor = document.getElementById('btn-mobile-menu') as HTMLDivElement | null
  if (!anchor) return
  const isMobileUi = document.body.classList.contains('platform-mobile')
  if (!isMobileUi) return
  const isAndroidUi = document.body.classList.contains('platform-android')

  const clickById = (id: string) => {
    try {
      const el = document.getElementById(id) as HTMLElement | null
      if (!el) return
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    } catch {}
  }

  const items: TopMenuItemSpec[] = [
    { label: t('lib.menu'), action: () => { clickById('btn-library') } },
    { label: t('file.new'), action: () => { clickById('btn-new') } },
    { label: t('file.open'), action: () => { void openFile2() } },
    { label: t('file.save'), action: () => { void saveFile() } },
    { label: '插入图片…', action: () => { void handleMobileInsertImages() } },
    ...(isAndroidUi ? ([
      { label: '录音文件转文本…', action: () => { void transcribeFromAudioFileMenu() } },
      { label: activeSpeechRecorder ? '停止录音并转写' : '开始录音', action: () => { void toggleRecordAndTranscribeMenu() } },
      { label: '转写设置（自定义模型）…', action: () => { void openManualTranscribeSettingsFromMenu() } },
      { label: activeAndroidAsrNote ? (activeAndroidAsrNote.running ? '暂停自动语音笔记' : '继续自动语音笔记') : '自动语音笔记', action: () => { void toggleAndroidAsrNoteFromMenu() } },
      { label: '语音笔记余额/充值…', action: () => { void openAndroidAsrBillingEntry() } },
    ] as TopMenuItemSpec[]) : []),
    { label: `${t('mode.edit')}/${t('mode.read')}`, action: () => { void handleToggleModeShortcut() } },
    { label: t('sync.title'), action: () => { try { void openWebdavSyncDialog() } catch {} } },
    { label: t('sync.now'), action: () => { void handleManualSyncFromMenu() } },
    { label: t('sync.openlog'), action: () => { void handleOpenSyncLogFromMenu() } },
    { label: t('menu.extensions'), action: () => { clickById('btn-extensions') } },
    { label: t('menu.theme.tooltip') || t('menu.theme'), action: () => { clickById('btn-theme') } },
    { label: t('menu.update'), action: () => { void checkUpdateInteractive() } },
    { label: t('menu.about'), action: () => { void showAbout(true) } },
  ]
  showTopMenu(anchor, items)
}

function changeLocaleWithNotice(pref: LocalePref) {
  try {
    const prevLocale = getLocale()
    setLocalePref(pref)
    applyI18nUi()
    const newLocale = getLocale()
    if (prevLocale === newLocale) return
    const msgPrev = tLocale(prevLocale, 'lang.restartToApply')
    const msgNew = tLocale(newLocale, 'lang.restartToApply')
    NotificationManager.show('extension', msgPrev)
    NotificationManager.show('extension', msgNew)
  } catch {}
}

function showLangMenu() {
  const anchor = document.getElementById('btn-lang') as HTMLDivElement | null
  if (!anchor) return
  const pref = getLocalePref()
  const items: TopMenuItemSpec[] = [
    { label: `${pref === 'auto' ? '✓ ' : ''}${t('lang.auto')}`, action: () => { changeLocaleWithNotice('auto') } },
    { label: `${pref === 'zh' ? '✓ ' : ''}${t('lang.zh')}`, action: () => { changeLocaleWithNotice('zh') } },
    { label: `${pref === 'en' ? '✓ ' : ''}${t('lang.en')}`, action: () => { changeLocaleWithNotice('en') } },
  ]
  showTopMenu(anchor, items)
}

// 刷新文件树并更新库名称显示
async function refreshLibraryUiAndTree(refreshTree = true) {
  // 更新库名称显示
  try {
    const elPath = document.getElementById('lib-path') as HTMLDivElement | null
    if (elPath) {
      const id = await getActiveLibraryId()
      if (id) {
        const libs = await getLibraries()
        const cur = libs.find(x => x.id === id)
        const name = cur?.name || ''
        const root = String(cur?.root || '').trim()
        if (root.startsWith('content://')) {
          const hint0 = safLocationHint(root)
          const hint = hint0 ? (hint0.length > 32 ? (hint0.slice(0, 32) + '…') : hint0) : ''
          elPath.textContent = hint ? (name ? (name + ' · ' + hint) : hint) : name
          try { elPath.title = hint0 || root } catch {}
        } else {
          elPath.textContent = name
          try { elPath.title = root || name } catch {}
        }
      } else {
        elPath.textContent = ''
      }
    }
  } catch {}

  // Android：若当前激活库是危险 SAF 目录（Android/data/obb），立刻强提示避免事故继续发生
  try {
    if (!_warnedUninstallUnsafeSafLibrary) {
      const p = await (async () => { try { return await invoke<string>('get_platform') } catch { return '' } })()
      if (p === 'android') {
        const root = await getLibraryRoot()
        if (root && root.startsWith('content://') && isSafUninstallUnsafeFolder(root)) {
          _warnedUninstallUnsafeSafLibrary = true
          alert('警告：当前库目录位于 Android/data 或 Android/obb。\n这类目录会在卸载应用时被系统自动清空，文档会丢失。\n请立刻更换库目录（建议：下载/文档/存储根目录下自建文件夹），或先“从外置文件夹导入…”到本地库。')
        }
      }
    }
  } catch {}

  if (!refreshTree) return
  try {
    const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
    if (treeEl && !fileTreeReady) {
      await fileTree.init(treeEl, {
        getRoot: getLibraryRoot,
        onOpenFile: async (p: string) => { await openFile2(p) },
        onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} },
        onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} }
      })
      fileTreeReady = true
    } else if (treeEl) {
      await fileTree.refresh()
    }
    try { const s = await getLibrarySort(); fileTree.setSort(s); await fileTree.refresh() } catch {}
  } catch {}
}

// 库选择菜单：列出已保存库、切换/新增/重命名/删除
async function showLibraryMenu() {
  const anchor = document.getElementById('lib-choose') as HTMLButtonElement | null
  if (!anchor) return
  try {
    const platform = await (async () => {
      try { return await invoke<string>('get_platform') } catch { return '' }
    })()
    const libs = await getLibraries()
    const activeId = await getActiveLibraryId()
    const items: TopMenuItemSpec[] = []
    for (const lib of libs) {
      const cur = lib.id === activeId
      const label = (cur ? "\u2714\uFE0E " : '') + lib.name
      items.push({
        label,
        action: async () => {
          try { await setActiveLibId(lib.id) } catch {}
          await refreshLibraryUiAndTree(true)
        }
      })
    }
    // 末尾操作项
    items.push({ label: '新增库…', action: async () => { const p = await pickLibraryRoot(); if (p) await refreshLibraryUiAndTree(true) } })
    if (platform === 'android') {
      items.push({ label: '从外置文件夹导入…', action: async () => { await importAndroidSafFolderAsLocalLibrary() } })
      items.push({ label: '导出当前库到文件夹…', action: async () => { await exportActiveLibraryToFolderAndroid() } })
    }
    items.push({ label: '重命名当前库…', action: async () => {
      const id = await getActiveLibraryId(); if (!id) return
      const libs2 = await getLibraries()
      const cur = libs2.find(x => x.id === id)
      const oldName = cur?.name || ''
      const name = await openRenameDialog(oldName, '')
      if (!name || name === oldName) return
      try { await renameLib(id, name) } catch {}
      await refreshLibraryUiAndTree(false)
    } })
    items.push({ label: '删除当前库', action: async () => {
      const id = await getActiveLibraryId(); if (!id) return
      const ok = await ask('确认删除当前库？')
      if (!ok) return
      try { await removeLib(id) } catch {}
      await refreshLibraryUiAndTree(true)
    } })
    showTopMenu(anchor, items)
  } catch {}
}

function sanitizeSafName(input: string, fallback: string): string {
  const s = String(input || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return s || fallback
}

function isTextLikeForExport(path: string): boolean {
  const p = String(path || '').toLowerCase()
  // 仅导出文本类文件：md/txt/yaml/json/csv 等；图片等二进制暂不导出
  return /\.(md|markdown|txt|json|ya?ml|csv|log)$/i.test(p)
}

async function ensureSafDirUnder(parentUri: string, name: string): Promise<string> {
  const safe = sanitizeSafName(name, 'folder')
  // 先查找，避免重复创建导致报错或出现同名重复目录
  try {
    const ents = await safListDir(parentUri)
    const hit = ents.find(e => e && e.isDir && e.name === safe)
    if (hit && hit.path) return hit.path
  } catch {}
  return await safCreateDir(parentUri, safe)
}

async function createSafDirUnique(parentUri: string, desiredName: string): Promise<string> {
  const base = sanitizeSafName(desiredName, 'folder')
  let taken = new Set<string>()
  try {
    const ents = await safListDir(parentUri)
    taken = new Set((ents || []).filter(e => e && e.isDir).map(e => String(e.name || '').trim()).filter(Boolean))
  } catch {}
  let name = base
  let n = 1
  while (taken.has(name) && n < 100) {
    n += 1
    name = `${base}-${n}`
  }
  return await safCreateDir(parentUri, name)
}

async function ensureSafDirChain(rootUri: string, relDir: string, cache: Map<string, string>): Promise<string> {
  const norm = String(relDir || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  if (!norm) return rootUri
  if (cache.has(norm)) return cache.get(norm)!
  const parts = norm.split('/').filter(Boolean)
  let curUri = rootUri
  let curKey = ''
  for (const p of parts) {
    curKey = curKey ? (curKey + '/' + p) : p
    const cached = cache.get(curKey)
    if (cached) {
      curUri = cached
      continue
    }
    curUri = await ensureSafDirUnder(curUri, p)
    cache.set(curKey, curUri)
  }
  return curUri
}

async function exportActiveLibraryToFolderAndroid(): Promise<void> {
  try {
    const platform = await (async () => {
      try { return await invoke<string>('get_platform') } catch { return '' }
    })()
    if (platform !== 'android') {
      pluginNotice('仅 Android 可用', 'err', 2000)
      return
    }

    const root = await getLibraryRoot()
    if (!root) {
      pluginNotice('未选择库', 'err', 2000)
      return
    }
    if (root.startsWith('content://')) {
      pluginNotice('当前为外置库（SAF），无需导出应用私有目录', 'ok', 2200)
      return
    }

    const activeId = await getActiveLibraryId()
    const libs = await getLibraries()
    const lib = libs.find(x => x.id === activeId) || libs[0]
    const libName = sanitizeSafName(lib?.name || 'library', 'library')

    let parent = ''
    try {
      parent = normalizePath(await safPickFolder()) || ''
    } catch (e) {
      const msg = String((e as any)?.message || e || '')
      if (/cancel/i.test(msg) || /canceled/i.test(msg) || /cancellation/i.test(msg)) return
      throw e
    }
    if (!parent || !parent.startsWith('content://')) {
      pluginNotice('请选择一个目标文件夹（SAF）', 'err', 2400)
      return
    }
    try { await persistSafUriPermission(parent) } catch {}

    const ts = formatBackupTimestamp(new Date())
    const baseName = sanitizeSafName(`flymd-export-${libName}-${ts}`, 'flymd-export')
    let exportRootUri = ''
    try {
      exportRootUri = await createSafDirUnique(parent, baseName)
    } catch {
      exportRootUri = await createSafDirUnique(parent, baseName + '-2')
    }
    try { await persistSafUriPermission(exportRootUri) } catch {}

    // 递归收集本地库文件（路径模式）
    type LocalFile = { abs: string; rel: string }
    const files: LocalFile[] = []
    const skipDir = (name: string) => {
      const s = String(name || '').trim()
      if (!s) return true
      if (s === '.' || s === '..') return true
      if (s === '.git' || s === 'node_modules' || s === '.flymd') return true
      return false
    }
    const walk = async (absDir: string, relDir: string) => {
      let entries: any[] = []
      try {
        entries = await readDir(absDir as any, { recursive: false } as any) as any[]
      } catch {
        return
      }
      for (const entry of entries || []) {
        const name = entry?.name ? String(entry.name) : ''
        if (!name) continue
        if (skipDir(name)) continue
        const isDir = entry?.isDirectory === true || entry?.isDir === true || Array.isArray(entry?.children)
        const childAbs = absDir.replace(/[\\/]+$/, '') + (absDir.includes('\\') ? '\\' : '/') + name
        const childRel = relDir ? (relDir + '/' + name) : name
        if (isDir) await walk(childAbs, childRel)
        else files.push({ abs: childAbs, rel: childRel })
      }
    }
    await walk(root, '')

    if (!files.length) {
      pluginNotice('库为空，无需导出', 'ok', 1600)
      return
    }

    const dirCache = new Map<string, string>()
    let exported = 0
    let skipped = 0
    for (const f of files) {
      try {
        if (!isTextLikeForExport(f.abs)) { skipped += 1; continue }
        const rel = String(f.rel || '').replace(/\\/g, '/')
        const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
        const name = rel.includes('/') ? rel.slice(rel.lastIndexOf('/') + 1) : rel
        const parentDirUri = await ensureSafDirChain(exportRootUri, dir, dirCache)
        const safeName = sanitizeSafName(name, 'file.txt')
        const mime = /\.md|\.markdown$/i.test(safeName) ? 'text/markdown' : 'text/plain'
        const fileUri = await safCreateFile(parentDirUri, safeName, mime)
        const text = await readTextFile(f.abs as any)
        await writeTextFileAnySafe(fileUri, text)
        exported += 1
      } catch {
        skipped += 1
      }
    }

    pluginNotice(`导出完成：${exported} 个文本文件，跳过 ${skipped} 个非文本/失败项`, 'ok', 3600)
  } catch (e) {
    console.warn('导出库失败', e)
    pluginNotice('导出失败', 'err', 2600)
  }
}

function applyI18nUi() {
  try {
    // 菜单
    const map: Array<[string, string]> = [
      ['btn-open', t('menu.file')],
      ['btn-mode', t('menu.mode')],
      ['btn-mobile-menu', t('menu.more')],
      ['btn-recent', t('menu.recent')],
      ['btn-uploader', t('menu.uploader')],
      ['btn-extensions', t('menu.extensions')],
      ['btn-library', t('lib.menu')],
      ['btn-update', t('menu.update')],
      ['btn-about', t('menu.about')],
    ]
    for (const [id, text] of map) {
      const el = document.getElementById(id) as HTMLDivElement | null
      if (el) { el.textContent = text; el.title = text }
    }
    // 主题与插件按钮：标题与提示分离
    try {
      const themeBtn = document.getElementById('btn-theme') as HTMLDivElement | null
      if (themeBtn) {
        themeBtn.textContent = t('menu.theme')
        themeBtn.title = t('menu.theme.tooltip')
      }
      const pluginsBtn = document.getElementById('btn-plugins') as HTMLDivElement | null
      if (pluginsBtn) {
        pluginsBtn.textContent = t('menu.plugins')
        pluginsBtn.title = t('menu.plugins.tooltip')
      }
    } catch {}
    // 文件名/状态/编辑器占位
    try { (document.getElementById('editor') as HTMLTextAreaElement | null)?.setAttribute('placeholder', t('editor.placeholder')) } catch {}
    try { refreshTitle() } catch {}
    try { refreshStatus() } catch {}
    // 库页签/按钮
    try {
      const localeNow = getLocale()
      const filesLabel = localeNow === 'en' ? (t as any)('tab.files.short') ?? t('tab.files') : t('tab.files')
      const outlineLabel = localeNow === 'en' ? (t as any)('tab.outline.short') ?? t('tab.outline') : t('tab.outline')
      const chooseLabel = localeNow === 'en' ? (t as any)('lib.choose.short') ?? t('lib.choose') : t('lib.choose')
      const refreshLabel = localeNow === 'en' ? (t as any)('lib.refresh.short') ?? t('lib.refresh') : t('lib.refresh')
      const elF = document.getElementById('lib-tab-files') as HTMLButtonElement | null
      if (elF) elF.textContent = String(filesLabel)
      const elO = document.getElementById('lib-tab-outline') as HTMLButtonElement | null
      if (elO) elO.textContent = String(outlineLabel)
      const elC = document.getElementById('lib-choose') as HTMLButtonElement | null
      if (elC) elC.textContent = String(chooseLabel)
      const elR = document.getElementById('lib-refresh') as HTMLButtonElement | null
      if (elR) elR.textContent = String(refreshLabel)
      const elP = document.getElementById('lib-pin') as HTMLButtonElement | null
      if (elP) elP.textContent = libraryDocked ? t('lib.pin.auto') : t('lib.pin.fixed')
      updateLibrarySideButton()
    } catch {}
    // 图床设置（若已创建）
    try {
      const uplRoot = document.getElementById('uploader-overlay') as HTMLDivElement | null
      if (uplRoot) {
        const titleEl = uplRoot.querySelector('#upl-title') as HTMLDivElement | null
        const descEl = uplRoot.querySelector('.upl-desc') as HTMLDivElement | null
        if (titleEl) titleEl.textContent = t('upl.title')
        if (descEl) descEl.textContent = t('upl.desc')
        const setLabel = (forId: string, txt: string) => {
          const lab = uplRoot.querySelector(`label[for="${forId}"]`) as HTMLLabelElement | null
          if (lab) lab.textContent = txt
        }
        setLabel('upl-enabled', t('upl.enable'))
        setLabel('upl-always-local', t('upl.alwaysLocal'))
        setLabel('upl-ak', t('upl.ak'))
        setLabel('upl-sk', t('upl.sk'))
        setLabel('upl-bucket', t('upl.bucket'))
        setLabel('upl-endpoint', t('upl.endpoint'))
        setLabel('upl-region', t('upl.region'))
        setLabel('upl-domain', t('upl.domain'))
        setLabel('upl-template', t('upl.template'))
        setLabel('upl-pathstyle', t('upl.pathstyle'))
        setLabel('upl-acl', t('upl.acl'))
        setLabel('upl-webp-enable', t('upl.webp.enable'))
        setLabel('upl-webp-quality', t('upl.webp.quality'))
        setLabel('upl-webp-local', t('upl.webp.local'))
        const setPh = (id: string, ph: string) => { const inp = uplRoot.querySelector(`#${id}`) as HTMLInputElement | null; if (inp) inp.placeholder = ph }
        setPh('upl-ak', t('upl.ak.ph'))
        setPh('upl-sk', t('upl.sk.ph'))
        setPh('upl-bucket', t('upl.bucket.ph'))
        setPh('upl-endpoint', t('upl.endpoint.ph'))
        setPh('upl-region', t('upl.region.ph'))
        setPh('upl-domain', t('upl.domain.ph'))
        setPh('upl-template', t('upl.template.ph'))
        const secs = uplRoot.querySelectorAll('.upl-section-title') as NodeListOf<HTMLDivElement>
        if (secs[0]) secs[0].textContent = t('upl.section.basic')
        if (secs[1]) secs[1].textContent = t('upl.section.access')
        if (secs[2]) secs[2].textContent = t('upl.section.advanced')
        const hints = uplRoot.querySelectorAll('.upl-hint') as NodeListOf<HTMLDivElement>
        if (hints[0]) hints[0].textContent = t('upl.hint.alwaysLocal')
        if (hints[1]) hints[1].textContent = t('upl.endpoint.hint')
        if (hints[2]) hints[2].textContent = t('upl.domain.hint')
        if (hints[3]) hints[3].textContent = t('upl.webp.quality.hint')
        if (hints[3]) hints[3].textContent = t('upl.template.hint')
      }
    } catch {}
    // 扩展管理（若已创建）：重绘或更新文本
    try {
      const extOverlay = document.getElementById('extensions-overlay') as HTMLDivElement | null
      if (extOverlay) {
        // 简单做法：刷新整块 UI 的静态文案
        const titleEl = extOverlay.querySelector('.ext-header div') as HTMLDivElement | null
        if (titleEl) titleEl.textContent = t('ext.title')
        const stTitles = extOverlay.querySelectorAll('.ext-subtitle') as NodeListOf<HTMLDivElement>
        if (stTitles[0]) stTitles[0].textContent = t('ext.install.section')
        // 第二/第三个小节标题在 refreshExtensionsUI 中按需重建
        const input = extOverlay.querySelector('#ext-install-input') as HTMLInputElement | null
        if (input) input.placeholder = t('ext.install.placeholder')
        const btnInstall = extOverlay.querySelector('#ext-install-btn') as HTMLButtonElement | null
        if (btnInstall) btnInstall.textContent = t('ext.install.btn')
        // 列表区域走 refresh 重建，确保按钮文本（设置/启用/禁用/移除/刷新）也同步
        void panelRefreshExtensionsUI()
      }
    } catch {}
    // WebDAV 同步窗口（若已创建）：仅更新标题与按钮
    try {
      const syncOverlay = document.getElementById('sync-overlay') as HTMLDivElement | null
      if (syncOverlay) {
        const tEl = syncOverlay.querySelector('#sync-title') as HTMLDivElement | null
        if (tEl) tEl.textContent = t('sync.title')
        const closeEl = syncOverlay.querySelector('#sync-close') as HTMLButtonElement | null
        if (closeEl) closeEl.title = t('about.close')
        const openLog = syncOverlay.querySelector('#sync-openlog') as HTMLButtonElement | null
        if (openLog) openLog.textContent = t('sync.openlog')
        const saveBtn = syncOverlay.querySelector('#sync-save') as HTMLButtonElement | null
        if (saveBtn) saveBtn.textContent = t('sync.save')
      }
    } catch {}
    // 重命名对话框（若已创建）
    try {
      const renameOverlay = document.getElementById('rename-overlay') as HTMLDivElement | null
      if (renameOverlay) {
        const titleEl = renameOverlay.querySelector('#rename-title') as HTMLDivElement | null
        if (titleEl) titleEl.textContent = t('dlg.rename')
        const closeEl = renameOverlay.querySelector('#rename-close') as HTMLButtonElement | null
        if (closeEl) closeEl.title = t('about.close')
        const labels = renameOverlay.querySelectorAll('.link-field > span') as NodeListOf<HTMLSpanElement>
        if (labels[0]) labels[0].textContent = t('dlg.name')
        if (labels[1]) labels[1].textContent = t('dlg.ext')
        const nameInput = renameOverlay.querySelector('#rename-text') as HTMLInputElement | null
        if (nameInput) nameInput.placeholder = t('dlg.name.ph')
        const cancelBtn = renameOverlay.querySelector('#rename-cancel') as HTMLButtonElement | null
        if (cancelBtn) cancelBtn.textContent = t('dlg.cancel')
        const okBtn = renameOverlay.querySelector('#rename-ok') as HTMLButtonElement | null
        if (okBtn) okBtn.textContent = t('dlg.ok')
      }
    } catch {}
    // 插入链接对话框（若已创建）
    try {
      const linkOverlay = document.getElementById('link-overlay') as HTMLDivElement | null
      if (linkOverlay) {
        const titleEl = linkOverlay.querySelector('#link-title') as HTMLDivElement | null
        if (titleEl) titleEl.textContent = t('dlg.link')
        const closeEl = linkOverlay.querySelector('#link-close') as HTMLButtonElement | null
        if (closeEl) closeEl.title = t('about.close')
        const labels = linkOverlay.querySelectorAll('.link-field > span') as NodeListOf<HTMLSpanElement>
        if (labels[0]) labels[0].textContent = t('dlg.text')
        if (labels[1]) labels[1].textContent = t('dlg.url')
        const textInput = linkOverlay.querySelector('#link-text') as HTMLInputElement | null
        if (textInput) textInput.placeholder = t('dlg.link.text.ph')
        const urlInput = linkOverlay.querySelector('#link-url') as HTMLInputElement | null
        if (urlInput) urlInput.placeholder = t('dlg.url.ph')
        const testBtn = linkOverlay.querySelector('#link-test') as HTMLButtonElement | null
        if (testBtn) testBtn.textContent = t('dlg.test')
        const cancelBtn = linkOverlay.querySelector('#link-cancel') as HTMLButtonElement | null
        if (cancelBtn) cancelBtn.textContent = t('dlg.cancel')
        const insertBtn = linkOverlay.querySelector('#link-insert') as HTMLButtonElement | null
        if (insertBtn) insertBtn.textContent = t('dlg.insert')
      }
    } catch {}

    // 移动端：i18n 会重写按钮文本，这里统一恢复顶栏图标
    try { if (document.body.classList.contains('platform-mobile')) initMobileIcons() } catch {}
  } catch {}
}

function bindEvents() {
  // 移动端：内置“悬浮工具条”（照搬 floating-toolbar 插件，只在选中时出现）
  try {
    initBuiltInFloatingToolbar({
      enabled: () => {
        try { return document.body.classList.contains('platform-mobile') } catch { return false }
      },
      isReadingMode: () => mode === 'preview',
      getEditor: () => editor,
      isWysiwygActive: () => !!wysiwygV2Active,
      getDoc: () => editor.value,
      setDoc: (next) => {
        try {
          editor.value = String(next ?? '')
          dirty = true
          refreshTitle()
          refreshStatus()
          // 触发既有 input 监听，确保预览/分屏同步
          try { editor.dispatchEvent(new Event('input', { bubbles: true })) } catch {}
        } catch {}
      },
      notice: (msg, level, ms) => pluginNotice(String(msg || ''), level as any, ms as any),
      wysiwyg: {
        applyHeading: (lv) => wysiwygV2ApplyHeading(lv),
        toggleBold: () => wysiwygV2ToggleBold(),
        toggleItalic: () => wysiwygV2ToggleItalic(),
        toggleBulletList: () => wysiwygV2ToggleBulletList(),
        applyLink: (url, label) => wysiwygV2ApplyLink(url, label),
        insertImage: (src, alt) => wysiwygV2InsertImage(src, alt),
        getSelectedText: () => {
          try { return wysiwygV2GetSelectedText() } catch { return '' }
        },
      },
    })
  } catch {}
  try { ensureEditorKeyHooksBound() } catch {}
// 全局：确保编辑器键盘钩子仅绑定一次（切换文档/重开窗也生效）
  function ensureEditorKeyHooksBound() {
    try {
      const w = window as any
      if (w._editorKeyHooksBound) return
      w._editorKeyHooksBound = true
      // 反引号序列状态（全局）
      w._btCount = 0
      w._btTimer = null
      w._btSelS = 0
      w._btSelE = 0

      const getEditor = (): HTMLTextAreaElement | null => document.getElementById('editor') as HTMLTextAreaElement | null
      const isEditMode = () => (typeof mode !== 'undefined' && mode === 'edit' && !wysiwyg)

      const pairs: Array<[string, string]> = [["(", ")"],["[", "]"],["{", "}"],["\"", "\""],["'", "'"],["*","*"],["_","_"],["（","）"],["【","】"],["《","》"],["「","」"],["『","』"],["“","”"],["‘","’"]]
      try { pairs.push([String.fromCharCode(96), String.fromCharCode(96)]) } catch {}
      const openClose = Object.fromEntries(pairs as any) as Record<string,string>
      try { pairs.push([String.fromCharCode(0x300A), String.fromCharCode(0x300B)]) } catch {}
      try { pairs.push([String.fromCharCode(0x3010), String.fromCharCode(0x3011)]) } catch {}
      try { pairs.push([String.fromCharCode(0xFF08), String.fromCharCode(0xFF09)]) } catch {}
      try { pairs.push([String.fromCharCode(0x300C), String.fromCharCode(0x300D)]) } catch {}
      try { pairs.push([String.fromCharCode(0x300E), String.fromCharCode(0x300F)]) } catch {}
      try { pairs.push([String.fromCharCode(0x201C), String.fromCharCode(0x201D)]) } catch {}
      try { pairs.push([String.fromCharCode(0x2018), String.fromCharCode(0x2019)]) } catch {}
      const closers = new Set(Object.values(openClose))

      function handleKeydown(e: KeyboardEvent) {
        const ta = getEditor(); if (!ta) return
        if (e.target !== ta) return
        if (!isEditMode()) return
        if (e.key === '*') return
        if (e.ctrlKey || e.metaKey || e.altKey) return
        const val = String(ta.value || '')
        const s = ta.selectionStart >>> 0
        const epos = ta.selectionEnd >>> 0

        // 反引号三连/双连/单：优先处理
        if (e.key === '`') {
          const w = window as any
          try { if (w._btTimer) { clearTimeout(w._btTimer); w._btTimer = null } } catch {}
          w._btCount = (w._btCount || 0) + 1
          if (w._btCount === 1) { w._btSelS = s; w._btSelE = epos }
          e.preventDefault()
          const commit = () => {
            const s0 = w._btSelS >>> 0, e0 = w._btSelE >>> 0
            const before = val.slice(0, s0); const mid = val.slice(s0, e0); const after = val.slice(e0)
            const hasNL = /\n/.test(mid)
            if (w._btCount >= 3 || hasNL) {
              const content = (e0 > s0 ? ('\n' + mid + '\n') : ('\n\n'))
              ta.value = before + '```' + content + '```' + after
              const caret = (e0 > s0) ? (s0 + content.length + 3) : (s0 + 4)
              ta.selectionStart = ta.selectionEnd = caret
            } else if (w._btCount === 2) {
              ta.value = before + '``' + (e0 > s0 ? mid : '') + '``' + after
              if (e0 > s0) { ta.selectionStart = s0 + 2; ta.selectionEnd = s0 + 2 + mid.length } else { ta.selectionStart = ta.selectionEnd = s0 + 2 }
            } else {
              ta.value = before + '`' + (e0 > s0 ? mid : '') + '`' + after
              if (e0 > s0) { ta.selectionStart = s0 + 1; ta.selectionEnd = s0 + 1 + mid.length } else { ta.selectionStart = ta.selectionEnd = s0 + 1 }
            }
            try { dirty = true; refreshTitle(); refreshStatus() } catch {}
            if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
            w._btCount = 0; w._btTimer = null
          }
          const w2 = window as any; w2._btTimer = (setTimeout as any)(commit, 280)
          return
        }

        // 跳过右侧
        if (closers.has(e.key) && s === epos && val[s] === e.key) { e.preventDefault(); ta.selectionStart = ta.selectionEnd = s + 1; return }

        // 通用成对/环绕（不含反引号）
        const close = (openClose as any)[e.key]; if (!close) return
        // 交给 imePatch 在 beforeinput 阶段处理，避免与此处重复
        e.preventDefault()
        if (s !== epos) {
          const before = val.slice(0, s); const mid = val.slice(s, epos); const after = val.slice(epos)
          ta.value = before + e.key + mid + close + after
          ta.selectionStart = s + 1; ta.selectionEnd = s + 1 + mid.length
        } else {
          const before = val.slice(0, s); const after = val.slice(epos)
          ta.value = before + e.key + close + after
          ta.selectionStart = ta.selectionEnd = s + 1
        }
        try { dirty = true; refreshTitle(); refreshStatus() } catch {}
        if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
      }

      function handleTabIndent(e: KeyboardEvent) {
        const ta = getEditor(); if (!ta) return
        if (e.target !== ta) return
        if (!isEditMode()) return
        if (e.key !== 'Tab' || e.ctrlKey || e.metaKey) return
        e.preventDefault()
        const val = String(ta.value || '')
        const start = ta.selectionStart >>> 0; const end = ta.selectionEnd >>> 0
        const isShift = !!e.shiftKey; const indent = "&emsp;&emsp;"
        const lineStart = val.lastIndexOf('\n', start - 1) + 1
        const sel = val.slice(lineStart, end)
        if (start === end) {
          if (isShift) {
            if (val.slice(lineStart).startsWith(indent)) {
              const nv = val.slice(0, lineStart) + val.slice(lineStart + indent.length)
              ta.value = nv
              const newPos = Math.max(lineStart, start - indent.length)
              ta.selectionStart = ta.selectionEnd = newPos
            }
          } else {
            if (!val.slice(lineStart).startsWith(indent)) {
              const nv = val.slice(0, lineStart) + indent + val.slice(lineStart)
              ta.value = nv
              const newPos = start + indent.length
              ta.selectionStart = ta.selectionEnd = newPos
            }
          }
        } else if (start !== end && sel.includes('\n')) {
          const lines = val.slice(lineStart, end).split('\n')
          const changed = lines.map((ln) => isShift ? (ln.startsWith(indent) ? ln.slice(indent.length) : (ln.startsWith(' \t') ? ln.slice(1) : (ln.startsWith('\t') ? ln.slice(1) : ln))) : ((ln.startsWith(indent) ? ln : (indent + ln)))).join('\n')
          const newVal = val.slice(0, lineStart) + changed + val.slice(end)
          const delta = changed.length - (end - lineStart)
          ta.value = newVal; ta.selectionStart = lineStart; ta.selectionEnd = end + delta
        } else {
          if (isShift) {
            const curLineStart = lineStart
            const cur = val.slice(curLineStart)
            if (cur.startsWith(indent, start - curLineStart)) { const nv = val.slice(0, start - indent.length) + val.slice(start); ta.value = nv; ta.selectionStart = ta.selectionEnd = start - indent.length }
            else if ((start - curLineStart) > 0 && val.slice(curLineStart, curLineStart + 1) === '\t') { const nv = val.slice(0, curLineStart) + val.slice(curLineStart + 1); ta.value = nv; const shift = (start > curLineStart) ? 1 : 0; ta.selectionStart = ta.selectionEnd = start - shift }
          } else {
            const nv = val.slice(0, start) + indent + val.slice(end); ta.value = nv; ta.selectionStart = ta.selectionEnd = start + indent.length
          }
        }
        try { dirty = true; refreshTitle(); refreshStatus() } catch {}
        if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
      }

      document.addEventListener('beforeinput', (e) => { try { const ev: any = e as any; if (ev?.isComposing || /Composition/i.test(String(ev?.inputType || ''))) return; handleBeforeInput(e as any) } catch {} }, true)
      document.addEventListener('input', (e) => { try { const ev: any = e as any; if (ev?.isComposing || /Composition/i.test(String(ev?.inputType || ''))) return; handleInput(e as any) } catch {} }, true)
      document.addEventListener('keydown', (e) => { try { handleKeydown(e) } catch {} }, true)
      document.addEventListener('keydown', (e) => { try { handleTabIndent(e) } catch {} }, true)
      document.addEventListener('keydown', (e) => {
        try {
          const ev = e as KeyboardEvent
          if (ev.key !== 'Tab' || ev.ctrlKey || ev.metaKey || !wysiwygV2Active) return
          const tgt = e.target as HTMLElement | null
          const rootEl = document.getElementById('md-wysiwyg-root')
          if (!rootEl || !tgt || !rootEl.contains(tgt)) return
          ev.preventDefault(); try { ev.stopPropagation() } catch {} ; try { (e as any).stopImmediatePropagation && (e as any).stopImmediatePropagation() } catch {}

          const em = '&emsp;&emsp;'
          const sel = window.getSelection()
          // 反缩进：Shift+Tab 删除光标前一组，或当前段落行首一组
          if (ev.shiftKey) {
            try {
              if (sel && sel.rangeCount > 0) {
                const r = sel.getRangeAt(0)
                // 删除紧邻光标前的实体
                if (r.startContainer && r.startContainer.nodeType === 3) {
                  const tn = r.startContainer as Text
                  const off = r.startOffset >>> 0
                  const need = em.length
                  if (off >= need && tn.data.slice(off - need, off) === em) {
                    tn.deleteData(off - need, need)
                    const rr = document.createRange(); rr.setStart(tn, off - need); rr.collapse(true)
                    sel.removeAllRanges(); sel.addRange(rr)
                    return
                  }
                }
                // 尝试删除当前块的行首实体
                const block = (tgt.closest('p,div,li,h1,h2,h3,h4,h5,h6,blockquote,pre') as HTMLElement) || (rootEl as HTMLElement)
                if (block && block.firstChild && block.firstChild.nodeType === 3) {
                  const t0 = (block.firstChild as Text)
                  if ((t0.data || '').startsWith(em)) {
                    t0.deleteData(0, em.length)
                    const rr = document.createRange(); rr.setStart(t0, 0); rr.collapse(true)
                    sel?.removeAllRanges(); sel?.addRange(rr)
                  }
                }
              }
            } catch {}
            return
          }

          // 正向缩进：若当前段落行首已是缩进，则不重复；否则插入一组
          try {
            if (sel && sel.rangeCount > 0) {
              const r = sel.getRangeAt(0)
              const block = (tgt.closest('p,div,li,h1,h2,h3,h4,h5,h6,blockquote,pre') as HTMLElement) || (rootEl as HTMLElement)
              const already = (() => { try { const fc = block?.firstChild; return (fc && fc.nodeType === 3 && (fc as Text).data.startsWith(em)) } catch { return false } })()
              if (already) return
            }
          } catch {}

          let ok = false
          try { ok = document.execCommand('insertText', false, em) } catch {}
          if (!ok && sel && sel.rangeCount > 0) {
            const r = sel.getRangeAt(0)
            r.deleteContents()
            r.insertNode(document.createTextNode(em))
            try { sel.removeAllRanges(); const rr = document.createRange(); rr.setStart(r.endContainer, r.endOffset); rr.collapse(true); sel.addRange(rr) } catch {}
          }
        } catch {}
      }, true)
      document.addEventListener('keydown', (e: KeyboardEvent) => {
        try {
          if (e.key !== 'Backspace') return
          const anyEv = e as any
          if (anyEv?.defaultPrevented) return
          const target = e.target as HTMLElement | null
          if (!target) return
          if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
          const el = target as HTMLInputElement | HTMLTextAreaElement
          const s = el.selectionStart ?? 0
          const end = el.selectionEnd ?? s
          if (s === 0 && end === 0) {
            e.preventDefault()
            try { e.stopPropagation() } catch {}
            try { (anyEv as any).stopImmediatePropagation && (anyEv as any).stopImmediatePropagation() } catch {}
          }
        } catch {}
      }, true)
    } catch {}
  }
  // 全局错误捕获
  window.addEventListener('error', (e) => { try { (e as any)?.preventDefault?.() } catch {}; // @ts-ignore
    showError(e.message || '未捕获错误', (e as any)?.error)
  })
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => { try { e.preventDefault() } catch {}; const reason = (e?.reason instanceof Error) ? e.reason : new Error(String(e?.reason ?? '未知拒绝'))
    showError('未处理的 Promise 拒绝', reason)
  })

  // 菜单项点击事件
  const btnOpen = document.getElementById('btn-open')
  const btnMode = document.getElementById('btn-mode')
  const btnMobileMenu = document.getElementById('btn-mobile-menu')
  const btnSave = document.getElementById('btn-save')
  const btnSaveas = document.getElementById('btn-saveas')
  const btnToggle = document.getElementById('btn-toggle')
  const btnNew = document.getElementById('btn-new')
  const btnRecent = document.getElementById('btn-recent')
  const btnLibrary = document.getElementById('btn-library')
  const btnAbout = document.getElementById('btn-about')
  const btnUpdate = document.getElementById('btn-update')
  const btnUploader = document.getElementById('btn-uploader')
  const btnWysiwyg = document.getElementById('btn-wysiwyg')
  const btnLang = document.getElementById('btn-lang')

  if (btnOpen) btnOpen.addEventListener('click', guard(() => showFileMenu()))
  if (btnMode) btnMode.addEventListener('click', guard(() => showModeMenu()))
  if (btnMobileMenu) btnMobileMenu.addEventListener('click', guard(() => showMobileQuickMenu()))
  if (btnLang) btnLang.addEventListener('click', guard(() => showLangMenu()))
  if (btnSave) btnSave.addEventListener('click', guard(() => saveFile()))
  if (btnSaveas) btnSaveas.addEventListener('click', guard(() => saveAs()))
  if (btnToggle) btnToggle.addEventListener('click', guard(() => toggleMode()))
  if (btnWysiwyg) btnWysiwyg.addEventListener('click', guard(() => toggleWysiwyg()))
  // 查找替换对话框（源码模式，Ctrl+H）
  let _findPanel: HTMLDivElement | null = null
  let _findInput: HTMLInputElement | null = null
  let _replaceInput: HTMLInputElement | null = null
  let _findCase: HTMLInputElement | null = null
  let _lastFind = ''
  let _findNextFn: ((fromCaret?: boolean) => void) | null = null
  let _findPrevFn: (() => void) | null = null
  let _findUpdateLabelFn: (() => void) | null = null
  function showFindPanelFindOnly() {
    showFindPanel()
    if (!_findPanel) return
    try { (_findPanel as HTMLDivElement).dataset.mode = 'find-only' } catch {}
  }
  // 所见/编辑：反引号序列状态（用于 ``` 代码围栏检测）
  let _btCount = 0
  let _btTimer: number | null = null
  let _btSelS = 0
  let _btSelE = 0
  let _astCount = 0
  let _astTimer: number | null = null
  let _astSelS = 0
  let _astSelE = 0
  function ensureFindPanel() {
    if (_findPanel) return
    const panel = document.createElement('div')
    panel.id = 'find-replace-panel'
    panel.style.position = 'fixed'
    panel.style.right = '16px'
    panel.style.top = '56px'
    panel.style.zIndex = '9999'
    panel.style.background = 'var(--bg)'
    panel.style.color = 'var(--fg)'
    panel.style.border = '1px solid var(--border)'
    panel.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)'
    panel.style.borderRadius = '8px'
    panel.style.padding = '8px 10px'
    panel.style.display = 'none'
    panel.style.minWidth = '260px'
    panel.innerHTML = `
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
        <input id="find-text" type="text" placeholder="查找... (Enter=下一个, Shift+Enter=上一个)" style="flex:1; padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--fg);" />
        <span id="find-count" style="text-align:center; font-size:11px; color:var(--muted); white-space:nowrap; padding:3px 6px; border-radius:4px; background:rgba(127,127,127,0.08); border:1px solid rgba(127,127,127,0.12);"></span>
        <label title="区分大小写" style="display:flex; align-items:center; gap:4px; user-select:none;">
          <input id="find-case" type="checkbox" />Aa
        </label>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input id="replace-text" type="text" placeholder="替换为..." style="flex:1; padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--fg);" />
        <button id="btn-find-prev" style="padding:6px 8px;">上一个</button>
        <button id="btn-find-next" style="padding:6px 8px;">下一个</button>
      </div>
      <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
        <button id="btn-replace" style="padding:6px 10px;">替换</button>
        <button id="btn-replace-all" style="padding:6px 10px;">全部替换</button>
        <button id="btn-close-find" style="margin-left:auto; padding:6px 10px;">关闭 (Esc)</button>
      </div>
    
    `
    document.body.appendChild(panel)
    _findPanel = panel
    _findInput = panel.querySelector('#find-text') as HTMLInputElement
    _replaceInput = panel.querySelector('#replace-text') as HTMLInputElement
    _findCase = panel.querySelector('#find-case') as HTMLInputElement
    const btnPrev = panel.querySelector('#btn-find-prev') as HTMLButtonElement
    const btnNext = panel.querySelector('#btn-find-next') as HTMLButtonElement
    const btnRep = panel.querySelector('#btn-replace') as HTMLButtonElement
    const btnAll = panel.querySelector('#btn-replace-all') as HTMLButtonElement
    const btnClose = panel.querySelector('#btn-close-find') as HTMLButtonElement
    const lblCount = panel.querySelector('#find-count') as HTMLSpanElement | null

    function norm(s: string) { return (_findCase?.checked ? s : s.toLowerCase()) }
    function getSel() { return { s: editor.selectionStart >>> 0, e: editor.selectionEnd >>> 0 } }
    // 设置选区并将其滚动到视口中间附近（仅源码模式 textarea）
    function setSel(s: number, e: number) {
      try {
        const ta = editor as HTMLTextAreaElement
        const len = String(ta.value || '').length >>> 0
        const start = s >>> 0
        ta.selectionStart = start
        ta.selectionEnd = e >>> 0
        try { ta.focus() } catch {}
        if (len > 0 && ta.scrollHeight > ta.clientHeight + 4) {
          const ratio = Math.max(0, Math.min(1, start / len))
          const target = ratio * ta.scrollHeight
          const view = ta.clientHeight
          ta.scrollTop = Math.max(0, target - view * 0.4)
        }
      } catch {
        // 降级路径：至少确保选区被设置
        try { editor.selectionStart = s; editor.selectionEnd = e } catch {}
      }
    }

    // 统计当前查询词在整个文档中的出现次数及当前命中序号（基于 editor.value，适用于编辑/所见模式）
    function countMatchesInEditor(termRaw: string): { total: number; index: number } {
      const term = String(termRaw || '')
      if (!term) return { total: 0, index: 0 }
      const val = String(editor.value || '')
      if (!val) return { total: 0, index: 0 }
      const hay = norm(val)
      const needle = norm(term)
      if (!needle) return { total: 0, index: 0 }
      const sel = getSel()
      let total = 0
      let curIndex = 0
      let pos = 0
      const step = Math.max(1, needle.length)
      for (;;) {
        const idx = hay.indexOf(needle, pos)
        if (idx < 0) break
        total++
        const start = idx
        const end = idx + term.length
        if (!curIndex && sel.s >= start && sel.s <= end) curIndex = total
        pos = idx + step
      }
      return { total, index: curIndex }
    }
    function updateFindCountLabel() {
      if (!lblCount) return
      const term = String(_findInput?.value || '')
      if (!term) { lblCount.textContent = ''; return }
      try {
        // 阅读模式：优先使用预览 DOM 的匹配信息
        if (mode === 'preview' && !wysiwyg) {
          const total = _previewFindMatches.length
          if (!total) { lblCount.textContent = '未找到'; return }
          const cur = _previewFindIndex >= 0 ? (_previewFindIndex + 1) : 0
          lblCount.textContent = cur > 0 ? `${cur}/${total}` : `${total}个`
          return
        }
        const { total, index } = countMatchesInEditor(term)
        if (!total) { lblCount.textContent = '未找到'; return }
        lblCount.textContent = index > 0 ? `${index}/${total}` : `${total}个`
      } catch {
        try { lblCount.textContent = '' } catch {}
      }
    }
    _findUpdateLabelFn = () => { try { updateFindCountLabel() } catch {} }

    // 阅读模式查找：使用浏览器原生查找 API
    let _previewFindIndex = -1
    let _previewFindMatches: Range[] = []

    function findInPreview(term: string, caseSensitive: boolean, forward: boolean) {
      try {
        // 清除之前的高亮
        const sel = window.getSelection()
        if (sel) sel.removeAllRanges()

        // 如果搜索词变了，或当前无缓存结果，则重新收集匹配项
        if (_lastFind !== term || _previewFindMatches.length === 0) {
          _previewFindMatches = []
          _previewFindIndex = -1
          _lastFind = term

          // 收集所有匹配项
          const walker = document.createTreeWalker(
            preview,
            NodeFilter.SHOW_TEXT,
            null
          )

          let node: Node | null
          while ((node = walker.nextNode())) {
            const text = node.textContent || ''
            const searchText = caseSensitive ? text : text.toLowerCase()
            const searchTerm = caseSensitive ? term : term.toLowerCase()

            let pos = 0
            while ((pos = searchText.indexOf(searchTerm, pos)) !== -1) {
              const range = document.createRange()
              range.setStart(node, pos)
              range.setEnd(node, pos + term.length)
              _previewFindMatches.push(range)
              pos += term.length
            }
          }
        }

        if (_previewFindMatches.length === 0) return false

        // 移动到下一个/上一个匹配项
        if (forward) {
          _previewFindIndex = (_previewFindIndex + 1) % _previewFindMatches.length
        } else {
          if (_previewFindIndex <= 0) {
            _previewFindIndex = _previewFindMatches.length - 1
          } else {
            _previewFindIndex--
          }
        }

        // 高亮当前匹配项
        const range = _previewFindMatches[_previewFindIndex]
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(range)
        }

        // 滚动到可见区域（以预览容器为基准，居中显示）
        try {
          const pv = preview as HTMLDivElement | null
          if (pv && pv.scrollHeight > pv.clientHeight + 4) {
            const pvRect = pv.getBoundingClientRect()
            const rect = range.getBoundingClientRect()
            const currentTop = pv.scrollTop >>> 0
            const delta = rect.top - pvRect.top
            const targetTop = Math.max(0, currentTop + delta - pv.clientHeight * 0.35)
            pv.scrollTo({ top: targetTop, behavior: 'smooth' })
          } else {
            // 兜底：若预览不可滚动，则退化为元素自身的 scrollIntoView
            const el = (range.startContainer as any)?.parentElement as HTMLElement | null
            el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }
        } catch {}

        return true
      } catch (e) {
        console.error('Preview find error:', e)
        return false
      }
    }

    function findNext(fromCaret = true) {
      const term = String(_findInput?.value || '')
      if (!term) { if (lblCount) lblCount.textContent = ''; return }

      // 阅读模式：在预览区查找
      if (mode === 'preview' && !wysiwyg) {
        findInPreview(term, !!_findCase?.checked, true)
        updateFindCountLabel()
        return
      }

      if (wysiwyg) { try { wysiwygV2FindNext(term, !!_findCase?.checked) } catch {} ; updateFindCountLabel(); return }
      const val = String(editor.value || '')
      const hay = norm(val)
      const needle = norm(term)
      const { s, e } = getSel()
      const startPos = fromCaret ? Math.max(e, 0) : 0
      let idx = hay.indexOf(needle, startPos)
      if (idx < 0 && startPos > 0) idx = hay.indexOf(needle, 0) // 循环查找
      if (idx >= 0) {
        setSel(idx, idx + term.length)
        updateFindCountLabel()
      } else {
        updateFindCountLabel()
      }
    }
    function findPrev() {
      // 上一个：严格在光标前搜索；未命中则循环到最后一个
      const term = String(_findInput?.value || '')
      if (!term) { if (wysiwyg) { try { (document.querySelector('#md-wysiwyg-root .ProseMirror') as HTMLElement)?.focus() } catch {} } else { try { editor.focus() } catch {} } ; return }

      // 阅读模式：在预览区查找
      if (mode === 'preview' && !wysiwyg) {
        findInPreview(term, !!_findCase?.checked, false)
        updateFindCountLabel()
        return
      }

      if (wysiwyg) { try { wysiwygV2FindPrev(term, !!_findCase?.checked) } catch {} ; updateFindCountLabel(); return }
      const val = String(editor.value || '')
      const hay = norm(val)
      const needle = norm(term)
      const { s } = getSel()
      const before = hay.slice(0, Math.max(0, s >>> 0))
      let idx = before.lastIndexOf(needle)
      if (idx < 0) idx = hay.lastIndexOf(needle) // 循环到文末最后一个
      if (idx >= 0) {
        setSel(idx, idx + term.length)
      } else {
        // 未找到也要把焦点送回编辑器，避免按钮聚焦导致选区高亮消失
        try { editor.focus() } catch {}
      }
      updateFindCountLabel()
    }
    function replaceOne() {
      const term = String(_findInput?.value || '')
      const rep = String(_replaceInput?.value || '')
      if (!term) return
      // 阅读模式不支持替换
      if (mode === 'preview' && !wysiwyg) {
        alert('阅读模式下不支持替换，请切换到源码模式')
        return
      }
      if (wysiwyg) { try { wysiwygV2ReplaceOneSel(term, rep, !!_findCase?.checked) } catch {} ; return }
      const { s, e } = getSel()
      const cur = editor.value.slice(s, e)
      const match = (_findCase?.checked ? cur === term : cur.toLowerCase() === term.toLowerCase())
      if (!match) { findNext(false); return }
      const ta = editor as HTMLTextAreaElement
      const val = String(ta.value || '')
      ta.focus(); ta.selectionStart = s; ta.selectionEnd = e
      if (!insertUndoable(ta, rep)) {
        editor.value = val.slice(0, s) + rep + val.slice(e)
      }
      const pos = s + rep.length
      setSel(pos, pos)
      dirty = true; refreshTitle(); refreshStatus(); if (mode === 'preview') { void renderPreview() } else if (wysiwyg) { scheduleWysiwygRender() }
      findNext(false)
      updateFindCountLabel()
    }
    function replaceAll() {
      const term = String(_findInput?.value || '')
      if (!term) return
      const rep = String(_replaceInput?.value || '')
      // 阅读模式不支持替换
      if (mode === 'preview' && !wysiwyg) {
        alert('阅读模式下不支持替换，请切换到源码模式')
        return
      }
      if (wysiwyg) { try { wysiwygV2ReplaceAllInDoc(term, rep, !!_findCase?.checked) } catch {} ; return }
      const ta = editor as HTMLTextAreaElement
      const val = String(ta.value || '')
      const hay = norm(val)
      const needle = norm(term)
      if (!needle) return
      let i = 0, changed = val, count = 0
      if (_findCase?.checked) {
        // 大小写敏感：直接遍历替换
        for (;;) {
          const idx = changed.indexOf(term, i)
          if (idx < 0) break
          changed = changed.slice(0, idx) + rep + changed.slice(idx + term.length)
          i = idx + rep.length; count++
        }
      } else {
        // 不区分大小写：逐段查找对齐替换
        let pos = 0
        while (pos < changed.length) {
          const seg = changed.slice(pos)
          const idx = seg.toLowerCase().indexOf(term.toLowerCase())
          if (idx < 0) break
          const real = pos + idx
          changed = changed.slice(0, real) + rep + changed.slice(real + term.length)
          pos = real + rep.length; count++
        }
      }
      if (count > 0) {
        ta.focus(); ta.selectionStart = 0; ta.selectionEnd = val.length
        if (!insertUndoable(ta, changed)) {
          editor.value = changed
        }
        const caret = Math.min(editor.value.length, editor.selectionEnd + rep.length)
        setSel(caret, caret)
        dirty = true; refreshTitle(); refreshStatus(); if (mode === 'preview') { void renderPreview() } else if (wysiwyg) { scheduleWysiwygRender() }
      }
      updateFindCountLabel()
    }

    _findNextFn = (fromCaret?: boolean) => { findNext(fromCaret) }
    _findPrevFn = () => { findPrev() }

    _findInput?.addEventListener('input', () => updateFindCountLabel())
    _findCase?.addEventListener('change', () => updateFindCountLabel())
    _findInput?.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); if (ev.shiftKey) findPrev(); else findNext() } })
    btnPrev?.addEventListener('click', () => findPrev())
    btnNext?.addEventListener('click', () => findNext())
    btnRep?.addEventListener('click', () => replaceOne())
    btnAll?.addEventListener('click', () => replaceAll())
    btnClose?.addEventListener('click', () => { panel.style.display = 'none'; if (wysiwyg) { try { (document.querySelector('#md-wysiwyg-root .ProseMirror') as HTMLElement)?.focus() } catch {} } else { try { editor.focus() } catch {} } })
  }
  function showFindPanel() {
    ensureFindPanel()
    if (!_findPanel) return
    try { delete (_findPanel as HTMLDivElement).dataset.mode } catch {}
    // 选区文本用作初始查找词
    try {
      let sel = ''
      if (wysiwyg) { sel = String(wysiwygV2GetSelectedText() || '') }
      else { sel = editor.value.slice(editor.selectionStart >>> 0, editor.selectionEnd >>> 0) }
      if (sel) { (_findInput as HTMLInputElement).value = sel; _lastFind = sel }
    } catch {}
    try { if (_findUpdateLabelFn) _findUpdateLabelFn() } catch {}
    _findPanel.style.display = 'block'
    setTimeout(() => { try { (_findInput as HTMLInputElement).focus(); (_findInput as HTMLInputElement).select() } catch {} }, 0)
  }

  // ========== 移动端工具栏初始化（Android 专属）==========
  /**
   * 初始化移动端顶栏图标按钮事件
   * 注意：仅在移动端调用，手机端只支持源码模式
   */
  function initMobileToolbar() {
    if (!isMobileUiFast()) return

    const toolbar = document.getElementById('mobile-toolbar')
    if (!toolbar) {
      console.warn('[Mobile] toolbar not found')
      return
    }

    // 1. 模式切换按钮（源码 ⇄ 阅读）
    const btnModeToggle = document.getElementById('btn-mode-toggle')
    btnModeToggle?.addEventListener('click', async () => {
      try {
        await toggleMode()
        // 更新图标
        const isReadMode = mode === 'preview'
        toggleModeIcon(isReadMode)
      } catch (e) {
        console.error('[Mobile] 模式切换失败', e)
        try { pluginNotice('模式切换失败：' + String((e as any)?.message || e || ''), 'err', 2400) } catch {}
      }
    })

    // 2. 撤销按钮（源码模式使用 execCommand）
    const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement | null
    btnUndo?.addEventListener('click', () => {
      try {
        try { (editor as HTMLTextAreaElement).focus() } catch {}
        document.execCommand('undo')
      } catch (e) {
        console.warn('[Mobile] 撤销失败', e)
        try { pluginNotice('撤销失败', 'err', 1600) } catch {}
      }
    })

    // 3. 重做按钮
    const btnRedo = document.getElementById('btn-redo') as HTMLButtonElement | null
    btnRedo?.addEventListener('click', () => {
      try {
        try { (editor as HTMLTextAreaElement).focus() } catch {}
        document.execCommand('redo')
      } catch (e) {
        console.warn('[Mobile] 重做失败', e)
        try { pluginNotice('重做失败', 'err', 1600) } catch {}
      }
    })

    // 4. 保存按钮
    const btnSaveMobile = document.getElementById('btn-save-mobile')
    btnSaveMobile?.addEventListener('click', async () => {
      try {
        await saveFile()
      } catch (e) {
        console.error('[Mobile] 保存失败', e)
        try { pluginNotice('保存失败：' + String((e as any)?.message || e || ''), 'err', 2400) } catch {}
      }
    })

    // 5. 查找按钮
    const btnFind = document.getElementById('btn-find')
    btnFind?.addEventListener('click', () => {
      try {
        showFindPanel()
      } catch (e) {
        console.error('[Mobile] 查找面板打开失败', e)
        try { pluginNotice('查找失败：' + String((e as any)?.message || e || ''), 'err', 2400) } catch {}
      }
    })
  }

  // 移动端：在事件绑定阶段初始化顶栏按钮（之前在顶层调用会因为作用域导致根本没绑上）
  try {
    if (isMobileUiFast()) {
      try { initMobileIcons() } catch {}
      try { initMobileToolbar() } catch {}
    }
  } catch {}

  // 全局快捷键：Ctrl+H 打开查找替换
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    try {
      // 查找面板打开时，回车键用于切换到下一个/上一个（在所有模式下都拦截）
      if (_findPanel && _findPanel.style.display !== 'none' && e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        if (e.shiftKey) { if (_findPrevFn) _findPrevFn() } else { if (_findNextFn) _findNextFn(true) }
        return
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); showFindPanelFindOnly(); return }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'h') { e.preventDefault(); showFindPanel(); return }
      if (e.key === 'Escape' && _findPanel && _findPanel.style.display !== 'none') { e.preventDefault(); _findPanel.style.display = 'none'; if (wysiwyg) { try { (document.querySelector('#md-wysiwyg-root .ProseMirror') as HTMLElement)?.focus() } catch {} } else { try { editor.focus() } catch {} } ; return }
    } catch {}
  }, true)  // 使用捕获阶段，确保在其他监听器之前处理

  // 撤销友好插入/删除：通过 execCommand / setRangeText 保持到原生撤销栈
  function insertUndoable(ta: HTMLTextAreaElement, text: string): boolean {
    try { ta.focus(); document.execCommand('insertText', false, text); return true } catch {
      try {
        const s = ta.selectionStart >>> 0, e = ta.selectionEnd >>> 0
        ta.setRangeText(text, s, e, 'end')
        ta.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
        return true
      } catch { return false }
    }
  }
  function deleteUndoable(ta: HTMLTextAreaElement): boolean {
    try { ta.focus(); document.execCommand('delete'); return true } catch {
      const s = ta.selectionStart >>> 0, e = ta.selectionEnd >>> 0
      if (s !== e) {
        ta.setRangeText('', s, e, 'end')
        ta.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }))
        return true
      }
      return false
    }
  }

  // 源码模式：成对标记补全（自动/环绕/跳过/成对删除）
  try {
    (editor as HTMLTextAreaElement).addEventListener('keydown', (e: KeyboardEvent) => { if ((e as any).defaultPrevented) return; if (e.ctrlKey || e.metaKey || e.altKey) return
      // 反引号特殊处理：支持 ``` 围栏（空选区自动补全围栏；有选区则环绕为代码块）
      if (e.key === '`') {
        try { if (_btTimer) { clearTimeout(_btTimer); _btTimer = null } } catch {}
        _btCount = (_btCount || 0) + 1
        const ta = editor as HTMLTextAreaElement
        const val = String(ta.value || '')
        const s0 = ta.selectionStart >>> 0
        const e0 = ta.selectionEnd >>> 0
        if (_btCount === 1) { _btSelS = s0; _btSelE = e0 }
        e.preventDefault()
        const commit = () => {
          const s = _btSelS >>> 0
          const epos = _btSelE >>> 0
          const before = val.slice(0, s)
          const mid = val.slice(s, epos)
          const after = val.slice(epos)
          const hasNewline = /\n/.test(mid)
          if (_btCount >= 3 || hasNewline) {
            // 代码块围栏（可撤销）
            const content = (epos > s ? ('\n' + mid + '\n') : ('\n\n'))
            ta.selectionStart = s; ta.selectionEnd = epos
            if (!insertUndoable(ta, '```' + content + '```')) {
              ta.value = before + '```' + content + '```' + after
            }
            ta.selectionStart = ta.selectionEnd = (epos > s ? (s + content.length + 3) : (s + 4))
          } else if (_btCount === 2) {
            // 双反引号：当作行内代码（兼容场景，可撤销）
            ta.selectionStart = s; ta.selectionEnd = epos
            const ins = '``' + (epos > s ? mid : '') + '``'
            if (!insertUndoable(ta, ins)) {
              ta.value = before + ins + after
            }
            if (epos > s) { ta.selectionStart = s + 2; ta.selectionEnd = s + 2 + mid.length } else { ta.selectionStart = ta.selectionEnd = s + 2 }
          } else {
            // 单反引号：行内代码（可撤销）
            ta.selectionStart = s; ta.selectionEnd = epos
            const ins = '`' + (epos > s ? mid : '') + '`'
            if (!insertUndoable(ta, ins)) {
              ta.value = before + ins + after
            }
            if (epos > s) { ta.selectionStart = s + 1; ta.selectionEnd = s + 1 + mid.length } else { ta.selectionStart = ta.selectionEnd = s + 1 }
          }
          dirty = true; try { refreshTitle(); refreshStatus() } catch {}
          if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
          _btCount = 0; _btTimer = null
        }
        _btTimer = (setTimeout as any)(commit, 320)
        return
      }
            // 星号连击：1次斜体(*)；2次加粗(**)；与反引号逻辑一致，延迟收敛，避免第二次被当成“跳过右侧”
      if (e.key === '*') {
        try { if (_astTimer) { clearTimeout(_astTimer as any); _astTimer = null } } catch {}
        _astCount = (_astCount || 0) + 1
        const ta = editor as HTMLTextAreaElement
        const val = String(ta.value || '')
        const s0 = ta.selectionStart >>> 0
        const e0 = ta.selectionEnd >>> 0
        // 特判：处于 *|* 中间时，再按 * 扩展为 **|**（不跳过右侧）
        if (s0 === e0 && s0 > 0 && val[s0 - 1] === '*' && val[s0] === '*') {
          e.preventDefault()
          const left = s0 - 1, right = s0 + 1
          ta.selectionStart = left; ta.selectionEnd = right
          if (!insertUndoable(ta, '****')) {
            ta.value = val.slice(0, left) + '****' + val.slice(right)
          }
          ta.selectionStart = ta.selectionEnd = left + 2
          dirty = true; try { refreshTitle(); refreshStatus() } catch {}
          if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
          _astCount = 0; _astTimer = null
          return
        }
        if (_astCount === 1) { _astSelS = s0; _astSelE = e0 }
        e.preventDefault()
        const commitStar = () => {
          const s = _astSelS >>> 0
          const epos = _astSelE >>> 0
          const before = val.slice(0, s)
          const mid = val.slice(s, epos)
          const after = val.slice(epos)
          const ta2 = editor as HTMLTextAreaElement
          ta2.selectionStart = s; ta2.selectionEnd = epos
          if (_astCount >= 2) {
            // 加粗：**选区** 或 **|**
            const ins = '**' + (epos > s ? mid : '') + '**'
            if (!insertUndoable(ta2, ins)) { ta2.value = before + ins + after }
            if (epos > s) { ta2.selectionStart = s + 2; ta2.selectionEnd = s + 2 + mid.length } else { ta2.selectionStart = ta2.selectionEnd = s + 2 }
          } else {
            // 斜体：*选区* 或 *|*
            const ins = '*' + (epos > s ? mid : '') + '*'
            if (!insertUndoable(ta2, ins)) { ta2.value = before + ins + after }
            if (epos > s) { ta2.selectionStart = s + 1; ta2.selectionEnd = s + 1 + mid.length } else { ta2.selectionStart = ta2.selectionEnd = s + 1 }
          }
          dirty = true; try { refreshTitle(); refreshStatus() } catch {}
          if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
          _astCount = 0; _astTimer = null
        }
        _astTimer = (setTimeout as any)(commitStar, 280)
        return
      }
      // 波浪线：一次按键即完成成对环抱补全（~~ 语法）
      if (e.key === '~') {
        const ta = editor as HTMLTextAreaElement
        const val = String(ta.value || '')
        const s0 = ta.selectionStart >>> 0
        const e0 = ta.selectionEnd >>> 0
        e.preventDefault()
        ta.selectionStart = s0; ta.selectionEnd = e0
        const mid = val.slice(s0, e0)
        const ins = (e0 > s0) ? ('~~' + mid + '~~') : '~~~~'
        if (!insertUndoable(ta, ins)) {
          ta.value = val.slice(0, s0) + ins + val.slice(e0)
        }
        if (e0 > s0) { ta.selectionStart = s0 + 2; ta.selectionEnd = s0 + 2 + mid.length } else { ta.selectionStart = ta.selectionEnd = s0 + 2 }
        dirty = true; try { refreshTitle(); refreshStatus() } catch {}
        if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
        return
      }
      const _pairs: Array<[string, string]> = [
        ["(", ")"], ["[", "]"], ["{", "}"], ['"', '"'], ["'", "'"], ["*", "*"], ["_", "_"],
        ["（", "）"], ["【", "】"], ["《", "》"], ["「", "」"], ["『", "』"], ["“", "”"], ["‘", "’"]
      ]
      try { _pairs.push([String.fromCharCode(96), String.fromCharCode(96)]) } catch {}
      const openClose: Record<string, string> = Object.fromEntries(_pairs as any)
      const closers = new Set(Object.values(openClose))
      const ta = editor as HTMLTextAreaElement
      const val = String(ta.value || '')
      const s = ta.selectionStart >>> 0
      const epos = ta.selectionEnd >>> 0

      // 成对删除：Backspace 位于一对括号/引号之间（可撤销）
      if (e.key === 'Backspace' && s === epos && s > 0 && s < val.length) {
        const prev = val[s - 1]
        const next = val[s]
        // 处理 ~~|~~ 的成对删除
        if (s >= 2 && s + 2 <= val.length && val.slice(s - 2, s) === '~~' && val.slice(s, s + 2) === '~~') {
          e.preventDefault()
          ta.selectionStart = s - 2; ta.selectionEnd = s + 2
          if (!deleteUndoable(ta)) {
            ta.value = val.slice(0, s - 2) + val.slice(s + 2)
            ta.selectionStart = ta.selectionEnd = s - 2
          } else {
            ta.selectionStart = ta.selectionEnd = s - 2
          }
          dirty = true; try { refreshTitle(); refreshStatus() } catch {}
          if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
          return
        }
        if (openClose[prev] && openClose[prev] === next) {
          e.preventDefault()
          ta.selectionStart = s - 1; ta.selectionEnd = s + 1
          if (!deleteUndoable(ta)) {
            ta.value = val.slice(0, s - 1) + val.slice(s + 1)
            ta.selectionStart = ta.selectionEnd = s - 1
          } else {
            ta.selectionStart = ta.selectionEnd = s - 1
          }
          dirty = true; try { refreshTitle(); refreshStatus() } catch {}
          if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
          return
        }
      }

      // 跳过右侧：输入右括号/引号，若当前位置已是相同字符，则只移动光标
      if (closers.has(e.key) && s === epos && val[s] === e.key) {
        e.preventDefault()
        ta.selectionStart = ta.selectionEnd = s + 1
        return
      }

      // 自动/环绕补全
      const close = openClose[e.key]
      // 交给 imePatch 在 beforeinput 阶段处理，避免与此处重复
        if (!close) return
      e.preventDefault()
      if (s !== epos) {
        // 环绕选区
        const before = val.slice(0, s)
        const mid = val.slice(s, epos)
        const after = val.slice(epos)
        ta.value = before + e.key + mid + close + after
        ta.selectionStart = s + 1
        ta.selectionEnd = s + 1 + mid.length
      } else {
        // 插入成对并定位中间
        const before = val.slice(0, s)
        const after = val.slice(epos)
        ta.value = before + e.key + close + after
        ta.selectionStart = ta.selectionEnd = s + 1
      }
      dirty = true; try { refreshTitle(); refreshStatus() } catch {}
      if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
    })
  } catch {}  // 源码模式：Tab/Shift+Tab 段落缩进/反缩进
  try {
    (editor as HTMLTextAreaElement).addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.ctrlKey || e.metaKey) return
      e.preventDefault()
      try {
        const ta = editor as HTMLTextAreaElement
        const val = String(ta.value || '')
        const start = ta.selectionStart >>> 0
        const end = ta.selectionEnd >>> 0
        const isShift = !!e.shiftKey
        const indent = "&emsp;&emsp;" // 使用 HTML 实体 &emsp;&emsp; 模拟缩进，避免触发代码块
        // 选区起始行与结束行的起始偏移
        const lineStart = val.lastIndexOf('\n', start - 1) + 1
        const lineEndBoundary = val.lastIndexOf('\n', Math.max(end - 1, 0)) + 1
        const sel = val.slice(lineStart, end)
        if (start === end) {
          if (isShift) {
            if (val.slice(lineStart).startsWith(indent)) {
              const nv = val.slice(0, lineStart) + val.slice(lineStart + indent.length)
              ta.value = nv
              const newPos = Math.max(lineStart, start - indent.length)
              ta.selectionStart = ta.selectionEnd = newPos
            }
          } else {
            if (!val.slice(lineStart).startsWith(indent)) {
              const nv = val.slice(0, lineStart) + indent + val.slice(lineStart)
              ta.value = nv
              const newPos = start + indent.length
              ta.selectionStart = ta.selectionEnd = newPos
            }
          }
        } else if (start !== end && sel.includes('\n')) {
          // 多行：逐行缩进或反缩进
          const lines = val.slice(lineStart, end).split('\n')
          const changed = lines.map((ln) => {
            if (isShift) {
              if (ln.startsWith(indent)) return ln.slice(indent.length)
              if (ln.startsWith(' \t')) return ln.slice(1) // 宽松回退
              if (ln.startsWith('\t')) return ln.slice(1)
              return ln
            } else {
              return (ln.startsWith(indent) ? ln : indent + ln)
            }
          }).join('\n')
          const newVal = val.slice(0, lineStart) + changed + val.slice(end)
          const delta = changed.length - (end - lineStart)
          ta.value = newVal
          // 调整新选区：覆盖处理的整段
          ta.selectionStart = lineStart
          ta.selectionEnd = end + delta
        } else {
          // 单行：在光标处插入/删除缩进
          const curLineStart = lineStart
          if (isShift) {
            const cur = val.slice(curLineStart)
            if (cur.startsWith(indent, start - curLineStart)) {
              const newVal = val.slice(0, start - indent.length) + val.slice(start)
              ta.value = newVal
              ta.selectionStart = ta.selectionEnd = start - indent.length
            } else if ((start - curLineStart) > 0 && val.slice(curLineStart, curLineStart + 1) === '\t') {
              const newVal = val.slice(0, curLineStart) + val.slice(curLineStart + 1)
              ta.value = newVal
              const shift = (start > curLineStart) ? 1 : 0
              ta.selectionStart = ta.selectionEnd = start - shift
            }
          } else {
            const newVal = val.slice(0, start) + indent + val.slice(end)
            ta.value = newVal
            ta.selectionStart = ta.selectionEnd = start + indent.length
          }
        }
        dirty = true
        try { refreshTitle(); refreshStatus() } catch {}
        if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
      } catch {}
    })
  } catch {}
  if (btnUpdate) btnUpdate.addEventListener('click', guard(() => checkUpdateInteractive()))
  // 代码复制按钮（事件委托）
  // 库侧栏右键菜单
  initLibraryContextMenu({
    getCurrentFilePath: () => currentFilePath,
    isDirty: () => !!dirty,
    normalizePath,
    getLibraryRoot,
    renameFileSafe,
    deleteFileSafe,
    openFile: async (p: string) => { await openFile2(p) },
    ensureTreeInitialized: async () => {
      const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
      if (treeEl && !fileTreeReady) {
        await fileTree.init(treeEl, {
          getRoot: getLibraryRoot,
          onOpenFile: async (p: string) => { await openFile2(p) },
          onOpenNewFile: async (p: string) => { await openFile2(p) },
          onMoved: async (src: string, dst: string) => {
            try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {}
          },
        })
        fileTreeReady = true
      }
    },
    refreshTree: async () => {
      const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
      if (treeEl && !fileTreeReady) {
        await fileTree.init(treeEl, {
          getRoot: getLibraryRoot,
          onOpenFile: async (p: string) => { await openFile2(p) },
          onOpenNewFile: async (p: string) => { await openFile2(p) },
          onMoved: async (src: string, dst: string) => {
            try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {}
          },
        })
        fileTreeReady = true
      } else if (treeEl) {
        await fileTree.refresh()
      }
    },
    updateTitle: () => { refreshTitle() },
    confirmNative: async (msg: string) => { return await confirmNative(msg) },
    exists: async (p: string) => { return await exists(p as any) },
    askOverwrite: async (msg: string) => { return await ask(msg) },
    moveFileSafe,
    setSort: async (mode: LibSortMode) => { await setLibrarySort(mode) },
    applySortToTree: async (mode: LibSortMode) => {
      try { fileTree.setSort(mode) } catch {}
      try { await fileTree.refresh() } catch {}
    },
    clearFolderOrderForParent: async (p: string) => {
      try { (await import('./fileTree')).clearFolderOrderForParent(p) } catch {}
    },
    onAfterDeleteCurrent: () => {
      if (currentFilePath) {
        currentFilePath = null as any
        try { (editor as HTMLTextAreaElement).value = '' } catch {}
        try { preview.innerHTML = '' } catch {}
        refreshTitle()
      }
    },
  })

  // 所见模式：右键打印（已去除，根据用户反馈移除该菜单）
  document.addEventListener('click', async (ev) => {
    const t = ev?.target as HTMLElement
    if (t && t.classList.contains('code-copy')) {
      ev.preventDefault()
      let text: string | null = null
      const direct = (t as any).__copyText
      if (typeof direct === 'string') text = direct
      if (text == null) {
        const box = t.closest('.codebox') as HTMLElement | null
        let pre = box?.querySelector('pre') as HTMLElement | null
        if (!pre) {
          const id = t.getAttribute('data-copy-target')
          if (id) { pre = document.querySelector(`pre[data-code-copy-id="${id}"]`) as HTMLElement | null }
        }
        if (pre) {
          // 默认只复制代码文本；按住 Alt 点击则复制为 Markdown 围栏（兼容旧行为）
          const copyAsMarkdownFence = !!((ev as MouseEvent | undefined)?.altKey)
          const codeEl = pre.querySelector('code') as HTMLElement | null
          const raw = (() => {
            if (codeEl) return codeEl.textContent || ''
            try {
              const cloned = pre.cloneNode(true) as HTMLElement
              try { (cloned.querySelector('.code-lnums') as HTMLElement | null)?.remove() } catch {}
              return cloned.textContent || ''
            } catch {
              return pre.textContent || ''
            }
          })()
          if (!copyAsMarkdownFence) {
            text = raw
          } else {
            let lang = ''
            if (codeEl) {
              const codeClasses = codeEl.className || ''
              const preClasses = pre.className || ''
              const langMatch = (codeClasses + ' ' + preClasses).match(/language-([a-z0-9_+-]+)/i)
              if (langMatch && langMatch[1]) {
                lang = langMatch[1]
              }
            }
            text = lang ? ('```' + lang + '\n' + raw + '\n```') : ('```\n' + raw + '\n```')
          }
        } else {
          text = ''
        }
      }
      text = text || ''
      let ok = false
      try { await navigator.clipboard.writeText(text); ok = true } catch {}
      if (!ok) {
        try {
          const ta = document.createElement('textarea')
          ta.value = text
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
          ok = true
        } catch {}
      }
      t.textContent = ok ? '已复制' : '复制失败'
      setTimeout(() => { (t as HTMLButtonElement).textContent = '复制' }, 1200)
    }
  }, { capture: true })
  // 库重命名/删除快捷键
  
  // 快捷键：插入链接、重命名、删除（库树）
  document.addEventListener('keydown', guard(async (e: KeyboardEvent) => {
    // 开发模式：F12 / Ctrl+Shift+I 打开 DevTools（不影响生产）
    try {
      if ((import.meta as any).env?.DEV) {
        const isF12 = e.key === 'F12'
        const isCtrlShiftI = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i'
        if (isF12 || isCtrlShiftI) {
          e.preventDefault()
          try { getCurrentWebview().openDevtools() } catch {}
          return
        }
      }
    } catch {}
    // 记录最近一次 Ctrl/Cmd(+Shift)+V 组合键（仅在编辑器/所见模式聚焦时生效，用于区分普通粘贴与纯文本粘贴）
    try {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        const active = document.activeElement as HTMLElement | null
        const inMdEditor = active === (editor as any)
        const inWysiwyg = !!(active && (active.classList.contains('ProseMirror') || active.closest('.ProseMirror')))
        _lastPasteCombo = (inMdEditor || inWysiwyg) ? (e.shiftKey ? 'plain' : 'normal') : null
        try { (window as any).__flymdLastPasteCombo = _lastPasteCombo } catch {}
      }
    } catch {}
    // 编辑快捷键（全局）：插入链接 / 加粗 / 斜体
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); guard(insertLink)(); return }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      await toggleWysiwyg();
      // 更新专注模式侧栏背景色
      setTimeout(() => updateFocusSidebarBg(), 100);
      return
    }
    // Ctrl+Shift+R：打开最近文件面板
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
      e.preventDefault()
      try { await renderRecentPanel(true) } catch {}
      return
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      try { e.stopPropagation(); /* 防止编辑器内部再次处理 */ } catch {}
      try { (e as any).stopImmediatePropagation && (e as any).stopImmediatePropagation() } catch {}
      saveScrollPosition()  // 保存当前滚动位置
      try {
        if (wysiwyg) {
          // 先确定进入"阅读"(预览)状态，再退出所见，避免退出所见时根据旧 mode 隐藏预览
          mode = 'preview'
          try { preview.classList.remove('hidden') } catch {}
          try { await renderPreview() } catch {}
          try { await setWysiwygEnabled(false) } catch {}
          try { syncToggleButton() } catch {}
          // 更新专注模式侧栏背景色
          setTimeout(() => updateFocusSidebarBg(), 100);
          // 更新外圈UI颜色
          try { updateChromeColorsForMode('preview') } catch {}
          restoreScrollPosition()  // 恢复滚动位置
          try { notifyModeChange() } catch {}
          return
        }
      } catch {}
      if (mode !== 'preview') {
        mode = 'preview'
        try { preview.classList.remove('hidden') } catch {}
        try { await renderPreview() } catch {}
        try { syncToggleButton() } catch {}
        // 更新专注模式侧栏背景色
        setTimeout(() => updateFocusSidebarBg(), 100);
        // 更新外圈UI颜色
        try { updateChromeColorsForMode('preview') } catch {}
        restoreScrollPosition()  // 恢复滚动位置
        try { notifyModeChange() } catch {}
      }
      return
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      try { e.stopPropagation() } catch {}
      try { (e as any).stopImmediatePropagation && (e as any).stopImmediatePropagation() } catch {}
      await handleToggleModeShortcut();
      return
    }
    // 源码模式分屏：Ctrl+Shift+E，委托给分屏模块（仅源码模式生效）
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault()
      try { e.stopPropagation() } catch {}
      try { (e as any).stopImmediatePropagation && (e as any).stopImmediatePropagation() } catch {}
      try {
        const flymd = (window as any)
        if (typeof flymd.flymdToggleSplitPreview === 'function') {
          flymd.flymdToggleSplitPreview()
        }
      } catch {}
      return
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      await formatBold()
      if (mode === 'preview') {
        void renderPreview()
      } else if (wysiwyg && !wysiwygV2Active) {
        // 仅旧所见模式需要从 Markdown 重渲染；V2 直接在编辑视图内部操作
        scheduleWysiwygRender()
      }
      return
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      await formatItalic()
      if (mode === 'preview') {
        void renderPreview()
      } else if (wysiwyg && !wysiwygV2Active) {
        scheduleWysiwygRender()
      }
      return
    }
    // 专注模式快捷键 Ctrl+Shift+F
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); await toggleFocusMode(); return }
    // 文件操作快捷键
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); await openFile2(); return }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); await saveAs(); return }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); await saveFile(); return }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault()
      const flymd = (window as any)
      if (flymd.flymdNewFile) {
        await flymd.flymdNewFile()
      }
      return
    }
    try {
      const lib = document.getElementById('library') as HTMLDivElement | null
      const libVisible = lib && !lib.classList.contains('hidden')
      if (!libVisible) return
      const row = document.querySelector('#lib-tree .lib-node.selected') as HTMLElement | null
      if (!row) return
      const p = (row as any).dataset?.path as string || ''
      if (!p) return
      if (e.key === 'F2') {
        e.preventDefault()
        const oldName = p.split(/[\\/]+/).pop() || ''
        const name = window.prompt('重命名为：', oldName) || ''
        if (!name || name === oldName) return
        const root = await getLibraryRoot(); if (!root) return
        if (!isInside(root, p)) { alert('越权操作禁止'); return }
        // SAF：content:// URI 只能走 android_saf_rename（renameFileSafe 已兜底）
        if (String(p).startsWith('content://')) {
          const next = await renameFileSafe(p, name)
          if (currentFilePath === p) { currentFilePath = next as any; refreshTitle() }
          const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
          if (treeEl && fileTreeReady) { try { await fileTree.refresh() } catch {} }
          return
        }
        const base = p.replace(/[\\/][^\\/]*$/, '')
        const dst = base + (base.includes('\\') ? '\\' : '/') + name
        if (await exists(dst)) { alert('同名已存在'); return }
        await moveFileSafe(p, dst)
        if (currentFilePath === p) { currentFilePath = dst as any; refreshTitle() }
      const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null; if (treeEl && !fileTreeReady) { await fileTree.init(treeEl, { getRoot: getLibraryRoot, onOpenFile: async (p: string) => { await openFile2(p) }, onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} }, onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} } }); fileTreeReady = true } else if (treeEl) { await fileTree.refresh() }
        return
      }
      // Delete 键删除文件功能已移除，避免干扰编辑器中的文字删除
      // 用户可以通过右键菜单或其他方式删除文件
    } catch (e) { showError('操作失败', e) }
  }), { capture: true })
  if (btnNew) btnNew.addEventListener('click', guard(async () => {
    try {
      const lib = document.getElementById('library') as HTMLDivElement | null
      const libVisible = lib && !lib.classList.contains('hidden')
      let dir = selectedFolderPath || null
      if (!dir) {
        if (currentFilePath) dir = currentFilePath.replace(/[\\/][^\\/]*$/, '')
        if (!dir) dir = await getLibraryRoot()
        if (!dir) dir = await pickLibraryRoot()
      }
      if (!dir) return
      const p = await newFileSafeInTree(dir)
      await openFile2(p)
      mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {}
      const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
      if (treeEl && !fileTreeReady) { await fileTree.init(treeEl, { getRoot: getLibraryRoot, onOpenFile: async (q: string) => { await openFile2(q) }, onOpenNewFile: async (q: string) => { await openFile2(q); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} }, onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} } }); fileTreeReady = true } else if (treeEl) { await fileTree.refresh() }
      try { const tree = document.getElementById('lib-tree') as HTMLDivElement | null; const nodes = Array.from(tree?.querySelectorAll('.lib-node.lib-dir') || []) as HTMLElement[]; const target = nodes.find(n => (n as any).dataset?.path === dir); if (target) target.dispatchEvent(new MouseEvent('click', { bubbles: true })) } catch {}
      return
    } catch (e) { showError('新建文件失败', e) }
  }))
  if (btnRecent) btnRecent.addEventListener('click', guard(() => renderRecentPanel(true)))
  if (btnLibrary) btnLibrary.addEventListener('click', guard(async () => {
    const lib = document.getElementById('library')
    const showing = lib && !lib.classList.contains('hidden')
    if (showing) { showLibrary(false); return }
    // 显示并准备数据
    showLibrary(true)
    let root = await getLibraryRoot()
    if (!root) root = await pickLibraryRoot()
    try { await refreshLibraryUiAndTree(false) } catch {}
    const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null; if (treeEl && !fileTreeReady) { await fileTree.init(treeEl, { getRoot: getLibraryRoot, onOpenFile: async (p: string) => { await openFile2(p) }, onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} }, onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} } }); fileTreeReady = true } else if (treeEl) { await fileTree.refresh() }
    // 应用持久化的排序偏好
    try { const s = await getLibrarySort(); fileTree.setSort(s); await fileTree.refresh() } catch {}
  }))
  // 非固定模式：点击库外空白自动隐藏
  document.addEventListener('mousedown', (ev) => {
    try {
      const lib = document.getElementById('library') as HTMLDivElement | null
      if (!lib) return
      const visible = !lib.classList.contains('hidden')
      if (!visible) return
      if (libraryDocked) return // 仅非固定模式
      const t = ev.target as Node
      if (lib && !lib.contains(t)) showLibrary(false, false)
    } catch {}
  }, { capture: true })
  if (btnAbout) btnAbout.addEventListener('click', guard(() => showAbout(true)))
  if (btnUploader) btnUploader.addEventListener('click', guard(() => openUploaderDialog()))

  // 所见模式：输入/合成结束/滚动时联动渲染与同步
  editor.addEventListener('input', () => { scheduleSaveDocPos() })
  editor.addEventListener('compositionend', () => { scheduleSaveDocPos() })
  editor.addEventListener('scroll', () => { scheduleSaveDocPos() })
  editor.addEventListener('keyup', () => { scheduleSaveDocPos(); try { notifySelectionChangeForPlugins() } catch {} })
  editor.addEventListener('click', () => { scheduleSaveDocPos(); try { notifySelectionChangeForPlugins() } catch {} })

  // 预览滚动也记录阅读位置
  preview.addEventListener('scroll', () => { scheduleSaveDocPos() })

  // ===== 初始化滚动条自动隐藏（支持悬停保持显示） =====
  try {
    initAutoHideScrollbar()
  } catch (err) {
    console.warn('滚动条自动隐藏初始化失败', err)
    // 失败不影响应用其他功能
  }

  // 绑定全局点击（图床弹窗测试按钮）
  document.addEventListener('click', async (ev) => {
    const t = ev?.target as HTMLElement
    if (t && t.id === 'upl-test') {
      ev.preventDefault()
      const overlay = document.getElementById('uploader-overlay') as HTMLDivElement | null
      const testRes = overlay?.querySelector('#upl-test-result') as HTMLDivElement | null
      const ep = (overlay?.querySelector('#upl-endpoint') as HTMLInputElement)?.value || ''
      if (testRes) { testRes.textContent = '测试中...'; (testRes as any).className = ''; testRes.id = 'upl-test-result' }
      try {
        const res = await testUploaderConnectivity(ep)
        if (testRes) { testRes.textContent = res.ok ? '可达' : '不可达'; (testRes as any).className = res.ok ? 'ok' : 'err' }
      } catch (e: any) {
        if (testRes) { testRes.textContent = '测试失败'; (testRes as any).className = 'err' }
      }
    }
  })


  // 文本变化
  editor.addEventListener('input', () => {
    dirty = true
    refreshTitle()
  })
  editor.addEventListener('keyup', (ev) => { refreshStatus(ev); try { notifySelectionChangeForPlugins() } catch {} })
  editor.addEventListener('click', (ev) => { refreshStatus(ev); try { notifySelectionChangeForPlugins() } catch {} })
  // 粘贴到编辑器：
  // - Ctrl+Shift+V：始终按纯文本粘贴（忽略 HTML/图片等富文本信息）
  // - 普通 Ctrl+V：优先将 HTML 转译为 Markdown；其次处理图片文件占位+异步上传；否则走默认粘贴
  editor.addEventListener('paste', guard(async (e: ClipboardEvent) => {
    try {
      const dt = e.clipboardData
      if (!dt) return

      // 统一提取常用数据，便于后续分支复用
      const types = dt.types ? Array.from(dt.types) : []
      const hasHtmlType = types.some(t => String(t).toLowerCase() === 'text/html')
      const html = hasHtmlType ? dt.getData('text/html') : ''
      const plainText = dt.getData('text/plain') || dt.getData('text') || ''
      const plainTrim = plainText.trim()
      const pasteCombo = _lastPasteCombo
      // 使用一次即清空，避免状态污染后续粘贴
      _lastPasteCombo = null

      // 0) Ctrl+Shift+V：强制走"纯文本粘贴"路径，完全忽略 HTML / 图片 等富文本
      if (pasteCombo === 'plain') {
        try {
          e.preventDefault()
          const env: PlainPasteEnv = {
            insertAtCursor: (t) => insertAtCursor(t),
            isPreviewMode: () => mode === 'preview',
            isWysiwygMode: () => wysiwyg,
            renderPreview: () => renderPreview(),
            scheduleWysiwygRender: () => scheduleWysiwygRender(),
          }
          await applyPlainTextPaste(plainText, env)
        } catch {}
        return
      }

      // 1) 处理 HTML → Markdown（像 Typora 那样保留格式）
      try {
        if (html && html.trim()) {
          // 粗略判断是否为“富文本”而非纯文本包装，避免过度拦截
          const looksRich = /<\s*(p|div|h[1-6]|ul|ol|li|pre|table|img|a|blockquote|strong|em|b|i|code)[\s>]/i.test(html)
          if (looksRich) {
            // 这里必须同步阻止默认粘贴，避免出现“纯文本 + Markdown”双重插入
            e.preventDefault()

            // 按需加载 DOMPurify 做一次基本清洗，避免恶意剪贴板 HTML 注入
            let safe = html
            // 提取 base href 以便相对链接转绝对（若存在）
            let baseUrl: string | undefined
            try {
              const m = html.match(/<base\s+href=["']([^"']+)["']/i)
              if (m && m[1]) baseUrl = m[1]
            } catch {}
            try {
              if (!sanitizeHtml) {
                const mod: any = await import('dompurify')
                const DOMPurify = mod?.default || mod
                sanitizeHtml = (h: string, cfg?: any) => DOMPurify.sanitize(h, cfg)
              }
              safe = sanitizeHtml!(html)
            } catch {}

            // 转成 Markdown 文本（动态导入）
            let mdText = ''
            try {
              const { htmlToMarkdown } = await import('./html2md')
              mdText = htmlToMarkdown(safe, { baseUrl }) || ''
            } catch (err) {
              console.warn('HTML to Markdown conversion failed:', err)
            }

            // 转译失败时退回纯文本，保证不会“吃掉”粘贴内容
            const finalText = (mdText && mdText.trim()) ? mdText : plainText
            if (finalText) {
              insertAtCursor(finalText)
              if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
            }
            return
          }
        }
      } catch {}

      // 1b) Ctrl+V 且仅有单个 URL：插入占位提示 [正在抓取title]，异步抓取网页标题后替换为 [标题](url)
      if (pasteCombo === 'normal') {
        try {
          const url = plainTrim
          // 仅在剪贴板内容是“单行 http/https URL”时触发，避免误伤普通文本
          if (url && /^https?:\/\/[^\s]+$/i.test(url)) {
            e.preventDefault()
            const placeholder = '[正在抓取title]'
            // 先插入占位提示，让用户感知到粘贴正在进行；此处不触发预览渲染，避免多次重绘
            insertAtCursor(placeholder)

            let finalText = url
            try {
              const title = await fetchPageTitle(url)
              if (title && title.trim()) {
                // 基本转义标题中的方括号，避免破坏 Markdown 语法
                const safeTitle = title.replace(/[\[\]]/g, '\\$&')
                finalText = `[${safeTitle}](${url})`
              }
            } catch {}

            try {
              const v = String((editor as HTMLTextAreaElement).value || '')
              const idx = v.indexOf(placeholder)
              if (idx >= 0) {
                const before = v.slice(0, idx)
                const after = v.slice(idx + placeholder.length)
                const next = before + finalText + after
                ;(editor as HTMLTextAreaElement).value = next
                const caret = before.length + finalText.length
                ;(editor as HTMLTextAreaElement).selectionStart = caret
                ;(editor as HTMLTextAreaElement).selectionEnd = caret
                dirty = true
                refreshTitle()
                refreshStatus()
              } else {
                // 占位符已被用户编辑删除，退回为在当前位置插入最终文本
                insertAtCursor(finalText)
              }
              if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
            } catch {}
            return
          }
        } catch {}
      }

      // 2) 若包含图片文件，使用占位 + 异步上传
      const items = Array.from(dt.items || [])
      const imgItem = items.find((it) => it.kind === 'file' && /^image\//i.test(it.type))
      if (!imgItem) return

      const file = imgItem.getAsFile()
      if (!file) return

      e.preventDefault()

      // 生成文件名
      const mime = (file.type || '').toLowerCase()
      const ext = (() => {
        if (mime.includes('jpeg')) return 'jpg'
        if (mime.includes('png')) return 'png'
        if (mime.includes('gif')) return 'gif'
        if (mime.includes('webp')) return 'webp'
        if (mime.includes('bmp')) return 'bmp'
        if (mime.includes('avif')) return 'avif'
        if (mime.includes('svg')) return 'svg'
        return 'png'
      })()
      const ts = new Date()
      const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
      const rand = Math.random().toString(36).slice(2, 6)
      const fname = `pasted-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}-${rand}.${ext}`

      // 占位符 + 异步上传，不阻塞编辑（已拆分到 core/imageUpload）
      await _imageUploader.startAsyncUploadFromFile(file, fname)
      return
      // 若开启直连上传（S3/R2），优先尝试上传，成功则直接插入外链并返回
      try {
        const upCfg = await getUploaderConfig()
        if (upCfg) {
          const pub = await uploadImageToS3R2(file, fname, file.type || 'application/octet-stream', upCfg)
          insertAtCursor(`![${fname}](${pub.publicUrl})`)
          if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
          else if (wysiwyg) scheduleWysiwygRender()
          return
        }
      } catch (e) {
        console.warn('直连上传失败，改用本地保存/内联', e)
      }

      await _imageUploader.startAsyncUploadFromFile(file, fname)
    } catch (err) {
      showError('处理粘贴图片失败', err)
    }
  }))
  // 拖拽到编辑器：插入图片（本地文件或 URL）
  editor.addEventListener('dragover', (e) => { e.preventDefault() })
  editor.addEventListener('drop', async (e) => {
    try {
      e.preventDefault()
      const dt = e.dataTransfer
      if (!dt) return
      const files = Array.from(dt.files || [])
      // 在 Tauri 环境下，文件拖入统一交给 tauri://file-drop 处理，避免与 DOM 层重复
      if (isTauriRuntime() && files.length > 0) {
        return
      }
      if (files.length > 0) {
        // Always-save-local: prefer local images folder
        try {
          const alwaysLocal = await getAlwaysSaveLocalImages()
          if (alwaysLocal) {
            const imgFiles = files.filter((f) => extIsImage(f.name) || (f.type && f.type.startsWith('image/')))
            if (imgFiles.length > 0) {
              const partsLocal: string[] = []
              if (isTauriRuntime() && currentFilePath) {
                const base = currentFilePath.replace(/[\\/][^\\/]*$/, '')
                const sep = base.includes('\\') ? '\\' : '/'
                const imgDir = base + sep + 'images'
                try { await ensureDir(imgDir) } catch {}
                for (const f of imgFiles) {
                  try {
                    const dst = imgDir + sep + f.name
                    const buf = new Uint8Array(await f.arrayBuffer())
                    await writeFile(dst as any, buf as any)
                    const needAngle = /[\s()]/.test(dst) || /^[a-zA-Z]:/.test(dst) || /\\/.test(dst)
                    const mdUrl = needAngle ? `<${dst}>` : dst
                    partsLocal.push(`![${f.name}](${mdUrl})`)
                  } catch {}
                }
                if (partsLocal.length > 0) {
                  insertAtCursor(partsLocal.join('\n'))
                  if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                  return
                }
              } else if (isTauriRuntime() && !currentFilePath) {
                const dir = await getDefaultPasteDir()
                if (dir) {
                  const baseDir = dir.replace(/[\\/]+$/, '')
                  const sep = baseDir.includes('\\') ? '\\' : '/'
                  try { await ensureDir(baseDir) } catch {}
                  for (const f of imgFiles) {
                    try {
                      const dst = baseDir + sep + f.name
                      const buf = new Uint8Array(await f.arrayBuffer())
                      await writeFile(dst as any, buf as any)
                      const needAngle = /[\s()]/.test(dst) || /^[a-zA-Z]:/.test(dst) || /\\/.test(dst)
                      const mdUrl = needAngle ? `<${dst}>` : dst
                      partsLocal.push(`![${f.name}](${mdUrl})`)
                    } catch {}
                  }
                  if (partsLocal.length > 0) {
                    insertAtCursor(partsLocal.join('\n'))
                    if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                    return
                  }
                }
              }
              // Fallback to data URLs
              const partsData: string[] = []
              for (const f of imgFiles) {
                try { const url = await fileToDataUrl(f); partsData.push(`![${f.name}](${url})`) } catch {}
              }
              if (partsData.length > 0) {
                insertAtCursor(partsData.join('\n'))
                if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                return
              }
            }
          }
        } catch {}
        // 优先检查是否有 MD 文件（浏览器环境）
        const mdFile = files.find((f) => /\.(md|markdown|txt)$/i.test(f.name))
        if (mdFile) {
          const reader = new FileReader()
          reader.onload = async (evt) => {
            try {
              const content = evt.target?.result as string
              if (content !== null && content !== undefined) {
                if (dirty) {
                  const ok = await confirmNative('当前文件尚未保存，是否放弃更改并打开拖拽的文件？', '打开文件')
                  if (!ok) return
                }
                editor.value = content
                currentFilePath = null
                dirty = false
                refreshTitle()
                refreshStatus()
                if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                // 拖入 MD 文件后默认预览
                await switchToPreviewAfterOpen()
              }
            } catch (err) {
              showError('读取拖拽的MD文件失败', err)
            }
          }
          reader.onerror = () => showError('文件读取失败', reader.error)
          reader.readAsText(mdFile, 'UTF-8')
          return
        }
        // 若启用直连上传，优先尝试上传到 S3/R2，成功则直接插入外链后返回
        try {
          const upCfg = await getUploaderConfig()
          if (upCfg) {
            const partsUpload: string[] = []
            for (const f of files) {
              if (extIsImage(f.name) || (f.type && f.type.startsWith('image/'))) {
                try {
                  let fileForUpload: Blob = f
                  let nameForUpload: string = f.name
                  let typeForUpload: string = f.type || 'application/octet-stream'
                  try {
                    if (upCfg?.convertToWebp) {
                      const r = await transcodeToWebpIfNeeded(f, nameForUpload, upCfg.webpQuality ?? 0.85, { skipAnimated: true })
                      fileForUpload = r.blob
                      nameForUpload = r.fileName
                      typeForUpload = r.type || 'image/webp'
                    }
                  } catch {}
                  const pub = await uploadImageToS3R2(fileForUpload, nameForUpload, typeForUpload, upCfg)
                  partsUpload.push(`![${nameForUpload}](${pub.publicUrl})`)
                } catch (e) {
                  console.warn('直连上传失败，跳过此文件使用本地兜底', f.name, e)
                }
              }
            }
            if (partsUpload.length > 0) {
              insertAtCursor(partsUpload.join('\n'))
              if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
              return
            }
          }
        } catch {}
        // 处理图片
        const parts: string[] = []
        for (const f of files) {
          if (extIsImage(f.name) || (f.type && f.type.startsWith('image/'))) {
            const url = await fileToDataUrl(f)
            parts.push(`![${f.name}](${url})`)
          }
        }
        if (parts.length > 0) {
          insertAtCursor(parts.join('\n'))
          if (mode === 'preview') await renderPreview()
          }
        return
      }
      const uriList = dt.getData('text/uri-list') || ''
      const plain = dt.getData('text/plain') || ''
      const cand = (uriList.split('\n').find((l) => /^https?:/i.test(l)) || '').trim() || plain.trim()
      if (cand && /^https?:/i.test(cand)) {
        const isImg = extIsImage(cand)
        insertAtCursor(`${isImg ? '!' : ''}[${isImg ? 'image' : 'link'}](${cand})`)
        if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
      }
    } catch (err) {
      showError('拖拽处理失败', err)
    }
  })
  // 快捷键
  // 关闭前确认（未保存）
  // 注意：Windows 平台上在 onCloseRequested 中调用浏览器 confirm 可能被拦截/无效，
  // 使用 Tauri 原生 ask 更稳定；必要时再降级到 confirm。
  try {
    void getCurrentWindow().onCloseRequested(async (event) => {
      let portableActive = false
      try { portableActive = await isPortableModeEnabled() } catch {}
      const runPortableExportOnExit = async () => {
        if (portableActive) {
          try { await exportPortableBackupSilent() } catch (err) { console.warn('[Portable] 关闭时导出失败', err) }
        }
      }
      if (!dirty) {
        await runPortableExportOnExit()
        return
      }

      // 阻止默认关闭，进行异步确认
      event.preventDefault()
      try { await saveCurrentDocPosNow() } catch {}

      let shouldExit = false
      let wantSave = false

      // 使用自定义三按钮对话框（多语言文案）
      const result = await showThreeButtonDialog(
        t('dlg.exit.unsaved'),
        t('dlg.exit.title')
      )

      if (result === 'save') {
        // 保存并退出
        wantSave = true
      } else if (result === 'discard') {
        // 直接退出，放弃更改
        shouldExit = true
      } else {
        // cancel - 取消退出，不做任何操作
        return
      }

      if (wantSave) {
        try {
          const wasDirty = dirty
          if (!currentFilePath) {
            await saveAs()
          } else {
            await saveFile()
          }
          // 仅当 dirty 从 true 变为 false 时视为保存成功；
          // 如果用户在文件选择器中点击了“取消”或保存失败，保持窗口不退出
          if (wasDirty && !dirty) {
            shouldExit = true
          } else {
            shouldExit = false
          }
        } catch (e) {
          showError('保存失败', e)
          shouldExit = false
        }
      }

      if (shouldExit) {
        // 便签模式：关闭前先恢复窗口大小和位置，避免 tauri-plugin-window-state 记住便签的小窗口尺寸
        if (stickyNoteMode) {
          try { await restoreWindowStateBeforeSticky() } catch {}
        }
        await runPortableExportOnExit()
        // 若启用“关闭前同步”，沿用后台隐藏 + 同步 + 退出的策略
        try {
          const cfg = await getWebdavSyncConfig()
          if (cfg.enabled && cfg.onShutdown) {
            const win = getCurrentWindow()
            try { await win.hide() } catch {}
            try { await webdavSyncNow('shutdown') } catch {}
            try { await new Promise(r => setTimeout(r, 300)) } catch {}
            try { await win.destroy() } catch {}
            return
          }
        } catch {}

        // 未启用关闭前同步，直接退出
        try { await getCurrentWindow().destroy() } catch { try { await getCurrentWindow().close() } catch {} }
      }
    })
  } catch (e) {
    console.log('窗口关闭监听注册失败（浏览器模式）')
  }

  // 点击外部区域时关闭最近文件面板
  // 浏览器/非 Tauri 环境下的关闭前确认兜底
  try {
    if (!isTauriRuntime()) {
      window.addEventListener('beforeunload', (e) => {
        try { void saveCurrentDocPosNow() } catch {}
        if (dirty) {
          e.preventDefault()
          ;(e as any).returnValue = ''
        }
      })
    }
  } catch {}
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('recent-panel') as HTMLDivElement
    if (!panel || panel.classList.contains('hidden')) return
    const target = e.target as Node | null
    // 只要点击在面板外部，就关闭最近文件面板
    if (target && !panel.contains(target)) {
      panel.classList.add('hidden')
    }
  })
  // 便签模式：全局屏蔽右键菜单（仅便签模式生效，避免影响其他模式）
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    if (!stickyNoteMode) return
    e.preventDefault()
    e.stopPropagation()
  }, true)
  // 库按钮内部操作
  try {
    const chooseBtn = document.getElementById('lib-choose') as HTMLButtonElement | null
    const refreshBtn = document.getElementById('lib-refresh') as HTMLButtonElement | null
    if (chooseBtn) chooseBtn.addEventListener('click', guard(async () => { await showLibraryMenu() }))
    if (refreshBtn) refreshBtn.addEventListener('click', guard(async () => { const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null; if (treeEl && !fileTreeReady) { await fileTree.init(treeEl, { getRoot: getLibraryRoot, onOpenFile: async (p: string) => { await openFile2(p) }, onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} }, onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} } }); fileTreeReady = true } else if (treeEl) { await fileTree.refresh() } try { const s = await getLibrarySort(); fileTree.setSort(s); await fileTree.refresh() } catch {} }))
  } catch {}
  // 关于弹窗：点击遮罩或“关闭”按钮关闭
  const overlay = document.getElementById('about-overlay') as HTMLDivElement | null
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) showAbout(false)
    })
    const closeBtn = document.getElementById('about-close') as HTMLButtonElement | null
    if (closeBtn) closeBtn.addEventListener('click', () => showAbout(false))
  }

  // 监听 Tauri 文件拖放（用于直接打开 .md/.markdown/.txt 文件）
  ;(async () => {
    try {
      const mod = await import('@tauri-apps/api/event')
      if (typeof mod.listen === 'function') {
        const DRAG_DROP = (mod as any)?.TauriEvent?.DRAG_DROP ?? 'tauri://drag-drop'
        await getCurrentWindow().listen(DRAG_DROP, async (ev: any) => {
          try {
            const payload: any = ev?.payload ?? ev
            // 仅在真正 drop 时处理（避免 hover/cancel 噪声）
            if (payload && typeof payload === 'object' && payload.action && payload.action !== 'drop') return
            const arr = Array.isArray(payload) ? payload : (payload?.paths || payload?.urls || payload?.files || [])
            const paths: string[] = (Array.isArray(arr) ? arr : []).map((p) => normalizePath(p))
            const md = paths.find((p) => /\.(md|markdown|txt)$/i.test(p))
            if (md) { void openFile2(md); return }
            const imgs = paths.filter((p) => /\.(png|jpe?g|gif|svg|webp|bmp|avif|ico)$/i.test(p))
            if (imgs.length > 0) {
              // 若所见 V2 激活：交由所见模式自身处理（支持拖拽到编辑区）
              if (wysiwygV2Active) {
                return
              }
              // Always-save-local: prefer local images folder for dropped files
              try {
                const alwaysLocal = await getAlwaysSaveLocalImages()
                if (alwaysLocal) {
                  const partsLocal: string[] = []
                  if (isTauriRuntime() && currentFilePath) {
                    const base = currentFilePath.replace(/[\\/][^\\/]*$/, '')
                    const sep = base.includes('\\') ? '\\' : '/'
                    const imgDir = base + sep + 'images'
                    try { await ensureDir(imgDir) } catch {}
                    for (const p of imgs) {
                      try {
                        const name = (p.split(/[\\/]+/).pop() || 'image')
                        const dst = imgDir + sep + name
                        const bytes = await readFile(p as any)
                        await writeFile(dst as any, bytes as any)
                        const needAngle = /[\s()]/.test(dst) || /^[a-zA-Z]:/.test(dst) || /\\/.test(dst)
                        const mdUrl = needAngle ? `<${dst}>` : dst
                        partsLocal.push(`![${name}](${mdUrl})`)
                      } catch {}
                    }
                    if (partsLocal.length > 0) {
                      insertAtCursor(partsLocal.join('\n'))
                      if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                      return
                    }
                  }
                }
              } catch {}
              // 若启用直连上传，优先尝试上传到 S3/R2
              try {
                const upCfg = await getUploaderConfig()
                if (upCfg) {
                  const toLabel = (p: string) => { const segs = p.split(/[\\/]+/); return segs[segs.length - 1] || 'image' }
                  const parts: string[] = []
                  for (const p of imgs) {
                    try {
                      const name = toLabel(p)
                      const mime = (() => {
                        const m = name.toLowerCase().match(/\.([a-z0-9]+)$/); const ext = m ? m[1] : ''
                        if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
                        if (ext === 'png') return 'image/png'
                        if (ext === 'gif') return 'image/gif'
                        if (ext === 'webp') return 'image/webp'
                        if (ext === 'bmp') return 'image/bmp'
                        if (ext === 'avif') return 'image/avif'
                        if (ext === 'svg') return 'image/svg+xml'
                        if (ext === 'ico') return 'image/x-icon'
                        return 'application/octet-stream'
                      })()
                      const bytes = await readFile(p as any)
                      let blob: Blob = new Blob([bytes], { type: mime })
                      let name2: string = name
                      let mime2: string = mime
                      try {
                        if (upCfg?.convertToWebp) {
                          const r = await transcodeToWebpIfNeeded(blob, name, upCfg.webpQuality ?? 0.85, { skipAnimated: true })
                          blob = r.blob
                          name2 = r.fileName
                          mime2 = r.type || 'image/webp'
                        }
                      } catch {}
                      const pub = await uploadImageToS3R2(blob, name2, mime2, upCfg)
                      parts.push(`![${name2}](${pub.publicUrl})`)
                    } catch (e) {
                      console.warn('单张图片上传失败，跳过：', p, e)
                      const needAngle = /[\s()]/.test(p) || /^[a-zA-Z]:/.test(p) || /\\/.test(p)
                      parts.push(`![${toLabel(p)}](${needAngle ? `<${p}>` : p})`)
                    }
                  }
                  insertAtCursor(parts.join('\n'))
                  if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                  return
                }
              } catch (e) { console.warn('直连上传失败或未配置，回退为本地路径', e) }
              const toLabel = (p: string) => { const segs = p.split(/[\\/]+/); return segs[segs.length - 1] || 'image' }
              // 直接插入原始本地路径；预览阶段会自动转换为 asset: 以便显示
              const toMdUrl = (p: string) => {
                const needAngle = /[\s()]/.test(p) || /^[a-zA-Z]:/.test(p) || /\\/.test(p)
                return needAngle ? `<${p}>` : p
              }
              const text = imgs.map((p) => `![${toLabel(p)}](${toMdUrl(p)})`).join('\n')
              insertAtCursor(text)
              if (mode === 'preview') await renderPreview(); return
            }
          } catch (err) {
            showError('文件拖拽事件处理失败', err)
          }
        })
        await mod.listen('open-file', (ev: any) => {
          try {
            const payload = ev?.payload ?? ev
            if (typeof payload === 'string' && payload) void openFile2(payload)
          } catch (err) {
            showError('打开方式参数处理失败', err)
          }
        })
      }
    } catch {
      // 非 Tauri 环境或事件 API 不可用，忽略
    }
  })()
}

// 启动
(async () => {
  try {
    console.log('flyMD (飞速MarkDown) 应用启动...')
    try { logInfo('打点:JS启动') } catch {}

    // Linux 平台：设置不透明背景，修复 WebKitGTK/AppImage 透明窗口问题
    if (navigator.platform.toLowerCase().includes('linux')) {
      try {
        await getCurrentWindow().setBackgroundColor('#ffffff')
      } catch {
        document.body.style.background = '#ffffff'
      }
    }

    // 等待平台集成层完成（至少保证 platform-mobile class 就绪）
    try { await _platformIntegrationReady } catch {}

    // 尝试初始化存储（确保完成后再加载扩展，避免读取不到已安装列表）
    await initStore()
    // 移动端：应用被切到后台/系统回收前，尽量把设置落盘（否则用户会觉得“根本不能保存设置”）
    try {
      document.addEventListener(
        'visibilitychange',
        () => {
          try {
            if (!document.hidden) return
            if (store) void store.save()
          } catch {}
        },
        { capture: true },
      )
    } catch {}
    // Android：默认初始化一个“应用私有目录”的本地库，先把基础能力跑通（浏览/搜索/编辑/WebDAV/插件）
    try { await ensureAndroidDefaultLibraryRoot() } catch (e) { console.warn('[Android] 初始化默认库失败:', e) }
    // Android：库侧栏不固定（固定会挤压编辑区，这在手机上就是垃圾体验）
    try {
      const p = await invoke<string>('get_platform')
      if (p === 'android' && store) {
        libraryDocked = false
        await store.set('libraryDocked', false)
        await store.save()
      }
    } catch {}
    try { await getAutoSave().loadFromStore() } catch {}
    // 初始化扩展管理面板宿主（依赖 store 等全局状态）
    try {
      initExtensionsPanel({
        getStore: () => store,
        pluginNotice,
        showError,
        confirmNative: (message: string) => confirmNative(message),
        openUploaderDialog,
        openWebdavSyncDialog,
        getWebdavSyncConfig,
        openInBrowser,
        installPluginFromGit,
        installPluginFromLocal,
        activatePlugin,
        deactivatePlugin,
        getActivePluginModule: (id: string) => pluginHost.getActivePluginModule(id),
        coreAiExtensionId: CORE_AI_EXTENSION_ID,
        markCoreExtensionBlocked: (id: string) => markCoreExtensionBlocked(store, id),
        removePluginDir: (dir: string) => removePluginDir(dir),
        openPluginSettings,
      })
    } catch {}
    try {
      const layout = await getOutlineLayout()
      outlineLayout = layout
      applyOutlineLayout()
    } catch {}
    // 读取紧凑标题栏设置并应用
    try {
      const compact = await getCompactTitlebar(store)
      await setCompactTitlebar(compact, store, false)
    } catch {}
    await maybeAutoImportPortableBackup()
    try {
      const side = await getLibrarySide()
      await setLibrarySide(side, false)
    } catch {}
    try {
      const docked = await getLibraryDocked()
      await setLibraryDocked(docked, false)
    } catch {}
    // 开发模式：不再自动打开 DevTools，改为快捷键触发，避免干扰首屏
    // 快捷键见下方全局 keydown（F12 或 Ctrl+Shift+I）
    // 核心功能：必须执行
    refreshTitle()
    refreshStatus()
    bindEvents()  // 🔧 关键：无论存储是否成功，都要绑定事件
    initContextMenuListener()  // 初始化右键菜单监听
    // 注意：专注模式状态恢复移至便签模式检测之后，见下方
    // 依据当前语言，应用一次 UI 文案（含英文简写，避免侧栏溢出）
    try { applyI18nUi() } catch {}
    try { logInfo('打点:事件绑定完成') } catch {}

    // 性能标记：首次渲染完成
    performance.mark('flymd-first-render')

    // 绑定扩展按钮（立即绑定，但延迟加载扩展）
    try { const btnExt = document.getElementById('btn-extensions'); if (btnExt) btnExt.addEventListener('click', () => { void panelShowExtensionsOverlay(true) }) } catch {}

    // 延迟初始化扩展系统和 WebDAV（使用 requestIdleCallback）
    const ric: any = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 100))
      ric(async () => {
        try {
          // 扩展：初始化目录并激活已启用扩展（此时 Store 已就绪）
          await ensurePluginsDir()
          // 初始化统一的"插件"菜单按钮
          initPluginsMenu()
          // 移动端：插件按钮是后插入的，这里补一次图标替换
          try { if (document.body.classList.contains('platform-mobile')) initMobileIcons() } catch {}
          await loadAndActivateEnabledPlugins()
          await ensureCoreExtensionsAfterStartup(store, APP_VERSION, activatePlugin)
          // 启动后后台检查一次扩展更新（仅提示，不自动更新）
          await checkPluginUpdatesOnStartup()
        } catch (e) {
          console.warn('[Extensions] 延迟初始化失败:', e)
        }
      })
    ric(async () => {
      try {
        // 将 WebDAV 插件 API 暴露给插件宿主
        try {
          const anyWin = window as any
          const pluginCallbacks: Array<(reason: any) => void> =
            (anyWin.__webdavPluginCallbacks =
              anyWin.__webdavPluginCallbacks || [])
          anyWin.__webdavPluginApi = {
            getConfig: async () => {
              try {
                return await getWebdavSyncConfig()
              } catch {
                return null
              }
            },
            registerExtraPaths: async (input: any) => {
              try {
                if (!input) return
                let owner = 'legacy'
                let paths: any = input
                if (
                  input &&
                  typeof input === 'object' &&
                  !Array.isArray(input) &&
                  Object.prototype.hasOwnProperty.call(input, 'paths')
                ) {
                  owner = String((input as any).owner || '').trim() || 'unknown'
                  paths = (input as any).paths
                }
                if (!paths) paths = []
                if (!Array.isArray(paths)) paths = [paths]
                // 直接交给 WebDAV 扩展内部处理
                try {
                  const mod: any = await import('./extensions/webdavSync')
                  if (typeof mod.setExtraSyncPaths === 'function') {
                    mod.setExtraSyncPaths(owner, paths)
                  } else if (typeof mod.registerExtraSyncPaths === 'function') {
                    mod.registerExtraSyncPaths(paths)
                  }
                } catch {}
              } catch {}
            },
            onSyncComplete: (cb: (reason: any) => void) => {
              try {
                if (typeof cb !== 'function') return
                pluginCallbacks.push(cb)
              } catch {}
            },
          }
          // 把 WebDAV 同步完成统一汇总：刷新库树 + 通知插件
          setOnSyncComplete(async () => {
            try {
              await refreshLibraryUiAndTree(true)
            } catch (e) {
              console.warn('[WebDAV] 刷新库失败:', e)
            }
            try {
              const list: Array<(r: any) => void> =
                (window as any).__webdavPluginCallbacks || []
              for (const fn of list) {
                try {
                  fn('manual')
                } catch {}
              }
            } catch {}
          })
        } catch {}
        await initWebdavSync()
      } catch (e) {
        console.warn('[WebDAV] 延迟初始化失败:', e)
      }
    })
    // 启动后后台预热扩展管理面板：提前完成市场索引加载与 UI 构建
    ric(async () => {
      try {
        await panelPrewarmExtensionsPanel()
      } catch (e) {
        console.warn('[ExtensionsPanel] 延迟预热失败:', e)
      }
    })
    // 开启 DevTools 快捷键（生产/开发环境均可）
    try {
      document.addEventListener('keydown', (e: KeyboardEvent) => {
        const isF12 = e.key === 'F12'
        const isCtrlShiftI = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i'
        if (isF12 || isCtrlShiftI) { e.preventDefault(); try { getCurrentWebview().openDevtools() } catch {} }
      })
    } catch {}
    // 便签模式检测：检查启动参数中是否有 --sticky-note
    let isStickyNoteStartup = false
    try {
      const cliArgs = await invoke<string[]>('get_cli_args')
      const stickyIndex = (cliArgs || []).findIndex(a => a === '--sticky-note')
      if (stickyIndex >= 0) {
        const stickyFilePath = cliArgs[stickyIndex + 1]
        if (stickyFilePath && typeof stickyFilePath === 'string') {
          isStickyNoteStartup = true
          // 延迟执行，确保 UI 初始化完成
          setTimeout(async () => {
            try { await enterStickyNoteMode(stickyFilePath) } catch (e) {
              console.error('[便签模式] 进入便签模式失败:', e)
            }
          }, 300)
        }
      }
    } catch (e) {
      console.warn('[便签模式] 检测启动参数失败:', e)
    }

    // 非便签模式启动时，检查是否有便签前保存的状态需要恢复（若存在则恢复并清除记录），并将窗口居中
    if (!isStickyNoteStartup) {
      // 1) 若存在便签前窗口状态，先恢复
      try { await restoreWindowStateBeforeSticky() } catch {}
      // 2) 兜底：窗口过小则拉回 960x640，避免残留便签尺寸
      try { await ensureMinWindowSize() } catch {}
      // 3) 兜底：强制退出专注模式并恢复原生标题栏，防止异常无标题栏状态
      try { await resetFocusModeDecorations() } catch {}
      // 4) 统一将窗口居中显示，避免位置跑偏
      try { await centerWindow() } catch {}

      // 移除透明度 CSS 变量，确保主窗口不透明
      try { document.documentElement.style.removeProperty('--sticky-opacity') } catch {}

      // 恢复源码模式状态（如果有便签前记录）
      try {
        if (store) {
          const editorState = await store.get('editorModeBeforeSticky') as { mode: string; wysiwygV2Active: boolean } | null
          if (editorState) {
            // 恢复源码模式，并清除记录
            // 注意：这里只是恢复状态变量，UI 切换会在后续文件打开时自动处理
            mode = editorState.mode as 'edit' | 'preview'
            // wysiwygV2Active 的恢复需要等 UI 加载完成后处理，这里只清除记录
            await store.delete('editorModeBeforeSticky')
            await store.save()
          }
        }
      } catch (e) {
        console.warn('[启动] 恢复源码模式状态失败:', e)
      }
    }

    // 兜底：主动询问后端是否有"默认程序/打开方式"传入的待打开路径
    try {
      const path = await invoke<string | null>('get_pending_open_path')
      if (path && typeof path === 'string') {
        void openFile2(path)
      } else {
        // macOS 兜底：通过后端命令读取启动参数，获取 Finder "打开方式"传入的文件
        try {
          const ua = navigator.userAgent || ''
          const isMac = /Macintosh|Mac OS X/i.test(ua)
          if (isMac) {
            const args = await invoke<string[]>('get_cli_args')
            const pick = (args || []).find((a) => {
              if (!a || typeof a !== 'string') return false
              const low = a.toLowerCase()
              if (low.startsWith('-psn_')) return false
              return /\.(md|markdown|txt|pdf)$/.test(low)
            })
            if (pick) { void openFile2(pick) }
          }
        } catch {}
      }
    } catch {}

    // 尝试加载最近文件（可能失败）
    try {
      void renderRecentPanel(false)
    } catch (e) {
      console.warn('最近文件面板加载失败:', e)
    }

    setTimeout(() => { try { editor.focus() } catch {}; try { logInfo('打点:可输入') } catch {} }, 0)
    // 可交互后预热常用动态模块（不阻塞首屏）
    try {
      const ric: any = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 200))
      ric(async () => {
        try {
          await Promise.allSettled([
            import('markdown-it'),
            import('dompurify'),
            import('highlight.js'),
          ])
        } catch {}
      })
    } catch {}
    // 性能标记：应用就绪
    performance.mark('flymd-app-ready')

    // 计算并输出启动性能
    try {
      const appStart = performance.getEntriesByName('flymd-app-start')[0]?.startTime || 0
      const domReady = performance.getEntriesByName('flymd-dom-ready')[0]?.startTime || 0
      const firstRender = performance.getEntriesByName('flymd-first-render')[0]?.startTime || 0
      const appReady = performance.getEntriesByName('flymd-app-ready')[0]?.startTime || 0
      console.log('[启动性能]', {
        'DOM就绪': `${(domReady - appStart).toFixed(0)}ms`,
        '首次渲染': `${(firstRender - appStart).toFixed(0)}ms`,
        '应用就绪': `${(appReady - appStart).toFixed(0)}ms`,
        '总耗时': `${(appReady - appStart).toFixed(0)}ms`
      })
    } catch {}

    console.log('应用初始化完成')
    void logInfo('flyMD (飞速MarkDown) 应用初始化完成')

    // 检查是否默认启用所见模式（便签模式下不启用，避免覆盖便签的阅读模式样式）
    try {
      const WYSIWYG_DEFAULT_KEY = 'flymd:wysiwyg:default'
      const SOURCEMODE_DEFAULT_KEY = 'flymd:sourcemode:default'
      const wysiwygDefault = localStorage.getItem(WYSIWYG_DEFAULT_KEY) === 'true'
      const sourcemodeDefault = localStorage.getItem(SOURCEMODE_DEFAULT_KEY) === 'true'
      const hasCurrentPdf = !!(currentFilePath && currentFilePath.toLowerCase().endsWith('.pdf'))

      // 若同时存在旧数据冲突，以“源码模式默认”为优先，确保语义明确；
      // 但若启动时已通过“打开方式”直接打开的是 PDF，则不要在这里强制切到所见模式，避免覆盖 PDF 预览。
      const shouldEnableWysiwyg = wysiwygDefault && !sourcemodeDefault && !hasCurrentPdf

      if (shouldEnableWysiwyg && !wysiwyg && !stickyNoteMode) {
        // 延迟一小段时间，确保编辑器已完全初始化
        setTimeout(async () => {
          try {
            await setWysiwygEnabled(true)
            console.log('[WYSIWYG] 默认启用所见模式')
          } catch (e) {
            console.error('[WYSIWYG] 默认启用所见模式失败:', e)
          }
        }, 200)
      }
    } catch (e) {
      console.error('[WYSIWYG] 检查默认所见模式设置失败:', e)
    }

    // 延迟更新检查到空闲时间（原本是 5 秒后）
    const ricUpdate: any = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 5000))
    ricUpdate(() => {
      try {
        checkUpdateSilentOnceAfterStartup()
      } catch (e) {
        console.warn('[Update] 延迟检查失败:', e)
      }
    })
  } catch (error) {
    console.error('应用启动失败:', error)
    showError('应用启动失败', error)

    // 🔧 即使启动失败，也尝试绑定基本事件
    try {
      bindEvents()
      console.log('已降级绑定基本事件')
    } catch (e) {
      console.error('事件绑定也失败了:', e)
    }
  }
})()

// 获取用户图片目录：优先使用 Tauri API，失败则基于 homeDir 猜测 Pictures
// ========= 粘贴/拖拽异步上传占位支持 =========
// 兼容入口：保留旧函数名，内部委托给核心模块
function startAsyncUploadFromFile(file: File, fname: string): Promise<void> {
  return _imageUploader.startAsyncUploadFromFile(file, fname)
}

// 获取用户图片目录：优先使用 Tauri API，失败则基于 homeDir 猜测 Pictures
async function getUserPicturesDir(): Promise<string | null> {
  try {
    const mod: any = await import('@tauri-apps/api/path')
    if (mod && typeof mod.pictureDir === 'function') {
      const p = await mod.pictureDir()
      if (p && typeof p === 'string') return p.replace(/[\\/]+$/, '')
    }
    if (mod && typeof mod.homeDir === 'function') {
      const h = await mod.homeDir()
      if (h && typeof h === 'string') {
        const base = h.replace(/[\\/]+$/, '')
        const sep = base.includes('\\') ? '\\' : '/'
        return base + sep + 'Pictures'
      }
    }
  } catch {}
  return null
}

function startAsyncUploadFromBlob(blob: Blob, fname: string, mime: string): Promise<void> {
  // NOTE: Blob 版本目前只被内部调用，保持向后兼容但委托给核心上传模块
  return _imageUploader.startAsyncUploadFromBlob(blob, fname, mime)
}
// ========= END =========

// ========== 扩展/插件：运行时与 UI ==========

// 插件运行时宿主：通过 initPluginRuntime 集中管理 PluginHost / 安装 / 更新 等逻辑
const pluginRuntime: PluginRuntimeHandles = initPluginRuntime({
  getStore: () => store,
  getEditor: () => editor,
  getPreviewRoot: () => preview,
  getCurrentFilePath: () => currentFilePath,
  getLibraryRoot: () => getLibraryRoot(),
  isPreviewMode: () => mode === 'preview',
  isWysiwyg: () => !!wysiwyg || !!wysiwygV2Active,
  renderPreview: () => { void renderPreview() },
  scheduleWysiwygRender: () => { try { scheduleWysiwygRender() } catch {} },
  markDirtyAndRefresh: () => {
    try {
      dirty = true
      refreshTitle()
      refreshStatus()
    } catch {}
  },
  splitYamlFrontMatter: (raw: string) => splitYamlFrontMatter(raw),
  yamlLoad: (raw: string) => yamlLoad(raw),
  pluginNotice: (msg: string, level?: 'ok' | 'err', ms?: number) => pluginNotice(msg, level, ms),
  confirmNative: (message: string, title?: string) => confirmNative(message, title),
  exportCurrentDocToPdf: (target: string) => exportCurrentDocToPdf(target),
  openFileByPath: (path: string) => openFile2(path),
  createStickyNote: async (filePath: string) => {
    try {
      const fn = (window as any).flymdCreateStickyNote
      if (typeof fn !== 'function') {
        throw new Error('当前环境不支持便签功能')
      }
      await fn(filePath)
    } catch (e) {
      console.error('createStickyNote 失败', e)
      throw e
    }
  },
  openUploaderSettings: () => { void openUploaderDialog() },
  openWebdavSettings: () => { void openWebdavSyncDialog() },
  getWebdavConfigSnapshot: async () => {
    try { return await getWebdavSyncConfig() } catch { return null }
  },
  wysiwygV2ApplyLink: wysiwygV2ApplyLink,
})

const {
  pluginHost,
  pluginContextMenuItems,
  updatePluginDockGaps,
  getInstalledPlugins,
  setInstalledPlugins,
  installPluginFromGit,
  installPluginFromLocal,
  activatePlugin,
  deactivatePlugin,
  openPluginSettings,
  checkPluginUpdatesOnStartup,
  updateInstalledPlugin,
  removePluginDir,
  loadAndActivateEnabledPlugins,
} = pluginRuntime

// 插件菜单管理：提供“右键菜单 / 下拉菜单”可见性开关的宿主依赖
const pluginMenuManagerHost: PluginMenuManagerHost = {
  getInstalledPlugins: () => getInstalledPlugins(),
  getPluginContextMenuItems: () => pluginContextMenuItems,
  getDropdownPlugins: () => {
    try {
      return getPluginsMenuItemsSnapshot()
    } catch {
      return []
    }
  },
}

// 将“菜单管理”入口挂接到“插件”下拉菜单的第一项
setPluginsMenuManagerOpener(() => {
  void openPluginMenuManager(pluginMenuManagerHost)
})

// 简单判断一个字符串是否更像本地路径（用于区分本地/远程安装）
function isLikelyLocalPath(input: string): boolean {
  const v = (input || '').trim()
  if (!v) return false
  if (/^[A-Za-z]:[\\/]/.test(v)) return true  // Windows 盘符路径
  if (/^\\\\/.test(v)) return true            // Windows UNC 路径
  if (v.startsWith('/')) return true          // 类 Unix 绝对路径
  return false
}

// 兼容旧代码：保留空实现，防止第三方脚本直接调用 showExtensionsOverlay
async function showExtensionsOverlay(show: boolean): Promise<void> {
  try {
    await panelShowExtensionsOverlay(show)
  } catch {}
}

// 将所见模式开关暴露到全局，便于在 WYSIWYG V2 覆盖层中通过双击切换至源码模式
try { (window as any).flymdSetWysiwygEnabled = async (enable: boolean) => { try { await setWysiwygEnabled(enable) } catch (e) { console.error('flymdSetWysiwygEnabled 调用失败', e) } } } catch {}
// 公开设置插件市场地址的 helper，便于远端/本地切换索引
try {
  (window as any).flymdSetPluginMarketUrl = async (url: string | null) => {
    try {
      if (!store) return false
      const key = 'pluginMarket:url'
      if (url && /^https?:\/\//i.test(url)) { await store.set(key, url) } else { await store.set(key, null as any) }
      await store.set('pluginMarket:cache', null as any)
      await store.save()
      console.log('[Extensions] Plugin market URL set to:', url)
      return true
    } catch (e) { console.error('flymdSetPluginMarketUrl 失败', e); return false }
  }
} catch {}
// 初始化多标签系统（包装器模式，最小侵入）
import('./tabs/integration').catch(e => console.warn('[Tabs] Failed to load tab system:', e))
// 初始化源码+阅读分屏（仅源码模式，包装器模式）
import('./modes/sourcePreviewSplit').catch(e => console.warn('[SplitPreview] Failed to init split view:', e))
