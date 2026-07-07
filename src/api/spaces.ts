import api, { unwrap } from '@/api/client'
import type { ApiResponse } from '@/api/client'

export type SpaceUsage = {
  spaceId: string
  usedBytes: number
  quotaBytes: number
  fileCount: number
}

export async function getSpaceUsage(spaceId: string) {
  const response = await api.get<ApiResponse<SpaceUsage>>(`/api/v1/spaces/${spaceId}/usage`)
  return unwrap(response.data)
}
