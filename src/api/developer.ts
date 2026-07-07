import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type ApiKey = {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
}

export async function listApiKeys() {
  const response = await api.get<ApiResponse<PageResponse<ApiKey>>>('/api/v1/developer/keys')
  return unwrap(response.data)
}

export async function createApiKey(payload: { name: string; expiresInDays?: number }) {
  const response = await api.post<ApiResponse<ApiKey & { fullKey: string }>>('/api/v1/developer/keys', payload)
  return unwrap(response.data)
}

export async function deleteApiKey(keyId: string) {
  const response = await api.delete<ApiResponse<void>>(`/api/v1/developer/keys/${keyId}`)
  return unwrap(response.data)
}