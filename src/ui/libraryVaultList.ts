// 库侧栏“库列表”渲染：用于快速切换多个库（不替代顶部库切换菜单）

import type { Library } from '../utils/library'

export type LibraryVaultListDeps = {
  getLibraries(): Promise<Library[]>
  getActiveLibraryId(): Promise<string | null>
  setActiveLibraryId(id: string): Promise<void>
  onAfterSwitch(): Promise<void>
}

export function initLibraryVaultList(container: HTMLElement, deps: LibraryVaultListDeps): { refresh(): Promise<void> } {
  async function refresh(): Promise<void> {
    try {
      const libs = await deps.getLibraries()
      const activeId = await deps.getActiveLibraryId()
      const visible = libs.filter(l => l.sidebarVisible !== false)

      if (visible.length <= 1) {
        container.innerHTML = ''
        container.classList.add('hidden')
        return
      }
      container.classList.remove('hidden')
      container.innerHTML = ''

      for (const lib of visible) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'lib-vault-item' + (lib.id === activeId ? ' active' : '')
        btn.textContent = lib.name || lib.id
        btn.title = lib.root
        btn.addEventListener('click', async () => {
          try {
            if (lib.id === activeId) return
            await deps.setActiveLibraryId(lib.id)
            await deps.onAfterSwitch()
          } catch {}
        })
        container.appendChild(btn)
      }
    } catch {
      // 不让 UI 因为配置读取失败就炸掉
      try {
        container.innerHTML = ''
        container.classList.add('hidden')
      } catch {}
    }
  }

  // 初次渲染
  void refresh()
  return { refresh }
}

