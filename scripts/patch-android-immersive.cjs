// flymd: 在 Tauri 生成的 Android 工程里打补丁（移动端兼容）
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

function patchAndroidManifestPermissions(projectRoot) {
  try {
    const appSrc = path.join(projectRoot, 'src-tauri', 'gen', 'android', 'app', 'src')
    if (!fs.existsSync(appSrc)) {
      console.warn('[patch-android-immersive] 未找到 gen/android/app/src（可能还没执行 tauri android init），跳过麦克风权限注入')
      return false
    }

    const manifests = walk(appSrc).filter(p => p.endsWith(path.sep + 'AndroidManifest.xml'))
    if (!manifests.length) {
      console.warn('[patch-android-immersive] 未找到任何 AndroidManifest.xml，跳过麦克风权限注入')
      return false
    }

    // flymd:audio-permission-v1
    // 说明：WebView getUserMedia 需要 Manifest 声明 RECORD_AUDIO，否则前端永远 Permission denied。
    const block = `  <!-- flymd:audio-permission-v1 -->\n  <uses-permission android:name="android.permission.RECORD_AUDIO" />\n  <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />\n`

    let ok = false
    for (const manifest of manifests) {
      const s = fs.readFileSync(manifest, 'utf8')
      if (s.includes('android.permission.RECORD_AUDIO')) {
        ok = true
        continue
      }

      const m = s.match(/<manifest\b[^>]*>/)
      if (!m || m.index == null) {
        console.warn(`[patch-android-immersive] AndroidManifest.xml 未找到 <manifest>，跳过: ${manifest}`)
        continue
      }

      // 在 <manifest ...> 后插入 uses-permission（尽量不碰 <application>）
      const insertPos = m.index + m[0].length
      const next = s.slice(0, insertPos) + '\n' + block + s.slice(insertPos)
      fs.writeFileSync(manifest, next, 'utf8')
      console.log(`[patch-android-immersive] 已写入麦克风权限声明: ${manifest}`)
      ok = true
    }
    return ok
  } catch (e) {
    console.warn(`[patch-android-immersive] 写入 AndroidManifest 麦克风权限失败: ${e?.message || e}`)
    return false
  }
}

function patchMainActivity(filePath) {
  const original = fs.readFileSync(filePath, 'utf8')
  const hasImmersive = original.includes('flymd:immersive-fullscreen-v2') || original.includes('flymdApplyImmersiveFullscreen')
  // SAF folder picker：兼容 v1/v2 标记
  const hasFolderPicker = original.includes('flymd:saf-folder-picker-v1') || original.includes('flymd:saf-folder-picker-v2')
  const hasFlymdPickFolder = /fun\s+flymdPickFolder\s*\(/.test(original)
  const hasMicPermission = original.includes('flymd:mic-permission-v1') || /fun\s+flymdEnsureRecordAudioPermission\s*\(/.test(original)
  const hasSpeechRecognizer = original.includes('flymd:speech-recognizer-v1') || /fun\s+flymdSpeechStartListening\s*\(/.test(original)

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

  function injectMicPermissionHookIntoExistingOnRequestPermissionsResult() {
    if (content.includes('flymd:mic-permission-hook-v1')) return false
    const m = content.match(/^(\s*)override\s+fun\s+onRequestPermissionsResult\s*\(([^)]*)\)\s*\{/m)
    if (!m || m.index == null) return false
    const indent = m[1] || ''
    const params = m[2] || ''
    const openIdx = (m.index + m[0].length) - 1 // '{'
    const closeIdx = findMatchingBrace(content, openIdx)
    if (openIdx < 0 || closeIdx < 0) return false

    const names = parseParamNames(params)
    const reqName = names[0] || 'requestCode'
    const grantsName = names[2] || 'grantResults'
    const bodyIndent = indent + '  '

    const hook = `
${bodyIndent}// flymd:mic-permission-hook-v1
${bodyIndent}if (${reqName} == flymdMicPermReqCode) {
${bodyIndent}  synchronized(flymdMicPermLock) {
${bodyIndent}    var ok = false
${bodyIndent}    try {
${bodyIndent}      if (${grantsName}.isNotEmpty() && ${grantsName}[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) ok = true
${bodyIndent}    } catch (_: Throwable) {}
${bodyIndent}    flymdMicPermGranted = ok
${bodyIndent}    flymdMicPermDone = true
${bodyIndent}    flymdMicPermLock.notifyAll()
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
  const hasOnActivityResult = /override\s+fun\s+onActivityResult\s*\(/.test(content)
  const hasOnRequestPermissionsResult = /override\s+fun\s+onRequestPermissionsResult\s*\(/.test(content)

  // 0) 如果模板是 `class MainActivity : ...()`（无 class body），先补上 `{ ... }`，避免后续找不到 `}` 插入点
  if (!classHasBody) {
    content = content.replace(/^(\s*class\s+MainActivity\b[^\n]*)$/m, (line) => `${line.trimEnd()} {`)
  }

  // 1) 取消“沉浸式全屏”：用户需要系统状态栏（时间/信号/电量），并让 WebView 内容自然避开顶部安全区。
  // 说明：这里不去“强行开启”任何 edge-to-edge；只做最小清理：
  // - 移除我们曾注入的 flymdApplyImmersiveFullscreen() 方法
  // - 移除所有对该方法的调用
  function removeImmersiveFullscreen() {
    let changed = false

    // a) 先移除所有调用（避免方法删除后编译失败）
    const beforeCalls = content
    content = content.replace(/^\s*flymdApplyImmersiveFullscreen\(\)\s*\r?\n/gm, '')
    content = content.replace(/^\s*if\s*\(\s*hasFocus\s*\)\s*flymdApplyImmersiveFullscreen\(\)\s*\r?\n/gm, '')
    if (content !== beforeCalls) changed = true

    // b) 再移除方法定义（使用 brace 计数，避免 if 块导致正则误删）
    while (true) {
      const markerIdx = content.indexOf('flymd:immersive-fullscreen-v2')
      if (markerIdx < 0) break

      const funIdx = content.indexOf('fun flymdApplyImmersiveFullscreen', markerIdx)
      if (funIdx < 0) break
      const openIdx = content.indexOf('{', funIdx)
      if (openIdx < 0) break
      const closeIdx = findMatchingBrace(content, openIdx)
      if (closeIdx < 0) break

      let start = content.lastIndexOf('\n', markerIdx)
      if (start < 0) start = 0
      // 删除到方法结束括号之后，并吃掉多余空行
      let end = closeIdx + 1
      while (end < content.length && (content[end] === '\n' || content[end] === '\r' || content[end] === ' ' || content[end] === '\t')) {
        // 避免吃掉下一个函数/注释：遇到非空白就停
        end += 1
      }

      content = content.slice(0, start) + '\n' + content.slice(end)
      changed = true
    }

    return changed
  }

  if (hasImmersive) {
    const removed = removeImmersiveFullscreen()
    if (removed) {
      console.log(`[patch-android-immersive] 已移除沉浸式全屏代码（显示系统状态栏）: ${filePath}`)
    }
  }

  const blocks = []

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

  // 麦克风权限：getUserMedia 需要 Manifest + 运行时权限；有些 WebView 不会自动弹系统权限框，必须 ActivityCompat.requestPermissions。
  const needMicPermissionCore = !/fun\s+flymdEnsureRecordAudioPermission\s*\(/.test(content)
  const needMicPermissionHook = hasOnRequestPermissionsResult && !content.includes('flymd:mic-permission-hook-v1')
  if (needMicPermissionHook) {
    const hooked = injectMicPermissionHookIntoExistingOnRequestPermissionsResult()
    if (!hooked) {
      console.warn(`[patch-android-immersive] 注入 mic permission hook 失败（未找到 onRequestPermissionsResult 方法体），录音权限可能无法正常回调: ${filePath}`)
    }
  }
  if (needMicPermissionCore) {
    blocks.push(`
  // flymd:mic-permission-v1
  private val flymdMicPermLock = java.lang.Object()
  @Volatile private var flymdMicPermDone: Boolean = false
  @Volatile private var flymdMicPermGranted: Boolean = false
  private val flymdMicPermReqCode: Int = 61707

  @androidx.annotation.Keep
  fun flymdEnsureRecordAudioPermission(timeoutMs: Long): Boolean {
    try {
      val perm = "android.permission.RECORD_AUDIO"
      val granted =
        androidx.core.content.ContextCompat.checkSelfPermission(this, perm) == android.content.pm.PackageManager.PERMISSION_GRANTED
      if (granted) return true

      synchronized(flymdMicPermLock) {
        flymdMicPermDone = false
        flymdMicPermGranted = false
      }

      runOnUiThread {
        try {
          androidx.core.app.ActivityCompat.requestPermissions(this, arrayOf(perm), flymdMicPermReqCode)
        } catch (_: Throwable) {
          synchronized(flymdMicPermLock) {
            flymdMicPermDone = true
            flymdMicPermGranted = false
            flymdMicPermLock.notifyAll()
          }
        }
      }

      val waitTotal = if (timeoutMs > 0) timeoutMs else 60_000L
      val end = android.os.SystemClock.uptimeMillis() + waitTotal
      synchronized(flymdMicPermLock) {
        while (!flymdMicPermDone) {
          val waitMs = end - android.os.SystemClock.uptimeMillis()
          if (waitMs <= 0) break
          try { flymdMicPermLock.wait(waitMs) } catch (_: Throwable) {}
        }
        return flymdMicPermDone && flymdMicPermGranted
      }
    } catch (_: Throwable) {
      return false
    }
  }

${hasOnRequestPermissionsResult ? '' : `
  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
    // flymd:mic-permission-hook-v1
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode != flymdMicPermReqCode) return
    synchronized(flymdMicPermLock) {
      var ok = false
      try {
        if (grantResults.isNotEmpty() && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) ok = true
      } catch (_: Throwable) {}
      flymdMicPermGranted = ok
      flymdMicPermDone = true
      flymdMicPermLock.notifyAll()
    }
  }`}
`)
  }

  // 系统 SpeechRecognizer：语音输入（返回 partial/final/rms/error 事件）
  const needSpeechRecognizerCore = !/fun\s+flymdSpeechStartListening\s*\(/.test(content)
  if (needSpeechRecognizerCore) {
    blocks.push(`

  // flymd:speech-recognizer-v1
  // 说明：
  // - 直接使用系统 android.speech.SpeechRecognizer（不依赖任何第三方 App / AIDL）
  // - 事件通过队列返回给 Rust/JS 侧轮询消费（避免 Java->Rust 回调复杂度）
  // - 只实现“最小可用”：开始/停止/取消 + partial/final + rms 音量 + 错误

  private val flymdSpeechLock = java.lang.Object()
  @Volatile private var flymdSpeechRecognizer: android.speech.SpeechRecognizer? = null
  @Volatile private var flymdSpeechActiveSessionId: Int = 0
  @Volatile private var flymdSpeechStartDone: Boolean = false
  @Volatile private var flymdSpeechStartOk: Boolean = false
  @Volatile private var flymdSpeechStartErr: String? = null
  @Volatile private var flymdSpeechLastRmsAtMs: Long = 0L
  private var flymdSpeechNextId: Int = 1

  private val flymdSpeechEventsLock = java.lang.Object()
  private val flymdSpeechEvents: java.util.ArrayDeque<String> = java.util.ArrayDeque()

  private fun flymdSpeechPushEvent(obj: org.json.JSONObject) {
    val s = obj.toString()
    synchronized(flymdSpeechEventsLock) {
      // 防止队列无限增长导致 OOM：最多保留 128 条，超出丢弃最旧
      while (flymdSpeechEvents.size >= 128) {
        try { flymdSpeechEvents.removeFirst() } catch (_: Throwable) { break }
      }
      flymdSpeechEvents.addLast(s)
    }
  }

  private fun flymdSpeechState(sid: Int, state: Int, msg: String) {
    try {
      val o = org.json.JSONObject()
      o.put("t", "state")
      o.put("sid", sid)
      o.put("state", state)
      o.put("msg", msg)
      flymdSpeechPushEvent(o)
    } catch (_: Throwable) {}
  }

  private fun flymdSpeechEnsureRecognizer(): android.speech.SpeechRecognizer? {
    val existing = flymdSpeechRecognizer
    if (existing != null) return existing
    return try {
      if (!android.speech.SpeechRecognizer.isRecognitionAvailable(this)) return null
      val r = android.speech.SpeechRecognizer.createSpeechRecognizer(this)
      r.setRecognitionListener(object : android.speech.RecognitionListener {
        override fun onReadyForSpeech(params: android.os.Bundle?) {
          val sid = flymdSpeechActiveSessionId
          if (sid <= 0) return
          flymdSpeechState(sid, 1, "ready")
        }

        override fun onBeginningOfSpeech() {
          val sid = flymdSpeechActiveSessionId
          if (sid <= 0) return
          flymdSpeechState(sid, 1, "begin")
        }

        override fun onRmsChanged(rmsdB: Float) {
          val sid = flymdSpeechActiveSessionId
          if (sid <= 0) return
          val now = android.os.SystemClock.uptimeMillis()
          // 限流：rms 回调过于频繁，避免刷爆队列
          if (now - flymdSpeechLastRmsAtMs < 120) return
          flymdSpeechLastRmsAtMs = now
          try {
            val amp = kotlin.math.max(0.0, kotlin.math.min(1.0, (rmsdB / 10.0).toDouble()))
            val o = org.json.JSONObject()
            o.put("t", "amp")
            o.put("sid", sid)
            o.put("amp", amp)
            flymdSpeechPushEvent(o)
          } catch (_: Throwable) {}
        }

        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {
          val sid = flymdSpeechActiveSessionId
          if (sid <= 0) return
          flymdSpeechState(sid, 2, "end")
        }

        override fun onError(error: Int) {
          val sid = flymdSpeechActiveSessionId
          if (sid <= 0) return
          try {
            val o = org.json.JSONObject()
            o.put("t", "error")
            o.put("sid", sid)
            o.put("code", error)
            o.put("msg", "speechrecognizer error")
            flymdSpeechPushEvent(o)
          } catch (_: Throwable) {}
          flymdSpeechState(sid, 0, "idle")
          flymdSpeechActiveSessionId = 0
        }

        override fun onResults(results: android.os.Bundle?) {
          val sid = flymdSpeechActiveSessionId
          if (sid <= 0) return
          try {
            val list = results?.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION)
            val text = if (list != null && list.isNotEmpty()) (list[0] ?: "") else ""
            val o = org.json.JSONObject()
            o.put("t", "final")
            o.put("sid", sid)
            o.put("text", text)
            flymdSpeechPushEvent(o)
          } catch (_: Throwable) {}
          flymdSpeechState(sid, 0, "idle")
          flymdSpeechActiveSessionId = 0
        }

        override fun onPartialResults(partialResults: android.os.Bundle?) {
          val sid = flymdSpeechActiveSessionId
          if (sid <= 0) return
          try {
            val list = partialResults?.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION)
            val text = if (list != null && list.isNotEmpty()) (list[0] ?: "") else ""
            val o = org.json.JSONObject()
            o.put("t", "partial")
            o.put("sid", sid)
            o.put("text", text)
            flymdSpeechPushEvent(o)
          } catch (_: Throwable) {}
        }

        override fun onEvent(eventType: Int, params: android.os.Bundle?) {}
      })
      flymdSpeechRecognizer = r
      r
    } catch (_: Throwable) {
      null
    }
  }

  @androidx.annotation.Keep
  fun flymdSpeechStartListening(timeoutMs: Long): Int {
    try {
      val perm = "android.permission.RECORD_AUDIO"
      val granted =
        androidx.core.content.ContextCompat.checkSelfPermission(this, perm) == android.content.pm.PackageManager.PERMISSION_GRANTED
      if (!granted) return -3

      if (!android.speech.SpeechRecognizer.isRecognitionAvailable(this)) return -1

      synchronized(flymdSpeechLock) {
        if (flymdSpeechActiveSessionId > 0) return -2

        val sid = flymdSpeechNextId++
        flymdSpeechStartDone = false
        flymdSpeechStartOk = false
        flymdSpeechStartErr = null
        flymdSpeechLastRmsAtMs = 0L
        flymdSpeechActiveSessionId = sid

        runOnUiThread {
          try {
            val r = flymdSpeechEnsureRecognizer()
            if (r == null) {
              flymdSpeechStartErr = "recognizer unavailable"
              flymdSpeechStartOk = false
              flymdSpeechActiveSessionId = 0
            } else {
              val intent = android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
              intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
              intent.putExtra(android.speech.RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
              intent.putExtra(android.speech.RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
              // 说明：不强制语言，跟随系统；需要时可由前端扩展传参
              r.startListening(intent)
              flymdSpeechStartOk = true
              flymdSpeechState(sid, 1, "recording")
            }
          } catch (t: Throwable) {
            flymdSpeechStartErr = t.message ?: "startListening failed"
            flymdSpeechStartOk = false
            flymdSpeechActiveSessionId = 0
          }
          synchronized(flymdSpeechLock) {
            flymdSpeechStartDone = true
            flymdSpeechLock.notifyAll()
          }
        }

        val waitTotal = if (timeoutMs > 0) timeoutMs else 8_000L
        val end = android.os.SystemClock.uptimeMillis() + waitTotal
        while (!flymdSpeechStartDone) {
          val waitMs = end - android.os.SystemClock.uptimeMillis()
          if (waitMs <= 0) break
          try { flymdSpeechLock.wait(waitMs) } catch (_: Throwable) {}
        }

        if (!flymdSpeechStartDone || !flymdSpeechStartOk) {
          flymdSpeechActiveSessionId = 0
          return -4
        }
        return sid
      }
    } catch (_: Throwable) {
      return -4
    }
  }

  @androidx.annotation.Keep
  fun flymdSpeechStopListening(sessionId: Int) {
    try {
      if (sessionId <= 0) return
      if (flymdSpeechActiveSessionId != sessionId) return
      runOnUiThread {
        try {
          flymdSpeechRecognizer?.stopListening()
          flymdSpeechState(sessionId, 2, "stop")
        } catch (_: Throwable) {}
      }
    } catch (_: Throwable) {}
  }

  @androidx.annotation.Keep
  fun flymdSpeechCancelListening(sessionId: Int) {
    try {
      if (sessionId <= 0) return
      if (flymdSpeechActiveSessionId != sessionId) return
      flymdSpeechActiveSessionId = 0
      runOnUiThread {
        try { flymdSpeechRecognizer?.cancel() } catch (_: Throwable) {}
        try { flymdSpeechState(sessionId, 0, "idle") } catch (_: Throwable) {}
      }
    } catch (_: Throwable) {}
  }

  @androidx.annotation.Keep
  fun flymdSpeechDrainEvents(maxItems: Int): Array<String> {
    val out = java.util.ArrayList<String>()
    val max = if (maxItems <= 0) 64 else kotlin.math.min(maxItems, 256)
    synchronized(flymdSpeechEventsLock) {
      while (out.size < max && flymdSpeechEvents.isNotEmpty()) {
        try {
          out.add(flymdSpeechEvents.removeFirst())
        } catch (_: Throwable) {
          break
        }
      }
    }
    return out.toTypedArray()
  }

  @androidx.annotation.Keep
  fun flymdSpeechGetActiveSessionId(): Int {
    return flymdSpeechActiveSessionId
  }
`)
  }

  // 兜底：如果文件里已有 v1/v2 folder picker，但未标记 @Keep，则补上，防止 release 混淆/裁剪导致 JNI 找不到方法
  if (hasFolderPicker || hasFlymdPickFolder) {
    ensureKeepNearFun('flymdPickFolder')
    // 仅在我们已打过 hook 时，才尝试给 onActivityResult 加 Keep（避免误改用户自定义方法）
    if (content.includes('flymd:saf-folder-picker-hook-v1')) ensureKeepNearFun('onActivityResult')
  }

  // 兜底：如果已有 mic permission，但未标记 @Keep，则补上（JNI 调用需要）
  if (hasMicPermission || /fun\s+flymdEnsureRecordAudioPermission\s*\(/.test(content)) {
    ensureKeepNearFun('flymdEnsureRecordAudioPermission')
    if (content.includes('flymd:mic-permission-hook-v1')) ensureKeepNearFun('onRequestPermissionsResult')
  }

  // 兜底：如果已有 SpeechRecognizer 补丁，但未标记 @Keep，则补上（JNI 调用需要）
  if (hasSpeechRecognizer || /fun\s+flymdSpeechStartListening\s*\(/.test(content)) {
    ensureKeepNearFun('flymdSpeechStartListening')
    ensureKeepNearFun('flymdSpeechStopListening')
    ensureKeepNearFun('flymdSpeechCancelListening')
    ensureKeepNearFun('flymdSpeechDrainEvents')
    ensureKeepNearFun('flymdSpeechGetActiveSessionId')
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

function patchProguardKeepRules(projectRoot) {
  try {
    const proguard = path.join(projectRoot, 'src-tauri', 'gen', 'android', 'app', 'proguard-rules.pro')
    if (!fs.existsSync(proguard)) {
      console.warn('[patch-android-immersive] 未找到 proguard-rules.pro（可能不启用混淆或模板变更），跳过 keep 规则注入')
      return false
    }
    const s = fs.readFileSync(proguard, 'utf8')
    const hasFolderKeep = s.includes('flymd:saf-folder-picker-keep-v1')
    const hasMicKeep = s.includes('flymd:mic-permission-keep-v1')
    const hasSpeechKeep = s.includes('flymd:speech-recognizer-keep-v1')
    if (hasFolderKeep && hasMicKeep && hasSpeechKeep) {
      console.log('[patch-android-immersive] Proguard keep 规则已存在，跳过')
      return true
    }

    let block = '\n'
    if (!hasFolderKeep) {
      block += `

# flymd:saf-folder-picker-keep-v1
# 说明：release 可能启用 R8/Proguard；flymdPickFolder 仅被 JNI 调用，容易被裁剪/改名导致运行时找不到方法。
-keepclassmembers class **.MainActivity {
    public java.lang.String flymdPickFolder(long);
}
`
    }
    if (!hasMicKeep) {
      block += `

# flymd:mic-permission-keep-v1
# 说明：flymdEnsureRecordAudioPermission 仅被 JNI 调用；若被裁剪/改名，会导致录音权限请求永远失败。
-keepclassmembers class **.MainActivity {
    public boolean flymdEnsureRecordAudioPermission(long);
}
`
    }
    if (!hasSpeechKeep) {
      block += `

# flymd:speech-recognizer-keep-v1
# 说明：SpeechRecognizer 联动仅被 JNI 调用；release 下若被裁剪/改名，会导致运行时找不到方法。
-keepclassmembers class **.MainActivity {
    public int flymdSpeechStartListening(long);
    public void flymdSpeechStopListening(int);
    public void flymdSpeechCancelListening(int);
    public java.lang.String[] flymdSpeechDrainEvents(int);
    public int flymdSpeechGetActiveSessionId();
}
`
    }

    fs.writeFileSync(proguard, s.trimEnd() + block + '\n', 'utf8')
    console.log(`[patch-android-immersive] 已写入 Proguard keep 规则: ${proguard}`)
    return true
  } catch (e) {
    console.warn(`[patch-android-immersive] 写入 Proguard keep 规则失败: ${e?.message || e}`)
    return false
  }
}

function main() {
  const root = process.cwd()
  const files = findMainActivityKotlin(root)
  if (!files.length) {
    console.warn('[patch-android-immersive] 未找到 MainActivity.kt（可能还没执行 tauri android init），跳过')
    // 即使没找到 MainActivity，也尝试补丁 Manifest 权限（可能模板路径变化）
    patchAndroidManifestPermissions(root)
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
    console.warn('[patch-android-immersive] 未能成功写入任何 MainActivity.kt（构建仍可继续，但相关 Android 补丁不会生效）')
  }

  // release 兜底：确保 JNI 调用的方法不会被 R8/Proguard 裁剪/改名
  patchProguardKeepRules(root)

  // 麦克风权限（录音）：注入 AndroidManifest uses-permission
  patchAndroidManifestPermissions(root)
}

main()
