<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MarketFinancialRow, MarketPredictionDetail } from '@/entities/market/model/market-detail.types'
import { formatMarketCompact } from '@/entities/market/model/market-detail.adapter'
import { formatMarketPercent } from '@/entities/market/model/market-prediction.adapter'
import { fetchMarketFinancials } from '@/entities/market/api/market-detail.api'
import { useMarketStatementPeriod } from '@/pages/market/composables/useMarketStatementPeriod'
import MarketStatCard from './MarketStatCard.vue'
import MarketBarChart from './MarketBarChart.vue'
import type { MarketBarChartSeries } from './MarketBarChart.vue'
import MarketButtonGroup from './MarketButtonGroup.vue'
import type { MarketButtonGroupOption } from './MarketButtonGroup.vue'
import MarketInfoHint from './MarketInfoHint.vue'
import MarketMetricTable from './MarketMetricTable.vue'
import type { MarketMetric } from '@/entities/market/model/market-detail.types'

const props = defineProps<{
  ticker: string
  detail: MarketPredictionDetail
}>()

const annualRows = computed(() => props.detail.financials)
const { period, rows, periodLoading } = useMarketStatementPeriod<MarketFinancialRow>(
  computed(() => props.ticker),
  annualRows,
  (ticker: string, signal: AbortSignal) => fetchMarketFinancials(ticker, 'quarterly', signal),
)

const PERIOD_OPTIONS: MarketButtonGroupOption[] = [
  { label: 'Annual', value: 'annual' },
  { label: 'Quarterly', value: 'quarterly' },
]

// ---- Latest row ----
const latest = computed(() => rows.value.length ? rows.value[rows.value.length - 1] : null)

// ---- Helper ----
function finValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return formatMarketCompact(value)
}

function finValuePercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return formatMarketPercent(value)
}

function m(label: string, value: number | null | undefined, format: 'number' | 'percent' = 'number', description = ''): MarketMetric {
  const v = format === 'percent' ? finValuePercent(value) : finValue(value)
  return { label, value: v, description, zero: value === 0 }
}

// ---- 3 small tables ----
const marginAnalysisRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Gross Margin', latest.value.grossMargin, 'percent', 'Gross Profit Margin is calculated as (Gross Profit / Revenue) x 100%.'),
    m('Operating Margin', latest.value.operatingMargin, 'percent', 'Operating Profit Margin is calculated as (Operating Income / Revenue) x 100%.'),
    m('Net Margin', latest.value.netMargin, 'percent', 'Net Profit Margin is calculated as (Net Income / Revenue) x 100%.'),
  ]
})

const earningsSurprisesRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Asset Turnover', latest.value.assetTurnover, 'number', 'Asset Turnover Ratio is calculated as Revenue divided by Average Total Assets.'),
    m('Return on Equity', latest.value.returnOnEquity, 'percent', 'Return on Equity (ROE) is calculated as Net Income divided by Average Shareholder Equity.'),
    m('Return on Assets', latest.value.returnOnAsset, 'percent', 'Return on Assets (ROA) is calculated as Net Income divided by Average Total Assets.'),
  ]
})

const financialScoresRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Altman Z-Score', latest.value.altmanZScore, 'number', 'The Altman Z-Score predicts a company\'s probability of bankruptcy within two years. Z > 2.99 = safe, 1.8-2.99 = gray zone, < 1.8 = high risk.'),
    m('Piotroski Score', latest.value.piotroskiScore, 'number', 'The Piotroski F-Score is a 9-point scoring system used to identify value stocks with strong financial statements. Score >= 6 is considered good.'),
  ]
})

// ---- Hide logic ----
// Mirrors Vue2 `Financials.vue` `hasZero`: hide the whole block when ANY row is zero.
// `'0.0%'` is included because the Vue3 percent formatter rounds to one decimal
// where Vue2's `formatNumber` produced `'0.00%'`.
function hasZero(rows: MarketMetric[]): boolean {
  if (!Array.isArray(rows)) return false
  return rows.some((row) => ['0.00%', '0.0%', '0.00', '0'].includes(row.value))
}

// ---- Financial Trends ----
const TRENDS_OPTIONS: MarketButtonGroupOption[] = [
  { label: 'Revenue', value: 'revenue' },
  { label: 'Gross Profit', value: 'grossProfit' },
  { label: 'Operating', value: 'operating' },
  { label: 'Net Income', value: 'netIncome' },
  { label: 'EBITDA', value: 'ebitda' },
]

const trendsOption = ref('revenue')

const trendCategories = computed(() => rows.value.map((r) => r.period))

function getTrendSeries(): MarketBarChartSeries[] {
  const opt = trendsOption.value
  const lineLabel = opt === 'revenue' ? 'Revenue'
    : opt === 'grossProfit' ? 'Gross Profit'
    : opt === 'operating' ? 'Operating Income'
    : opt === 'netIncome' ? 'Net Income'
    : 'EBITDA'
  return [
    { key: 'totalDebt', label: 'Total Debt', colorVar: '#16A34A' },
    { key: 'line', label: lineLabel, colorVar: '#3B82F6', type: 'line' },
  ]
}

const trendData = computed(() => {
  const opt = trendsOption.value
  return rows.value.map((r) => ({
    totalDebt: r.totalDebt ?? null,
    line: opt === 'revenue' ? r.revenue
      : opt === 'grossProfit' ? r.grossProfit ?? null
      : opt === 'operating' ? r.operatingIncome ?? null
      : opt === 'netIncome' ? r.netIncome
      : r.ebitda ?? null,
  }))
})

// ---- Trend stat cards ----
function yoyValue(key: 'revenueYoY' | 'grossProfitYoY' | 'operatingIncomeYoY' | 'netIncomeYoY' | 'ebitdaYoY'): { value: string; tone: 'positive' | 'negative' | 'neutral' } {
  const val = latest.value?.[key] ?? null
  if (val === null) return { value: '—', tone: 'neutral' }
  const tone: 'positive' | 'negative' | 'neutral' = val > 0 ? 'positive' : val < 0 ? 'negative' : 'neutral'
  return { value: `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`, tone }
}

function ratioValue(key: 'revenueRatio' | 'grossProfitRatio' | 'operatingIncomeRatio' | 'netIncomeRatio' | 'ebitdaRatio'): string {
  const val = latest.value?.[key] ?? null
  if (val === null) return '—'
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
}

const trendInfo = computed(() => {
  const opt = trendsOption.value
  const title = opt === 'revenue' ? 'Current Revenue'
    : opt === 'grossProfit' ? 'Current Gross Profit'
    : opt === 'operating' ? 'Current Operating'
    : opt === 'netIncome' ? 'Current Net Income'
    : 'Current EBITDA'
  const currentKey = opt === 'revenue' ? 'revenue'
    : opt === 'grossProfit' ? 'grossProfit'
    : opt === 'operating' ? 'operatingIncome'
    : opt === 'netIncome' ? 'netIncome'
    : 'ebitda'
  const currentVal = latest.value?.[currentKey as keyof MarketFinancialRow] ?? null
  return {
    title,
    current: currentVal !== null ? finValue(currentVal as number | null) : '—',
    yoy: yoyValue((opt + 'YoY') as Parameters<typeof yoyValue>[0]),
    ratio: ratioValue((opt + 'Ratio') as Parameters<typeof ratioValue>[0]),
  }
})

// ---- Income Metrics chart ----
const incomeMetricsCategories = computed(() => rows.value.map((r) => r.period))

const incomeMetricsSeries: MarketBarChartSeries[] = [
  { key: 'revenue', label: 'Revenue', colorVar: '#3B82F6' },
  { key: 'netIncome', label: 'Net Income', colorVar: '#16A34A' },
  { key: 'ebitda', label: 'EBITDA', colorVar: '#818CF8' },
]

const incomeMetricsData = computed(() =>
  rows.value.map((r) => ({
    revenue: r.revenue ?? null,
    netIncome: r.netIncome ?? null,
    ebitda: r.ebitda ?? null,
  }))
)

// ---- Cash & Debt Position chart ----
const balanceRows = computed(() => props.detail.balanceSheet ?? [])
const cashDebtCategories = computed(() => balanceRows.value.map((r) => r.period))

const cashDebtSeries: MarketBarChartSeries[] = [
  { key: 'cash', label: 'Cash', colorVar: '#3B82F6' },
  { key: 'totalDebt', label: 'Total Debt', colorVar: '#16A34A' },
]

const cashDebtData = computed(() =>
  balanceRows.value.map((r) => ({
    cash: r.cashAndCashEquivalents ?? null,
    totalDebt: r.totalDebt ?? null,
  }))
)
</script>

<template>
  <section class="space-y-3">
    <!-- Period toggle -->
    <MarketButtonGroup
      v-model="period"
      :options="PERIOD_OPTIONS"
      aria-label="Period"
      background-color="var(--app-surface)"
    />

    <!-- 3 small tables -->
    <div class="grid gap-3 xl:grid-cols-3">
      <section v-if="!hasZero(marginAnalysisRows)" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <h3 class="mb-3 text-base font-extrabold">Margin Analysis</h3>
        <MarketMetricTable :rows="marginAnalysisRows" />
      </section>
      <section v-if="!hasZero(earningsSurprisesRows)" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <h3 class="mb-3 text-base font-extrabold">Earnings Surprises</h3>
        <MarketMetricTable :rows="earningsSurprisesRows" />
      </section>
      <section v-if="!hasZero(financialScoresRows)" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <h3 class="mb-3 text-base font-extrabold">Financial Scores</h3>
        <MarketMetricTable :rows="financialScoresRows" />
      </section>
    </div>

    <!-- Financial Trends -->
    <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <h3 class="mb-3 text-lg font-extrabold">Financial Trends</h3>
      <MarketButtonGroup
        v-model="trendsOption"
        :options="TRENDS_OPTIONS"
        aria-label="Financial metric"
        background-color="var(--app-surface-muted)"
      />
      <MarketBarChart
        :categories="trendCategories"
        :series="getTrendSeries()"
        :data="trendData"
        :height="400"
        :loading="periodLoading"
        empty-message="No financial trend data available"
      />

      <!-- 3 stat cards -->
      <div class="mt-4 border-t border-[var(--app-border-muted)] pt-4">
        <div class="grid gap-3 xl:grid-cols-3">
          <MarketStatCard
            borderless
            centered
            :title="trendInfo.title"
            :value="trendInfo.current"
            :loading="periodLoading"
          />
          <MarketStatCard
            borderless
            centered
            title="YoY Growth"
            :value="trendInfo.yoy.value"
            :tone="trendInfo.yoy.tone"
            :loading="periodLoading"
          />
          <MarketStatCard
            borderless
            centered
            title="% of Revenue"
            :value="trendInfo.ratio"
            :loading="periodLoading"
          />
        </div>
      </div>
    </section>

    <!-- 2 charts -->
    <div class="grid gap-3 xl:grid-cols-2">
      <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <h3 class="mb-3 text-base font-extrabold">Income Metrics</h3>
        <MarketBarChart
          :categories="incomeMetricsCategories"
          :series="incomeMetricsSeries"
          :data="incomeMetricsData"
          :height="400"
          :loading="periodLoading"
          empty-message="No income metrics data available"
        />
      </section>
      <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <h3 class="mb-3 text-base font-extrabold">
          Cash & Debt Position
          <MarketInfoHint
            text="Cash refers to the total amount of cash and cash equivalents held by a company. Total Debt refers to the sum of all a company's long-term and short-term interest-bearing liabilities."
          />
        </h3>
        <MarketBarChart
          :categories="cashDebtCategories"
          :series="cashDebtSeries"
          :data="cashDebtData"
          :height="400"
          empty-message="No cash & debt data available"
        />
      </section>
    </div>
  </section>
</template>
