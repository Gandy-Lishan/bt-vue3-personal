<script setup lang="ts">
import { Copy, Pencil, Settings2, Trash2 } from '@lucide/vue'
import type { MySignalRow } from '@/entities/my-stuff/model/my-signal.types'
import MySignalHeaderCell from './MySignalHeaderCell.vue'
import { mySignalHeaderColumns } from './my-signal-table.columns'

withDefaults(defineProps<{
  rows: MySignalRow[]
  loading: boolean
  library: boolean
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
}>(), { sortKey: '', sortDirection: 'asc' })
const emit = defineEmits<{ preview: [row: MySignalRow]; edit: [row: MySignalRow]; copy: [row: MySignalRow]; delete: [row: MySignalRow]; sort: [key: string] }>()

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
            <MySignalHeaderCell v-for="column in mySignalHeaderColumns" :key="column.key" :column="column" :sort-key="sortKey" :sort-direction="sortDirection" @sort="emit('sort', $event)" />
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
                <button v-if="library" class="signal-action" type="button" aria-label="Copy signal" title="Copy" @click="emit('copy', row)"><Copy :size="16" /></button>
                <button v-if="!library" class="signal-action signal-action--danger" type="button" aria-label="Delete signal" title="Delete" @click="emit('delete', row)"><Trash2 :size="16" /></button>
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
