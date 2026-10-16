<script setup lang="ts">
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, MoreHorizontal, Pencil, Settings2, Trash2 } from '@lucide/vue'
import type { MySignalRow } from '@/entities/my-stuff/model/my-signal.types'

const props = withDefaults(defineProps<{
  rows: MySignalRow[]
  loading: boolean
  library: boolean
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
}>(), { sortKey: '', sortDirection: 'asc' })
const emit = defineEmits<{ preview: [row: MySignalRow]; edit: [row: MySignalRow]; copy: [row: MySignalRow]; delete: [row: MySignalRow]; sort: [key: string] }>()

interface HeaderColumn {
  key: string
  label: string
  align: 'left' | 'right'
  pad: string
  sortable: boolean
  width?: string
}

const headerColumns: HeaderColumn[] = [
  { key: 'name', label: 'Name', align: 'left', pad: 'px-4', sortable: true },
  { key: 'symbol', label: 'Symbol', align: 'left', pad: 'px-3', sortable: true },
  { key: 'timeframe', label: 'Timeframe', align: 'left', pad: 'px-3', sortable: true },
  { key: 'signal', label: 'Signal', align: 'left', pad: 'px-3', sortable: false },
  { key: 'lastSignalDate', label: 'Last signal', align: 'left', pad: 'px-3', sortable: true },
  { key: 'barsSinceSignal', label: 'Bars since signal', align: 'right', pad: 'px-3', sortable: true },
  { key: 'currentReturn', label: 'Return since signal', align: 'right', pad: 'px-3', sortable: true },
  { key: 'actions', label: 'Actions', align: 'right', pad: 'px-4', sortable: false, width: 'w-[164px]' },
]

function isSorted(key: string) {
  return props.sortKey === key
}

function sortIcon(key: string) {
  if (!isSorted(key)) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

function sortAria(key: string) {
  if (!headerColumns.some((column) => column.key === key && column.sortable)) return undefined
  if (!isSorted(key)) return 'none'
  return props.sortDirection === 'asc' ? 'ascending' : 'descending'
}

function returnClass(value: number | null) {
  if (value === null || value === 0) return 'text-[var(--app-text-muted)]'
  return value > 0 ? 'text-[var(--app-positive)]' : 'text-[var(--app-negative)]'
}

function formatReturn(value: number | null) {
  if (value === null) return '-'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[940px] border-collapse text-left text-[0.8125rem] text-[var(--app-text)]">
        <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th
              v-for="column in headerColumns"
              :key="column.key"
              scope="col"
              class="box-border py-2.5"
              :class="[column.pad, column.width, column.align === 'right' ? 'text-right' : 'text-left']"
              :aria-sort="sortAria(column.key)"
            >
              <button
                v-if="column.sortable"
                class="inline-flex w-full min-w-0 items-center gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                :class="[column.align === 'right' ? 'justify-end' : 'justify-start', isSorted(column.key) ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]']"
                type="button"
                @click="emit('sort', column.key)"
              >
                <span class="min-w-0">{{ column.label }}</span>
                <component :is="sortIcon(column.key)" :size="13" class="shrink-0" aria-hidden="true" />
              </button>
              <span v-else>{{ column.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="8" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">Loading signals...</td></tr>
          <tr v-else-if="!rows.length"><td colspan="8" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">No signals match the current filters.</td></tr>
          <tr v-for="row in rows" v-else :key="row.id" class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]">
            <td class="box-border px-4 py-2.5 font-extrabold text-[var(--app-text)]">{{ row.name }}</td>
            <td class="box-border px-3 py-2.5 text-[var(--app-text-secondary)]">{{ row.symbol }}</td>
            <td class="box-border px-3 py-2.5 text-[var(--app-text-secondary)]">{{ row.timeframe }}</td>
            <td class="box-border max-w-[310px] px-3 py-2.5 text-[var(--app-text-secondary)]"><span class="line-clamp-2" :title="row.description">{{ row.description }}</span></td>
            <td class="box-border whitespace-nowrap px-3 py-2.5 text-[var(--app-text-secondary)]">{{ row.lastSignalDate || 'Never' }}</td>
            <td class="box-border px-3 py-2.5 text-right tabular-nums text-[var(--app-text-secondary)]">{{ row.barsSinceSignal ?? '-' }}</td>
            <td class="box-border px-3 py-2.5 text-right tabular-nums" :class="returnClass(row.currentReturn)">{{ formatReturn(row.currentReturn) }}</td>
            <td class="box-border px-4 py-2.5">
              <div class="flex justify-end gap-1">
                <button class="signal-action" type="button" aria-label="Signal preview" title="Signal Preview" @click="emit('preview', row)"><Settings2 :size="16" /></button>
                <button v-if="!library" class="signal-action" type="button" aria-label="Edit signal" title="Edit" @click="emit('edit', row)"><Pencil :size="16" /></button>
                <button class="signal-action" type="button" aria-label="Copy signal" title="Copy" @click="emit('copy', row)"><Copy :size="16" /></button>
                <button v-if="!library" class="signal-action signal-action--danger" type="button" aria-label="Delete signal" title="Delete" @click="emit('delete', row)"><Trash2 :size="16" /></button>
                <button v-else class="signal-action" type="button" aria-label="More actions" title="More"><MoreHorizontal :size="16" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.signal-action { display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 6px; color: var(--app-text-muted); }
.signal-action:hover { background: var(--app-primary-soft); color: var(--app-primary); }
.signal-action--danger:hover { color: var(--app-negative); }
</style>
