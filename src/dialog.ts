/**
 * 自定义三按钮确认对话框及相关 WebDAV 同步对话框
 * 所有用户可见文案统一接入 i18n
 */

import { t } from './i18n'

// 对话框返回值类型
export type DialogResult = 'save' | 'discard' | 'cancel'

// WebDAV 同步冲突对话框返回值
export type ConflictResult = 'local' | 'remote' | 'cancel'
export type TwoChoiceResult = 'confirm' | 'cancel'
export type BoolResult = boolean

// 对话框样式
const dialogStyles = `
.custom-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  backdrop-filter: blur(4px);
  animation: dialogFadeIn 0.15s ease;
}

@keyframes dialogFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.custom-dialog-box {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
  animation: dialogSlideIn 0.2s ease;
}

@keyframes dialogSlideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.custom-dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--fg);
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-dialog-icon {
  font-size: 24px;
}

.custom-dialog-message {
  font-size: 14px;
  color: var(--fg);
  opacity: 0.85;
  line-height: 1.6;
  margin: 0 0 24px 0;
  white-space: pre-line;
}

.custom-dialog-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.custom-dialog-button {
  -webkit-app-region: no-drag;
  cursor: pointer;
  border: 1px solid var(--border);
  background: rgba(127, 127, 127, 127/255 * 0.08);
  background: rgba(127, 127, 127, 0.08);
  color: var(--fg);
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s ease;
  min-width: 100px;
}

.custom-dialog-button:hover {
  background: rgba(127, 127, 127, 0.15);
  border-color: rgba(127, 127, 127, 0.35);
}

.custom-dialog-button:active {
  transform: scale(0.97);
}

.custom-dialog-button.primary {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.custom-dialog-button.primary:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.custom-dialog-button.danger {
  background: #dc2626;
  color: white;
  border-color: #dc2626;
}

.custom-dialog-button.danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}

.custom-dialog-button:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* 移动端：别假设 400px 的桌面宽度 */
body.platform-mobile .custom-dialog-overlay {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

body.platform-mobile .custom-dialog-box {
  min-width: 0;
  width: calc(100vw - 32px);
  max-width: calc(100vw - 32px);
  padding: 16px;
  max-height: calc(100vh - 32px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  overflow: auto;
}

@supports (height: 100dvh) {
  body.platform-mobile .custom-dialog-box {
    max-height: calc(100dvh - 32px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  }
}

body.platform-mobile .custom-dialog-buttons {
  flex-direction: column-reverse;
}

body.platform-mobile .custom-dialog-button {
  width: 100%;
  min-height: 44px;
}
`

// 注入样式到页面
function injectStyles() {
  const styleId = 'custom-dialog-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = dialogStyles
    document.head.appendChild(style)
  }
}

/**
 * 显示三按钮确认对话框
 * @param message 对话框消息
 * @param title 对话框标题（可选，不传则使用多语言默认标题）
 * @returns Promise<DialogResult> - 'save': 保存并退出, 'discard': 直接退出, 'cancel': 取消
 */
export function showThreeButtonDialog(
  message: string,
  title?: string
): Promise<DialogResult> {
  return new Promise((resolve) => {
    injectStyles()

    // 创建对话框 DOM
    const overlay = document.createElement('div')
    overlay.className = 'custom-dialog-overlay'

    const box = document.createElement('div')
    box.className = 'custom-dialog-box'

    const titleEl = document.createElement('div')
    titleEl.className = 'custom-dialog-title'
    const finalTitle = (title && title.trim()) || t('dlg.exit.title')
    titleEl.innerHTML = `<span class="custom-dialog-icon">ℹ️</span>${finalTitle}`

    const messageEl = document.createElement('div')
    messageEl.className = 'custom-dialog-message'
    messageEl.textContent = message

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'custom-dialog-buttons'

    // 创建三个按钮
    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'custom-dialog-button'
    cancelBtn.textContent = t('dlg.cancel')

    const discardBtn = document.createElement('button')
    discardBtn.className = 'custom-dialog-button danger'
    discardBtn.textContent = t('dlg.exit.discard')

    const saveBtn = document.createElement('button')
    saveBtn.className = 'custom-dialog-button primary'
    saveBtn.textContent = t('dlg.exit.save')

    function closeDialog(result: DialogResult) {
      overlay.style.animation = 'dialogFadeIn 0.1s ease reverse'
      setTimeout(() => {
        overlay.remove()
        resolve(result)
      }, 100)
    }

    cancelBtn.onclick = () => {
      closeDialog('cancel')
    }

    discardBtn.onclick = () => {
      closeDialog('discard')
    }

    saveBtn.onclick = () => {
      closeDialog('save')
    }

    buttonsContainer.appendChild(cancelBtn)
    buttonsContainer.appendChild(discardBtn)
    buttonsContainer.appendChild(saveBtn)

    box.appendChild(titleEl)
    box.appendChild(messageEl)
    box.appendChild(buttonsContainer)
    overlay.appendChild(box)

    // 添加到页面
    document.body.appendChild(overlay)

    // 聚焦到保存按钮（默认操作）
    setTimeout(() => saveBtn.focus(), 50)

    // 点击遮罩层关闭（视为取消）
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeDialog('cancel')
      }
    }

    // ESC 键取消
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog('cancel')
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
  })
}

/**
 * 库侧栏删除确认对话框（文件/文件夹共用）
 * @param filename 文件或文件夹名
 * @param isDir 是否为文件夹
 * @returns Promise<boolean> - true: 确认删除, false: 取消
 */
export function showLibraryDeleteDialog(
  filename: string,
  isDir: boolean,
): Promise<BoolResult> {
  return new Promise((resolve) => {
    injectStyles()

    const overlay = document.createElement('div')
    overlay.className = 'custom-dialog-overlay'

    const box = document.createElement('div')
    box.className = 'custom-dialog-box'

    const titleEl = document.createElement('div')
    titleEl.className = 'custom-dialog-title'
    const titleKey = isDir ? 'dlg.libDelete.title.dir' : 'dlg.libDelete.title.file'
    titleEl.innerHTML = `<span class="custom-dialog-icon">🗑️</span>${t(titleKey as any)}`

    const messageEl = document.createElement('div')
    messageEl.className = 'custom-dialog-message'
    const nameKey = isDir ? 'dlg.libDelete.name.dir' : 'dlg.libDelete.name.file'
    const safeName = filename || t(nameKey as any)
    const msgKey = isDir ? 'dlg.libDelete.msg.dir' : 'dlg.libDelete.msg.file'
    messageEl.textContent = t(msgKey as any, { name: safeName })

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'custom-dialog-buttons'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'custom-dialog-button'
    cancelBtn.textContent = t('dlg.cancel')

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'custom-dialog-button danger'
    deleteBtn.textContent = t('dlg.delete')

    function close(result: BoolResult) {
      overlay.style.animation = 'dialogFadeIn 0.1s ease reverse'
      setTimeout(() => {
        overlay.remove()
        resolve(result)
      }, 100)
    }

    cancelBtn.onclick = () => close(false)
    deleteBtn.onclick = () => close(true)

    buttonsContainer.appendChild(cancelBtn)
    buttonsContainer.appendChild(deleteBtn)

    box.appendChild(titleEl)
    box.appendChild(messageEl)
    box.appendChild(buttonsContainer)
    overlay.appendChild(box)
    document.body.appendChild(overlay)

    setTimeout(() => deleteBtn.focus(), 50)

    overlay.onclick = (e) => {
      if (e.target === overlay) close(false)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(false)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
  })
}

/**
 * WebDAV 文件冲突对话框（本地和远程都已修改）
 * @param filename 文件名
 * @returns Promise<ConflictResult> - 'local': 保留本地, 'remote': 保留远程, 'cancel': 取消
 */
export function showConflictDialog(filename: string): Promise<ConflictResult> {
  return new Promise((resolve) => {
    injectStyles()

    const overlay = document.createElement('div')
    overlay.className = 'custom-dialog-overlay'

    const box = document.createElement('div')
    box.className = 'custom-dialog-box'

    const titleEl = document.createElement('div')
    titleEl.className = 'custom-dialog-title'
    titleEl.innerHTML = `<span class="custom-dialog-icon">⚠️</span>${t('dlg.sync.conflict.title')}`

    const messageEl = document.createElement('div')
    messageEl.className = 'custom-dialog-message'
    messageEl.textContent = t('dlg.sync.conflict.msg', { name: filename })

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'custom-dialog-buttons'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'custom-dialog-button'
    cancelBtn.textContent = t('dlg.cancel')

    const remoteBtn = document.createElement('button')
    remoteBtn.className = 'custom-dialog-button'
    remoteBtn.textContent = t('dlg.sync.conflict.remote')

    const localBtn = document.createElement('button')
    localBtn.className = 'custom-dialog-button primary'
    localBtn.textContent = t('dlg.sync.conflict.local')

    function closeDialog(result: ConflictResult) {
      overlay.style.animation = 'dialogFadeIn 0.1s ease reverse'
      setTimeout(() => {
        overlay.remove()
        resolve(result)
      }, 100)
    }

    cancelBtn.onclick = () => closeDialog('cancel')
    remoteBtn.onclick = () => closeDialog('remote')
    localBtn.onclick = () => closeDialog('local')

    buttonsContainer.appendChild(cancelBtn)
    buttonsContainer.appendChild(remoteBtn)
    buttonsContainer.appendChild(localBtn)

    box.appendChild(titleEl)
    box.appendChild(messageEl)
    box.appendChild(buttonsContainer)
    overlay.appendChild(box)
    document.body.appendChild(overlay)

    setTimeout(() => localBtn.focus(), 50)

    overlay.onclick = (e) => {
      if (e.target === overlay) closeDialog('cancel')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog('cancel')
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
  })
}

/**
 * WebDAV 本地文件删除确认对话框
 * @param filename 文件名
 * @returns Promise<TwoChoiceResult> - 'confirm': 同步删除远程, 'cancel': 从远程恢复
 */
export function showLocalDeleteDialog(filename: string): Promise<TwoChoiceResult> {
  return new Promise((resolve) => {
    injectStyles()

    const overlay = document.createElement('div')
    overlay.className = 'custom-dialog-overlay'

    const box = document.createElement('div')
    box.className = 'custom-dialog-box'

    const titleEl = document.createElement('div')
    titleEl.className = 'custom-dialog-title'
    titleEl.innerHTML = `<span class="custom-dialog-icon">🗑️</span>${t('dlg.sync.localDelete.title')}`

    const messageEl = document.createElement('div')
    messageEl.className = 'custom-dialog-message'
    messageEl.textContent = t('dlg.sync.localDelete.msg', { name: filename })

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'custom-dialog-buttons'

    const restoreBtn = document.createElement('button')
    restoreBtn.className = 'custom-dialog-button'
    restoreBtn.textContent = t('dlg.sync.localDelete.restore')

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'custom-dialog-button danger'
    deleteBtn.textContent = t('dlg.sync.localDelete.deleteRemote')

    function closeDialog(result: TwoChoiceResult) {
      overlay.style.animation = 'dialogFadeIn 0.1s ease reverse'
      setTimeout(() => {
        overlay.remove()
        resolve(result)
      }, 100)
    }

    restoreBtn.onclick = () => closeDialog('cancel')
    deleteBtn.onclick = () => closeDialog('confirm')

    buttonsContainer.appendChild(restoreBtn)
    buttonsContainer.appendChild(deleteBtn)

    box.appendChild(titleEl)
    box.appendChild(messageEl)
    box.appendChild(buttonsContainer)
    overlay.appendChild(box)
    document.body.appendChild(overlay)

    setTimeout(() => deleteBtn.focus(), 50)

    overlay.onclick = (e) => {
      if (e.target === overlay) closeDialog('cancel')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog('cancel')
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
  })
}

/**
 * WebDAV 远程文件删除确认对话框
 * @param filename 文件名
 * @returns Promise<TwoChoiceResult> - 'confirm': 同步删除本地, 'cancel': 保留本地
 */
export function showRemoteDeleteDialog(filename: string): Promise<TwoChoiceResult> {
  return new Promise((resolve) => {
    injectStyles()

    const overlay = document.createElement('div')
    overlay.className = 'custom-dialog-overlay'

    const box = document.createElement('div')
    box.className = 'custom-dialog-box'

    const titleEl = document.createElement('div')
    titleEl.className = 'custom-dialog-title'
    titleEl.innerHTML = `<span class="custom-dialog-icon">⚠️</span>${t('dlg.sync.remoteDelete.title')}`

    const messageEl = document.createElement('div')
    messageEl.className = 'custom-dialog-message'
    messageEl.textContent = t('dlg.sync.remoteDelete.msg', { name: filename })

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'custom-dialog-buttons'

    const keepBtn = document.createElement('button')
    keepBtn.className = 'custom-dialog-button'
    keepBtn.textContent = t('dlg.sync.remoteDelete.keepLocal')

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'custom-dialog-button danger'
    deleteBtn.textContent = t('dlg.sync.remoteDelete.deleteLocal')

    function closeDialog(result: TwoChoiceResult) {
      overlay.style.animation = 'dialogFadeIn 0.1s ease reverse'
      setTimeout(() => {
        overlay.remove()
        resolve(result)
      }, 100)
    }

    keepBtn.onclick = () => closeDialog('cancel')
    deleteBtn.onclick = () => closeDialog('confirm')

    buttonsContainer.appendChild(keepBtn)
    buttonsContainer.appendChild(deleteBtn)

    box.appendChild(titleEl)
    box.appendChild(messageEl)
    box.appendChild(buttonsContainer)
    overlay.appendChild(box)
    document.body.appendChild(overlay)

    setTimeout(() => keepBtn.focus(), 50)

    overlay.onclick = (e) => {
      if (e.target === overlay) closeDialog('cancel')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog('cancel')
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
  })
}

/**
 * WebDAV safe 模式：本地存在但远端不存在时的上传确认对话框
 * @param filename 文件名
 * @returns Promise<TwoChoiceResult> - 'confirm': 上传本地到远端, 'cancel': 仅保留本地
 */
export function showUploadMissingRemoteDialog(filename: string): Promise<TwoChoiceResult> {
  return new Promise((resolve) => {
    injectStyles()

    const overlay = document.createElement('div')
    overlay.className = 'custom-dialog-overlay'

    const box = document.createElement('div')
    box.className = 'custom-dialog-box'

    const titleEl = document.createElement('div')
    titleEl.className = 'custom-dialog-title'
    titleEl.innerHTML = `<span class="custom-dialog-icon">📤</span>${t('dlg.sync.uploadMissing.title')}`

    const messageEl = document.createElement('div')
    messageEl.className = 'custom-dialog-message'
    messageEl.textContent = t('dlg.sync.uploadMissing.msg', { name: filename })

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'custom-dialog-buttons'

    const keepLocalBtn = document.createElement('button')
    keepLocalBtn.className = 'custom-dialog-button'
    keepLocalBtn.textContent = t('dlg.sync.uploadMissing.keepLocal')

    const uploadBtn = document.createElement('button')
    uploadBtn.className = 'custom-dialog-button primary'
    uploadBtn.textContent = t('dlg.sync.uploadMissing.upload')

    function closeDialog(result: TwoChoiceResult) {
      overlay.style.animation = 'dialogFadeIn 0.1s ease reverse'
      setTimeout(() => {
        overlay.remove()
        resolve(result)
      }, 100)
    }

    keepLocalBtn.onclick = () => closeDialog('cancel')
    uploadBtn.onclick = () => closeDialog('confirm')

    buttonsContainer.appendChild(keepLocalBtn)
    buttonsContainer.appendChild(uploadBtn)

    box.appendChild(titleEl)
    box.appendChild(messageEl)
    box.appendChild(buttonsContainer)
    overlay.appendChild(box)
    document.body.appendChild(overlay)

    setTimeout(() => uploadBtn.focus(), 50)

    overlay.onclick = (e) => {
      if (e.target === overlay) closeDialog('cancel')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog('cancel')
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
  })
}
