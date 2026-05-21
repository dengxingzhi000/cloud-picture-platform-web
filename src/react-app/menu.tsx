import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'

export type MenuItem = {
  id: string
  name: string
  code: string
  path: string | null
  icon: string | null
  sortOrder: number
  children?: MenuItem[]
}

type MenuContextValue = {
  menus: MenuItem[]
  setMenus: (menus: MenuItem[]) => void
  flattenMenuPaths: (items?: MenuItem[]) => string[]
}

const MenuContext = createContext<MenuContextValue | null>(null)

export function MenuProvider({ children }: PropsWithChildren) {
  const [menus, setMenus] = useState<MenuItem[]>([])

  const flattenMenuPaths = (items?: MenuItem[]): string[] => {
    const result: string[] = []
    const traverse = (list: MenuItem[]) => {
      for (const item of list) {
        if (item.path) result.push(item.path)
        if (item.children?.length) traverse(item.children)
      }
    }
    traverse(items ?? menus)
    return result
  }

  const value = useMemo<MenuContextValue>(
    () => ({ menus, setMenus, flattenMenuPaths }),
    [menus]
  )

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

export function useMenu() {
  const context = useContext(MenuContext)
  if (!context) {
    throw new Error('useMenu must be used inside MenuProvider')
  }
  return context
}
