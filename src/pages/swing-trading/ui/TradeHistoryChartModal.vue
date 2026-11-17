<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts/highstock'
import { fetchStrategyPairPrices } from '@/entities/strategy/api/strategy.api'
import { useTheme } from '@/shared/theme/theme'

interface TradeRow {
  symbol: string
  entryDate: string
  exitDate: string
  entryPrice: string
  exitPrice: string
  shares: string
  returnPct: string
  realizedPnl: string
}

const props = defineProps<{ rows: TradeRow[] }>()
const emit = defineEmits<{ close: [] }>()
const { isDarkTheme } = useTheme()
const chartElement = ref<HTMLElement | null>(null)
const selectedTicker = ref('')
const logoFailed = ref(false)
const loading = ref(false)
const error = ref('')
const unmatchedCount = ref(0)
const latestClose = ref<number | null>(null)
const priceChange = ref<number | null>(null)
const zoomOptions = ['1M', '3M', '6M', '1Y', 'All'] as const
type ZoomOption = typeof zoomOptions[number]
const selectedZoom = ref<ZoomOption | null>('3M')
const cache = new Map<string, Awaited<ReturnType<typeof fetchStrategyPairPrices>>>()
let chart: Highcharts.Chart | null = null
let requestSerial = 0
let chartDataMin = 0
let chartDataMax = 0

const tickerOptions = computed(() => {
  const counts = new Map<string, number>()
  props.rows.forEach((row) => {
    const symbol = String(row.symbol || '').trim().toUpperCase()
    if (symbol) counts.set(symbol, (counts.get(symbol) || 0) + 1)
  })
  return [...counts].map(([symbol, count]) => ({ symbol, count }))
})
const tickerRows = computed(() => props.rows.filter(row => String(row.symbol || '').trim().toUpperCase() === selectedTicker.value))
const tickerLogoUrl = computed(() => `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(selectedTicker.value)}.png`)
const dateKey = (value: unknown) => String(value || '').slice(0, 10)
const timestamp = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey(value)) ? Date.parse(`${dateKey(value)}T00:00:00Z`) : NaN
const number = (value: unknown) => {
  const parsed = Number(String(value ?? '').replace(/[$,]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}
const priceChangeLabel = computed(() => priceChange.value === null || latestClose.value === null
  ? ''
  : `${priceChange.value >= 0 ? '+' : ''}${priceChange.value.toFixed(2)} (${priceChange.value >= 0 ? '+' : ''}${(priceChange.value / (latestClose.value - priceChange.value) * 100).toFixed(2)}%)`)
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character)

function setZoom(option: ZoomOption) {
  if (!chart || !chartDataMax) return
  selectedZoom.value = option
  if (option === 'All') {
    chart.xAxis[0]?.setExtremes(chartDataMin, chartDataMax, true, false, { trigger: 'tradeChartZoom' })
    return
  }
  const start = new Date(chartDataMax)
  if (option === '1Y') start.setUTCFullYear(start.getUTCFullYear() - 1)
  else start.setUTCMonth(start.getUTCMonth() - Number(option[0]))
  chart.xAxis[0]?.setExtremes(Math.max(start.getTime(), chartDataMin), chartDataMax, true, false, { trigger: 'tradeChartZoom' })
}

async function loadChart() {
  const symbol = selectedTicker.value
  const serial = ++requestSerial
  chart?.destroy()
  chart = null
  if (!symbol) return
  loading.value = true
  error.value = ''
  unmatchedCount.value = 0
  latestClose.value = null
  priceChange.value = null
  const dates = tickerRows.value.flatMap(row => [timestamp(row.entryDate), timestamp(row.exitDate)]).filter(Number.isFinite)
  if (!dates.length) {
    loading.value = false
    error.value = 'No valid trade dates are available.'
    return
  }
  const day = 86400000
  const latest = Math.max(...dates)
  const viewStart = new Date(latest)
  viewStart.setUTCMonth(viewStart.getUTCMonth() - 6)
  const viewEnd = new Date(latest)
  viewEnd.setUTCMonth(viewEnd.getUTCMonth() + 6)
  const start = new Date(Math.min(Math.min(...dates) - 30 * day, viewStart.getTime())).toISOString().slice(0, 10)
  const end = new Date(Math.min(Date.now(), viewEnd.getTime())).toISOString().slice(0, 10)
  try {
    let records = cache.get(symbol)
    if (!records) {
      records = await fetchStrategyPairPrices(symbol, start, end, 'Daily')
      cache.set(symbol, records)
    }
    if (serial !== requestSerial) return
    const candles = records.map((item) => {
      const values = ['Open', 'High', 'Low', 'Close'].map(key => number(item.raw[key] ?? item.raw[key.toLowerCase()]))
      return values.every(value => value !== null) ? [item.timestamp, ...values] as number[] : null
    }).filter((item): item is number[] => item !== null).sort((a, b) => a[0]! - b[0]!)
    if (!candles.length) throw new Error('No OHLC price data is available for this ticker.')
    chartDataMin = candles[0]![0]!
    chartDataMax = candles[candles.length - 1]![0]!
    const byDate = new Map(candles.map(item => [item[0], item]))
    const volume = records.map((item) => {
      const amount = number(item.raw.Volume ?? item.raw.volume)
      const candle = byDate.get(item.timestamp)
      return amount !== null && candle ? { x: item.timestamp, y: amount, color: candle[4]! >= candle[1]! ? (isDarkTheme.value ? '#43c5ad' : '#0d907e') : (isDarkTheme.value ? '#fb7185' : '#db4d63') } : null
    }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.x - b.x)
    const volumeByDate = new Map(volume.map(item => [item.x, item.y]))
    const buys: Highcharts.PointOptionsObject[] = []
    const sells: Highcharts.PointOptionsObject[] = []
    let unmatched = 0
    tickerRows.value.forEach((row) => {
      ;([
        [row.entryDate, buys, -1],
        [row.exitDate, sells, 1],
      ] as const).forEach(([date, points, direction]) => {
        const x = timestamp(date)
        if (!Number.isFinite(x)) return
        const candle = byDate.get(x)
        if (!candle) { unmatched += 1; return }
        const gap = Math.max(candle[2]! - candle[3]!, candle[4]! * 0.012)
        const sameDayCount = points.filter(point => point.x === x).length
        const y = direction < 0 ? candle[3]! - gap * (3 + sameDayCount * 1.2) : candle[2]! + gap * (3 + sameDayCount * 1.2)
        points.push({ x, y, custom: { row } })
      })
    })
    unmatchedCount.value = unmatched
    latestClose.value = candles.at(-1)?.[4] ?? null
    priceChange.value = candles.length > 1 ? candles.at(-1)![4]! - candles.at(-2)![4]! : null
    loading.value = false
    await nextTick()
    if (serial !== requestSerial || !chartElement.value) return
    const dark = isDarkTheme.value
    const ink = dark ? '#e9eef7' : '#14243b'
    const muted = dark ? '#91a3bd' : '#536b88'
    const grid = dark ? '#243247' : '#e6edf4'
    const border = dark ? '#26374d' : '#d8e3ef'
    const background = dark ? '#0f1723' : '#ffffff'
    const green = dark ? '#43c5ad' : '#0d907e'
    const red = dark ? '#fb7185' : '#db4d63'
    chart = Highcharts.stockChart(chartElement.value, {
      chart: { height: 560, backgroundColor: background, plotBackgroundColor: background, marginRight: 65, style: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' } },
      title: { text: undefined },
      credits: { enabled: false },
      rangeSelector: { enabled: false },
      navigator: { enabled: true, maskFill: dark ? 'rgba(67,197,173,.12)' : 'rgba(13,144,126,.1)', outlineColor: border, handles: { backgroundColor: background, borderColor: border }, xAxis: { gridLineWidth: 0, labels: { style: { color: muted } } } },
      scrollbar: { barBackgroundColor: dark ? '#26374d' : '#d8e3ef', barBorderColor: border, buttonBackgroundColor: background, buttonBorderColor: border, trackBackgroundColor: background, trackBorderColor: border },
      xAxis: { crosshair: { color: dark ? '#496078' : '#a9bfd2', dashStyle: 'ShortDash', width: 1, snap: false, zIndex: 3 }, lineColor: border, tickColor: border, gridLineWidth: 0, labels: { style: { color: muted, fontSize: '11px' } }, events: { afterSetExtremes(event: Highcharts.AxisSetExtremesEventObject) { if (event.trigger !== 'tradeChartZoom') selectedZoom.value = null } } },
      yAxis: [
        { height: '72%', opposite: true, title: { text: undefined }, gridLineColor: grid, lineColor: border, labels: { align: 'left', x: 32, style: { color: muted, fontSize: '11px' } } },
        { top: '76%', height: '24%', offset: 0, opposite: true, title: { text: undefined }, gridLineWidth: 0, lineColor: border, labels: { align: 'left', x: 32, style: { color: muted, fontSize: '11px' } } },
      ],
      legend: { enabled: false },
      plotOptions: { series: { dataGrouping: { enabled: false }, turboThreshold: 0, states: { hover: { enabled: false, halo: { size: 0 } }, inactive: { opacity: 1 } }, marker: { states: { hover: { enabled: false } } } } },
      tooltip: { shared: false, crosshairs: false, backgroundColor: background, borderColor: border, borderRadius: 10, shadow: false, style: { color: ink, fontSize: '12px' }, formatter(this: { point: Highcharts.Point; x?: number }) {
        const point = this.point as Highcharts.Point & { custom?: { row?: TradeRow } }
        const row = point?.custom?.row
        const pointDate = Number(point?.x ?? this.x)
        const date = Highcharts.dateFormat('%Y-%m-%d', pointDate)
        if (row) return `<b>${date}</b><br/>${point.series.name}: ${escapeHtml(point.series.name === 'Buy' ? row.entryPrice : row.exitPrice)}<br/>Shares: ${escapeHtml(row.shares)}${point.series.name === 'Sell' ? `<br/>Return: ${escapeHtml(row.returnPct)}<br/>P&L: ${escapeHtml(row.realizedPnl)}` : ''}`
        const candle = byDate.get(pointDate)
        const dayVolume = volumeByDate.get(pointDate)
        const volumeLine = `<br/>Volume: ${dayVolume === undefined ? 'N/A' : Highcharts.numberFormat(dayVolume, 0)}`
        return candle ? `<b>${date}</b><br/>Open: ${candle[1]}<br/>High: ${candle[2]}<br/>Low: ${candle[3]}<br/>Close: ${candle[4]}${volumeLine}` : date
      } },
      series: [
        { type: 'candlestick', name: symbol, data: candles as Highcharts.SeriesCandlestickOptions['data'], color: red, upColor: green, lineColor: red, upLineColor: green, showInLegend: false },
        { type: 'column', name: 'Volume', data: volume, yAxis: 1, borderWidth: 0, opacity: 1, showInLegend: false },
        { type: 'scatter', name: 'Buy', data: buys, color: '#07a956', lineWidth: 0, marker: { symbol: 'triangle', radius: 9, lineWidth: 0 } },
        { type: 'scatter', name: 'Sell', data: sells, color: '#e52238', lineWidth: 0, marker: { symbol: 'triangle-down', radius: 9, lineWidth: 0 } },
      ],
    } as unknown as Highcharts.Options)
    setZoom(selectedZoom.value || '3M')
  } catch (cause) {
    if (serial !== requestSerial) return
    loading.value = false
    error.value = cause instanceof Error ? cause.message : 'Could not load price data.'
  }
}

watch(selectedTicker, () => { logoFailed.value = false; loadChart() })
watch(tickerOptions, (options) => {
  if (!options.some(item => item.symbol === selectedTicker.value)) selectedTicker.value = options[0]?.symbol || ''
})
onMounted(() => { selectedTicker.value = tickerOptions.value[0]?.symbol || '' })
onBeforeUnmount(() => { requestSerial += 1; chart?.destroy() })
</script>

<template>
  <div class="trade-chart-backdrop">
    <section class="trade-chart-dialog" role="dialog" aria-modal="true" aria-label="Trade history chart">
      <header class="trade-chart-header">
        <div class="trade-chart-heading">
          <span class="trade-chart-symbol-icon">
            <img v-if="selectedTicker && !logoFailed" :key="selectedTicker" :src="tickerLogoUrl" :alt="`${selectedTicker} logo`" @error="logoFailed = true">
            <span v-else aria-hidden="true">{{ selectedTicker.slice(0, 2) }}</span>
          </span>
          <div><h2>{{ selectedTicker || 'Trades on Chart' }}</h2><p>Trades on Chart · {{ tickerRows.length }} trades</p></div>
        </div>
        <div v-if="latestClose !== null" class="trade-chart-price">
          <strong>{{ latestClose.toFixed(2) }}</strong>
          <span v-if="priceChange !== null" :class="priceChange >= 0 ? 'trade-chart-gain' : 'trade-chart-loss'">{{ priceChangeLabel }}</span>
        </div>
        <div class="trade-chart-actions">
          <div class="trade-chart-zoom" role="group" aria-label="Chart zoom">
            <button v-for="option in zoomOptions" :key="option" type="button" :class="{ active: selectedZoom === option }" :aria-pressed="selectedZoom === option" :disabled="loading || !!error" @click="setZoom(option)">{{ option }}</button>
          </div>
        </div>
        <button type="button" class="trade-chart-close" aria-label="Close chart" @click="emit('close')">&times;</button>
      </header>
      <div class="trade-chart-stage">
        <div class="trade-chart-switcher">
          <label for="trade-chart-ticker">Ticker</label>
          <select id="trade-chart-ticker" v-model="selectedTicker" class="trade-chart-ticker">
            <option v-for="item in tickerOptions" :key="item.symbol" :value="item.symbol">{{ item.symbol }} ({{ item.count }} trades)</option>
          </select>
          <span>Showing the first matching ticker. Select another to switch charts.</span>
          <div class="trade-chart-legend" aria-label="Trade markers">
            <span><i class="trade-chart-buy-marker" aria-hidden="true"></i>Buy</span>
            <span><i class="trade-chart-sell-marker" aria-hidden="true"></i>Sell</span>
          </div>
        </div>
        <p v-if="loading" class="trade-chart-message">Loading price data...</p>
        <p v-else-if="error" class="trade-chart-message">{{ error }}</p>
        <div v-show="!loading && !error" ref="chartElement" class="trade-chart-canvas"></div>
      </div>
      <p v-if="!loading && !error && unmatchedCount" class="trade-chart-message">{{ unmatchedCount }} trade marker(s) could not be placed on the daily chart.</p>
    </section>
  </div>
</template>

<style scoped>
.trade-chart-backdrop { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(15, 23, 42, .65); }
.trade-chart-dialog { width: min(1220px, 100%); max-height: 94vh; overflow: auto; border: 1px solid var(--sw-border-strong, #d8e3ef); border-radius: 18px; background: var(--sw-surface, #fff); color: var(--sw-ink, #14243b); box-shadow: 0 20px 60px rgba(0,0,0,.25); }
.trade-chart-header { display: flex; align-items: center; gap: 24px; min-height: 94px; padding: 18px 26px; border-bottom: 1px solid var(--sw-border, #e6edf4); }
.trade-chart-heading { display: flex; align-items: center; gap: 14px; min-width: 0; }
.trade-chart-symbol-icon { display: grid; place-items: center; flex: none; width: 48px; height: 48px; padding: 4px; border: 1px solid var(--sw-border-strong, #d8e3ef); border-radius: 50%; background: var(--sw-surface-muted, #f2f6fb); overflow: hidden; }
.trade-chart-symbol-icon img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }
.trade-chart-symbol-icon span { color: var(--sw-muted, #64748b); font-size: 13px; font-weight: 800; }
.trade-chart-header h2 { margin: 0; font-size: 25px; line-height: 1.1; }
.trade-chart-header p { margin: 4px 0 0; color: var(--sw-muted, #64748b); font-size: 13px; }
.trade-chart-price { display: flex; flex-direction: column; min-width: 130px; }
.trade-chart-price strong { font-size: 25px; line-height: 1.1; }
.trade-chart-price span { margin-top: 4px; font-size: 13px; font-weight: 700; }
.trade-chart-gain { color: #0d907e; }
.trade-chart-loss { color: #db4d63; }
.trade-chart-actions { display: flex; align-items: center; gap: 22px; margin-left: auto; }
.trade-chart-zoom { display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.trade-chart-zoom button { min-width: 39px; height: 36px; padding: 0 9px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--sw-muted, #64748b); font: inherit; font-size: 13px; cursor: pointer; }
.trade-chart-zoom button:hover:not(:disabled), .trade-chart-zoom button.active { border-color: var(--sw-border-strong, #d8e3ef); background: var(--sw-surface-muted, #f2f6fb); color: var(--sw-ink, #14243b); }
.trade-chart-zoom button.active { font-weight: 700; }
.trade-chart-zoom button:disabled { opacity: .5; cursor: not-allowed; }
.trade-chart-switcher { display: flex; align-items: center; justify-content: flex-start; gap: 10px; min-height: 62px; padding: 10px 20px 4px; }
.trade-chart-switcher label { color: var(--sw-ink, #14243b); font-size: 13px; font-weight: 700; }
.trade-chart-switcher span { color: var(--sw-muted, #64748b); font-size: 12px; }
.trade-chart-legend { display: flex; align-items: center; gap: 22px; margin-left: auto; white-space: nowrap; }
.trade-chart-legend span { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; }
.trade-chart-buy-marker { width: 0; height: 0; border-right: 6px solid transparent; border-bottom: 10px solid #07a956; border-left: 6px solid transparent; }
.trade-chart-sell-marker { width: 0; height: 0; border-top: 10px solid #e52238; border-right: 6px solid transparent; border-left: 6px solid transparent; }
.trade-chart-ticker { min-width: 160px; height: 36px; padding: 0 10px; border: 1px solid var(--sw-border-strong, #d8e3ef); border-radius: 7px; background: var(--sw-surface, #fff); color: var(--sw-ink, #14243b); font: inherit; font-size: 13px; cursor: pointer; }
.trade-chart-close { display: grid; place-items: center; flex: none; width: 36px; height: 36px; border: 1px solid var(--sw-border-strong, #d8e3ef); border-radius: 9px; background: var(--sw-surface-muted, #f2f6fb); color: inherit; font-size: 25px; line-height: 1; cursor: pointer; }
.trade-chart-message { margin: 12px 26px; color: var(--sw-muted, #64748b); }
.trade-chart-stage { min-height: 560px; padding: 0 10px 12px; }
.trade-chart-canvas { width: 100%; min-height: 560px; }
:deep(.highcharts-background), :deep(.highcharts-plot-background) { fill: var(--sw-surface, #fff); }
@media (max-width: 900px) { .trade-chart-header { flex-wrap: wrap; gap: 12px; } .trade-chart-actions { order: 3; width: 100%; justify-content: flex-end; } .trade-chart-close { margin-left: auto; } }
@media (max-width: 760px) { .trade-chart-switcher { flex-wrap: wrap; } .trade-chart-legend { margin-left: 0; } }
@media (max-width: 640px) { .trade-chart-backdrop { padding: 8px; } .trade-chart-dialog { max-height: 98vh; border-radius: 12px; } .trade-chart-header { padding: 14px; } .trade-chart-price { min-width: 90px; } .trade-chart-header h2, .trade-chart-price strong { font-size: 20px; } .trade-chart-actions { gap: 6px; } .trade-chart-zoom { gap: 0; } .trade-chart-zoom button { min-width: 34px; padding: 0 6px; } .trade-chart-switcher { padding: 10px 10px 4px; } .trade-chart-ticker { min-width: 130px; max-width: 150px; } }
</style>
