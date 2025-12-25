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
  const hasFolderPicker = original.includes('flymd:saf-folder-picker-v1')
  if (hasImmersive && hasFolderPicker) {
    console.log(`[patch-android-immersive] 已打过补丁(v2)，跳过: ${filePath}`)
    return true
  }

  let content = original

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

  if (!hasFolderPicker) {
    if (hasOnActivityResult) {
      console.warn(`[patch-android-immersive] MainActivity 已存在 onActivityResult，暂不注入 SAF folder picker（需要手工合并）: ${filePath}`)
    } else {
      blocks.push(`
  // flymd:saf-folder-picker-v1
  private val flymdFolderPickerLock = java.lang.Object()
  @Volatile private var flymdFolderPickerDone: Boolean = false
  @Volatile private var flymdFolderPickerResult: String? = null
  @Volatile private var flymdFolderPickerError: String? = null
  private val flymdFolderPickerReqCode: Int = 61706

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

  @Suppress("DEPRECATION")
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
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
  }
`)
    }
  }

  if (!blocks.length) {
    console.warn(`[patch-android-immersive] 没有需要写入的补丁内容，跳过: ${filePath}`)
    return true
  }

  const patchBlock = blocks.join('\n')

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
