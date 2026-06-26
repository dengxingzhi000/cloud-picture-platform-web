import api, { unwrap } from '@/api/client'
import type { ApiResponse } from '@/api/client'

export type AiChatRequest = {
  sessionId?: string
  message: string
  contextPictureIds?: string[]
}

export type AiChatResponse = {
  sessionId: string
  reply: string
  intent: string
  suggestedActions: string[]
}

export async function sendChatMessage(payload: AiChatRequest) {
  const response = await api.post<ApiResponse<AiChatResponse>>('/api/v1/ai/chat', {
    sessionId: payload.sessionId ?? 'default',
    message: payload.message,
    contextPictureIds: payload.contextPictureIds,
  })
  return unwrap(response.data)
}
