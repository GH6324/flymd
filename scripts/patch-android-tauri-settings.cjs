// flymd: 在 Tauri 生成的 Android 工程里打补丁（tauri.settings.gradle 兜底）
//
// 背景：
// - GitHub Actions 上偶发出现 `settings.gradle` 引用 `tauri.settings.gradle`，但该文件不存在
// - 结果：Gradle 直接在 settings 阶段崩溃（连 app module 都进不去）
//
// 目标：
// - 如果 `src-tauri/gen/android/tauri.settings.gradle` 不存在，则生成一个“最小可用”的版本
// - 只做兜底：不覆盖已有文件，不引入额外复杂性

const fs = require('fs')
const path = require('path')

function exists(p) {
  try { return fs.existsSync(p) } catch { return false }
}

function readText(p) {
  return fs.readFileSync(p, 'utf8')
}

function writeText(p, s) {
  fs.writeFileSync(p, s, 'utf8')
}

function main() {
  const cwd = process.cwd()
  const androidRoot = path.join(cwd, 'src-tauri', 'gen', 'android')
  if (!exists(androidRoot)) {
    console.warn('[patch-android-tauri-settings] 未找到 src-tauri/gen/android（可能还没执行 tauri android init），跳过')
    return
  }

  const settingsGradle = path.join(androidRoot, 'settings.gradle')
  const tauriSettings = path.join(androidRoot, 'tauri.settings.gradle')

  if (exists(tauriSettings)) {
    console.log(`[patch-android-tauri-settings] tauri.settings.gradle 已存在，跳过: ${tauriSettings}`)
    return
  }

  if (!exists(settingsGradle)) {
    console.warn('[patch-android-tauri-settings] 未找到 settings.gradle，无法判断是否需要兜底，跳过')
    return
  }

  const s = readText(settingsGradle)
  if (!s.includes('tauri.settings.gradle')) {
    console.log('[patch-android-tauri-settings] settings.gradle 未引用 tauri.settings.gradle，跳过兜底生成')
    return
  }

  const content = `// flymd:tauri-settings-fallback-v1
//
// 说明：
// - 这是 CI 兜底文件：当 tauri CLI 未生成 tauri.settings.gradle 时，用它避免 Gradle 直接崩
// - 只提供最小 settings 配置：仓库源 + include(":app")
//
// 如果你在本地能稳定生成该文件，请忽略这里；CI 会优先使用 tauri CLI 生成的版本。

pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories {
    google()
    mavenCentral()
  }
}

rootProject.name = "android"
include(":app")
`

  writeText(tauriSettings, content)
  console.log(`[patch-android-tauri-settings] 已生成 tauri.settings.gradle（兜底）: ${tauriSettings}`)
}

main()

