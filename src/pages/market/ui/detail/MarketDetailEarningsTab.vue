<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MarketPredictionDetail } from '@/entities/market/model/market-detail.types'
import { formatMarketCompact, formatUTCDate } from '@/entities/market/model/market-detail.adapter'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'
import MarketStatCard from './MarketStatCard.vue'
import MarketBarChart from './MarketBarChart.vue'
import type { MarketBarChartSeries } from './MarketBarChart.vue'
import MarketSegmentedControl from './MarketSegmentedControl.vue'
import type { MarketSegmentOption } from './MarketSegmentedControl.vue'
import MarketInfoHint from './MarketInfoHint.vue'

const props = defineProps<{
  detail: MarketPredictionDetail
}>()

const PAGE_SIZE = 10

// ---- EPS Trend & Estimates chart ----
const epsTrendCategories = computed(() => props.detail.earnings.map((r) => r.period))

const epsTrendSeries: MarketBarChartSeries[] = [
  { key: 'estimate', label: 'Estimate ESP', colorVar: '#3b82f6' },
  { key: 'actual', label: 'Actual ESP', colorVar: '#b3d8ff' },
]

const epsTrendData = computed(() =>
  props.detail.earnings.map((r) => ({
    estimate: r.estimatedEps,
    actual: r.actualEps,
  }))
)

// ---- EPS Growth Rate chart ----
const EPS_GROWTH_OPTIONS: MarketSegmentOption[] = [
  { label: 'YoY', value: 'yoy' },
  { label: 'QoQ', value: 'qoq' },
]

const epsGrowthMode = ref('yoy')

const epsGrowthCategories = computed(() => props.detail.earnings.map((r) => r.period))

const epsGrowthSeries: MarketBarChartSeries[] = [
  { key: 'value', label: 'EPS Growth Rate', colorVar: '--app-accent', type: 'line', areaFill: '--app-accent' },
]

const epsGrowthData = computed(() =>
  props.detail.earnings.map((r) => ({
    value: epsGrowthMode.value === 'yoy' ? r.yoyGrowth ?? null : r.qoqGrowth ?? null,
  }))
)

// ---- Earnings Surprises chart ----
const earningsSurpriseCategories = computed(() => props.detail.earnings.map((r) => r.period))

const earningsSurpriseSeries: MarketBarChartSeries[] = [
  { key: 'surprise', label: 'EPS Surprise', colorVar: '--app-positive', negativeColorVar: '--app-negative' },
]

const earningsSurpriseData = computed(() =>
  props.detail.earnings.map((r) => ({ surprise: r.epsSurprise ?? r.surprise ?? null }))
)

// ---- Revenue Surprises chart ----
const revenueSurpriseCategories = computed(() => props.detail.earnings.map((r) => r.period))

const revenueSurpriseSeries: MarketBarChartSeries[] = [
  { key: 'surprise', label: 'Revenue Surprise', colorVar: '--app-positive', negativeColorVar: '--app-negative' },
]

const revenueSurpriseData = computed(() =>
  props.detail.earnings.map((r) => ({ surprise: r.revenueSurprise ?? null }))
)

// ---- Stat cards ----
const info = computed(() => props.detail.earningsInfo)

const avgEpsCard = computed(() => ({
  title: 'Average EPS',
  description: `<p><strong>Earnings Per Share (EPS)</strong> is calculated as <strong>Net Income</strong> divided by the <strong>number of outstanding common shares</strong>. This is one of the most closely watched metrics by investors because it directly reflects the <strong>profit a company generates for each share of its stock</strong>.</p>`,
  value: formatEarningsDollar(info.value?.avgEps),
}))

const beatMissCard = computed(() => ({
  title: 'Beat/Miss Ratio',
  description: `<p>The <strong>Beat/Miss Ratio (EPS)</strong> measures the frequency with which a company's actual earnings (or revenue) exceed or fall short of analyst expectations.</p>`,
  value: info.value
    ? `${info.value.beatCount ?? 0}/${info.value.missCount ?? 0}`
    : '—',
}))

const avgSurpriseCard = computed(() => {
  const val = info.value?.avgSurprise ?? null
  const tone = val != null ? (val > 0 ? 'positive' as const : val < 0 ? 'negative' as const : 'neutral' as const) : 'neutral' as const
  const formatted = formatEarningsAvgPercent(val)
  return {
    title: 'Average Surprice',
    description: `<p><strong>Average Surprise</strong> is the average percentage difference between a company's actual earnings (or revenue) and analyst expectations.</p>`,
    value: formatted,
    tone,
  }
})

// ---- Earnings History table ----
const historyColumns: AppDataTableColumn[] = [
  { key: 'period', label: 'Period', minWidth: 100, sortable: true },
  { key: 'date', label: 'Date', minWidth: 110, sortable: true },
  { key: 'estimatedEps', label: 'Estimated EPS', minWidth: 120, sortable: true },
  { key: 'actualEps', label: 'Actual EPS', minWidth: 110, sortable: true },
  { key: 'surprise', label: 'Surprise', minWidth: 90, sortable: true },
  { key: 'estRevenue', label: 'Est. Revenue', minWidth: 120, sortable: true },
  { key: 'actualRevenue', label: 'Actual Revenue', minWidth: 120, sortable: true },
]

// Mirrors Vue2 `formatNumber` from `@/utils`:
// - null / NaN → '-'
// - 'dollar' → `$` + compact magnitude (sign before `$`)
// - 'avg' → signed percent, no '+' when zero
function formatEarningsDollar(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-'
  return formatMarketCompact(value, { currency: true })
}

function formatEarningsCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-'
  return formatMarketCompact(value)
}

function formatEarningsAvgPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-'
  if (value === 0) return `${formatMarketCompact(0)}%`
  const sign = value > 0 ? '+' : '-'
  return `${sign}${formatMarketCompact(Math.abs(value))}%`
}

interface HistoryDisplayRow {
  period: string
  date: string
  estimatedEps: string
  actualEps: string
  surprise: string
  estRevenue: string
  actualRevenue: string
  _fiscalDate: string
  _raw: Record<string, number | null>
}

const historyDisplayRows = computed<HistoryDisplayRow[]>(() =>
  props.detail.earnings.map((r) => {
    const fiscalDate = r.fiscalDate ?? ''
    return {
      // Vue2: period = formatUTCDate(fiscal_date_ending) → "Sep 30, 2024"
      period: fiscalDate ? formatUTCDate(fiscalDate) : '-',
      // Vue2: date = formatQuartAnnualDate(fiscal_date_ending, period) → FY year or date
      date: r.period,
      _fiscalDate: fiscalDate,
      estimatedEps: formatEarningsDollar(r.estimatedEps),
      actualEps: formatEarningsDollar(r.actualEps),
      surprise: formatEarningsAvgPercent(r.surprise),
      estRevenue: formatEarningsCompact(r.estimatedRevenue),
      actualRevenue: formatEarningsCompact(r.actualRevenue),
      // Vue2 `BaseTable` sorts `number` columns on the raw value, not the formatted text.
      _raw: {
        estimatedEps: r.estimatedEps ?? null,
        actualEps: r.actualEps ?? null,
        surprise: r.surprise ?? null,
        estRevenue: r.estimatedRevenue ?? null,
        actualRevenue: r.actualRevenue ?? null,
      },
    }
  })
)

const historyTable = useSortedPagedRows(historyDisplayRows, (row, key) => {
  if (key === 'period' || key === 'date') {
    return row._fiscalDate ? Date.parse(row._fiscalDate) || row[key] : row[key]
  }
  if (key in row._raw) return row._raw[key]
  return String((row as unknown as Record<string, unknown>)[key] ?? '')
}, PAGE_SIZE)

const historyRows = computed<Array<Record<string, unknown>>>(() =>
  historyTable.pagedRows.value.map((row) => row as unknown as Record<string, unknown>)
)

// ---- Upcoming Earnings table ----
const upcomingColumns: AppDataTableColumn[] = [
  { key: 'date', label: 'Date', minWidth: 120, sortable: true },
  { key: 'estimatedEps', label: 'Estimated EPS', minWidth: 130, sortable: true },
  { key: 'estimatedRevenue', label: 'Est. Revenue', minWidth: 130, sortable: true },
]

interface UpcomingDisplayRow {
  date: string
  estimatedEps: string
  estimatedRevenue: string
  _rawDate: string
  _raw: Record<string, number | null>
}

const upcomingDisplayRows = computed<UpcomingDisplayRow[]>(() =>
  (props.detail.upcomingEarnings ?? []).map((r) => ({
    // Vue2: date = formatUTCDate(...) — adapter already formats this
    date: r.date || '-',
    _rawDate: r.date,
    // Vue2: eps_estimated → formatNumber(v, 'dollar'); revenue_estimated → formatNumber(v)
    estimatedEps: formatEarningsDollar(r.estimatedEps),
    estimatedRevenue: formatEarningsCompact(r.estimatedRevenue),
    _raw: {
      estimatedEps: r.estimatedEps ?? null,
      estimatedRevenue: r.estimatedRevenue ?? null,
    },
  }))
)

const upcomingTable = useSortedPagedRows(upcomingDisplayRows, (row, key) => {
  if (key === 'date') return row._rawDate ? Date.parse(row._rawDate) || row.date : row.date
  if (key in row._raw) return row._raw[key]
  return String((row as unknown as Record<string, unknown>)[key] ?? '')
}, PAGE_SIZE)

const upcomingRows = computed<Array<Record<string, unknown>>>(() =>
  upcomingTable.pagedRows.value.map((row) => row as unknown as Record<string, unknown>)
)

function handleSort(key: string) {
  const kind = key === 'date' || key === 'period' ? 'date' : 'text'
  historyTable.sort({ key, kind })
  upcomingTable.sort({ key, kind })
}
</script>

<template>
  <section class="space-y-3">
    <!-- Top row: EPS Trend chart + Stat cards -->
    <div class="grid items-stretch gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
      <!-- EPS Trend & Estimates -->
      <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <h3 class="mb-3 text-base font-extrabold">
          EPS Trend & Estimates
          <MarketInfoHint
            text="Estimate ESP refers to the difference between an analyst's most recent forecast for a company's upcoming earnings report and the prevailing consensus estimate. Actual ESP refers to the actual percentage difference between a company's reported EPS or revenue and the market consensus estimate."
          />
        </h3>
        <MarketBarChart
          :categories="epsTrendCategories"
          :series="epsTrendSeries"
          :data="epsTrendData"
          :height="400"
          empty-message="No EPS trend data available"
        />
      </section>

      <!-- Stat cards -->
      <div class="flex flex-col gap-3 h-full">
        <MarketStatCard
          class="flex-1 min-h-0"
          :title="avgEpsCard.title"
          :description="avgEpsCard.description"
          :value="avgEpsCard.value"
        />
        <MarketStatCard
          class="flex-1 min-h-0"
          :title="beatMissCard.title"
          :description="beatMissCard.description"
          :value="beatMissCard.value"
        />
        <MarketStatCard
          class="flex-1 min-h-0"
          :title="avgSurpriseCard.title"
          :description="avgSurpriseCard.description"
          :value="avgSurpriseCard.value"
          :tone="avgSurpriseCard.tone"
        />
      </div>
    </div>

    <!-- 3 small charts -->
    <div class="grid gap-3 xl:grid-cols-3">
      <!-- EPS Growth Rate -->
      <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <h3 class="mb-3 text-base font-extrabold">
          EPS Growth Rate
          <MarketInfoHint
            text="EPS Growth Rate measures the speed at which a company's Earnings Per Share (EPS) has increased over different periods (e.g. year-over-year or quarter-over-quarter growth)."
          />
        </h3>
        <MarketSegmentedControl
          v-model="epsGrowthMode"
          :options="EPS_GROWTH_OPTIONS"
          aria-label="Growth period"
        />
        <MarketBarChart
          :categories="epsGrowthCategories"
          :series="epsGrowthSeries"
          :data="epsGrowthData"
          :height="360"
          :percent-axis="true"
          empty-message="No EPS growth data available"
        />
      </section>

      <!-- Earnings Surprises -->
      <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <h3 class="mb-3 text-base font-extrabold">
          Earnings Surprises
          <MarketInfoHint
            text="The Earnings Surprises chart displays the difference between a company's actual EPS and analysts' estimated EPS over the past few quarters."
          />
        </h3>
        <MarketBarChart
          :categories="earningsSurpriseCategories"
          :series="earningsSurpriseSeries"
          :data="earningsSurpriseData"
          :height="360"
          empty-message="No earnings surprise data available"
        />
      </section>

      <!-- Revenue Surprises -->
      <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <h3 class="mb-3 text-base font-extrabold">
          Revenue Surprises
          <MarketInfoHint
            text="The Revenue Surprises chart displays the difference between a company's actual revenue and analysts' estimated revenue over the past few quarters."
          />
        </h3>
        <MarketBarChart
          :categories="revenueSurpriseCategories"
          :series="revenueSurpriseSeries"
          :data="revenueSurpriseData"
          :height="360"
          empty-message="No revenue surprise data available"
        />
      </section>
    </div>

    <!-- Earnings History -->
    <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <h3 class="mb-3 text-lg font-extrabold">Earnings History</h3>
      <AppDataTable
        :columns="historyColumns"
        :rows="historyRows"
        :sort-key="historyTable.sortKey.value"
        :sort-direction="historyTable.sortDirection.value"
        empty-message="No earnings history available"
        @sort="handleSort"
      />
      <div v-if="historyDisplayRows.length" class="mt-3 border-t border-[var(--app-border)] pt-3">
        <IndicatorPagination
          :page="historyTable.page.value"
          :page-count="historyTable.pageCount.value"
          :total="historyDisplayRows.length"
          item-label="earnings"
          @change="historyTable.setPage"
        />
      </div>
    </section>

    <!-- Upcoming Earnings -->
    <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <h3 class="mb-3 text-lg font-extrabold">Upcoming Earnings</h3>
      <AppDataTable
        :columns="upcomingColumns"
        :rows="upcomingRows"
        :sort-key="upcomingTable.sortKey.value"
        :sort-direction="upcomingTable.sortDirection.value"
        empty-message="No upcoming earnings available"
        @sort="handleSort"
      />
      <div v-if="upcomingDisplayRows.length" class="mt-3 border-t border-[var(--app-border)] pt-3">
        <IndicatorPagination
          :page="upcomingTable.page.value"
          :page-count="upcomingTable.pageCount.value"
          :total="upcomingDisplayRows.length"
          item-label="upcoming earnings"
          @change="upcomingTable.setPage"
        />
      </div>
    </section>
  </section>
</template>
