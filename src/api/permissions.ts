import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type PermissionItem = {
  id: string
  name: string
  description: string | null
  resource: string
  action: string
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export type PermissionCreateRequest = {
  name: string
  description?: string
  resource: string
  action: string
}

export type PermissionUpdateRequest = {
  name?: string
  description?: string
  resource?: string
  action?: string
}

export async function listPermissions(page = 0, size = 20, resource?: string) {
  const params: Record<string, string | number> = { page, size }
  if (resource) params.resource = resource
  const response = await api.get<ApiResponse<PageResponse<PermissionItem>>>('/api/v1/admin/permissions', { params })
  return unwrap(response.data)
}

export async function getPermission(id: string) {
  const response = await api.get<ApiResponse<PermissionItem>>(`/api/v1/admin/permissions/${id}`)
  return unwrap(response.data)
}

export async function createPermission(data: PermissionCreateRequest) {
  const response = await api.post<ApiResponse<PermissionItem>>('/api/v1/admin/permissions', data)
  return unwrap(response.data)
}

export async function updatePermission(id: string, data: PermissionUpdateRequest) {
  const response = await api.put<ApiResponse<PermissionItem>>(`/api/v1/admin/permissions/${id}`, data)
  return unwrap(response.data)
}

export async function deletePermission(id: string) {
  const response = await api.delete<ApiResponse<void>>(`/api/v1/admin/permissions/${id}`)
  unwrap(response.data)
}
