<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, CircleHelp } from '@lucide/vue'
import type { MySignalHeaderColumn } from './my-signal-table.columns'

const props = withDefaults(defineProps<{
  column: MySignalHeaderColumn
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  sortable?: boolean
}>(), { sortKey: '', sortDirection: 'asc' })
const emit = defineEmits<{ sort: [key: MySignalHeaderColumn['key']] }>()
const canSort = computed(() => props.sortable ?? props.column.sortable)
const isSorted = computed(() => canSort.value && props.sortKey === props.column.key)
const sortIcon = computed(() => !isSorted.value ? ArrowUpDown : props.sortDirection === 'asc' ? ArrowUp : ArrowDown)
const sortAria = computed(() => !canSort.value ? undefined : !isSorted.value ? 'none' : props.sortDirection === 'asc' ? 'ascending' : 'descending')
const tooltipVisible = ref(false)
const tooltipPosition = ref({ left: 0, top: 0 })
function showTooltip(event: MouseEvent | FocusEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  tooltipPosition.value = { left: Math.min(Math.max(rect.left + rect.width / 2, 160), window.innerWidth - 160), top: rect.top - 8 }
  tooltipVisible.value = true
}
function hideTooltip() { tooltipVisible.value = false }
</script>

<template>
  <th scope="col" class="box-border py-2.5" :class="[column.pad, column.width, column.align === 'right' ? 'text-right' : 'text-left']" :aria-sort="sortAria">
    <span class="inline-flex items-center gap-1.5" :class="column.align === 'right' ? 'justify-end' : 'justify-start'">
      <button v-if="canSort" class="inline-flex min-w-0 items-center gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]" :class="isSorted ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]'" type="button" @click="emit('sort', column.key)">
        <span class="min-w-0">{{ column.label }}</span>
        <component :is="sortIcon" :size="13" class="shrink-0" aria-hidden="true" />
      </button>
      <span v-else>{{ column.label }}</span>
      <span v-if="column.tooltip" class="inline-flex shrink-0 cursor-help text-[var(--app-text-muted)]" tabindex="0" :aria-label="column.tooltip" @mouseenter="showTooltip" @mouseleave="hideTooltip" @focus="showTooltip" @blur="hideTooltip" @keydown.esc="hideTooltip"><CircleHelp :size="14" aria-hidden="true" /></span>
    </span>
  </th>
  <Teleport to="body"><div v-if="tooltipVisible && column.tooltip" class="signal-header-tooltip" role="tooltip" :style="{ left: `${tooltipPosition.left}px`, top: `${tooltipPosition.top}px` }">{{ column.tooltip }}</div></Teleport>
</template>

<style scoped>
.signal-header-tooltip { position: fixed; z-index: 1000; width: max-content; max-width: min(300px, 90vw); transform: translate(-50%, -100%); border-radius: 6px; background: #1e293b; padding: 8px 10px; color: white; font-size: 12px; font-weight: 400; line-height: 1.4; text-align: left; white-space: normal; box-shadow: 0 6px 18px rgb(0 0 0 / .2); pointer-events: none; }
</style>
