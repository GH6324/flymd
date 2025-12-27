// flymd: 自动确保已生成 src-tauri/gen/android（避免首次 Android 构建/运行缺补丁）
//
// 背景：
// - Tauri v2 的 Android 工程默认生成在 src-tauri/gen/android（通常被 gitignore）
// - 我们的 Android 补丁（权限/图标/签名/MainActivity 修复）依赖该目录存在
// - 若用户直接跑 `npm run tauri android dev/build`，首次可能还没 init，导致补丁全跳过
//
// 目标：
// - 仅当“本次 npm 调用是 tauri android …”且 gen/android 不存在时，自动执行 `tauri android init`

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

function exists(p) {
  try { return fs.existsSync(p) } catch { return false }
}

function isTauriAndroidInvocation() {
  // npm 在生命周期脚本里会注入 npm_config_argv（JSON），包含原始命令参数
  // 例：npm run tauri android dev  -> ["run","tauri","android","dev"]
  try {
    const raw = process.env.npm_config_argv
    if (!raw) return false
    const obj = JSON.parse(raw)
    const original = Array.isArray(obj?.original) ? obj.original : []
    return original.includes('android')
  } catch {
    return false
  }
}

function findTauriCliBin(cwd) {
  const bin = process.platform === 'win32' ? 'tauri.cmd' : 'tauri'
  return path.join(cwd, 'node_modules', '.bin', bin)
}

function main() {
  const cwd = process.cwd()
  const androidRoot = path.join(cwd, 'src-tauri', 'gen', 'android')

  if (!isTauriAndroidInvocation()) return
  if (exists(androidRoot)) return

  const tauriBin = findTauriCliBin(cwd)
  if (!exists(tauriBin)) {
    console.warn(`[ensure-android-init] 未找到 tauri CLI 可执行文件: ${tauriBin}`)
    console.warn('[ensure-android-init] 请先执行 npm i 安装依赖，再运行 tauri android init/dev/build')
    process.exitCode = 1
    return
  }

  console.log('[ensure-android-init] 检测到 Android 构建，但 src-tauri/gen/android 不存在，开始执行: tauri android init')
  const res = spawnSync(tauriBin, ['android', 'init'], {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (res.status !== 0) {
    process.exitCode = res.status || 1
    return
  }

  if (!exists(androidRoot)) {
    console.warn('[ensure-android-init] tauri android init 执行成功，但仍未找到 src-tauri/gen/android（异常）')
    process.exitCode = 1
  }
}

main()

