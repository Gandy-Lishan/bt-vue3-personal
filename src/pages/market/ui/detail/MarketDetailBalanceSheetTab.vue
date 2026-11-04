<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MarketBalanceSheetRow, MarketMetric, MarketPredictionDetail } from '@/entities/market/model/market-detail.types'
import { formatMarketCompact } from '@/entities/market/model/market-detail.adapter'
import { formatMarketPercent } from '@/entities/market/model/market-prediction.adapter'
import { fetchMarketBalanceSheet } from '@/entities/market/api/market-detail.api'
import { useMarketStatementPeriod } from '@/pages/market/composables/useMarketStatementPeriod'
import MarketStatCard from './MarketStatCard.vue'
import MarketBarChart from './MarketBarChart.vue'
import type { MarketBarChartSeries } from './MarketBarChart.vue'
import MarketButtonGroup from './MarketButtonGroup.vue'
import type { MarketButtonGroupOption } from './MarketButtonGroup.vue'
import MarketMetricTable from './MarketMetricTable.vue'

const props = defineProps<{
  ticker: string
  detail: MarketPredictionDetail
}>()

// ---- Period ----
const annualRows = computed(() => props.detail.balanceSheet)
const { period, rows, periodLoading } = useMarketStatementPeriod<MarketBalanceSheetRow>(
  computed(() => props.ticker),
  annualRows,
  (ticker: string, signal: AbortSignal) => fetchMarketBalanceSheet(ticker, 'quarterly', signal),
)

const PERIOD_OPTIONS: MarketButtonGroupOption[] = [
  { label: 'Annual', value: 'annual' },
  { label: 'Quarterly', value: 'quarterly' },
]

// ---- Category ----
const category = ref<'assets' | 'liabilitiesEquity' | 'keyRatios'>('assets')

const CATEGORY_OPTIONS: MarketButtonGroupOption[] = [
  { label: 'Assets', value: 'assets' },
  { label: 'liabilities & Equity', value: 'liabilitiesEquity' },
  { label: 'Key Ratios', value: 'keyRatios' },
]

// ---- Latest row ----
const latest = computed(() => rows.value.length ? rows.value[rows.value.length - 1] : null)

// ---- Helpers ----
function bsValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return formatMarketCompact(value)
}

function bsValuePercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return formatMarketPercent(value)
}

function m(label: string, value: number | null | undefined, format: 'number' | 'percent' = 'number', description = ''): MarketMetric {
  const v = format === 'percent' ? bsValuePercent(value) : bsValue(value)
  return { label, value: v, description, zero: value === 0 }
}

// ---- 4 StatCards ----
const statCards = computed(() => [
  { title: 'Total Assets', value: bsValue(latest.value?.totalAssets) },
  { title: 'Fixed Assets', value: bsValue(latest.value?.totalNonCurrentAssets) },
  { title: 'Total Liabilities', value: bsValue(latest.value?.totalLiabilities) },
  { title: 'Total Equity', value: bsValue(latest.value?.totalEquity) },
])

// ---- Assets section ----
const assetsTrendCategories = computed(() => rows.value.map((r) => r.period))

const assetsTrendSeries: MarketBarChartSeries[] = [
  { key: 'total', label: 'Total Assets', colorVar: '#16A34A' },
  { key: 'current', label: 'Current Assets', colorVar: '#3B82F6' },
  { key: 'nonCurrent', label: 'Non-Current Assets', colorVar: '#DC2626' },
]

const assetsTrendData = computed(() =>
  rows.value.map((r) => ({
    total: r.totalAssets ?? null,
    current: r.totalCurrentAssets ?? null,
    nonCurrent: r.totalNonCurrentAssets ?? null,
  }))
)

const currentAssetsRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Cash & Equivalents', latest.value.cashAndCashEquivalents, 'number', 'Cash and cash equivalents refer to the cash held by a company, along with short-term, highly liquid investments that can be readily converted into a known amount of cash.'),
    m('Short-term Investments', latest.value.shortTermInvestments, 'number', 'Short-term investments are investments held by a company that are expected to be converted into cash or mature within one year.'),
    m('Net Receivables', latest.value.netReceivables, 'number', 'Net accounts receivable refers to the amount of money a company is owed by its customers for goods sold or services rendered, minus any allowance for doubtful accounts.'),
    m('Inventory', latest.value.inventory, 'number', 'Inventory refers to the raw materials, work-in-progress, and finished goods that a company holds for sale or for use in the production process.'),
    m('Total Current Assets', latest.value.totalCurrentAssets, 'number', 'Total current assets refers to assets that a business expects to convert into cash, sell, or use up within one year.'),
  ]
})

const nonCurrentAssetsRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Long-term Investments', latest.value.longTermInvestments, 'number', 'Long-term investments are investments held by a company that are expected to be converted into cash or mature in more than one year.'),
    m('Property & Equipment', latest.value.propertyPlantEquipmentNet, 'number', 'Property, Plant, & Equipment (PP&E) refers to the tangible fixed assets owned by a company, such as land, buildings, and machinery.'),
    m('Goodwill', latest.value.goodwill, 'number', 'Goodwill represents the portion of the purchase price paid by a company when acquiring another firm that exceeds the fair value of the acquired identifiable net assets.'),
    m('Intangivle Assets', latest.value.intangibleAssets, 'number', 'Intangible assets are assets that lack physical form but possess economic value. Examples include patents, trademarks, copyrights, franchises, and software.'),
    m('Total Non-Current Assets', latest.value.totalNonCurrentAssets, 'number', 'Total non-current assets refers to assets that a business expects to convert into cash, sell, or use up in more than one year.'),
  ]
})

// ---- Liabilities & Equity section ----
const liabilitiesBreakdownCategories = computed(() => rows.value.map((r) => r.period))

const liabilitiesBreakdownSeries: MarketBarChartSeries[] = [
  { key: 'total', label: 'Total Liabilities', colorVar: '#16A34A' },
  { key: 'current', label: 'Current Liabilities', colorVar: '#3B82F6' },
  { key: 'nonCurrent', label: 'Non-Current Liabilities', colorVar: '#DC2626' },
]

const liabilitiesBreakdownData = computed(() =>
  rows.value.map((r) => ({
    total: r.totalLiabilities ?? null,
    current: r.totalCurrentLiabilities ?? null,
    nonCurrent: r.totalNonCurrentLiabilities ?? null,
  }))
)

const equityTrendCategories = computed(() => rows.value.map((r) => r.period))

const equityTrendSeries: MarketBarChartSeries[] = [
  { key: 'total', label: 'Total Equity', colorVar: '#16A34A' },
  { key: 'retained', label: 'Retained Earnings', colorVar: '#3B82F6' },
  { key: 'common', label: 'Common Stock', colorVar: '#DC2626' },
]

const equityTrendData = computed(() =>
  rows.value.map((r) => ({
    total: r.totalEquity ?? null,
    retained: r.retainedEarnings ?? null,
    common: r.commonStock ?? null,
  }))
)

const currentLiabilitiesRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Accounts Payable', latest.value.accountPayables, 'number', 'Accounts payable refers to the short-term, interest-free debt a company owes to its suppliers for goods or services purchased.'),
    m('Short-term Debt', latest.value.shortTermDebt, 'number', 'Short-term debt refers to interest-bearing liabilities like bank loans and short-term notes that are due within one year.'),
    m('Deferred Revenue', latest.value.deferredRevenue, 'number', 'Deferred revenue refers to the portion of customer prepayments a company has received for goods or services not yet delivered or rendered, which is expected to be recognized as revenue within one year.'),
    m('Current Liabilities', latest.value.totalCurrentLiabilities, 'number', 'Current liabilities, as a summary item, are a key component in measuring a company\'s short-term solvency.'),
  ]
})

const nonCurrentLiabilitiesRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Long-term Debt', latest.value.longTermDebt, 'number', 'Long-term debt refers to interest-bearing liabilities like bank loans and corporate bonds that are due in more than one year.'),
    m('Deferred Revenue (Non-Current)', latest.value.deferredRevenueNonCurrent, 'number', 'Deferred Revenue (Non-Current) refers to the portion of customer prepayments a company has received for goods or services not yet delivered or rendered, which is expected to be recognized as revenue after one year.'),
    m('Other Non-Current Liabilities', latest.value.otherNonCurrentLiabilities, 'number', 'Other Non-Current Liabilities include all other liabilities due in more than one year, apart from the two categories above.'),
    m('Non-Current Liabilities', latest.value.totalNonCurrentLiabilities, 'number', 'Non-Current Liabilities, as a summary item, are an important indicator for assessing a company\'s long-term financial leverage and risk.'),
  ]
})

const stockholdersEquityRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Retained Earnings', latest.value.retainedEarnings, 'number', 'Retained Earnings represent the cumulative net profits a company has accumulated since its inception, minus any dividends already paid out to shareholders.'),
    m('Common Stock', latest.value.commonStock, 'number', 'Common Stock refers to the capital invested by shareholders through the purchase of a company\'s common shares.'),
    m('Stockholders\' Equity', latest.value.totalEquity, 'number', 'Stockholders\' Equity, as a summary item, is a key indicator for evaluating a company\'s financial soundness and shareholder wealth.'),
  ]
})

// ---- Key Ratios section ----
const keyPerfCategories = computed(() => rows.value.map((r) => r.period))

const keyPerfSeries: MarketBarChartSeries[] = [
  { key: 'currentRatio', label: 'Current Ratio', colorVar: '#16A34A', type: 'line' },
  { key: 'debtToEquity', label: 'Debt to Equity', colorVar: '#3B82F6', type: 'line' },
  { key: 'assetTurnover', label: 'Asset Turnover', colorVar: '#DC2626', type: 'line' },
]

const keyPerfData = computed(() =>
  rows.value.map((r) => ({
    currentRatio: r.currentRatio ?? null,
    debtToEquity: r.d2eRatio ?? null,
    assetTurnover: r.assetTurnover ?? null,
  }))
)

// ---- Key Ratios row computed properties ----

const liquidityRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Current Ratio', latest.value.currentRatio, 'number', 'Formula: Total Current Assets / Total Current Liabilities. Measures a company\'s ability to repay its short-term debts. A 2:1 ratio is generally considered healthy.'),
    m('Quick Ratio', latest.value.quickRatio, 'number', 'Formula: (Total Current Assets - Inventory) / Total Current Liabilities. A more stringent measure than the current ratio because it excludes inventory.'),
    m('Cash Ratio', latest.value.cashRatio, 'number', 'Formula: Cash & Cash Equivalents / Total Current Liabilities. The most stringent liquidity measure, as it only considers cash and highly liquid assets.'),
  ]
})

const assetMgmtRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Asset Turnover', latest.value.assetTurnover, 'number', 'Formula: Net Sales / Average Total Assets. Measures how efficiently a company uses all its assets to generate sales.'),
    m('Fixed Asset Turnover', latest.value.fixedAssetTurnover, 'number', 'Formula: Net Sales / Average Net Fixed Assets. Measures how efficiently a company uses its fixed assets to generate sales.'),
    m('Inventory Turnover', latest.value.inventoryTurnover, 'number', 'Formula: Cost of Goods Sold (COGS) / Average Inventory. Measures how quickly a company sells and replenishes its inventory.'),
  ]
})

const capitalRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Debt to Equity', latest.value.d2eRatio, 'percent', 'Formula: Total Liabilities / Total Shareholder Equity. Measures the relative proportion of debt to equity in a company\'s financing.'),
    m('Debt to Capital', latest.value.d2cRatio, 'percent', 'Formula: Total Debt / (Total Debt + Total Shareholder Equity). Measures how much of a company\'s total capital comes from debt.'),
    m('Equity Ratio', latest.value.equityRatio, 'percent', 'Formula: Total Shareholder Equity / Total Assets. Measures how much of a company\'s assets are financed by shareholder equity.'),
  ]
})

const growthRows = computed((): MarketMetric[] => {
  if (!latest.value) return []
  return [
    m('Asset Growth', latest.value.assetGrowth, 'percent', 'Formula: ((Current Period Total Assets - Prior Period Total Assets) / Prior Period Total Assets) * 100%. Measures the growth rate of a company\'s total assets.'),
    m('Liabilities Growth', latest.value.liabilitiesGrowth, 'percent', 'Formula: ((Current Period Total Liabilities - Prior Period Total Liabilities) / Prior Period Total Liabilities) * 100%. Measures the growth rate of a company\'s liabilities.'),
    m('Equity Growth', latest.value.equityGrowth, 'percent', 'Formula: ((Current Period Shareholder Equity - Prior Period Shareholder Equity) / Prior Period Shareholder Equity) * 100%. Measures the growth rate of shareholder equity.'),
  ]
})

// ---- Hide logic for Key Ratios tables ----
// Mirrors Vue2 `BalanceSheet.vue` `hasZero`: hide the whole block when ANY row is zero.
// `'0.0%'` is included because the Vue3 percent formatter rounds to one decimal
// where Vue2's `formatNumber` produced `'0.00%'`.
function hasZero(rows: MarketMetric[]): boolean {
  if (!Array.isArray(rows)) return false
  return rows.some((row) => ['0.00%', '0.0%', '0.00', '0'].includes(row.value))
}
</script>

<template>
  <section class="space-y-3">
    <!-- Period + Category controls -->
    <div class="flex flex-wrap gap-3">
      <MarketButtonGroup
        v-model="period"
        :options="PERIOD_OPTIONS"
        aria-label="Period"
        background-color="var(--app-surface)"
      />
      <MarketButtonGroup
        v-model="category"
        :options="CATEGORY_OPTIONS"
        aria-label="Category"
        background-color="var(--app-surface)"
      />
    </div>

    <!-- 4 StatCards -->
    <div class="grid gap-3 xl:grid-cols-4">
      <MarketStatCard
        v-for="card in statCards"
        :key="card.title"
        :title="card.title"
        :value="card.value"
        :loading="periodLoading"
      />
    </div>

    <!-- Assets section -->
    <template v-if="category === 'assets'">
      <!-- Total Assets Trend chart -->
      <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <h3 class="mb-3 text-base font-extrabold">Total Assets Trend</h3>
        <MarketBarChart
          :categories="assetsTrendCategories"
          :series="assetsTrendSeries"
          :data="assetsTrendData"
          :height="400"
          :loading="periodLoading"
          empty-message="No total assets trend data available"
        />
      </section>
      <!-- Current / Non-Current Assets tables -->
      <div class="grid gap-3 xl:grid-cols-2">
        <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 class="mb-3 text-base font-extrabold">Current Assets</h3>
          <MarketMetricTable :rows="currentAssetsRows" highlight-last />
        </section>
        <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 class="mb-3 text-base font-extrabold">Non-Current Assets</h3>
          <MarketMetricTable :rows="nonCurrentAssetsRows" highlight-last />
        </section>
      </div>
    </template>

    <!-- Liabilities & Equity section -->
    <template v-else-if="category === 'liabilitiesEquity'">
      <!-- Liabilities Breakdown + Equity Trend charts -->
      <div class="grid gap-3 xl:grid-cols-2">
        <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 class="mb-3 text-base font-extrabold">Liabilities Breakdown</h3>
          <MarketBarChart
            :categories="liabilitiesBreakdownCategories"
            :series="liabilitiesBreakdownSeries"
            :data="liabilitiesBreakdownData"
            :height="400"
            :loading="periodLoading"
            empty-message="No liabilities breakdown data available"
          />
        </section>
        <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 class="mb-3 text-base font-extrabold">Shareholders' Equity Trend</h3>
          <MarketBarChart
            :categories="equityTrendCategories"
            :series="equityTrendSeries"
            :data="equityTrendData"
            :height="400"
            :loading="periodLoading"
            empty-message="No equity trend data available"
          />
        </section>
      </div>
      <!-- 3 tables -->
      <div class="grid gap-3 xl:grid-cols-3">
        <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 class="mb-3 text-base font-extrabold">Current Liabilities</h3>
          <MarketMetricTable :rows="currentLiabilitiesRows" highlight-last />
        </section>
        <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 class="mb-3 text-base font-extrabold">Non-Current Liabilities</h3>
          <MarketMetricTable :rows="nonCurrentLiabilitiesRows" highlight-last />
        </section>
        <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 class="mb-3 text-base font-extrabold">Stockholders' Equity</h3>
          <MarketMetricTable :rows="stockholdersEquityRows" highlight-last />
        </section>
      </div>
    </template>

    <!-- Key Ratios section -->
    <template v-else-if="category === 'keyRatios'">
      <!-- Key Performance Metrics chart -->
      <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <h3 class="mb-3 text-base font-extrabold">Key Performance Metrics</h3>
        <MarketBarChart
          :categories="keyPerfCategories"
          :series="keyPerfSeries"
          :data="keyPerfData"
          :height="400"
          :loading="periodLoading"
          percent-axis
          empty-message="No key performance metrics data available"
        />
      </section>
      <!-- 4 tables -->
      <div class="grid gap-3 xl:grid-cols-4">
        <section v-if="!hasZero(liquidityRows)" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 class="mb-3 text-base font-extrabold">Liquidity Metrics</h3>
          <MarketMetricTable :rows="liquidityRows" highlight-last />
        </section>
        <section v-if="!hasZero(assetMgmtRows)" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 class="mb-3 text-base font-extrabold">Asset Management</h3>
          <MarketMetricTable :rows="assetMgmtRows" highlight-last />
        </section>
        <section v-if="!hasZero(capitalRows)" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 class="mb-3 text-base font-extrabold">Capital Structure</h3>
          <MarketMetricTable :rows="capitalRows" highlight-last />
        </section>
        <section v-if="!hasZero(growthRows)" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 class="mb-3 text-base font-extrabold">Growth Analysis</h3>
          <MarketMetricTable :rows="growthRows" highlight-last />
        </section>
      </div>
    </template>
  </section>
</template>
