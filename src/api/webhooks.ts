import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type Webhook = {
  id: string
  url: string
  events: string[]
  secret?: string
  active: boolean
  createdAt: string
  lastTriggeredAt?: string
}

export type WebhookDelivery = {
  id: string
  event: string
  status: 'SUCCESS' | 'FAILED'
  statusCode?: number
  createdAt: string
}

export async function listWebhooks() {
  const response = await api.get<ApiResponse<PageResponse<Webhook>>>('/api/v1/webhooks')
  return unwrap(response.data)
}

export async function createWebhook(payload: { url: string; events: string[] }) {
  const response = await api.post<ApiResponse<Webhook>>('/api/v1/webhooks', payload)
  return unwrap(response.data)
}

export async function deleteWebhook(webhookId: string) {
  const response = await api.delete<ApiResponse<void>>(`/api/v1/webhooks/${webhookId}`)
  return unwrap(response.data)
}

export async function testWebhook(webhookId: string) {
  const response = await api.post<ApiResponse<void>>(`/api/v1/webhooks/${webhookId}/test`)
  return unwrap(response.data)
}

export async function listDeliveries(webhookId: string) {
  const response = await api.get<ApiResponse<PageResponse<WebhookDelivery>>>(`/api/v1/webhooks/${webhookId}/deliveries`)
  return unwrap(response.data)
}
