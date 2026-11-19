import { onMounted, onUnmounted, ref } from 'vue'
import { fetchUnreadNotificationCount } from '@/entities/notification/api/notification.api'

export function useNotificationCount() {
  const count = ref(0)
  let wasMarkedRead = false
  const markRead = () => { wasMarkedRead = true; count.value = 0 }

  onMounted(() => {
    window.addEventListener('notifications:read', markRead)
    void fetchUnreadNotificationCount().then((value) => { if (!wasMarkedRead) count.value = value }).catch(() => {})
  })
  onUnmounted(() => window.removeEventListener('notifications:read', markRead))
  return count
}
