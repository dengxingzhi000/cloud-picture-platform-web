import type { ReactNode } from 'react'
import { usePermission } from '@/react-app/permission'

type PermissionProps = {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

export function Permission({ permission, children, fallback = null }: PermissionProps) {
  const { hasPermission } = usePermission()

  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
