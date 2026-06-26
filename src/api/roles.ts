import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type RoleItem = {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export type RoleCreateRequest = {
  name: string
  description?: string
}

export type RoleUpdateRequest = {
  name?: string
  description?: string
}

export async function listRoles(page = 0, size = 20) {
  const response = await api.get<ApiResponse<PageResponse<RoleItem>>>('/api/v1/admin/roles', {
    params: { page, size },
  })
  return unwrap(response.data)
}

export async function getRole(id: string) {
  const response = await api.get<ApiResponse<RoleItem>>(`/api/v1/admin/roles/${id}`)
  return unwrap(response.data)
}

export async function createRole(data: RoleCreateRequest) {
  const response = await api.post<ApiResponse<RoleItem>>('/api/v1/admin/roles', data)
  return unwrap(response.data)
}

export async function updateRole(id: string, data: RoleUpdateRequest) {
  const response = await api.put<ApiResponse<RoleItem>>(`/api/v1/admin/roles/${id}`, data)
  return unwrap(response.data)
}

export async function deleteRole(id: string) {
  const response = await api.delete<ApiResponse<void>>(`/api/v1/admin/roles/${id}`)
  unwrap(response.data)
}

export async function getRolePermissions(id: string) {
  const response = await api.get<ApiResponse<string[]>>(`/api/v1/admin/roles/${id}/permissions`)
  return unwrap(response.data)
}

export async function updateRolePermissions(id: string, permissionIds: string[]) {
  const response = await api.put<ApiResponse<void>>(`/api/v1/admin/roles/${id}/permissions`, { permissionIds })
  unwrap(response.data)
}
