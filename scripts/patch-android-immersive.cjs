// flymd: 在 Tauri 生成的 Android 工程里打补丁（沉浸式全屏）
//
// 背景：
// - `src-tauri/gen/android` 是 tauri CLI 生成目录，默认被 gitignore
// - 我们不能把改动直接提交进去，只能在 CI（以及本地 init 后）自动 patch
//
// 参考：
// - https://github.com/orgs/tauri-apps/discussions/9261

const fs = require('fs')
const path = require('path')

function walk(dir, out = []) {
  try {
    const ents = fs.readdirSync(dir, { withFileTypes: true })
    for (const it of ents) {
      const p = path.join(dir, it.name)
      if (it.isDirectory()) walk(p, out)
      else out.push(p)
    }
  } catch {}
  return out
}

function findMainActivityKotlin(projectRoot) {
  const base = path.join(projectRoot, 'src-tauri', 'gen', 'android', 'app', 'src', 'main')
  const javaRoot = path.join(base, 'java')
  const kotlinRoot = path.join(base, 'kotlin')

  const candidates = []
  for (const root of [javaRoot, kotlinRoot]) {
    if (!fs.existsSync(root)) continue
    const files = walk(root)
    for (const f of files) {
      if (f.endsWith(path.sep + 'MainActivity.kt')) candidates.push(f)
    }
  }
  return candidates
}

function patchMainActivity(filePath) {
  const original = fs.readFileSync(filePath, 'utf8')
  const hasImmersive = original.includes('flymd:immersive-fullscreen-v2')
  // SAF folder picker：兼容 v1/v2 标记
  const hasFolderPicker = original.includes('flymd:saf-folder-picker-v1') || original.includes('flymd:saf-folder-picker-v2')
  const hasFlymdPickFolder = /fun\s+flymdPickFolder\s*\(/.test(original)

  let content = original

  function findMatchingBrace(s, openIdx) {
    let depth = 0
    for (let i = openIdx; i < s.length; i += 1) {
      const ch = s[i]
      if (ch === '{') depth += 1
      else if (ch === '}') {
        depth -= 1
        if (depth === 0) return i
      }
    }
    return -1
  }

  function parseParamNames(paramList) {
    try {
      const parts = String(paramList || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const out = []
      for (const p of parts) {
        const name = (p.split(':')[0] || '').trim()
        if (name) out.push(name)
      }
      return out
    } catch {
      return []
    }
  }

  function ensureKeepNearFun(funName) {
    try {
      const re = new RegExp(`^(\\s*)(override\\s+)?fun\\s+${funName}\\b`, 'm')
      const m = content.match(re)
      if (!m || m.index == null) return
      const idx = m.index
      const indent = m[1] || ''
      // 只检查函数定义前最近几行，避免误判别处 @Keep
      const head = content.slice(0, idx)
      const prev = head.split(/\r?\n/).slice(-6).join('\n')
      if (prev.includes('@androidx.annotation.Keep')) return
      content = content.slice(0, idx) + `${indent}@androidx.annotation.Keep\n` + content.slice(idx)
    } catch {}
  }

  function injectFolderPickerHookIntoExistingOnActivityResult() {
    if (content.includes('flymd:saf-folder-picker-hook-v1')) return false
    const m = content.match(/^(\s*)override\s+fun\s+onActivityResult\s*\(([^)]*)\)\s*\{/m)
    if (!m || m.index == null) return false
    const indent = m[1] || ''
    const params = m[2] || ''
    const openIdx = (m.index + m[0].length) - 1 // '{'
    const closeIdx = findMatchingBrace(content, openIdx)
    if (openIdx < 0 || closeIdx < 0) return false

    const names = parseParamNames(params)
    const reqName = names[0] || 'requestCode'
    const resName = names[1] || 'resultCode'
    const dataName = names[2] || 'data'
    const bodyIndent = indent + '  '

    const hook = `
${bodyIndent}// flymd:saf-folder-picker-hook-v1
${bodyIndent}if (${reqName} == flymdFolderPickerReqCode) {
${bodyIndent}  synchronized(flymdFolderPickerLock) {
${bodyIndent}    if (${resName} != android.app.Activity.RESULT_OK) {
${bodyIndent}      flymdFolderPickerError = "canceled"
${bodyIndent}      flymdFolderPickerDone = true
${bodyIndent}      flymdFolderPickerLock.notifyAll()
${bodyIndent}      return
${bodyIndent}    }
${bodyIndent}    val uri = ${dataName}?.data
${bodyIndent}    if (uri == null) {
${bodyIndent}      flymdFolderPickerError = "empty uri"
${bodyIndent}      flymdFolderPickerDone = true
${bodyIndent}      flymdFolderPickerLock.notifyAll()
${bodyIndent}      return
${bodyIndent}    }
${bodyIndent}    flymdFolderPickerResult = uri.toString()
${bodyIndent}    flymdFolderPickerDone = true
${bodyIndent}    flymdFolderPickerLock.notifyAll()
${bodyIndent}    return
${bodyIndent}  }
${bodyIndent}}
`
    const insertPos = openIdx + 1
    content = content.slice(0, insertPos) + hook + content.slice(insertPos)
    return true
  }

  const mainClassLine = content.match(/^(\s*class\s+MainActivity\b[^\n]*)$/m)?.[1]
  if (!mainClassLine) {
    console.warn(`[patch-android-immersive] 未找到 MainActivity 类声明，跳过: ${filePath}`)
    return false
  }

  const classHasBody = mainClassLine.includes('{') || /class\s+MainActivity\b[^{\n]*\{/.test(content)
  const hasOnCreate = /override\s+fun\s+onCreate\s*\(/.test(content)
  const hasOnResume = /override\s+fun\s+onResume\s*\(/.test(content)
  const hasOnWindowFocusChanged = /override\s+fun\s+onWindowFocusChanged\s*\(/.test(content)
  const hasOnActivityResult = /override\s+fun\s+onActivityResult\s*\(/.test(content)

  // 0) 如果模板是 `class MainActivity : ...()`（无 class body），先补上 `{ ... }`，避免后续找不到 `}` 插入点
  if (!classHasBody) {
    content = content.replace(/^(\s*class\s+MainActivity\b[^\n]*)$/m, (line) => `${line.trimEnd()} {`)
  }

  // 1) 尝试在已有的生命周期里插入一次调用（即使没命中，我们也会在缺失时注入 override 兜底）
  if (!hasImmersive && !content.includes('flymdApplyImmersiveFullscreen()')) {
    content = content.replace(
      /^(\s*)super\.onCreate\([^)]*\)\s*$/m,
      (line, indent) => `${line}\n${indent}flymdApplyImmersiveFullscreen()`,
    )
    content = content.replace(
      /^(\s*)super\.onResume\(\)\s*$/m,
      (line, indent) => `${line}\n${indent}flymdApplyImmersiveFullscreen()`,
    )
    content = content.replace(
      /^(\s*)super\.onWindowFocusChanged\(\s*hasFocus\s*\)\s*$/m,
      (line, indent) => `${line}\n${indent}if (hasFocus) flymdApplyImmersiveFullscreen()`,
    )
  }

  const blocks = []

  if (!hasImmersive) {
    // 在类末尾注入方法与 override（使用全限定名，避免新增 import 触发 Kotlin/Gradle 依赖问题）
    blocks.push(`
  // flymd:immersive-fullscreen-v2
  private fun flymdApplyImmersiveFullscreen() {
    try {
      window.statusBarColor = android.graphics.Color.TRANSPARENT
      window.navigationBarColor = android.graphics.Color.TRANSPARENT

      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
        window.attributes.layoutInDisplayCutoutMode =
          android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
      }

      @Suppress("DEPRECATION")
      window.decorView.systemUiVisibility =
        android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
          android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
          android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
          android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
          android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
          android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
    } catch (_: Throwable) {
    }
  }

${hasOnCreate ? '' : `
  override fun onCreate(savedInstanceState: android.os.Bundle?) {
    super.onCreate(savedInstanceState)
    flymdApplyImmersiveFullscreen()
  }`}

${hasOnResume ? '' : `
  override fun onResume() {
    super.onResume()
    flymdApplyImmersiveFullscreen()
  }`}

${hasOnWindowFocusChanged ? '' : `
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) flymdApplyImmersiveFullscreen()
  }`}
`)
  }

  // SAF folder picker：release 场景下也要可用（避免因模板已存在 onActivityResult 而跳过注入）
  // 1) 如果已有 onActivityResult，则往现有方法里打 hook；2) 如果没有，则注入 override；3) 统一确保 flymdPickFolder 存在。
  const needFolderPickerCore = !/fun\s+flymdPickFolder\s*\(/.test(content)
  const needFolderPickerHook = hasOnActivityResult && !content.includes('flymd:saf-folder-picker-hook-v1')
  if (needFolderPickerHook) {
    const hooked = injectFolderPickerHookIntoExistingOnActivityResult()
    if (!hooked) {
      console.warn(`[patch-android-immersive] 注入 SAF hook 失败（未找到 onActivityResult 方法体），后续可能无法接收目录选择结果: ${filePath}`)
    }
  }
  if (needFolderPickerCore) {
    blocks.push(`
  // flymd:saf-folder-picker-v2
  private val flymdFolderPickerLock = java.lang.Object()
  @Volatile private var flymdFolderPickerDone: Boolean = false
  @Volatile private var flymdFolderPickerResult: String? = null
  @Volatile private var flymdFolderPickerError: String? = null
  private val flymdFolderPickerReqCode: Int = 61706

  @androidx.annotation.Keep
  @Suppress("DEPRECATION")
  fun flymdPickFolder(timeoutMs: Long): String {
    synchronized(flymdFolderPickerLock) {
      flymdFolderPickerDone = false
      flymdFolderPickerResult = null
      flymdFolderPickerError = null

      runOnUiThread {
        try {
          val intent = android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT_TREE)
          intent.addFlags(
            android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION or
              android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
              android.content.Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
              android.content.Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
          )
          startActivityForResult(intent, flymdFolderPickerReqCode)
        } catch (e: Throwable) {
          synchronized(flymdFolderPickerLock) {
            flymdFolderPickerError = e.message ?: "open folder picker failed"
            flymdFolderPickerDone = true
            flymdFolderPickerLock.notifyAll()
          }
        }
      }

      val end = android.os.SystemClock.uptimeMillis() + timeoutMs
      while (!flymdFolderPickerDone) {
        val waitMs = end - android.os.SystemClock.uptimeMillis()
        if (waitMs <= 0) break
        try { flymdFolderPickerLock.wait(waitMs) } catch (_: Throwable) {}
      }
      if (!flymdFolderPickerDone) flymdFolderPickerError = "timeout"

      val r = flymdFolderPickerResult
      if (r == null) {
        throw java.lang.RuntimeException(flymdFolderPickerError ?: "canceled")
      }
      return r
    }
  }

${hasOnActivityResult ? '' : `
  @androidx.annotation.Keep
  @Suppress("DEPRECATION")
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
    // flymd:saf-folder-picker-hook-v1
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode != flymdFolderPickerReqCode) return
    synchronized(flymdFolderPickerLock) {
      if (resultCode != android.app.Activity.RESULT_OK) {
        flymdFolderPickerError = "canceled"
        flymdFolderPickerDone = true
        flymdFolderPickerLock.notifyAll()
        return
      }
      val uri = data?.data
      if (uri == null) {
        flymdFolderPickerError = "empty uri"
        flymdFolderPickerDone = true
        flymdFolderPickerLock.notifyAll()
        return
      }
      flymdFolderPickerResult = uri.toString()
      flymdFolderPickerDone = true
      flymdFolderPickerLock.notifyAll()
    }
  }`}
`)
  }

  // 兜底：如果文件里已有 v1/v2 folder picker，但未标记 @Keep，则补上，防止 release 混淆/裁剪导致 JNI 找不到方法
  if (hasFolderPicker || hasFlymdPickFolder) {
    ensureKeepNearFun('flymdPickFolder')
    // 仅在我们已打过 hook 时，才尝试给 onActivityResult 加 Keep（避免误改用户自定义方法）
    if (content.includes('flymd:saf-folder-picker-hook-v1')) ensureKeepNearFun('onActivityResult')
  }

  const mutatedBeforeBlocks = content !== original
  if (!blocks.length && !mutatedBeforeBlocks) {
    console.warn(`[patch-android-immersive] 没有需要写入的补丁内容，跳过: ${filePath}`)
    return true
  }

  const patchBlock = blocks.join('\n')

  if (blocks.length) {
    if (!classHasBody) {
      // 我们刚把 MainActivity 从一行 class 补成了 `{`，现在补上内容与结尾 `}`
      content = `${content.trimEnd()}\n${patchBlock}\n}\n`
    } else {
      // 简单定位最后一个顶层 '}' 作为 class 结束符插入点（模板 MainActivity 通常只有一个顶层 class）
      const idx = content.lastIndexOf('}')
      if (idx < 0) {
        console.warn(`[patch-android-immersive] 未找到类结束符 '}'，跳过: ${filePath}`)
        return false
      }
      content = content.slice(0, idx) + patchBlock + '\n}\n'
    }
  }

  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`[patch-android-immersive] 已写入补丁(v2): ${filePath}`)
  return true
}

function main() {
  const root = process.cwd()
  const files = findMainActivityKotlin(root)
  if (!files.length) {
    console.warn('[patch-android-immersive] 未找到 MainActivity.kt（可能还没执行 tauri android init），跳过')
    return
  }
  let ok = false
  for (const f of files) {
    try {
      if (patchMainActivity(f)) ok = true
    } catch (e) {
      console.warn(`[patch-android-immersive] patch 失败: ${f}: ${e?.message || e}`)
    }
  }
  if (!ok) {
    console.warn('[patch-android-immersive] 未能成功写入任何 MainActivity.kt（构建仍可继续，但不会全屏）')
  }
}

main()
