import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type PictureVersion = {
  id: string
  pictureId: string
  version: number
  name: string
  url: string
  thumbnailUrl?: string
  snapshotData?: string
  createdAt: string
  createdBy: string
}

export async function listVersions(
  pictureId: string,
  params?: { page?: number; size?: number }
) {
  const response = await api.get<ApiResponse<PageResponse<PictureVersion>>>(
    `/api/v1/pictures/${pictureId}/versions`,
    { params }
  )
  return unwrap(response.data)
}

export async function getVersion(pictureId: string, version: number) {
  const response = await api.get<ApiResponse<PictureVersion>>(
    `/api/v1/pictures/${pictureId}/versions/${version}`
  )
  return unwrap(response.data)
}

export async function createVersion(
  pictureId: string,
  payload?: { snapshotData?: string }
) {
  const response = await api.post<ApiResponse<PictureVersion>>(
    `/api/v1/pictures/${pictureId}/versions`,
    payload
  )
  return unwrap(response.data)
}
