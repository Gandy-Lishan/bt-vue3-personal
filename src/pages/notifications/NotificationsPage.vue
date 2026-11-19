<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown } from '@lucide/vue'
import { fetchNotifications, markAllNotificationsRead, type NotificationItem } from '@/entities/notification/api/notification.api'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'

type SortColumn = 'message' | 'broadcastType' | 'createdDate'
type SortDirection = 'asc' | 'desc'

const items = ref<NotificationItem[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const pageSize = ref(10)
const currentPage = ref(1)
const sortColumn = ref<SortColumn | ''>('')
const sortDirection = ref<SortDirection>('asc')
const pageSizes = [10, 20, 30, 50]

const filteredItems = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  const result = items.value.filter((item) => !keyword || [
    item.message, item.broadcastType, item.createdDate,
  ].some((field) => field.toLowerCase().includes(keyword)))
  if (sortColumn.value) {
    const key = sortColumn.value
    result.sort((a, b) => {
      const left = key === 'createdDate' ? a.dateStamp || a.createdDate : a[key]
      const right = key === 'createdDate' ? b.dateStamp || b.createdDate : b[key]
      return left.localeCompare(right, undefined, { numeric: true }) * (sortDirection.value === 'asc' ? 1 : -1)
    })
  }
  return result
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize.value)))
const visibleItems = computed(() => filteredItems.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))

function changeSort(column: SortColumn) {
  if (sortColumn.value === column) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
  currentPage.value = 1
}

function sortIcon(column: SortColumn) {
  if (sortColumn.value !== column) return ArrowUpDown
  return sortDirection.value === 'asc' ? ArrowUp : ArrowDown
}

function sortAria(column: SortColumn) {
  if (sortColumn.value !== column) return 'none'
  return sortDirection.value === 'asc' ? 'ascending' : 'descending'
}

function safeUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : ''
  } catch {
    return ''
  }
}

function formatPosted(item: NotificationItem) {
  const raw = item.dateStamp || item.createdDate
  if (!raw) return ''
  // The legacy ds field is a Chicago wall-clock value without a timezone.
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)
  const parsed = new Date(hasTimezone ? raw : raw.replace(' ', 'T') + 'Z')
  if (Number.isNaN(parsed.getTime())) return item.createdDate || raw
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: item.dateStamp && !hasTimezone ? 'UTC' : 'America/Chicago',
    month: '2-digit', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
  const label = formatter.format(parsed)
  if (!item.dateStamp || hasTimezone) return label
  const centralName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', timeZoneName: 'short',
  }).formatToParts(parsed).find((part) => part.type === 'timeZoneName')?.value || 'CT'
  return `${label} ${centralName}`
}

async function load() {
  loading.value = true
  error.value = ''
  const [list, markRead] = await Promise.allSettled([fetchNotifications(), markAllNotificationsRead()])
  if (list.status === 'fulfilled') items.value = list.value
  else error.value = 'Could not load notifications. Please try again.'
  if (markRead.status === 'fulfilled') window.dispatchEvent(new Event('notifications:read'))
  loading.value = false
}

onMounted(() => void load())
</script>

<template>
  <main class="notifications-page">
    <h1>Notifications</h1>
    <div class="notifications-controls">
      <label>Show
        <select v-model.number="pageSize" @change="currentPage = 1">
          <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
        </select>
        entries
      </label>
      <input v-model="search" type="search" placeholder="Search" aria-label="Search notifications" @input="currentPage = 1" />
    </div>

    <div v-if="error" class="notifications-error" role="alert">{{ error }} <button type="button" @click="load">Retry</button></div>
    <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse text-left text-[0.8125rem] text-[var(--app-text)]">
          <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
            <tr class="border-b border-[var(--app-border)]">
              <th
                v-for="column in ([
                  { key: 'message', label: 'Message' },
                  { key: 'broadcastType', label: 'Type' },
                  { key: 'createdDate', label: 'Posted' },
                ] as const)"
                :key="column.key"
                scope="col"
                class="box-border px-3 py-2.5 text-left"
                :class="column.key === 'message' ? 'min-w-[300px]' : 'min-w-[120px]'"
                :aria-sort="sortAria(column.key)"
              >
                <button
                  type="button"
                  class="inline-flex w-full items-center justify-start gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                  :class="sortColumn === column.key ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]'"
                  :aria-label="`Sort by ${column.label} ${sortColumn === column.key && sortDirection === 'asc' ? 'descending' : 'ascending'}`"
                  @click="changeSort(column.key)"
                >
                  <span>{{ column.label }}</span>
                  <component :is="sortIcon(column.key)" :size="13" aria-hidden="true" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="3" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">Loading notifications...</td></tr>
            <tr v-else-if="!visibleItems.length"><td colspan="3" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">No notifications found.</td></tr>
            <template v-else>
              <tr
                v-for="item in visibleItems"
                :key="item.id"
                class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
              >
                <td class="box-border px-3 py-2.5 text-left">{{ item.message }} <a v-if="safeUrl(item.url)" :href="safeUrl(item.url)" target="_blank" rel="noopener noreferrer" class="font-semibold text-[var(--app-primary)] hover:underline">Read more</a></td>
                <td class="box-border px-3 py-2.5 text-left">{{ item.broadcastType }}</td>
                <td class="box-border px-3 py-2.5 text-left">{{ formatPosted(item) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
    <div class="mt-4">
      <IndicatorPagination :page="currentPage" :page-count="pageCount" :total="filteredItems.length" item-label="notifications" @change="currentPage = $event" />
    </div>
  </main>
</template>

<style scoped>
.notifications-page { padding: 3rem var(--page-gutter) 6rem; color: var(--app-text); }
h1 { margin: 0 0 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--app-border); color: var(--app-text-secondary); font-size: 1.6rem; }
.notifications-controls { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
.notifications-controls label { display: flex; align-items: center; gap: .5rem; }
select, input { border: 1px solid var(--app-border); border-radius: .35rem; padding: .45rem .65rem; color: var(--app-text); background: var(--app-surface); }
input { width: min(250px, 100%); }
.notifications-error { margin-bottom: 1rem; color: var(--app-negative); }
.notifications-error button { text-decoration: underline; }
</style>
