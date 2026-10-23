<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowUp, Download, LoaderCircle, Plus, RefreshCw, Save, Search, Settings, Trash2, X } from '@lucide/vue'
import stocks from '@/assets/stocks_list.json'
import indexes from '@/assets/indexes_list.json'
import { deleteWatchList, fetchWatchListDetail, fetchWatchLists, previewWatchList, saveWatchList } from '@/entities/my-stuff/api/watch-list.api'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import SearchSelect from '@/shared/ui/SearchSelect.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'
import {
  buildWatchListPreview,
  WATCH_LIST_INDICATORS,
  type WatchListColumn,
  type WatchListHeatmapGroup,
  type WatchListPreviewColumn,
  type WatchListPreviewRow,
  type WatchListRecord,
  type WatchListResult,
} from '@/entities/my-stuff/model/watch-list'

type StockOption = { stock?: string; symbol?: string; name?: string }
type PreviewMode = 'list' | 'heatmap'

const abortController = new AbortController()
const records = ref<WatchListRecord[]>([])
const recordsLoading = ref(false)
const busy = ref(false)
const editingUrl = ref('')
const name = ref('')
const tickers = ref<string[]>([])
const tickerInput = ref('')
const columns = ref<WatchListColumn[]>([])
const previewRows = ref<WatchListPreviewRow[]>([])
const previewColumns = ref<WatchListPreviewColumn[]>([])
const heatmapGroups = ref<WatchListHeatmapGroup[]>([])
const selectedHeatmap = ref('')
const previewMode = ref<PreviewMode>('list')
const editorOpen = ref(false)
const message = ref('')
const error = ref('')
const tableSortKey = ref('Ticker')
const tableSortDirection = ref<'asc' | 'desc'>('asc')

const symbolOptions = computed(() => {
  const map = new Map<string, string>()
  ;([...(stocks as StockOption[]), ...(indexes as StockOption[])]).forEach((item) => {
    const symbol = String(item.stock ?? item.symbol ?? '').toUpperCase()
    if (symbol && !map.has(symbol)) map.set(symbol, String(item.name ?? ''))
  })
  return [...map.entries()].map(([symbol, company]) => ({ symbol, company }))
})
const validSymbols = computed(() => new Set(symbolOptions.value.map((item) => item.symbol)))
const watchListOptions = computed(() => records.value.map((record) => ({
  value: record.url,
  label: record.name,
  displayValue: record.name,
  description: `${record.tickers.length} symbol${record.tickers.length === 1 ? '' : 's'}${record.tickers.length ? ` · ${record.tickers.slice(0, 4).join(', ')}${record.tickers.length > 4 ? '…' : ''}` : ''}`,
  meta: record.updatedAt ? `Updated ${record.updatedAt.slice(0, 10)}` : 'Not updated',
})))
const activeHeatmap = computed(() => heatmapGroups.value.find((group) => group.name === selectedHeatmap.value) ?? heatmapGroups.value[0])
const activeRecord = computed(() => records.value.find((record) => record.url === editingUrl.value))
const dataDate = computed(() => activeRecord.value?.updatedAt?.slice(0, 10) || 'Latest available data')
const tableColumns = computed<AppDataTableColumn[]>(() => [
  { key: 'Ticker', label: 'Symbol', sortable: true, minWidth: 90 },
  { key: 'Name', label: 'Company', sortable: true, minWidth: 180 },
  { key: 'Close', label: 'Close', sortable: true, align: 'right', minWidth: 90 },
  ...previewColumns.value.map((column) => ({
    key: column.key,
    label: column.label,
    sortable: true,
    align: 'right' as const,
    minWidth: 120,
    cellClass: (value: unknown) => Number.parseFloat(String(value)) < 0 ? 'text-[var(--app-negative)]' : '',
  })),
])
const sortedTableRows = computed<Array<Record<string, unknown>>>(() => {
  const key = tableSortKey.value
  const direction = tableSortDirection.value === 'asc' ? 1 : -1
  return [...previewRows.value].sort((left, right) => {
    const a = left[key]
    const b = right[key]
    const aNumber = typeof a === 'number' ? a : Number.parseFloat(String(a).replace('%', ''))
    const bNumber = typeof b === 'number' ? b : Number.parseFloat(String(b).replace('%', ''))
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return (aNumber - bNumber) * direction
    return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * direction
  })
})

function defaultName() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `My Watch List ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultColumns(): WatchListColumn[] {
  return ['Trend Score', 'RelTrend Score', 'Optix', 'ROC'].map((indicator) => ({ indicator, bar: WATCH_LIST_INDICATORS.find((item) => item.value === indicator)?.bar ?? 1 }))
}

function resetEditor() {
  editingUrl.value = ''
  name.value = defaultName()
  tickers.value = []
  tickerInput.value = ''
  columns.value = defaultColumns()
  clearPreview()
  clearStatus()
}

function openNewEditor() {
  resetEditor()
  editorOpen.value = true
}

function clearPreview() {
  previewRows.value = []
  previewColumns.value = []
  heatmapGroups.value = []
  selectedHeatmap.value = ''
}

function clearStatus() {
  message.value = ''
  error.value = ''
}

function showMessage(value: string) {
  clearStatus()
  message.value = value
  window.setTimeout(() => { if (message.value === value) message.value = '' }, 3500)
}

function parseTickerInput() {
  clearStatus()
  const candidates = tickerInput.value.toUpperCase().split(/[\s,;，、]+/).map((item) => item.trim()).filter(Boolean)
  const invalid = candidates.filter((ticker) => !validSymbols.value.has(ticker))
  const next = [...new Set([...tickers.value, ...candidates.filter((ticker) => validSymbols.value.has(ticker))])]
  if (next.length > 10) error.value = 'A watch list can contain up to 10 tickers.'
  else if (invalid.length) error.value = `Ticker not found: ${invalid.join(', ')}`
  tickers.value = next.slice(0, 10)
  tickerInput.value = ''
}

function removeTicker(ticker: string) {
  tickers.value = tickers.value.filter((item) => item !== ticker)
  previewRows.value = previewRows.value.filter((item) => item.Ticker !== ticker)
  heatmapGroups.value = heatmapGroups.value.map((group) => ({ ...group, points: group.points.filter((point) => point.ticker !== ticker) }))
}

function addColumn() {
  if (columns.value.length >= 10) { error.value = 'A watch list can contain up to 10 indicator columns.'; return }
  const used = new Set(columns.value.map((item) => item.indicator))
  const option = WATCH_LIST_INDICATORS.find((item) => !used.has(item.value))
  if (option) columns.value.push({ indicator: option.value, bar: option.bar })
}

function updateColumn(index: number, event: Event) {
  const indicator = (event.target as HTMLSelectElement).value
  const option = WATCH_LIST_INDICATORS.find((item) => item.value === indicator)
  columns.value[index] = { indicator, bar: option?.bar ?? 1 }
}

function moveColumn(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= columns.value.length) return
  const next = [...columns.value]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  columns.value = next
}

function validateEditor() {
  clearStatus()
  if (!name.value.trim()) error.value = 'Enter a watch list name.'
  else if (!tickers.value.length) error.value = 'Select at least one ticker.'
  else if (!columns.value.length) error.value = 'Select at least one indicator column.'
  else if (new Set(columns.value.map((item) => item.indicator)).size !== columns.value.length) error.value = 'Each indicator can only be selected once.'
  return !error.value
}

function applyPreview(result: WatchListResult) {
  const preview = buildWatchListPreview(result, columns.value)
  previewRows.value = preview.rows
  previewColumns.value = preview.columns
  heatmapGroups.value = preview.heatmap
  selectedHeatmap.value = preview.heatmap[0]?.name ?? ''
}

async function loadRecords() {
  recordsLoading.value = true
  clearStatus()
  try {
    records.value = await fetchWatchLists(abortController.signal)
    recordsLoading.value = false
    if (!editingUrl.value && records.value[0]) await editRecord(records.value[0], false)
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to load watch lists.' }
  finally { recordsLoading.value = false }
}

async function editRecord(record: WatchListRecord, openEditor = true) {
  busy.value = true
  clearStatus()
  editingUrl.value = record.url
  name.value = record.name
  tickers.value = [...record.tickers]
  columns.value = record.columns.map((item) => ({ ...item }))
  editorOpen.value = openEditor
  try {
    const detail = await fetchWatchListDetail(record.url, abortController.signal)
    if (detail.code === 214) applyPreview(detail.result)
    else clearPreview()
    showMessage(detail.code === 203 ? 'This watch list is still processing.' : `Loaded “${record.name}”.`)
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to load watch list details.' }
  finally { busy.value = false }
}

async function handlePreview() {
  if (!validateEditor()) return
  busy.value = true
  try {
    const response = await previewWatchList(tickers.value, abortController.signal)
    if (response.code && response.code !== 215) throw new Error('The preview could not be generated.')
    applyPreview(response.result)
    showMessage('Preview updated.')
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to preview this watch list.' }
  finally { busy.value = false }
}

async function handleSave() {
  if (!validateEditor()) return
  busy.value = true
  try {
    const response = await saveWatchList(name.value.trim(), tickers.value, columns.value, editingUrl.value, abortController.signal)
    if ([400, 401, 403, 404, 406, 407, 443, 444, 445, 446, 500].includes(response.code)) throw new Error('The watch list could not be saved.')
    if (response.url) editingUrl.value = response.url
    if (Object.keys(response.result).length) applyPreview(response.result)
    showMessage(response.code === 203 ? 'Watch list queued for processing.' : 'Watch list saved successfully.')
    await loadRecords()
    editorOpen.value = false
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to save this watch list.' }
  finally { busy.value = false }
}


function handleWatchListSelect(option: { value: string }) {
  const record = records.value.find((item) => item.url === option.value)
  if (record) void editRecord(record, false)
}

function sortTable(key: string) {
  if (tableSortKey.value === key) tableSortDirection.value = tableSortDirection.value === 'asc' ? 'desc' : 'asc'
  else { tableSortKey.value = key; tableSortDirection.value = 'asc' }
}

async function handleDelete(record: WatchListRecord) {
  if (!window.confirm(`Delete “${record.name}”?`)) return
  busy.value = true
  try {
    await deleteWatchList(record.url, abortController.signal)
    if (editingUrl.value === record.url) resetEditor()
    showMessage(`Deleted “${record.name}”.`)
    await loadRecords()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to delete this watch list.' }
  finally { busy.value = false }
}

function heatColor(value: number, name: string) {
  const score = name.includes('Trend Score') ? value * 10 : value
  if (score <= 0) return 'var(--app-positive)'
  if (score <= 30) return 'color-mix(in srgb, var(--app-positive) 55%, var(--app-surface))'
  if (score <= 50) return 'var(--app-surface-muted)'
  if (score <= 75) return 'color-mix(in srgb, var(--app-negative) 55%, var(--app-surface))'
  return 'var(--app-negative)'
}

function downloadCsv() {
  if (!previewRows.value.length) { error.value = 'There is no preview data to export.'; return }
  const headers = ['Ticker', 'Name', 'Close', ...previewColumns.value.map((item) => item.label)]
  const keys = ['Ticker', 'Name', 'Close', ...previewColumns.value.map((item) => item.key)]
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [headers.map(quote).join(','), ...previewRows.value.map((row) => keys.map((key) => quote(row[key])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${name.value.trim() || 'Watch List'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => { resetEditor(); void loadRecords() })
onBeforeUnmount(() => abortController.abort())
</script>

<template>
  <div class="watch-list-workspace">
    <section class="watch-switcher">
      <div class="switcher-field">
        <label for="watch-list-select">Watchlist</label>
        <SearchSelect
          id="watch-list-select"
          v-model="editingUrl"
          :options="watchListOptions"
          :placeholder="recordsLoading ? 'Loading watchlists…' : 'Search watchlists'"
          empty-message="No matching watchlists."
          aria-label="Search and select a watchlist"
          :max-visible="20"
          @select="handleWatchListSelect"
        />
      </div>
      <span class="symbol-count">{{ tickers.length }} symbol{{ tickers.length === 1 ? '' : 's' }}</span>
      <div class="switcher-actions">
        <button class="outline-button" type="button" @click="openNewEditor"><Plus :size="17" />New watchlist</button>
        <button class="outline-button" type="button" :disabled="!activeRecord" @click="editorOpen = true"><Settings :size="17" />Edit watchlist</button>
      </div>
    </section>

    <section class="watch-table-card">
      <div class="table-card-heading">
        <div>
          <h2>{{ name || 'My Watchlist' }}</h2>
          <p>Data as of {{ dataDate }}</p>
        </div>
        <div class="table-actions">
          <button class="outline-button" type="button" :disabled="busy || !tickers.length" @click="handlePreview"><RefreshCw :size="17" :class="{ 'animate-spin': busy }" />Refresh</button>
          <button class="outline-button" type="button" :disabled="!previewRows.length" @click="downloadCsv"><Download :size="17" />Export</button>
        </div>
      </div>
      <div class="list-actions">
        <button class="outline-button" type="button" @click="editorOpen = true"><Plus :size="17" />Add symbols</button>
        <button class="outline-button" type="button" @click="editorOpen = true"><Settings :size="17" />Edit columns</button>
      </div>
      <div class="view-tabs">
        <button type="button" :class="{ active: previewMode === 'list' }" @click="previewMode = 'list'">Table</button>
        <button type="button" :class="{ active: previewMode === 'heatmap' }" @click="previewMode = 'heatmap'">Heatmap</button>
      </div>
      <div v-if="recordsLoading || busy" class="empty-state large"><LoaderCircle class="animate-spin" :size="22" /> Loading watchlist…</div>
      <div v-else-if="error" class="empty-state large error-text">{{ error }} <button type="button" @click="loadRecords">Try again</button></div>
      <div v-else-if="!previewRows.length" class="empty-state large">Choose a watchlist or add symbols to see market data.</div>
      <div v-else-if="previewMode === 'list'" class="data-table-wrap"><AppDataTable :columns="tableColumns" :rows="sortedTableRows" :sort-key="tableSortKey" :sort-direction="tableSortDirection" empty-message="No symbols in this watchlist." @sort="sortTable" /></div>
      <div v-else class="heatmap-wrap">
        <div v-if="heatmapGroups.length" class="heat-tabs"><button v-for="group in heatmapGroups" :key="group.name" type="button" :class="{ active: selectedHeatmap === group.name }" @click="selectedHeatmap = group.name">{{ group.name }}</button></div>
        <div v-if="activeHeatmap?.points.length" class="heat-grid"><a v-for="point in activeHeatmap.points" :key="point.ticker" :href="point.url || undefined" class="heat-cell" :style="{ background: heatColor(point.value, activeHeatmap.name) }"><strong>{{ point.ticker }}</strong><span>{{ point.value }}</span></a></div>
        <div v-else class="empty-state large">No heatmap-compatible data is available.</div>
      </div>
      <footer class="table-footer"><span>{{ previewRows.length }} symbol{{ previewRows.length === 1 ? '' : 's' }}</span><span>Values reflect the latest available market data.</span></footer>
    </section>

    <div v-if="message" class="toast">{{ message }}</div>

    <div v-if="editorOpen" class="modal-backdrop" @click.self="editorOpen = false">
      <section class="editor-modal" role="dialog" aria-modal="true" :aria-label="editingUrl ? 'Edit watchlist' : 'Create watchlist'">
        <header><h3>{{ editingUrl ? 'Edit watchlist' : 'Create watchlist' }}</h3><button class="icon-button" type="button" title="Close" @click="editorOpen = false"><X :size="18" /></button></header>
        <div v-if="error" class="status error">{{ error }}</div>
        <label class="field-label"><span>Watchlist name</span><input v-model="name" class="text-field" maxlength="120" /></label>
        <div class="field-label"><span>Symbols <small>{{ tickers.length }}/10</small></span>
          <div class="ticker-chips"><button v-for="ticker in tickers" :key="ticker" type="button" @click="removeTicker(ticker)">{{ ticker }} <X :size="13" /></button></div>
          <div class="ticker-entry"><label class="symbol-search"><Search :size="16" /><input v-model="tickerInput" list="watch-list-symbols" placeholder="Search symbols to add..." @keydown.enter.prevent="parseTickerInput" /></label><button class="outline-button" type="button" @click="parseTickerInput"><Plus :size="16" />Add</button></div>
          <datalist id="watch-list-symbols"><option v-for="option in symbolOptions" :key="option.symbol" :value="option.symbol">{{ option.company }}</option></datalist>
        </div>
        <div class="field-label"><span>Indicator columns <small>{{ columns.length }}/10</small></span>
          <div class="column-list"><div v-for="(column, index) in columns" :key="`${index}-${column.indicator}`" class="column-row"><span class="column-index">{{ index + 1 }}</span><select :value="column.indicator" class="text-field" @change="updateColumn(index, $event)"><option v-for="option in WATCH_LIST_INDICATORS" :key="option.value" :value="option.value">{{ option.label }}</option></select><button class="icon-button" type="button" title="Move up" :disabled="index === 0" @click="moveColumn(index, -1)"><ArrowUp :size="15" /></button><button class="icon-button" type="button" title="Move down" :disabled="index === columns.length - 1" @click="moveColumn(index, 1)"><ArrowDown :size="15" /></button><button class="icon-button danger" type="button" title="Remove column" :disabled="columns.length === 1" @click="columns.splice(index, 1)"><Trash2 :size="15" /></button></div></div>
          <button class="link-button" type="button" :disabled="columns.length >= 10" @click="addColumn"><Plus :size="15" />Add indicator</button>
        </div>
        <footer class="modal-actions"><button v-if="activeRecord" class="delete-button" type="button" :disabled="busy" @click="handleDelete(activeRecord)"><Trash2 :size="16" />Delete</button><span /><button class="secondary-button" type="button" @click="editorOpen = false">Cancel</button><button class="primary-button" type="button" :disabled="busy" @click="handleSave"><LoaderCircle v-if="busy" class="animate-spin" :size="16" /><Save v-else :size="16" />Save changes</button></footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.watch-list-workspace{display:grid;gap:14px;padding:16px;color:var(--app-text)}button,input,select{font:inherit}.watch-switcher,.watch-table-card{min-width:0;border:1px solid var(--app-border);border-radius:9px;background:var(--app-surface)}.watch-switcher{display:flex;align-items:flex-end;gap:12px;padding:14px}.switcher-field{width:min(430px,100%)}.switcher-field>label{display:block;margin-bottom:6px;font-size:.78rem;font-weight:700;color:var(--app-text-muted)}.symbol-count{align-self:flex-end;padding-bottom:10px;white-space:nowrap;font-size:.8rem;color:var(--app-text-muted)}.switcher-actions{display:flex;gap:10px;margin-left:auto}.outline-button,.primary-button,.secondary-button,.delete-button,.link-button{display:inline-flex;height:38px;align-items:center;justify-content:center;gap:7px;border-radius:7px;padding:0 13px;font-size:.82rem;font-weight:800}.outline-button,.secondary-button{border:1px solid var(--app-primary);background:var(--app-surface);color:var(--app-primary)}.outline-button:hover:not(:disabled),.secondary-button:hover:not(:disabled){background:var(--app-primary-soft)}.primary-button{background:var(--app-primary);color:white}.primary-button:hover:not(:disabled){background:var(--app-primary-hover)}.delete-button{color:var(--app-negative)}.link-button{height:34px;margin-top:7px;color:var(--app-primary)}button:disabled{cursor:not-allowed;opacity:.45}.icon-button{display:inline-flex;min-width:38px;height:38px;align-items:center;justify-content:center;border:1px solid var(--app-border);border-radius:7px;background:var(--app-surface);color:var(--app-text-secondary)}.icon-button:hover:not(:disabled){background:var(--app-primary-soft);color:var(--app-primary)}.danger:hover:not(:disabled){color:var(--app-negative)}.table-card-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px 6px}.table-card-heading h2{font-size:1.35rem;font-weight:850;letter-spacing:-.02em}.table-card-heading p{margin-top:2px;font-size:.78rem;color:var(--app-text-muted)}.table-actions,.list-actions{display:flex;gap:10px}.list-actions{padding:0 18px 8px}.view-tabs{display:flex;gap:4px;border-bottom:1px solid var(--app-border);padding:0 18px}.view-tabs button{border-bottom:2px solid transparent;padding:10px 16px 9px;color:var(--app-text-muted);font-size:.84rem;font-weight:800}.view-tabs button.active{border-color:var(--app-primary);color:var(--app-primary)}.empty-state{display:flex;align-items:center;justify-content:center;gap:8px;padding:30px;color:var(--app-text-muted)}.empty-state.large{min-height:220px}.error-text{color:var(--app-negative)}.error-text button{text-decoration:underline}.data-table-wrap{padding:12px 14px 4px}.table-footer{display:flex;justify-content:space-between;gap:12px;padding:10px 18px;color:var(--app-text-muted);font-size:.75rem}.heatmap-wrap{padding:16px}.heat-tabs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px}.heat-tabs button{border-radius:5px;padding:6px 11px;color:var(--app-text-muted);font-size:.78rem;font-weight:800}.heat-tabs button.active{background:var(--app-primary-soft);color:var(--app-primary)}.heat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px}.heat-cell{display:flex;min-height:82px;flex-direction:column;align-items:center;justify-content:center;border-radius:7px;color:var(--app-text);text-decoration:none;text-shadow:0 1px 1px var(--app-surface)}.toast{position:fixed;right:24px;bottom:24px;z-index:70;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);padding:11px 14px;box-shadow:0 12px 30px color-mix(in srgb,var(--app-text) 16%,transparent);font-size:.82rem;font-weight:700}.modal-backdrop{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--app-text) 36%,transparent);padding:20px}.editor-modal{width:min(680px,100%);max-height:calc(100vh - 40px);overflow:auto;border:1px solid var(--app-border);border-radius:10px;background:var(--app-surface);padding:18px;box-shadow:0 20px 60px color-mix(in srgb,var(--app-text) 24%,transparent)}.editor-modal>header{display:flex;align-items:center;justify-content:space-between}.editor-modal h3{font-size:1.05rem;font-weight:850}.field-label{display:block;margin-top:15px;font-size:.82rem;font-weight:800;color:var(--app-text-secondary)}.field-label>span{display:flex;justify-content:space-between;margin-bottom:6px}.field-label small{font-weight:600;color:var(--app-text-muted)}.text-field{width:100%;height:38px;border:1px solid var(--app-border);border-radius:7px;background:var(--app-surface);padding:0 10px;color:var(--app-text);outline:none}.text-field:focus{border-color:var(--app-primary)}.ticker-entry,.column-row{display:flex;align-items:center;gap:7px}.ticker-entry{margin-top:8px}.symbol-search{display:flex;height:38px;min-width:0;flex:1;align-items:center;gap:8px;border:1px solid var(--app-border);border-radius:7px;padding:0 10px;color:var(--app-text-muted)}.symbol-search input{min-width:0;flex:1;background:transparent;color:var(--app-text);outline:none}.ticker-chips{display:flex;flex-wrap:wrap;gap:6px}.ticker-chips button{display:inline-flex;align-items:center;gap:5px;border-radius:5px;background:var(--app-surface-muted);padding:6px 9px;color:var(--app-text-secondary);font-size:.77rem;font-weight:700}.column-list{display:grid;gap:7px}.column-index{width:25px;text-align:center;color:var(--app-text-muted)}.column-row select{flex:1}.status{margin-top:12px;border:1px solid var(--app-border);border-radius:7px;padding:9px 11px;font-size:.82rem;font-weight:700}.status.error{color:var(--app-negative)}.modal-actions{display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;border-top:1px solid var(--app-border-muted);margin-top:18px;padding-top:14px}.animate-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:900px){.watch-switcher{align-items:stretch;flex-wrap:wrap}.switcher-field{width:100%}.symbol-count{align-self:center}.switcher-actions{margin-left:0}.table-card-heading{align-items:flex-start;flex-direction:column}.table-actions{width:100%}.table-actions .outline-button{flex:1}}
@media(max-width:640px){.watch-list-workspace{padding:10px}.switcher-actions{display:grid;width:100%;grid-template-columns:1fr 1fr auto}.outline-button{padding:0 9px}.list-actions .outline-button{flex:1}.column-row{display:grid;grid-template-columns:24px minmax(0,1fr) repeat(3,38px)}.column-row select{grid-column:2/-1}.table-footer{flex-direction:column}.ticker-entry{align-items:stretch;flex-direction:column}.modal-actions{grid-template-columns:1fr 1fr}.modal-actions span{display:none}.modal-actions .delete-button{grid-column:1/-1}}
</style>
