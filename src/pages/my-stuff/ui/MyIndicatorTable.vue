<script setup lang="ts">
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Settings2, Trash2 } from '@lucide/vue'
import type { MyIndicatorRow } from '@/entities/my-stuff/api/user-indicator.api'

const props = withDefaults(defineProps<{ rows: MyIndicatorRow[]; loading: boolean; sortKey?: string; sortDirection?: 'asc' | 'desc' }>(), { sortKey: '', sortDirection: 'asc' })
const emit = defineEmits<{ sort: [key: string]; preview: [row: MyIndicatorRow] }>()
const columns = [
  { key: 'name', label: 'Name', sortable: true }, { key: 'category', label: 'Categories', sortable: true },
  { key: 'timeframe', label: 'Timeframe', sortable: true }, { key: 'included', label: 'Indicators included', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false },
]
function sortIcon(key: string) { return props.sortKey !== key ? ArrowUpDown : props.sortDirection === 'asc' ? ArrowUp : ArrowDown }
function compactTransform(value: string) {
  return value.replace('Simple Moving Average', 'SMA').replace('Exponential Moving Average', 'EMA').replace('Rate of Change', 'ROC').replace('Symbol ', '')
}
function componentSummary(item: MyIndicatorRow['included'][number]) { return [item.name, compactTransform(item.transform)].filter(Boolean).join(' · ') + (item.weight ? ` × ${item.weight}` : '') }
function relationshipSymbol(row: MyIndicatorRow) { return row.relationship === '−' ? '−' : row.relationship === '÷' ? '÷' : row.relationship === '+' || row.relationship === 'Weighted sum' ? '＋' : '' }
function includedSummary(row: MyIndicatorRow) { return row.included.map(componentSummary).join(` ${relationshipSymbol(row)} `) }
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]"><div class="overflow-x-auto">
    <table class="w-full min-w-[820px] border-collapse text-left text-[0.8125rem] text-[var(--app-text)]">
      <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold"><tr class="border-b border-[var(--app-border)]">
        <th v-for="column in columns" :key="column.key" class="box-border px-4 py-2.5" :class="column.key === 'actions' ? 'w-[140px] text-right' : 'text-left'">
          <button v-if="column.sortable" class="inline-flex w-full items-center gap-1 font-semibold hover:text-[var(--app-primary)]" :class="props.sortKey === column.key ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]'" type="button" @click="emit('sort', column.key)">{{ column.label }}<component :is="sortIcon(column.key)" :size="13" /></button><span v-else>{{ column.label }}</span>
        </th>
      </tr></thead>
      <tbody>
        <tr v-if="loading"><td colspan="5" class="h-64 px-4 text-center text-sm text-[var(--app-text-muted)]">Loading indicators...</td></tr>
        <tr v-else-if="!rows.length"><td colspan="5" class="h-64 px-4 text-center text-sm text-[var(--app-text-muted)]">No indicators match the current filters.</td></tr>
        <tr v-for="row in rows" v-else :key="row.id" class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]">
          <td class="px-4 py-2.5 font-extrabold">{{ row.name }}</td>
          <td class="px-4 py-2.5 text-[var(--app-text-secondary)]">{{ row.category }}</td><td class="px-4 py-2.5 text-[var(--app-text-secondary)]">{{ row.timeframe }}</td>
          <td class="min-w-[360px] px-4 py-2.5">
            <p v-if="row.included.length" class="included-summary" :title="includedSummary(row)"><template v-for="(item, index) in row.included" :key="`${item.url}-${index}`"><span v-if="index" class="included-relationship">{{ relationshipSymbol(row) }}</span><span class="included-name">{{ item.name }}</span><span v-if="item.transform"> · {{ compactTransform(item.transform) }}</span><span v-if="item.weight"> × {{ item.weight }}</span></template></p>
            <span v-else class="text-[var(--app-text-muted)]">-</span>
          </td>
          <td class="px-4 py-2.5"><div class="flex justify-end gap-1"><button class="indicator-action" type="button" title="Indicator Preview" aria-label="Indicator preview" @click="emit('preview', row)"><Settings2 :size="16" /></button><button class="indicator-action" type="button" title="Edit (coming next)" disabled><Pencil :size="16" /></button><button class="indicator-action indicator-action--danger" type="button" title="Delete (coming next)" disabled><Trash2 :size="16" /></button></div></td>
        </tr>
      </tbody>
    </table>
  </div></div>
</template>

<style scoped>
.indicator-action { display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 6px; color: var(--app-text-muted); }
.indicator-action:hover { background: var(--app-primary-soft); color: var(--app-primary); }
.indicator-action--danger:hover { color: var(--app-negative); }
.indicator-action:disabled { cursor: not-allowed; opacity: .45; }
.included-summary { display: -webkit-box; overflow: hidden; color: var(--app-text-secondary); line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.included-name { color: var(--app-text); font-weight: 400; }
.included-relationship { display: inline-flex; width: 24px; height: 24px; margin: 0 7px; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--app-primary) 30%, var(--app-border)); border-radius: 9999px; background: var(--app-primary-soft); color: var(--app-primary); font-size: 13px; font-weight: 800; line-height: 1; vertical-align: middle; }
</style>
