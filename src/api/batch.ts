import api, { unwrap } from '@/api/client'
import type { ApiResponse } from '@/api/client'

export async function batchDelete(pictureIds: string[]) {
  const response = await api.post<ApiResponse<void>>('/api/v1/pictures/batch/delete', { pictureIds })
  return unwrap(response.data)
}

export async function batchUpdateVisibility(pictureIds: string[], visibility: 'PUBLIC' | 'PRIVATE' | 'TEAM') {
  const response = await api.post<ApiResponse<void>>('/api/v1/pictures/batch/visibility', { pictureIds, visibility })
  return unwrap(response.data)
}

export async function batchAddTags(pictureIds: string[], tagIds: string[]) {
  const response = await api.post<ApiResponse<void>>('/api/v1/pictures/batch/tag', { pictureIds, tagIds })
  return unwrap(response.data)
}

export async function batchMoveToAlbum(pictureIds: string[], albumId: string) {
  const response = await api.post<ApiResponse<void>>('/api/v1/pictures/batch/move', { pictureIds, albumId })
  return unwrap(response.data)
}