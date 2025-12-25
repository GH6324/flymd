// flymd: 在 Tauri 生成的 Android 工程里同步图标资源
//
// 背景：
// - `src-tauri/icons/android/*` 是 `tauri icon` 生成的 launcher 图标资源
// - `src-tauri/gen/android` 是 tauri CLI 生成的 Android 工程（默认不进 git）
// - 某些情况下 init/build 后 APK 仍显示 Tauri 默认图标，说明图标没正确落进 gen/android
//
// 目标：
// - 每次 CI/init 后，把 `src-tauri/icons/android` 下的资源强制拷贝到 `gen/android/app/src/main/res`
// - 最小实现：只覆盖我们关心的 mipmap/values 文件夹

const fs = require('fs')
const path = require('path')

function exists(p) {
  try { return fs.existsSync(p) } catch { return false }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst))
  fs.copyFileSync(src, dst)
}

function copyDir(srcDir, dstDir) {
  ensureDir(dstDir)
  const ents = fs.readdirSync(srcDir, { withFileTypes: true })
  for (const it of ents) {
    const s = path.join(srcDir, it.name)
    const d = path.join(dstDir, it.name)
    if (it.isDirectory()) copyDir(s, d)
    else copyFile(s, d)
  }
}

function main() {
  const cwd = process.cwd()
  const androidRoot = path.join(cwd, 'src-tauri', 'gen', 'android')
  const srcIcons = path.join(cwd, 'src-tauri', 'icons', 'android')
  const dstRes = path.join(androidRoot, 'app', 'src', 'main', 'res')

  if (!exists(androidRoot)) {
    console.warn('[patch-android-icons] 未找到 src-tauri/gen/android（可能还没执行 tauri android init），跳过')
    return
  }
  if (!exists(srcIcons)) {
    console.warn('[patch-android-icons] 未找到 src-tauri/icons/android（先运行 tauri icon），跳过')
    return
  }
  if (!exists(dstRes)) {
    console.warn('[patch-android-icons] 未找到 gen/android/app/src/main/res，跳过')
    return
  }

  const dirs = [
    'mipmap-anydpi-v26',
    'mipmap-mdpi',
    'mipmap-hdpi',
    'mipmap-xhdpi',
    'mipmap-xxhdpi',
    'mipmap-xxxhdpi',
    'values',
  ]

  let copied = 0
  for (const name of dirs) {
    const from = path.join(srcIcons, name)
    if (!exists(from)) continue
    const to = path.join(dstRes, name)
    copyDir(from, to)
    copied += 1
  }

  console.log(`[patch-android-icons] 已同步图标资源目录数: ${copied}`)
}

main()

