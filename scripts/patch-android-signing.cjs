// flymd: 在 Tauri 生成的 Android 工程里打补丁（Release 签名）
//
// 背景：
// - `src-tauri/gen/android` 是 tauri CLI 生成目录，默认被 gitignore
// - Release 签名配置不能直接提交到 gen 目录，只能在 CI（以及本地 init 后）自动 patch
//
// 目标：
// - 在 app 模块引入一个统一的 Groovy 脚本：`$rootDir/flymd-signing.gradle`
// - 该脚本使用环境变量读取 keystore 配置：
//   KEYSTORE_PATH / KEYSTORE_PASSWORD / KEY_ALIAS / KEY_PASSWORD
// - 若任意变量缺失或文件不存在：不配置 signing（避免破坏 debug 与无签名构建）

const fs = require('fs')
const path = require('path')

function readText(p) {
  return fs.readFileSync(p, 'utf8')
}

function writeText(p, s) {
  fs.writeFileSync(p, s, 'utf8')
}

function exists(p) {
  try { return fs.existsSync(p) } catch { return false }
}

function findAndroidRoot(cwd) {
  return path.join(cwd, 'src-tauri', 'gen', 'android')
}

function findAppBuildFile(androidRoot) {
  const appDir = path.join(androidRoot, 'app')
  const kts = path.join(appDir, 'build.gradle.kts')
  const groovy = path.join(appDir, 'build.gradle')
  if (exists(kts)) return { path: kts, kind: 'kts' }
  if (exists(groovy)) return { path: groovy, kind: 'groovy' }
  return null
}

function findPluginsBlockEnd(content, startIdx) {
  // 朴素 brace 计数：用于定位 `plugins { ... }` 的结束位置
  let i = startIdx
  let depth = 0
  let seenOpen = false
  while (i < content.length) {
    const ch = content[i]
    if (ch === '{') { depth++; seenOpen = true }
    else if (ch === '}') {
      depth--
      if (seenOpen && depth === 0) return i + 1
    }
    i++
  }
  return -1
}

function injectApplyLine(buildFile, kind) {
  const original = readText(buildFile)
  if (original.includes('flymd-signing.gradle')) {
    console.log(`[patch-android-signing] 已引用 flymd-signing.gradle，跳过: ${buildFile}`)
    return false
  }

  const applyLine =
    kind === 'kts'
      ? 'apply(from = "${rootDir}/flymd-signing.gradle")'
      : 'apply from: "${rootDir}/flymd-signing.gradle"'

  let content = original

  // 尽量插到 plugins 块后面（避免某些 Gradle 版本对 apply 顺序敏感）
  const pluginsIdx = content.indexOf('plugins {')
  if (pluginsIdx >= 0) {
    const end = findPluginsBlockEnd(content, pluginsIdx)
    if (end > 0) {
      content = content.slice(0, end) + `\n\n// flymd:android-signing-v1\n${applyLine}\n` + content.slice(end)
      writeText(buildFile, content)
      console.log(`[patch-android-signing] 已注入 apply 行: ${buildFile}`)
      return true
    }
  }

  // 兜底：插到文件开头（跳过 shebang/注释不做复杂处理）
  content = `// flymd:android-signing-v1\n${applyLine}\n\n` + content
  writeText(buildFile, content)
  console.log(`[patch-android-signing] 已在文件头注入 apply 行: ${buildFile}`)
  return true
}

function ensureSigningGradle(androidRoot) {
  const p = path.join(androidRoot, 'flymd-signing.gradle')
  const marker = 'flymd:android-signing-gradle-v2'
  if (exists(p)) {
    const cur = readText(p)
    if (cur.includes(marker)) {
      console.log(`[patch-android-signing] flymd-signing.gradle 已存在，跳过: ${p}`)
      return false
    }
  }

  const content = `// ${marker}
//
// 说明：
// - 该文件由 scripts/patch-android-signing.cjs 自动生成
// - 仅在 Release 构建时需要；Debug 不需要签名配置
// - 使用环境变量配置 keystore（避免把证书提交进仓库）
//
// 环境变量：
// - KEYSTORE_PATH: keystore 的绝对/相对路径
// - KEYSTORE_PASSWORD: keystore 密码
// - KEY_ALIAS: key 别名
// - KEY_PASSWORD: key 密码
//
// 注意：
// - 任意变量缺失或文件不存在：不配置 signing（避免破坏无签名构建）

def flymdKeystorePath = System.getenv('KEYSTORE_PATH')
def flymdKeystorePassword = System.getenv('KEYSTORE_PASSWORD')
def flymdKeyAlias = System.getenv('KEY_ALIAS')
def flymdKeyPassword = System.getenv('KEY_PASSWORD')

def hasSigning = flymdKeystorePath && flymdKeystorePassword && flymdKeyAlias && flymdKeyPassword && file(flymdKeystorePath).exists()

if (!hasSigning) {
  println('[flymd-signing] Release signing 未配置（KEYSTORE_* 缺失或文件不存在），将跳过签名配置')
  return
}

android {
  signingConfigs {
    release {
      storeFile file(flymdKeystorePath)
      storePassword flymdKeystorePassword
      keyAlias flymdKeyAlias
      keyPassword flymdKeyPassword
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
    }
  }
}
`

  writeText(p, content)
  console.log(`[patch-android-signing] 已写入 flymd-signing.gradle: ${p}`)
  return true
}

function main() {
  const cwd = process.cwd()
  const androidRoot = findAndroidRoot(cwd)
  if (!exists(androidRoot)) {
    console.warn('[patch-android-signing] 未找到 src-tauri/gen/android（可能还没执行 tauri android init），跳过')
    return
  }

  ensureSigningGradle(androidRoot)

  const build = findAppBuildFile(androidRoot)
  if (!build) {
    console.warn('[patch-android-signing] 未找到 app/build.gradle(.kts)，跳过')
    return
  }

  injectApplyLine(build.path, build.kind)
}

main()
