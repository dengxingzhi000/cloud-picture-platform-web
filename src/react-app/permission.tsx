import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'

type PermissionContextValue = {
  permissions: string[]
  setPermissions: (permissions: string[]) => void
  hasPermission: (code: string) => boolean
}

const PermissionContext = createContext<PermissionContextValue | null>(null)

export function PermissionProvider({ children }: PropsWithChildren) {
  const [permissions, setPermissions] = useState<string[]>([])

  const hasPermission = (code: string) => permissions.includes(code)

  const value = useMemo<PermissionContextValue>(
    () => ({ permissions, setPermissions, hasPermission }),
    [permissions]
  )

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

export function usePermission() {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermission must be used inside PermissionProvider')
  }
  return context
}
