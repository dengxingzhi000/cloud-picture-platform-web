import api, { unwrap } from '@/api/client'
import type { ApiResponse } from '@/api/client'

export type UserRoleItem = {
  userId: string
  roleId: string
  roleName: string
  roleDescription: string | null
  assignedAt: string
}

export async function getUserRoles(userId: string) {
  const response = await api.get<ApiResponse<UserRoleItem[]>>(`/api/v1/admin/users/${userId}/roles`)
  return unwrap(response.data)
}

export async function assignUserRole(userId: string, roleId: string) {
  const response = await api.post<ApiResponse<UserRoleItem>>(`/api/v1/admin/users/${userId}/roles`, { roleId })
  return unwrap(response.data)
}

export async function removeUserRole(userId: string, roleId: string) {
  const response = await api.delete<ApiResponse<void>>(`/api/v1/admin/users/${userId}/roles/${roleId}`)
  unwrap(response.data)
}

export async function updateUserRoles(userId: string, roleIds: string[]) {
  const response = await api.put<ApiResponse<void>>(`/api/v1/admin/users/${userId}/roles`, { roleIds })
  unwrap(response.data)
}
