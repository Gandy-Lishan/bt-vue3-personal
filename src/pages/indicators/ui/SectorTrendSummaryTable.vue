<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from '@lucide/vue'
import { fetchSectorTrendScore } from '@/entities/indicator/api/indicator.api'
import type { IndicatorRawRow, IndicatorSortDirection } from '@/entities/indicator/model/indicator.types'
import { downloadCsv, toCsv } from '@/shared/utils/csv'

const props = withDefaults(defineProps<{
  embedded?: boolean
}>(), {
  embedded: false,
})

interface SectorColumn {
  key: string
  label: string
  kind: 'text' | 'number' | 'percent'
}

const columns: SectorColumn[] = [
  { key: 'index_name', label: 'Index/Sector', kind: 'text' },
  { key: 'trend_above8_ratio', label: 'Trend Score >=8', kind: 'percent' },
  { key: 'trend_below2_ratio', label: 'Trend Score <=2', kind: 'percent' },
  { key: 'reltrend_above8_ratio', label: 'Relative Score >=8', kind: 'percent' },
  { key: 'reltrend_below2_ratio', label: 'Relative Score <=2', kind: 'percent' },
  { key: 'trend_and_reltrend_above8_ratio', label: 'Trend & Rel Score >=8', kind: 'percent' },
  { key: 'trend_and_reltrend_below2_ratio', label: 'Trend & Rel Score <=2', kind: 'percent' },
  { key: 'reltrend_above8_spx_ratio', label: 'Relative Score >=8 in S&P 500', kind: 'percent' },
  { key: 'constituent_trend_score', label: 'Trend Score (Average)', kind: 'number' },
  { key: 'pct_rank_10_gte_80', label: '10-Day RSRR >= 80%', kind: 'percent' },
  { key: 'pct_rank_10_lte_20', label: '10-Day RSRR <= 20%', kind: 'percent' },
  { key: 'pct_rank_42_gte_80', label: '42-Day RSRR >= 80%', kind: 'percent' },
  { key: 'pct_rank_42_lte_20', label: '42-Day RSRR <= 20%', kind: 'percent' },
  { key: 'pct_rank_126_gte_80', label: '126-Day RSRR >= 80%', kind: 'percent' },
  { key: 'pct_rank_126_lte_20', label: '126-Day RSRR <= 20%', kind: 'percent' },
]

const rows = ref<IndicatorRawRow[]>([])
const loading = ref(false)
const sortKey = ref('constituent_trend_score')
const sortDirection = ref<IndicatorSortDirection>('desc')

const lastDate = computed(() => String(rows.value[0]?.last_date ?? ''))

const sortedRows = computed(() => {
  if (!sortKey.value) return rows.value

  return rows.value
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const compared = compareValues(left.row, right.row, sortKey.value, sortDirection.value)
      return compared || left.index - right.index
    })
    .map(({ row }) => row)
})

function rawCell(row: IndicatorRawRow, key: string) {
  return row[key]
}

function numberValue(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const numeric = Number(String(value).replace('%', ''))
  return Number.isFinite(numeric) ? numeric : null
}

function formatNumber(value: unknown, suffix = '') {
  const numeric = numberValue(value)
  if (numeric === null) return '-'
  const formatted = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2)
  return `${formatted}${suffix}`
}

function displayCell(row: IndicatorRawRow, column: SectorColumn) {
  const value = rawCell(row, column.key)
  if (column.kind === 'percent') return formatNumber(value, '%')
  if (column.kind === 'number') return formatNumber(value)
  return String(value ?? '-')
}

function compareValues(left: IndicatorRawRow, right: IndicatorRawRow, key: string, direction: IndicatorSortDirection) {
  const column = columns.find((item) => item.key === key)
  const leftRaw = rawCell(left, key)
  const rightRaw = rawCell(right, key)
  const multiplier = direction === 'asc' ? 1 : -1

  if (column?.kind === 'number' || column?.kind === 'percent') {
    const leftNumber = numberValue(leftRaw)
    const rightNumber = numberValue(rightRaw)
    if (leftNumber === null && rightNumber === null) return 0
    if (leftNumber === null) return 1
    if (rightNumber === null) return -1
    return (leftNumber - rightNumber) * multiplier
  }

  return String(leftRaw ?? '').localeCompare(String(rightRaw ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  }) * multiplier
}

function handleSort(column: SectorColumn) {
  if (sortKey.value === column.key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = column.key
    sortDirection.value = column.kind === 'text' ? 'asc' : 'desc'
  }
}

function sortIcon(column: SectorColumn) {
  if (sortKey.value !== column.key) return ArrowUpDown
  return sortDirection.value === 'asc' ? ArrowUp : ArrowDown
}

function sectorKey(row: IndicatorRawRow) {
  return encodeURIComponent(String(row.sector ?? row.index_name ?? ''))
}

function indicatorId(row: IndicatorRawRow, column: SectorColumn) {
  return `${String(row.sector ?? '').trim()}_${column.key}`
}

function detailRoute(row: IndicatorRawRow, column: SectorColumn): RouteLocationRaw {
  return {
    name: 'trend-score-detail',
    params: { id: indicatorId(row, column) },
    state: {
      trendBackQuery: { enlarge: 'TrendSector' },
      trendListLabel: 'Sector Summary',
      trendSource: 'sector_trend_score',
    },
  }
}

function downloadSectorCsv() {
  if (!sortedRows.value.length) return

  const headers = columns.map((column) => column.label)
  const body = sortedRows.value.map((row) => columns.map((column) => displayCell(row, column)))
  downloadCsv('sector-summary.csv', toCsv(headers, body))
}

onMounted(async () => {
  loading.value = true
  try {
    rows.value = await fetchSectorTrendScore()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section :class="props.embedded ? '' : 'rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]'">
    <header
      class="flex flex-col gap-3 border-b border-[var(--app-border)] py-4 xl:flex-row xl:items-center xl:justify-between"
      :class="props.embedded ? 'px-0 pt-0' : 'px-4'"
    >
      <div>
        <h2 class="text-xl font-semibold text-[var(--app-text)]">A Sector-by-Sector Examination of Trend Scores for S&P 500 Members</h2>
        <p class="mt-1 text-sm text-[var(--app-text-muted)]">
          Relative to the S&P 500 and measured as a percentage of total sector stocks
          <span v-if="lastDate">({{ lastDate }})</span>
        </p>
      </div>
      <button
        class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-semibold text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        :disabled="!sortedRows.length"
        @click="downloadSectorCsv"
      >
        <Download :size="16" />
        CSV
      </button>
    </header>

    <div class="min-w-0" :class="props.embedded ? 'pt-4' : ''">
      <table class="sector-summary-table w-full table-fixed border-collapse text-left text-[0.75rem] text-[var(--app-text)]">
        <colgroup>
          <col v-for="column in columns" :key="column.key" :style="{ width: column.key === 'index_name' ? '10%' : `${90 / (columns.length - 1)}%` }" />
        </colgroup>
        <thead class="bg-[var(--app-surface-muted)] text-[0.625rem] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="box-border px-1.5 py-2 text-left"
            >
              <button
                class="inline-flex w-full min-w-0 items-center gap-0.5 text-[0.625rem] font-semibold leading-tight transition hover:text-[var(--app-primary)]"
                :class="['justify-start', sortKey === column.key ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]']"
                type="button"
                :title="column.label"
                @click="handleSort(column)"
              >
                <span class="sector-summary-table__heading">{{ column.label }}</span>
                <component :is="sortIcon(column)" :size="11" class="shrink-0" aria-hidden="true" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              Loading sector summary...
            </td>
          </tr>
          <tr v-else-if="!sortedRows.length">
            <td :colspan="columns.length" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              No data
            </td>
          </tr>
          <tr
            v-for="(row, rowIndex) in sortedRows"
            v-else
            :key="String(row.sector ?? row.index_name ?? rowIndex)"
            class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="box-border px-1.5 py-2 text-left"
              :class="{ 'font-semibold': column.kind === 'text' }"
            >
              <RouterLink
                v-if="column.key === 'index_name'"
                class="text-[var(--app-primary)] hover:underline"
                :to="`/sector_trend_score?index=${sectorKey(row)}`"
              >
                {{ displayCell(row, column) }}
              </RouterLink>
              <RouterLink
                v-else
                class="text-[var(--app-primary)] hover:underline"
                :to="detailRoute(row, column)"
              >
                {{ displayCell(row, column) }}
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.sector-summary-table {
  line-height: 1.25;
}

.sector-summary-table__heading {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}

.sector-summary-table td,
.sector-summary-table th {
  overflow-wrap: anywhere;
}
</style>
