import axios from 'axios'

export interface NotificationItem {
  id: string
  message: string
  broadcastType: string
  createdDate: string
  dateStamp: string
  url: string
}

type RawNotification = Record<string, unknown>

function value(input: unknown) {
  return input == null ? '' : String(input)
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const { data } = await axios.get<unknown>('/dev/st_data/notifications/?all=true', { withCredentials: true })
  const rows = Array.isArray(data) ? data :
    data && typeof data === 'object' && Array.isArray((data as RawNotification).results)
      ? (data as RawNotification).results as unknown[] : []
  return rows.filter((row): row is RawNotification => Boolean(row && typeof row === 'object')).map((row, index) => ({
    id: value(row.id || index),
    message: value(row.message),
    broadcastType: value(row.broadcast_type),
    createdDate: value(row.created_date),
    dateStamp: value(row.ds),
    url: value(row.url),
  }))
}

export async function markAllNotificationsRead() {
  await axios.put('/dev/st_data/notifications/mark-all-read/', undefined, { withCredentials: true })
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data } = await axios.get<unknown>('/dev/st_data/notifications/count/', { withCredentials: true })
  if (typeof data === 'number') return data
  if (data && typeof data === 'object') {
    const record = data as RawNotification
    const count = Number(record.count ?? record.unread_count ?? record.unread ?? 0)
    return Number.isFinite(count) ? count : 0
  }
  return 0
}
