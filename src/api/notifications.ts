import client from './client';

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  targetId: string | null;
  read: boolean;
  createdAt: string;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export async function getNotifications(page = 0, size = 50) {
  const res = await client.get<PageResponse<NotificationItem>>('/api/notifications', {
    params: { page, size },
  });
  return res.data;
}

export async function getUnreadCount() {
  const res = await client.get<{ count: number }>('/api/notifications/unread-count');
  return res.data.count;
}

export async function markNotificationRead(id: string) {
  await client.patch(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await client.patch('/api/notifications/read-all');
}
