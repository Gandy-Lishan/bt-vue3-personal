<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowUp, Download, Eye, LoaderCircle, Plus, RefreshCw, Save, Search, Trash2, X } from '@lucide/vue'
import stocks from '@/assets/stocks_list.json'
import indexes from '@/assets/indexes_list.json'
import { deleteWatchList, fetchWatchListDetail, fetchWatchLists, previewWatchList, saveWatchList } from '@/entities/my-stuff/api/watch-list.api'
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
const query = ref('')
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
const message = ref('')
const error = ref('')

const symbolOptions = computed(() => {
  const map = new Map<string, string>()
  ;([...(stocks as StockOption[]), ...(indexes as StockOption[])]).forEach((item) => {
    const symbol = String(item.stock ?? item.symbol ?? '').toUpperCase()
    if (symbol && !map.has(symbol)) map.set(symbol, String(item.name ?? ''))
  })
  return [...map.entries()].map(([symbol, company]) => ({ symbol, company }))
})
const validSymbols = computed(() => new Set(symbolOptions.value.map((item) => item.symbol)))
const filteredRecords = computed(() => {
  const term = query.value.trim().toLowerCase()
  return records.value.filter((item) => !term || item.name.toLowerCase().includes(term) || item.tickers.some((ticker) => ticker.toLowerCase().includes(term)))
})
const activeHeatmap = computed(() => heatmapGroups.value.find((group) => group.name === selectedHeatmap.value) ?? heatmapGroups.value[0])

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
  try { records.value = await fetchWatchLists(abortController.signal) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to load watch lists.' }
  finally { recordsLoading.value = false }
}

async function editRecord(record: WatchListRecord) {
  busy.value = true
  clearStatus()
  try {
    const detail = await fetchWatchListDetail(record.url, abortController.signal)
    editingUrl.value = record.url
    name.value = record.name
    tickers.value = [...record.tickers]
    columns.value = record.columns.map((item) => ({ ...item }))
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
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Unable to save this watch list.' }
  finally { busy.value = false }
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

function formatValue(value: string | number | null) {
  return value === null || value === '' || value === undefined ? '—' : String(value)
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
    <section class="watch-card">
      <div class="section-heading">
        <div><h3>Saved Watch Lists</h3><p>Open a list to view or update it.</p></div>
        <button class="icon-button" type="button" title="Refresh watch lists" :disabled="recordsLoading" @click="loadRecords"><RefreshCw :size="17" :class="{ 'animate-spin': recordsLoading }" /></button>
      </div>
      <label class="search-field"><Search :size="16" /><input v-model="query" placeholder="Search watch lists or tickers..." /></label>
      <div v-if="recordsLoading" class="empty-state"><LoaderCircle class="animate-spin" :size="22" /> Loading watch lists…</div>
      <div v-else-if="!filteredRecords.length" class="empty-state">No watch lists found.</div>
      <div v-else class="saved-list">
        <article v-for="record in filteredRecords" :key="record.url" class="saved-row" :class="{ active: editingUrl === record.url }">
          <button class="saved-main" type="button" @click="editRecord(record)">
            <strong>{{ record.name }}</strong><span>{{ record.tickers.join(', ') || 'No tickers' }}</span>
          </button>
          <span class="updated">{{ record.updatedAt ? record.updatedAt.slice(0, 10) : '—' }}</span>
          <button class="icon-button danger" type="button" title="Delete watch list" :disabled="busy" @click="handleDelete(record)"><Trash2 :size="16" /></button>
        </article>
      </div>
    </section>

    <section class="watch-card editor-card">
      <div class="section-heading">
        <div><h3>{{ editingUrl ? 'Edit Watch List' : 'Create Watch List' }}</h3><p>Choose up to 10 tickers and 10 data columns.</p></div>
        <button class="secondary-button" type="button" :disabled="busy" @click="resetEditor"><Plus :size="16" />New</button>
      </div>
      <div v-if="error" class="status error">{{ error }}</div>
      <div v-if="message" class="status success">{{ message }}</div>

      <label class="field-label"><span>1. Name</span><input v-model="name" class="text-field" maxlength="120" /></label>
      <div class="field-label"><span>2. Manage Tickers <small>{{ tickers.length }}/10</small></span>
        <div class="ticker-entry"><input v-model="tickerInput" class="text-field" list="watch-list-symbols" placeholder="Type symbols separated by commas" @keydown.enter.prevent="parseTickerInput" /><button class="secondary-button" type="button" @click="parseTickerInput">Add</button></div>
        <datalist id="watch-list-symbols"><option v-for="option in symbolOptions" :key="option.symbol" :value="option.symbol">{{ option.company }}</option></datalist>
        <div class="ticker-chips"><button v-for="ticker in tickers" :key="ticker" type="button" @click="removeTicker(ticker)">{{ ticker }} <X :size="13" /></button></div>
      </div>

      <div class="field-label"><span>3. Manage Columns <small>{{ columns.length }}/10</small></span>
        <div class="column-list">
          <div v-for="(column, index) in columns" :key="`${index}-${column.indicator}`" class="column-row">
            <span class="column-index">{{ index + 1 }}</span>
            <select :value="column.indicator" class="text-field" @change="updateColumn(index, $event)"><option v-for="option in WATCH_LIST_INDICATORS" :key="option.value" :value="option.value">{{ option.label }}</option></select>
            <button class="icon-button" type="button" title="Move up" :disabled="index === 0" @click="moveColumn(index, -1)"><ArrowUp :size="15" /></button>
            <button class="icon-button" type="button" title="Move down" :disabled="index === columns.length - 1" @click="moveColumn(index, 1)"><ArrowDown :size="15" /></button>
            <button class="icon-button danger" type="button" title="Remove column" :disabled="columns.length === 1" @click="columns.splice(index, 1)"><Trash2 :size="15" /></button>
          </div>
        </div>
        <button class="link-button" type="button" :disabled="columns.length >= 10" @click="addColumn"><Plus :size="15" />Add indicator</button>
      </div>
      <div class="editor-actions">
        <button class="secondary-button" type="button" :disabled="busy" @click="handlePreview"><Eye :size="16" />View List</button>
        <button class="primary-button" type="button" :disabled="busy" @click="handleSave"><LoaderCircle v-if="busy" class="animate-spin" :size="16" /><Save v-else :size="16" />Save Watch List</button>
      </div>
    </section>

    <section class="watch-card preview-card">
      <div class="section-heading preview-heading">
        <div><h3>Preview</h3><p>{{ previewRows.length }} ticker{{ previewRows.length === 1 ? '' : 's' }}</p></div>
        <div class="preview-actions"><div class="segmented"><button type="button" :class="{ active: previewMode === 'list' }" @click="previewMode = 'list'">List</button><button type="button" :class="{ active: previewMode === 'heatmap' }" @click="previewMode = 'heatmap'">Heatmap</button></div><button class="icon-button" type="button" title="Export CSV" @click="downloadCsv"><Download :size="17" /></button></div>
      </div>
      <div v-if="!previewRows.length" class="empty-state large">Select tickers and choose “View List” to generate a preview.</div>
      <div v-else-if="previewMode === 'list'" class="table-scroll"><table><thead><tr><th>Ticker</th><th>Name</th><th>Close</th><th v-for="column in previewColumns" :key="column.key">{{ column.label }}</th><th /></tr></thead><tbody><tr v-for="row in previewRows" :key="row.Ticker"><td><strong>{{ row.Ticker }}</strong></td><td>{{ row.Name }}</td><td>{{ formatValue(row.Close) }}</td><td v-for="column in previewColumns" :key="column.key" :class="{ negative: Number.parseFloat(String(row[column.key])) < 0 }">{{ formatValue(row[column.key]) }}</td><td><button class="icon-button danger" type="button" title="Remove ticker" @click="removeTicker(row.Ticker)"><X :size="15" /></button></td></tr></tbody></table></div>
      <div v-else class="heatmap-wrap">
        <div v-if="heatmapGroups.length" class="heat-tabs"><button v-for="group in heatmapGroups" :key="group.name" type="button" :class="{ active: selectedHeatmap === group.name }" @click="selectedHeatmap = group.name">{{ group.name }}</button></div>
        <div v-if="activeHeatmap?.points.length" class="heat-grid"><a v-for="point in activeHeatmap.points" :key="point.ticker" :href="point.url || undefined" class="heat-cell" :style="{ background: heatColor(point.value, activeHeatmap.name) }"><strong>{{ point.ticker }}</strong><span>{{ point.value }}</span></a></div>
        <div v-else class="empty-state large">No heatmap-compatible data is available.</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.watch-list-workspace{display:grid;grid-template-columns:minmax(240px,.72fr) minmax(340px,1fr);gap:16px;padding:16px}.watch-card{min-width:0;border:1px solid var(--app-border);border-radius:10px;background:var(--app-surface);padding:16px;color:var(--app-text)}.preview-card{grid-column:1/-1}.section-heading,.preview-actions,.editor-actions,.ticker-entry,.column-row{display:flex;align-items:center}.section-heading{justify-content:space-between;gap:12px;margin-bottom:14px}.section-heading h3{font-size:1rem;font-weight:800}.section-heading p{margin-top:2px;font-size:.78rem;color:var(--app-text-muted)}button,input,select{font:inherit}.icon-button{display:inline-flex;min-width:36px;height:36px;align-items:center;justify-content:center;border:1px solid var(--app-border);border-radius:7px;background:var(--app-surface);color:var(--app-text-secondary)}.icon-button:hover:not(:disabled){background:var(--app-primary-soft);color:var(--app-primary)}button:disabled{cursor:not-allowed;opacity:.45}.danger:hover:not(:disabled){color:var(--app-negative)}.search-field{display:flex;height:38px;align-items:center;gap:8px;border:1px solid var(--app-border);border-radius:7px;padding:0 10px;color:var(--app-text-muted)}.search-field input{min-width:0;flex:1;background:transparent;color:var(--app-text);outline:none}.saved-list{max-height:420px;overflow:auto;margin-top:12px}.saved-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;border-top:1px solid var(--app-border-muted);padding:8px 0}.saved-row.active{background:var(--app-primary-soft)}.saved-main{min-width:0;padding:4px 7px;text-align:left}.saved-main strong,.saved-main span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.saved-main span,.updated{font-size:.75rem;color:var(--app-text-muted)}.empty-state{display:flex;align-items:center;justify-content:center;gap:8px;padding:30px;color:var(--app-text-muted)}.empty-state.large{min-height:180px}.field-label{display:block;margin-top:16px;font-size:.82rem;font-weight:800;color:var(--app-text-secondary)}.field-label>span{display:flex;justify-content:space-between;margin-bottom:6px}.field-label small{font-weight:600;color:var(--app-text-muted)}.text-field{width:100%;height:38px;border:1px solid var(--app-border);border-radius:7px;background:var(--app-surface);padding:0 10px;color:var(--app-text);outline:none}.text-field:focus{border-color:var(--app-primary)}.ticker-entry{gap:8px}.ticker-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.ticker-chips button{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--app-border);border-radius:999px;background:var(--app-primary-soft);padding:5px 9px;color:var(--app-text-secondary);font-size:.78rem;font-weight:700}.column-list{display:grid;gap:7px}.column-row{gap:6px}.column-index{width:25px;text-align:center;color:var(--app-text-muted)}.column-row select{flex:1}.primary-button,.secondary-button,.link-button{display:inline-flex;height:38px;align-items:center;justify-content:center;gap:7px;border-radius:7px;padding:0 13px;font-size:.82rem;font-weight:800}.primary-button{background:var(--app-primary);color:white}.primary-button:hover:not(:disabled){background:var(--app-primary-hover)}.secondary-button{border:1px solid var(--app-border);background:var(--app-surface);color:var(--app-text-secondary)}.secondary-button:hover:not(:disabled),.link-button:hover:not(:disabled){background:var(--app-primary-soft);color:var(--app-primary)}.link-button{height:34px;margin-top:7px;color:var(--app-primary)}.editor-actions{justify-content:flex-end;gap:8px;margin-top:20px}.status{margin-bottom:12px;border:1px solid var(--app-border);border-radius:7px;padding:9px 11px;font-size:.82rem;font-weight:700}.status.error{color:var(--app-negative)}.status.success{background:var(--app-primary-soft);color:var(--app-text)}.preview-actions{gap:8px}.segmented{display:flex;border:1px solid var(--app-border);border-radius:7px;padding:2px}.segmented button,.heat-tabs button{border-radius:5px;padding:6px 11px;color:var(--app-text-muted);font-size:.78rem;font-weight:800}.segmented button.active,.heat-tabs button.active{background:var(--app-primary-soft);color:var(--app-primary)}.table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:.8rem}th,td{border-bottom:1px solid var(--app-border-muted);padding:10px 9px;text-align:right;white-space:nowrap}th{background:var(--app-surface-muted);color:var(--app-text-secondary);font-size:.74rem}th:first-child,th:nth-child(2),td:first-child,td:nth-child(2){text-align:left}.negative{color:var(--app-negative)}.heat-tabs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px}.heat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px}.heat-cell{display:flex;min-height:82px;flex-direction:column;align-items:center;justify-content:center;border-radius:7px;color:var(--app-text);text-decoration:none;text-shadow:0 1px 1px var(--app-surface)}.heat-cell strong{font-size:1rem}.heat-cell span{font-size:.78rem}.animate-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:900px){.watch-list-workspace{grid-template-columns:1fr}.preview-card{grid-column:auto}}
@media(max-width:640px){.watch-list-workspace{padding:10px}.watch-card{padding:12px}.column-row{display:grid;grid-template-columns:24px minmax(0,1fr) repeat(3,36px)}.column-row select{grid-column:2/-1}.preview-heading{align-items:flex-start}.preview-actions{align-items:flex-end;flex-direction:column}.saved-row{grid-template-columns:minmax(0,1fr) auto}.updated{display:none}.editor-actions{display:grid;grid-template-columns:1fr 1fr}.ticker-entry{align-items:stretch;flex-direction:column}}
</style>
