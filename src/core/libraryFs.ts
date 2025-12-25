// 文档库文件系统扫描逻辑（与 UI 解耦，只关心路径和类型）

import { readDir, stat } from '@tauri-apps/plugin-fs'
import { persistSafUriPermission, safListDir } from '../platform/androidSaf'

export type LibEntry = { name: string; path: string; isDir: boolean }

function isContentUriPath(p: string): boolean {
  return typeof p === 'string' && p.startsWith('content://')
}

// 支持的文档后缀判断（库侧栏）
// 允许：md / markdown / txt / pdf
export function isSupportedDoc(name: string): boolean {
  return /\.(md|markdown|txt|pdf)$/i.test(name)
}

// 目录递归包含受支持文档的缓存
const libHasDocCache = new Map<string, boolean>()
const libHasDocPending = new Map<string, Promise<boolean>>()

async function dirHasSupportedDocRecursive(
  dir: string,
  depth = 20,
): Promise<boolean> {
  try {
    if (libHasDocCache.has(dir)) return libHasDocCache.get(dir) as boolean
    if (libHasDocPending.has(dir)) {
      return await (libHasDocPending.get(dir) as Promise<boolean>)
    }

    const p = (async (): Promise<boolean> => {
      if (depth <= 0) {
        libHasDocCache.set(dir, false)
        return false
      }

      // SAF：content:// 目录递归扫描（只看扩展名，避免打开大文件）
      if (isContentUriPath(dir)) {
        let entries: any[] = []
        try { await persistSafUriPermission(dir) } catch {}
        try { entries = (await safListDir(dir)) as any[] } catch { entries = [] }
        for (const it of entries || []) {
          const full = String((it as any)?.path || '').trim()
          const name = String((it as any)?.name || '').trim()
          const isDir = !!(it as any)?.isDir
          if (!full) continue
          if (!isDir && isSupportedDoc(name || full)) {
            libHasDocCache.set(dir, true)
            return true
          }
        }
        for (const it of entries || []) {
          const full = String((it as any)?.path || '').trim()
          const isDir = !!(it as any)?.isDir
          if (!full) continue
          if (isDir) {
            const ok = await dirHasSupportedDocRecursive(full, depth - 1)
            if (ok) {
              libHasDocCache.set(dir, true)
              return true
            }
          }
        }
        libHasDocCache.set(dir, false)
        return false
      }

      let entries: any[] = []
      try {
        entries = (await readDir(dir, { recursive: false } as any)) as any[]
      } catch {
        entries = []
      }
      for (const it of entries || []) {
        const full: string =
          typeof it?.path === 'string'
            ? it.path
            : dir +
              (dir.includes('\\') ? '\\' : '/') +
              (it?.name || '')
        const name = (it?.name || full.split(/[\\/]+/).pop() || '') as string
        try {
          const s = await stat(full)
          const isDir = !!(s as any)?.isDirectory
          if (!isDir && isSupportedDoc(name)) {
            libHasDocCache.set(dir, true)
            return true
          }
        } catch {}
      }
      for (const it of entries || []) {
        const full: string =
          typeof it?.path === 'string'
            ? it.path
            : dir +
              (dir.includes('\\') ? '\\' : '/') +
              (it?.name || '')
        try {
          const s = await stat(full)
          const isDir = !!(s as any)?.isDirectory
          if (isDir) {
            const ok = await dirHasSupportedDocRecursive(full, depth - 1)
            if (ok) {
              libHasDocCache.set(dir, true)
              return true
            }
          }
        } catch {}
      }
      libHasDocCache.set(dir, false)
      return false
    })()
    libHasDocPending.set(dir, p)
    const r = await p
    libHasDocPending.delete(dir)
    return r
  } catch {
    return false
  }
}

// 单层列出目录：只返回「包含支持文档的子目录」和「当前目录下的支持文档」
export async function listDirOnce(dir: string): Promise<LibEntry[]> {
  try {
    // SAF：content:// 目录
    if (isContentUriPath(dir)) {
      try { await persistSafUriPermission(dir) } catch {}
      let entries: any[] = []
      try { entries = (await safListDir(dir)) as any[] } catch { entries = [] }
      const files: LibEntry[] = []
      const dirCandidates: LibEntry[] = []
      for (const it of (entries || [])) {
        const p = String((it as any)?.path || '').trim()
        const name = String((it as any)?.name || '').trim()
        if (!p) continue
        const isDir = !!(it as any)?.isDir
        if (isDir) {
          dirCandidates.push({ name: name || p, path: p, isDir: true })
        } else if (isSupportedDoc(name || p)) {
          files.push({ name: name || p, path: p, isDir: false })
        }
      }
      const keptDirs: LibEntry[] = []
      for (const d of dirCandidates) {
        if (await dirHasSupportedDocRecursive(d.path)) keptDirs.push(d)
      }
      keptDirs.sort((a, b) => a.name.localeCompare(b.name))
      files.sort((a, b) => a.name.localeCompare(b.name))
      return [...keptDirs, ...files]
    }

    const entries = await readDir(dir, { recursive: false } as any)
    const files: LibEntry[] = []
    const dirCandidates: LibEntry[] = []
    for (const it of ((entries as any[]) || [])) {
      const p: string =
        typeof it?.path === 'string'
          ? it.path
          : dir +
            (dir.includes('\\') ? '\\' : '/') +
            (it?.name || '')
      try {
        const s = await stat(p)
        const isDir = !!(s as any)?.isDirectory
        const name = (it?.name || p.split(/[\\/]+/).pop() || '') as string
        if (isDir) {
          dirCandidates.push({ name, path: p, isDir: true })
        } else if (isSupportedDoc(name)) {
          files.push({ name, path: p, isDir: false })
        }
      } catch {}
    }
    const keptDirs: LibEntry[] = []
    for (const d of dirCandidates) {
      if (await dirHasSupportedDocRecursive(d.path)) keptDirs.push(d)
    }
    keptDirs.sort((a, b) => a.name.localeCompare(b.name))
    files.sort((a, b) => a.name.localeCompare(b.name))
    return [...keptDirs, ...files]
  } catch {
    // 这里不做 UI 报错，由调用方决定是否提示
    return []
  }
}
