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
  // v2：不再重写整个文件（避免破坏模板对 TauriActivity 的导入路径）
  if (original.includes('flymd:immersive-fullscreen-v2')) {
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

  // 0) 如果模板是 `class MainActivity : ...()`（无 class body），先补上 `{ ... }`，避免后续找不到 `}` 插入点
  if (!classHasBody) {
    content = content.replace(/^(\s*class\s+MainActivity\b[^\n]*)$/m, (line) => `${line.trimEnd()} {`)
  }

  // 1) 尝试在已有的生命周期里插入一次调用（即使没命中，我们也会在缺失时注入 override 兜底）
  if (!content.includes('flymdApplyImmersiveFullscreen()')) {
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

  // 2) 在类末尾注入方法与 override（使用全限定名，避免新增 import 触发 Kotlin/Gradle 依赖问题）
  const block = `
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
`

  if (!classHasBody) {
    // 我们刚把 MainActivity 从一行 class 补成了 `{`，现在补上内容与结尾 `}`
    content = `${content.trimEnd()}\n${block}\n}\n`
  } else {
    // 简单定位最后一个顶层 '}' 作为 class 结束符插入点（模板 MainActivity 通常只有一个顶层 class）
    const idx = content.lastIndexOf('}')
    if (idx < 0) {
      console.warn(`[patch-android-immersive] 未找到类结束符 '}'，跳过: ${filePath}`)
      return false
    }
    content = content.slice(0, idx) + block + '\n}\n'
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
