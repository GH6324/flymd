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
  if (original.includes('flymd:immersive-fullscreen')) {
    console.log(`[patch-android-immersive] 已打过补丁，跳过: ${filePath}`)
    return true
  }

  const m = original.match(/^\s*package\s+([a-zA-Z0-9_.]+)\s*$/m)
  const pkg = m ? m[1] : null
  if (!pkg) {
    console.warn(`[patch-android-immersive] 未找到 package 行，跳过: ${filePath}`)
    return false
  }

  const content = `package ${pkg}

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import app.tauri.TauriActivity

/**
 * flymd:immersive-fullscreen
 * 沉浸式全屏：隐藏状态栏/导航栏，让 WebView 内容延伸到系统栏区域。
 *
 * 说明：
 * - 不依赖 androidx.core（避免 Kotlin 编译期缺依赖）
 * - Android 会在切后台/旋转/恢复焦点时“复活”系统栏，因此需要在 onResume/onWindowFocusChanged 里重复应用。
 *
 * 参考：
 * - https://github.com/orgs/tauri-apps/discussions/9261
 */
class MainActivity : TauriActivity() {
  private fun applyImmersiveFullscreen() {
    // 透明系统栏（即使被临时拉出，也尽量不挡内容）
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.TRANSPARENT

    // 刘海屏：允许内容延伸到 cutout 区域（短边）
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      window.attributes.layoutInDisplayCutoutMode =
        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
    }

    @Suppress("DEPRECATION")
    window.decorView.systemUiVisibility =
      View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
        View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
        View.SYSTEM_UI_FLAG_FULLSCREEN
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    applyImmersiveFullscreen()
  }

  override fun onResume() {
    super.onResume()
    applyImmersiveFullscreen()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) applyImmersiveFullscreen()
  }
}
`

  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`[patch-android-immersive] 已写入补丁: ${filePath}`)
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
