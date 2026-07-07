import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type SemanticResult = {
  id: string
  name: string
  url: string
  thumbnailUrl?: string
  score: number
  ownerUsername: string
  visibility: string
}

export async function semanticSearch(params: { query: string; page?: number; size?: number }) {
  const response = await api.get<ApiResponse<PageResponse<SemanticResult>>>('/api/v1/search/semantic', { params })
  return unwrap(response.data)
}