<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ChevronLeft, Download, Info, Star } from '@lucide/vue'
import { fetchSmartScannerBacktestDetail } from '@/entities/scanner/api/smart-scanner.api'
import {
  formatScannerNumber,
  formatScannerPercent,
  formatScannerPrice,
  parseSmartScannerDetailRequest,
  smartScannerBacktestCsvTable,
} from '@/entities/scanner/model/smart-scanner.adapter'
import type { SmartScannerBacktestDetail, SmartScannerDetailRequest } from '@/entities/scanner/model/smart-scanner.types'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import SmartScannerSignalChart from './ui/SmartScannerSignalChart.vue'

type DetailTab = 'history' | 'summary'

const route = useRoute()
const detail = ref<SmartScannerBacktestDetail | null>(null)
const loading = ref(false)
const activeTab = ref<DetailTab>('summary')
const tradePage = ref(1)
const pageSize = 10
let abortController: AbortController | null = null

const request = computed<SmartScannerDetailRequest | null>(() => parseSmartScannerDetailRequest(route.query.rowData))
const displayInitial = computed(() => (detail.value?.symbol || request.value?.symbol || '?').slice(0, 1))

const headerMetrics = computed(() => [
  { label: 'Signal', value: detail.value?.signalLabel ?? request.value?.signalLabel ?? '—' },
  { label: 'Trend Score', value: formatScannerNumber(detail.value?.trendScore ?? request.value?.trendScore ?? null, 0, false) },
  { label: 'Win Rate', value: formatScannerPercent(detail.value?.winRate ?? request.value?.winRate ?? null, false, 0) },
  {
    label: 'Best Time in Market',
    value: `${formatScannerNumber(detail.value?.timeInMarket ?? request.value?.timeInMarket ?? null, 0, false)} bars`,
  },
])

const snapshotGroups = computed(() => {
  const current = detail.value
  return [
    {
      title: 'Return',
      metrics: [
        { label: 'Annual Return % (CAGR)', value: formatScannerPercent(current?.annualReturn ?? null), tone: valueTone(current?.annualReturn ?? null) },
        { label: 'Median Return %', value: formatScannerPercent(current?.medianReturn ?? null), tone: valueTone(current?.medianReturn ?? null) },
        { label: 'Average Return %', value: formatScannerPercent(current?.avgReturn ?? null), tone: valueTone(current?.avgReturn ?? null) },
      ],
    },
    {
      title: 'Risk',
      metrics: [
        { label: 'STD. DEV', value: formatScannerNumber(current?.stdDev ?? null), tone: '' },
        { label: 'Max Risk %', value: formatScannerPercent(current?.maxRisk ?? null), tone: '' },
      ],
    },
    {
      title: 'Trades',
      metrics: [
        { label: 'Win Rate %', value: formatScannerPercent(current?.winRate ?? null), tone: '' },
        { label: 'Average Win %', value: formatScannerPercent(current?.avgWin ?? null), tone: '' },
        { label: 'Average Loss %', value: formatScannerPercent(current?.avgLoss ?? null), tone: '' },
        { label: 'Total Trades', value: formatScannerNumber(current?.tradeNumber ?? null, 0, false), tone: '' },
        { label: 'Total Positive', value: formatScannerNumber(current?.totalPositive ?? null, 0, false), tone: '' },
        { label: 'Total Negative', value: formatScannerNumber(current?.totalNegative ?? null, 0, false), tone: '' },
      ],
    },
  ]
})

const tradeRows = computed<Array<Record<string, unknown>>>(() =>
  (detail.value?.trades ?? []).map((row) => ({
    id: row.id,
    index: row.index,
    entryDate: row.entryDate,
    exitDate: row.exitDate,
    exitReason: row.exitReason,
    eachReturn: row.eachReturn,
  })),
)

const tradePageCount = computed(() => Math.max(1, Math.ceil(tradeRows.value.length / pageSize)))
const pagedTradeRows = computed(() => {
  const start = (tradePage.value - 1) * pageSize
  return tradeRows.value.slice(start, start + pageSize)
})

const historyRows = computed<Array<Record<string, unknown>>>(() =>
  (detail.value?.backtestHistory ?? []).map((row) => ({
    id: row.id,
    entryDate: row.entryDate,
    oneMonth: row.oneMonth,
    twoMonths: row.twoMonths,
    threeMonths: row.threeMonths,
    fourMonths: row.fourMonths,
    fiveMonths: row.fiveMonths,
    sixMonths: row.sixMonths,
    oneYear: row.oneYear,
  })),
)

const periodRows = computed<Array<Record<string, unknown>>>(() =>
  (detail.value?.periodSummary ?? []).map((row) => ({
    id: row.id,
    metric: row.metric,
    oneMonth: row.oneMonth,
    twoMonths: row.twoMonths,
    threeMonths: row.threeMonths,
    fourMonths: row.fourMonths,
    fiveMonths: row.fiveMonths,
    sixMonths: row.sixMonths,
    oneYear: row.oneYear,
  })),
)

const tradeColumns: AppDataTableColumn[] = [
  { key: 'index', label: '#', minWidth: 80, align: 'center' },
  { key: 'entryDate', label: 'Entry Date', minWidth: 180, align: 'center' },
  { key: 'exitDate', label: 'Exit Date', minWidth: 180, align: 'center' },
  {
    key: 'exitReason',
    label: 'Exit Reason',
    minWidth: 190,
    align: 'center',
    badgeClass: (value) => exitReasonClass(String(value ?? '')),
  },
  {
    key: 'eachReturn',
    label: 'Each Return',
    minWidth: 160,
    align: 'center',
    format: (value) => formatScannerPercent(typeof value === 'number' ? value : null),
    cellClass: (value) => valueTone(typeof value === 'number' ? value : null),
  },
]

const periodColumns: AppDataTableColumn[] = [
  { key: 'entryDate', label: 'Entry Date', minWidth: 140, align: 'center' },
  ...periodValueColumns(),
]

const summaryColumns: AppDataTableColumn[] = [
  { key: 'metric', label: 'Metric', minWidth: 150, align: 'center' },
  ...periodValueColumns(),
]

function periodValueColumns(): AppDataTableColumn[] {
  return [
    ['oneMonth', '1 Month Later (%)'],
    ['twoMonths', '2 Months Later (%)'],
    ['threeMonths', '3 Months Later (%)'],
    ['fourMonths', '4 Months Later (%)'],
    ['fiveMonths', '5 Months Later (%)'],
    ['sixMonths', '6 Months Later (%)'],
    ['oneYear', '1 Year Later (%)'],
  ].map(([key, label]) => ({
    key,
    label,
    minWidth: 130,
    align: 'center' as const,
    format: (value: unknown) => formatScannerPercent(typeof value === 'number' ? value : null),
    cellClass: (value: unknown) => valueTone(typeof value === 'number' ? value : null),
  }))
}

function valueTone(value: number | null) {
  if ((value ?? 0) < 0) return 'text-[var(--app-negative)]'
  if ((value ?? 0) > 0) return 'text-[var(--app-positive)]'
  return ''
}

function exitReasonClass(value: string) {
  const normalized = value.toLowerCase()
  if (normalized.includes('profit')) return 'bg-emerald-100 text-emerald-700'
  if (normalized.includes('loss')) return 'bg-rose-100 text-rose-700'
  return 'bg-slate-200 text-slate-700'
}

function changeTone(value: number | null) {
  return valueTone(value)
}

function setTradePage(page: number) {
  tradePage.value = Math.max(1, Math.min(page, tradePageCount.value))
}

async function loadDetail() {
  if (!request.value) return
  abortController?.abort()
  abortController = new AbortController()
  loading.value = true
  try {
    detail.value = await fetchSmartScannerBacktestDetail(request.value, abortController.signal)
    tradePage.value = 1
  } finally {
    loading.value = false
  }
}

function exportActiveTable() {
  if (!detail.value) return
  const { headers, rows } = smartScannerBacktestCsvTable(detail.value, activeTab.value)
  if (!rows.length) return
  downloadCsv(`smart-scanner-${detail.value.symbol}-${activeTab.value}.csv`, toCsv(headers, rows))
}

watch(() => route.query.rowData, () => {
  void loadDetail()
})

onMounted(() => {
  void loadDetail()
})

onBeforeUnmount(() => {
  abortController?.abort()
})
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <main class="px-[var(--page-gutter)] pb-8 pt-5">
      <RouterLink class="inline-flex items-center gap-1 text-sm font-semibold text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]" to="/scannerai">
        <ChevronLeft :size="17" />
        Back to Smart Stock Scanner List
      </RouterLink>

      <section v-if="!request" class="mt-5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-sm text-[var(--app-text-muted)]">
        Missing scanner row data.
      </section>

      <template v-else>
        <section class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_repeat(4,minmax(150px,210px))] xl:items-center">
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-2xl font-extrabold text-[var(--app-text)]">
              {{ displayInitial }}
            </div>
            <div class="min-w-0">
              <h1 class="truncate text-2xl font-extrabold text-[var(--app-text)]">
                {{ detail?.displayName ?? request.symbol }}
              </h1>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--app-text-secondary)]">
                <span>{{ request.symbol }}</span>
                <span class="text-[var(--app-text-faint)]">|</span>
                <span>{{ detail?.exchange ?? 'NYSE' }}</span>
              </div>
            </div>
            <div class="ml-0 flex shrink-0 flex-col xl:ml-5">
              <span class="text-2xl font-extrabold text-[var(--app-text)]">{{ formatScannerPrice(detail?.close ?? request.close) }}</span>
              <span class="text-sm font-extrabold" :class="changeTone(detail?.pctChange ?? request.pctChange)">
                {{ formatScannerPercent(detail?.pctChange ?? request.pctChange, true, 2) }}
              </span>
            </div>
          </div>

          <article
            v-for="metric in headerMetrics"
            :key="metric.label"
            class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 shadow-sm"
          >
            <div class="text-sm font-semibold text-[var(--app-text-secondary)]">{{ metric.label }}</div>
            <div class="mt-1 text-2xl font-extrabold text-[var(--app-primary)]">{{ metric.value }}</div>
          </article>
        </section>

        <section class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(360px,0.95fr)]">
          <SmartScannerSignalChart :detail="detail" :loading="loading" />

          <aside class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-xl font-extrabold text-[var(--app-text)]">Backtest Snapshot</h2>
                <p class="mt-1 text-sm font-semibold text-[var(--app-text-secondary)]">
                  {{ request.symbol }} <span class="px-1 text-[var(--app-text-faint)]">|</span> {{ detail?.displayName ?? request.symbol }}
                </p>
              </div>
              <div class="flex gap-2">
                <button class="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--app-border)] text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)]" type="button" aria-label="Watch">
                  <Star :size="17" />
                </button>
              </div>
            </div>

            <div class="mt-4 space-y-3">
              <section
                v-for="group in snapshotGroups"
                :key="group.title"
                class="rounded-lg border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-3"
              >
                <h3 class="text-sm font-extrabold text-[var(--app-text)]">{{ group.title }}</h3>
                <div class="mt-3 grid gap-3" :class="group.metrics.length > 2 ? 'grid-cols-3' : 'grid-cols-2'">
                  <div
                    v-for="metric in group.metrics"
                    :key="metric.label"
                    class="min-w-0 border-r border-[var(--app-border-muted)] text-center last:border-r-0"
                  >
                    <div class="truncate text-xs font-semibold text-[var(--app-text-secondary)]">{{ metric.label }}</div>
                    <div class="mt-1 text-lg font-extrabold" :class="metric.tone">{{ metric.value }}</div>
                  </div>
                </div>
              </section>
            </div>

            <div class="mt-4 rounded-lg border border-[var(--app-border-muted)] bg-[var(--app-primary-soft)] p-4">
              <div class="flex gap-3">
                <Info :size="20" class="mt-0.5 shrink-0 text-[var(--app-primary)]" />
                <div class="text-sm leading-5 text-[var(--app-text-secondary)]">
                  <div class="font-extrabold text-[var(--app-primary)]">Historical results, not a forecast</div>
                  <p class="mt-1">This backtest shows how this strategy has performed in the past. Past performance is not indicative of future results.</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section class="mt-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
          <div class="grid grid-cols-2 p-3">
            <button
              class="h-8 rounded-l-md text-sm font-extrabold transition"
              :class="activeTab === 'history' ? 'bg-[var(--app-primary)] text-white' : 'bg-[var(--app-surface-muted)] text-[var(--app-text-secondary)]'"
              type="button"
              @click="activeTab = 'history'"
            >
              History
            </button>
            <button
              class="h-8 rounded-r-md text-sm font-extrabold transition"
              :class="activeTab === 'summary' ? 'bg-[var(--app-primary)] text-white' : 'bg-[var(--app-surface-muted)] text-[var(--app-text-secondary)]'"
              type="button"
              @click="activeTab = 'summary'"
            >
              Summary
            </button>
          </div>

          <div class="border-t border-[var(--app-border)] p-4">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 class="text-lg font-extrabold text-[var(--app-text)]">
                {{ activeTab === 'summary' ? `Trade History (${detail?.trades.length ?? 0} Trades)` : 'Backtest Results' }}
              </h2>
              <button
                class="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-semibold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                :disabled="!detail"
                @click="exportActiveTable"
              >
                <Download :size="16" />
                Export
              </button>
            </div>

            <AppDataTable
              v-if="activeTab === 'summary'"
              :columns="tradeColumns"
              :rows="pagedTradeRows"
              :loading="loading"
              empty-message="No trades found"
            />

            <div v-else class="space-y-4">
              <AppDataTable
                :columns="periodColumns"
                :rows="historyRows"
                :loading="loading"
                empty-message="No backtest history rows found"
              />
              <AppDataTable
                :columns="summaryColumns"
                :rows="periodRows"
                :loading="loading"
                empty-message="No period summary rows found"
              />
            </div>

            <div v-if="activeTab === 'summary'" class="mt-4">
              <IndicatorPagination
                :page="tradePage"
                :page-count="tradePageCount"
                :total="tradeRows.length"
                item-label="trades"
                @change="setTradePage"
              />
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
