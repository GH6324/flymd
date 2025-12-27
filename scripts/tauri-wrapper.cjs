// flymd: tauri 命令包装器（只在 Android 场景做必要的“先 init 再 patch”）
//
// 背景：
// - `src-tauri/gen/android` 默认不进 git；没生成时我们的 Android 补丁必然“跳过”
// - `npm run tauri -- android dev` 这种用法，pre/post 脚本拿不到 `android dev` 参数，没法可靠判断
//
// 目标：
// - 只要检测到 `tauri android ...`，且 gen/android 不存在：
//   1) 先执行 `tauri android init` 生成工程
//   2) 再执行 `npm run -s android:patch` 注入权限/图标/MainActivity 等补丁
// - 其它命令：原样透传给 tauri CLI，不添乱

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

function exists(p) {
  try { return fs.existsSync(p) } catch { return false }
}

function hasJavaInPath() {
  try {
    const res = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['java'], {
      cwd: process.cwd(),
      stdio: 'ignore',
      shell: process.platform === 'win32',
    })
    return res.status === 0
  } catch {
    return false
  }
}

function maybeSetupJavaFromAndroidStudio() {
  // 只在 Windows 做“找 Android Studio 自带 JBR”这个兜底；其它平台让用户自己配。
  if (process.platform !== 'win32') return

  try {
    const javaHome = String(process.env.JAVA_HOME || '').trim()
    if (javaHome && exists(path.join(javaHome, 'bin', 'java.exe'))) return
    if (hasJavaInPath()) return

    // 常见安装位置：C:\Program Files\Android\Android Studio\jbr；有些人装在 D 盘
    const roots = [
      'C:\\Program Files\\Android\\Android Studio',
      'C:\\Program Files (x86)\\Android\\Android Studio',
      'D:\\Program Files\\Android\\Android Studio',
      'D:\\Program Files (x86)\\Android\\Android Studio',
    ]

    for (const studioRoot of roots) {
      const jbr = path.join(studioRoot, 'jbr')
      const javaExe = path.join(jbr, 'bin', 'java.exe')
      if (!exists(javaExe)) continue
      process.env.JAVA_HOME = jbr
      // 子进程继承 PATH，确保 tauri CLI 能找到 java
      process.env.PATH = path.join(jbr, 'bin') + path.delimiter + String(process.env.PATH || '')
      console.log(`[tauri-wrapper] 未检测到 java，已自动设置 JAVA_HOME: ${jbr}`)
      return
    }

    console.warn('[tauri-wrapper] 未检测到 Java（JAVA_HOME 未设置且 PATH 中无 java），请在系统环境变量中设置 JAVA_HOME 后重试。')
  } catch {}
}

function binPath(name) {
  const bin = process.platform === 'win32' ? `${name}.cmd` : name
  return path.join(process.cwd(), 'node_modules', '.bin', bin)
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  })
  if (res.status !== 0) {
    process.exit(res.status || 1)
  }
}

function main() {
  const args = process.argv.slice(2)

  const tauriBin = binPath('tauri')
  const tauriCmd = exists(tauriBin) ? tauriBin : 'tauri'

  // 只处理 android 子命令；其它命令一律透传
  const isAndroid = args[0] === 'android'
  const sub = String(args[1] || '')

  if (isAndroid) {
    maybeSetupJavaFromAndroidStudio()

    const androidRoot = path.join(process.cwd(), 'src-tauri', 'gen', 'android')
    const needInit = sub !== 'init' && !exists(androidRoot)

    const npmBin = binPath('npm')
    const npmCmd = exists(npmBin) ? npmBin : (process.platform === 'win32' ? 'npm.cmd' : 'npm')

    if (sub === 'init') {
      // init：先生成，再 patch，避免用户打开 Android Studio 时看到的是“未打补丁”的工程
      run(tauriCmd, ['android', 'init'])
      run(npmCmd, ['run', '-s', 'android:patch'])
      return
    }

    if (needInit) {
      console.log('[tauri-wrapper] 检测到 Android 构建且未生成 gen/android，先执行: tauri android init')
      run(tauriCmd, ['android', 'init'])
    }

    // dev/build/run：确保每次都 patch（MainActivity/Manifest/Proguard/图标等）
    if (exists(androidRoot)) {
      run(npmCmd, ['run', '-s', 'android:patch'])
    }
  }

  // 最终执行用户原始 tauri 命令
  run(tauriCmd, args)
}

main()
