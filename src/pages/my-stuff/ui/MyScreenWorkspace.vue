<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Check, ChevronDown, ChevronUp, Copy, LoaderCircle, Pencil, Play, Plus, RefreshCw, Search, Settings2, Star, Trash2, X } from '@lucide/vue'
import { deleteMyScreen, fetchMyScreenResult, fetchMyScreens, saveMyScreen, updateMyScreenFavorite } from '@/entities/my-stuff/api/my-screen.api'
import type { MyScreenCondition, MyScreenDirection, MyScreenMode, MyScreenRow, MyScreenRunResult, MyScreenSubmitPayload } from '@/entities/my-stuff/model/my-screen.types'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'
import ScreenPreviewModal from './ScreenPreviewModal.vue'

type WorkspaceTab = 'saved' | 'build'
type BuilderMode = 'create' | 'edit' | 'view'

const emit = defineEmits<{ countChange: [count: number]; viewChange: [view: WorkspaceTab, mode: BuilderMode] }>()

const categories = ['S&P 500', 'NDX', 'Energy', 'Staples', 'Utilities', 'Materials', 'Industrials', 'Financials', 'Real Estate', 'Technology', 'Health Care', 'Discretionary', 'Communication Services', 'Custom']
const signalOptions = [
  { label: 'Trend Score', value: 'TrendScore' },
  { label: 'Historical Volatility (20-Day)', value: 'HV20' },
  { label: 'Historical Volatility (60-Day)', value: 'HV60' },
  { label: 'Symbol Close', value: 'Close' },
  { label: 'Daily Return', value: 'Change' },
  { label: 'Relative Strength Index (RSI)', value: 'RSI' },
  { label: 'Symbol Close 200-Day Moving Average', value: 'SMA200' },
  { label: 'Symbol Close 100-Day Moving Average', value: 'SMA100' },
  { label: 'Symbol Close 50-Day Moving Average', value: 'SMA50' },
  { label: 'Symbol Close 20-Day Moving Average', value: 'SMA20' },
  { label: 'Symbol Close 10-Day Moving Average', value: 'SMA10' },
  { label: 'Symbol Close 5-Day Moving Average', value: 'SMA5' },
  { label: 'Symbol Optix 50-Day Moving Average', value: 'Optix50' },
  { label: 'Symbol Optix 20-Day Moving Average', value: 'Optix20' },
  { label: 'Symbol Optix 10-Day Moving Average', value: 'Optix10' },
  { label: 'Symbol Optix 5-Day Moving Average', value: 'Optix5' },
  { label: 'Symbol Optix', value: 'Optix' },
  { label: 'Symbol Close All-Time High', value: 'SATH' },
  { label: 'Symbol Close All-Time Low', value: 'SATL' },
  { label: 'Symbol Close 52-Week High', value: 'S52WH' },
  { label: 'Symbol Close 52-Week Low', value: 'S52WL' },
  { label: 'Symbol Close 13-Week High', value: 'S13WH' },
  { label: 'Symbol Close 13-Week Low', value: 'S13WL' },
  { label: 'Symbol Close 4-Week High', value: 'S4WH' },
  { label: 'Symbol Close 4-Week Low', value: 'S4WL' },
]
const patternOptions = [
  ['triple_tap', 'Triple Tap'], ['rounding_bottom', 'Rounding Bottom'], ['descending_channel', 'Descending Channel'],
  ['ascending_channel', 'Ascending Channel'], ['head_and_shoulder_bottom', 'Head and Shoulders Bottom'],
  ['head_and_shoulder_top', 'Head and Shoulders Top'], ['double_bottom', 'Double Bottom'], ['double_top', 'Double Top'],
] as const
const dateOptions = [{ value: 0, label: 'Current bar' }, { value: -1, label: 'Previous bar' }, { value: -2, label: '2 bars ago' }, { value: -3, label: '3 bars ago' }, { value: -4, label: '4 bars ago' }]
const comparisonOptions = [{ value: 0, label: 'Greater than (>)' }, { value: 1, label: 'Equal to (=)' }, { value: 2, label: 'Less than (<)' }]

const abortController = new AbortController()
const activeTab = ref<WorkspaceTab>('saved')
const builderMode = ref<BuilderMode>('create')
const records = ref<MyScreenRow[]>([])
const selectedRecord = ref<MyScreenRow | null>(null)
const previewRecord = ref<MyScreenRow | null>(null)
const builderCollapsed = ref(false)
const resultSection = ref<HTMLElement | null>(null)
const resultSymbolsExpanded = ref(false)
const symbolsCopied = ref(false)
const runResult = ref<MyScreenRunResult | null>(null)
const listLoading = ref(false)
const running = ref(false)
const actionUrl = ref('')
const query = ref('')
const resultQuery = ref('')
const resultSort = ref('')
const page = ref(1)
const resultPage = ref(1)
const notice = ref('')
const error = ref('')
const pageSize = 10

function blankCondition(): MyScreenCondition { return { signal: 'TrendScore', condition: 0, value: '7', date: 0 } }
const draft = reactive({
  name: '', category: 'S&P 500', direction: 'Long' as MyScreenDirection, mode: 'criteria' as MyScreenMode,
  relation: 0, pattern: 'head_and_shoulder_top', tickers: '', conditions: [blankCondition()] as MyScreenCondition[],
})

const filteredRecords = computed(() => {
  const term = query.value.trim().toLowerCase()
  return records.value.filter((row) => !term || [row.name, row.category, row.direction, row.description.join(' ')].some((value) => value.toLowerCase().includes(term)))
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / pageSize)))
const pagedRecords = computed(() => filteredRecords.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const resultColumns = computed(() => runResult.value?.rows[0] ? Object.keys(runResult.value.rows[0]).filter((key) => !key.startsWith('Date')) : [])
const resultTableColumns = computed<AppDataTableColumn[]>(() => resultColumns.value.map((key) => {
  const sample = runResult.value?.rows.find((row) => row[key] !== null && row[key] !== undefined)?.[key]
  const numeric = sample !== '' && Number.isFinite(Number(sample))
  return {
    key,
    label: key,
    minWidth: key.toLowerCase() === 'symbol' ? 100 : 120,
    align: numeric ? 'right' : 'left',
    sortable: true,
    format: (value) => `${formatCell(value)}${key.includes('%') && value !== null && value !== undefined ? '%' : ''}`,
    cellClass: () => key.toLowerCase() === 'symbol' ? 'font-extrabold text-[var(--app-primary)]' : 'text-[var(--app-text-secondary)]',
  }
}))
const filteredResultRows = computed(() => {
  const term = resultQuery.value.trim().toLowerCase()
  const rows = (runResult.value?.rows ?? []).filter((row) => !term || Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term)))
  const [key, direction] = resultSort.value.split(':')
  if (!key || !direction) return rows
  return [...rows].sort((left, right) => {
    const a = left[key]
    const b = right[key]
    const aNumber = Number(a)
    const bNumber = Number(b)
    const comparison = Number.isFinite(aNumber) && Number.isFinite(bNumber) ? aNumber - bNumber : String(a ?? '').localeCompare(String(b ?? ''))
    return direction === 'asc' ? comparison : -comparison
  })
})
const resultPageCount = computed(() => Math.max(1, Math.ceil(filteredResultRows.value.length / pageSize)))
const pagedResultRows = computed(() => filteredResultRows.value.slice((resultPage.value - 1) * pageSize, resultPage.value * pageSize))
const validationMessage = computed(() => {
  if (!draft.name.trim()) return 'Give this screen a clear name.'
  if (draft.category === 'Custom' && !tickerList().length) return 'Add at least one ticker for a custom universe.'
  if (draft.mode === 'criteria' && draft.conditions.some((condition) => !condition.signal || !String(condition.value).trim())) return 'Complete every rule before running the screen.'
  return ''
})
const builderSummary = computed(() => {
  const universe = draft.category === 'Custom' ? `${tickerList().length} selected stocks` : `${draft.category} stocks`
  if (draft.mode === 'pattern') {
    const pattern = patternOptions.find(([value]) => value === draft.pattern)?.[1] ?? draft.pattern
    return `Find ${universe} currently matching the ${pattern} pattern.`
  }
  const clauses = draft.conditions.map((condition) => {
    const signal = signalOptions.find((item) => item.value === condition.signal)?.label ?? condition.signal
    const comparison = ['above', 'equal to', 'below'][condition.condition] ?? 'equal to'
    const timing = condition.date === 0 ? 'now' : condition.date === -1 ? 'one bar ago' : `${Math.abs(condition.date)} bars ago`
    return `${signal} ${condition.date === 0 ? 'is' : 'was'} ${comparison} ${condition.value} ${timing}`
  })
  const relation = draft.relation === 2 ? ' OR ' : ' AND '
  return `Find ${universe} where ${clauses.join(relation)}.`
})
const collapsedSummary = computed(() => {
  const universe = draft.category === 'Custom' ? 'the selected stocks' : `${draft.category} stocks`
  if (draft.mode === 'pattern') {
    const pattern = patternOptions.find(([value]) => value === draft.pattern)?.[1] ?? draft.pattern
    return `Finds ${universe} currently matching the ${pattern} pattern.`
  }
  const clauses = draft.conditions.map((condition) => {
    const signal = signalOptions.find((item) => item.value === condition.signal)?.label ?? condition.signal
    const comparison = ['above', 'equal to', 'below'][condition.condition] ?? 'equal to'
    const timing = condition.date === 0 ? 'current' : condition.date === -1 ? 'one bar ago' : `${Math.abs(condition.date)} bars ago`
    return `${timing} ${signal} ${comparison} ${condition.value}`
  })
  return `Finds ${universe} with ${clauses.join(draft.relation === 2 ? ' or ' : ' and ')}.`
})
const resultDate = computed(() => {
  const firstRow = runResult.value?.rows[0]
  const dateEntry = firstRow ? Object.entries(firstRow).find(([key]) => key.toLowerCase().startsWith('date')) : undefined
  return String(dateEntry?.[1] ?? selectedRecord.value?.lastSignalDate ?? '').trim()
})
const resultDefinition = computed(() => selectedRecord.value
  ? descriptionText(selectedRecord.value)
  : builderSummary.value.replace(/^Find\s+.+?\s+where\s+/i, '').replace(/\.$/, ''))
const resultSymbolList = computed(() => {
  const symbols = (runResult.value?.rows ?? [])
    .map((row) => row.Symbol ?? row.symbol ?? row.Stock ?? row.stock)
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
  return [...new Set(symbols)]
})
const resultSymbols = computed(() => resultSymbolList.value.join(', '))
const canExpandResultSymbols = computed(() => resultSymbolList.value.length > 20)

watch(query, () => { page.value = 1 })
watch([resultQuery, resultSort], () => { resultPage.value = 1 })
watch(() => draft.relation, (value) => {
  if (value === 0) draft.conditions.splice(1)
  else if (draft.conditions.length === 1) draft.conditions.push(blankCondition())
})

function tickerList() { return draft.tickers.split(/[\s,;]+/).map((item) => item.trim().toUpperCase()).filter(Boolean) }
function conditionLabel(condition: MyScreenCondition) {
  const signal = signalOptions.find((item) => item.value === condition.signal)?.label ?? condition.signal
  const comparison = comparisonOptions.find((item) => item.value === condition.condition)?.label.replace(/ \(.+\)/, '') ?? '='
  const date = dateOptions.find((item) => item.value === condition.date)?.label ?? 'Current bar'
  return `${date}: ${signal} ${comparison.toLowerCase()} ${condition.value}`
}
function cleanScreenRule(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+(?:and|or)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}
function descriptionText(row: MyScreenRow) { return row.description.map(cleanScreenRule).filter(Boolean).join(' ') || 'No rule description' }
function screenRuleItems(row: MyScreenRow) {
  const descriptions = row.description.map(cleanScreenRule).filter(Boolean)
  if (descriptions.length) return descriptions
  if (row.conditions.length) return row.conditions.map(conditionLabel)
  return ['No rule description']
}
function screenRuleRelationship(row: MyScreenRow) { return row.relation === 2 ? 'OR' : row.relation === 1 ? 'AND' : '' }
function showNotice(message: string) { notice.value = message; window.setTimeout(() => { if (notice.value === message) notice.value = '' }, 3500) }
function resetDraft() {
  Object.assign(draft, { name: '', category: 'S&P 500', direction: 'Long', mode: 'criteria', relation: 0, pattern: 'head_and_shoulder_top', tickers: '' })
  draft.conditions = [blankCondition()]
  selectedRecord.value = null
  runResult.value = null
  builderMode.value = 'create'
  resultQuery.value = ''
  resultSort.value = ''
}
function showSaved() { activeTab.value = 'saved'; emit('viewChange', 'saved', builderMode.value) }
function startNew() { resetDraft(); builderCollapsed.value = false; resultSymbolsExpanded.value = false; activeTab.value = 'build'; emit('viewChange', 'build', builderMode.value) }
defineExpose({ showSaved })
function loadIntoDraft(row: MyScreenRow) {
  selectedRecord.value = row
  Object.assign(draft, {
    name: row.name, category: row.category, direction: row.direction, mode: row.systemPattern ? 'pattern' : 'criteria',
    relation: row.conditions.length > 1 ? (row.relation || 1) : 0, pattern: row.systemPattern || 'head_and_shoulder_top', tickers: row.tickers.join(', '),
  })
  draft.conditions = row.conditions.length ? row.conditions.map((item) => ({ ...item })) : [blankCondition()]
}
function editRecord(row: MyScreenRow) { loadIntoDraft(row); builderMode.value = 'edit'; builderCollapsed.value = false; resultSymbolsExpanded.value = false; runResult.value = null; activeTab.value = 'build'; emit('viewChange', 'build', builderMode.value) }
function editFromPreview(row: MyScreenRow) { previewRecord.value = null; editRecord(row) }
function viewFromPreview(row: MyScreenRow) { previewRecord.value = null; void viewRecord(row) }
async function viewRecord(row: MyScreenRow) {
  loadIntoDraft(row); builderMode.value = 'view'; builderCollapsed.value = true; resultSymbolsExpanded.value = false; runResult.value = null; activeTab.value = 'build'; emit('viewChange', 'build', builderMode.value); actionUrl.value = row.url
  await nextTick()
  resultSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  try { runResult.value = await fetchMyScreenResult(row.url, row, abortController.signal) }
  catch { showNotice('Screen results could not be loaded.') }
  finally { actionUrl.value = '' }
}
async function loadRecords() {
  listLoading.value = true; error.value = ''
  try { records.value = await fetchMyScreens(abortController.signal) }
  catch (cause) { records.value = []; error.value = cause instanceof Error ? cause.message : 'Unable to load screens.' }
  finally { listLoading.value = false; emit('countChange', records.value.length) }
}
async function removeRecord(row: MyScreenRow) {
  if (!window.confirm(`Delete “${row.name}”?`)) return
  actionUrl.value = row.url
  try { await deleteMyScreen(row.url, abortController.signal); showNotice(`Deleted “${row.name}”.`); await loadRecords() }
  catch { showNotice('Screen could not be deleted.') }
  finally { actionUrl.value = '' }
}
async function toggleFavorite(row: MyScreenRow) {
  actionUrl.value = row.url
  try { await updateMyScreenFavorite(row.url, !row.favorite, abortController.signal); row.favorite = !row.favorite }
  catch { showNotice('Favorite could not be updated.') }
  finally { actionUrl.value = '' }
}
function buildPayload(): MyScreenSubmitPayload {
  const descriptions = draft.mode === 'pattern'
    ? [`Common Pattern: ${patternOptions.find(([value]) => value === draft.pattern)?.[1] ?? draft.pattern}`]
    : draft.conditions.map(conditionLabel)
  const signals = draft.mode === 'pattern'
    ? [{ signal: patternOptions.find(([value]) => value === draft.pattern)?.[1] ?? draft.pattern, condition: 1, value: 1 }]
    : draft.conditions.map(({ signal, condition, value }) => ({ signal, condition, value }))
  return {
    name: draft.name.trim(), category: draft.category, direction: draft.direction,
    relation: draft.mode === 'pattern' || draft.conditions.length === 1 ? 0 : draft.relation,
    score: draft.mode === 'criteria' && draft.relation === 1 ? draft.conditions.length : 1,
    start_date: '2005-01-01', end_date: '2050-01-01', signals: JSON.stringify(signals),
    description: JSON.stringify(descriptions), dates: JSON.stringify(draft.conditions.map((item) => item.date)),
    ...(draft.category === 'Custom' ? { sector_lists: JSON.stringify(tickerList()) } : {}),
    ...(draft.mode === 'pattern' ? { system_pattern: draft.pattern } : {}),
  }
}
async function runScreen() {
  if (validationMessage.value) { showNotice(validationMessage.value); return }
  running.value = true
  try {
    const result = await saveMyScreen(buildPayload(), builderMode.value === 'edit' ? selectedRecord.value?.url : '', abortController.signal)
    if (![211, 213, 214].includes(result.code)) { showNotice(result.message || 'Screen could not be run.'); return }
    runResult.value = result; resultSymbolsExpanded.value = false; builderMode.value = 'view'; showNotice('Screen completed successfully.'); await loadRecords()
    const updated = records.value.find((row) => row.url === result.url); if (updated) selectedRecord.value = updated
  } catch { showNotice('Screen could not be run. Please try again.') }
  finally { running.value = false }
}
function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (Number.isFinite(number) && typeof value !== 'boolean') return Number(number.toFixed(2)).toLocaleString()
  return String(value)
}
function sortResultTable(key: string) {
  const [currentKey, currentDirection] = resultSort.value.split(':')
  resultSort.value = `${key}:${currentKey === key && currentDirection === 'asc' ? 'desc' : 'asc'}`
}
async function copyResultSymbols() {
  if (!resultSymbols.value) return
  try {
    await navigator.clipboard.writeText(resultSymbols.value)
    symbolsCopied.value = true
    window.setTimeout(() => { symbolsCopied.value = false }, 1800)
  } catch {
    showNotice('Symbols could not be copied.')
  }
}

onMounted(loadRecords)
onBeforeUnmount(() => abortController.abort())
</script>

<template>
  <div class="pb-4">
    <div v-if="notice" class="mx-4 mt-4 flex items-center justify-between rounded-md border border-[var(--app-border-muted)] bg-[var(--app-primary-soft)] px-3 py-2 text-sm font-semibold"><span>{{ notice }}</span><button type="button" @click="notice = ''"><X :size="16" /></button></div>
    <div v-show="activeTab === 'saved'">
      <div class="grid gap-2 border-b border-[var(--app-border-muted)] px-4 py-3 md:grid-cols-[minmax(260px,1fr)_auto_auto]">
        <label class="screen-input flex items-center"><Search :size="16" class="mr-2 text-[var(--app-text-muted)]" /><input v-model="query" class="w-full bg-transparent outline-none" placeholder="Search screens..." /></label>
        <button class="screen-secondary" type="button" @click="loadRecords"><RefreshCw :size="16" :class="{ 'animate-spin': listLoading }" />Refresh</button>
        <button class="screen-primary" type="button" @click="startNew"><Plus :size="17" />New Screen</button>
      </div>
      <div v-if="error" class="mx-4 mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ error }} <button class="font-bold underline" @click="loadRecords">Retry</button></div>
      <div class="p-4">
        <section class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[900px] border-collapse text-left text-[0.8125rem] text-[var(--app-text)]">
              <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold"><tr class="border-b border-[var(--app-border)]"><th class="w-12 px-2 py-2.5"><span class="sr-only">Favorite</span></th><th class="px-4 py-2.5">Name</th><th class="px-4 py-2.5">Universe</th><th class="px-4 py-2.5">Direction</th><th class="px-4 py-2.5">Screen rules</th><th class="w-[140px] px-4 py-2.5 text-right">Actions</th></tr></thead>
              <tbody>
                <tr v-if="listLoading"><td colspan="6" class="h-36 text-center text-[var(--app-text-muted)]">Loading screens...</td></tr>
                <tr v-else-if="!pagedRecords.length"><td colspan="6" class="h-36 text-center text-[var(--app-text-muted)]">No screens found. Create one to get started.</td></tr>
                <template v-for="row in pagedRecords" :key="row.id">
                  <tr class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]">
                    <td class="px-2 py-2.5 text-center"><button class="screen-icon" type="button" title="Favorite" :aria-label="`Favorite ${row.name}`" @click="toggleFavorite(row)"><Star :size="16" :class="row.favorite ? 'fill-[var(--app-favorite)] text-[var(--app-favorite)]' : ''" /></button></td>
                    <td class="px-4 py-2.5"><button class="font-extrabold hover:text-[var(--app-primary)]" type="button" @click="viewRecord(row)">{{ row.name }}</button></td>
                    <td class="px-4 py-2.5 text-[var(--app-text-secondary)]">{{ row.category }}</td><td class="px-4 py-2.5"><span class="screen-pill">{{ row.direction }}</span></td>
                    <td class="min-w-[360px] px-4 py-2.5">
                      <p class="screen-rules" :title="descriptionText(row)">
                        <template v-for="(rule, index) in screenRuleItems(row)" :key="`${row.id}-${index}`">
                          <span v-if="index && screenRuleRelationship(row)" class="screen-rule-relationship">{{ screenRuleRelationship(row) }}</span>
                          <span class="screen-rule-condition">{{ rule }}</span>
                        </template>
                      </p>
                    </td>
                    <td class="px-4 py-2.5"><div class="flex justify-end gap-1"><button class="screen-icon" title="Preview" aria-label="Preview screen" @click="previewRecord = row"><Settings2 :size="16" /></button><button class="screen-icon" title="Edit" aria-label="Edit screen" @click="editRecord(row)"><Pencil :size="16" /></button><button class="screen-icon screen-icon--danger" title="Delete screen" :aria-label="`Delete ${row.name}`" @click="removeRecord(row)"><Trash2 :size="16" /></button></div></td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <footer class="border-t border-[var(--app-border)] px-4 py-3"><IndicatorPagination :page="page" :page-count="pageCount" :total="filteredRecords.length" item-label="screens" @change="page = $event" /></footer>
        </section>
      </div>
    </div>

    <div v-show="activeTab === 'build'" class="space-y-4 p-4">
      <section class="screen-builder">
        <header v-if="builderMode === 'view'" class="screen-collapsed-header"><div><strong>Screen conditions</strong><span>{{ draft.category }} · {{ draft.mode === 'pattern' ? 'Common pattern' : `${draft.conditions.length} condition${draft.conditions.length === 1 ? '' : 's'}` }}</span><p>{{ collapsedSummary }}</p></div><button class="screen-secondary" type="button" :aria-expanded="!builderCollapsed" @click="builderCollapsed = !builderCollapsed">{{ builderCollapsed ? 'Show conditions' : 'Hide conditions' }}<ChevronDown v-if="builderCollapsed" :size="15" /><ChevronUp v-else :size="15" /></button></header>
        <div v-show="!builderCollapsed" class="p-5">
          <div class="space-y-5">
            <section class="screen-panel"><div class="screen-step"><span>1</span><div><h4>Name &amp; universe</h4><p>Where should this screen look?</p></div></div><div class="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1.2fr)_minmax(130px,.55fr)_minmax(220px,1fr)]"><label class="screen-field"><span>Screen name</span><input v-model="draft.name" placeholder="e.g. Oversold large caps" /><small v-if="!draft.name.trim()" class="screen-field-error">Give this screen a clear name.</small></label><label class="screen-field"><span>Direction</span><select v-model="draft.direction"><option>Long</option><option>Short</option></select></label><label class="screen-field"><span>Universe</span><select v-model="draft.category"><option v-for="category in categories" :key="category">{{ category }}</option></select><small>Pick a market group, or choose Custom to paste your own ticker list.</small></label><label v-if="draft.category === 'Custom'" class="screen-field md:col-span-3"><span>Custom tickers</span><textarea v-model="draft.tickers" rows="3" placeholder="AAPL, MSFT, NVDA" /><small v-if="!tickerList().length" class="screen-field-error">Add at least one ticker for a custom universe.</small><small v-else>Separate symbols with commas, spaces, or new lines.</small></label></div></section>
            <section class="screen-panel"><div class="screen-step"><span>2</span><div><h4>Screen method</h4><p>Build rules or choose a chart pattern.</p></div></div><div class="mt-4 grid grid-cols-2 gap-2"><button class="screen-choice" :class="{ 'screen-choice--active': draft.mode === 'criteria' }" @click="draft.mode = 'criteria'">Rule builder</button><button class="screen-choice" :class="{ 'screen-choice--active': draft.mode === 'pattern' }" @click="draft.mode = 'pattern'">Common pattern</button></div>
              <div v-if="draft.mode === 'criteria'" class="mt-4 space-y-3"><label class="screen-field"><span>How should two rules work together?</span><select v-model.number="draft.relation"><option :value="0">One rule only</option><option :value="1">AND — both rules must match</option><option :value="2">OR — either rule may match</option></select></label><article v-for="(condition, index) in draft.conditions" :key="index" class="screen-condition-row"><span class="screen-condition-number">{{ index + 1 }}</span><div class="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(180px,1.4fr)_minmax(150px,1fr)_minmax(160px,1fr)_minmax(140px,.8fr)]"><label class="screen-field"><span>Measure</span><select v-model="condition.signal"><option v-for="option in signalOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><label class="screen-field"><span>Comparison</span><select v-model.number="condition.condition"><option v-for="option in comparisonOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><label class="screen-field"><span>Value or another measure</span><input v-model="condition.value" list="screen-value-options" placeholder="e.g. 7 or SMA20" /><small v-if="!String(condition.value).trim()" class="screen-field-error">Enter a value or measure.</small></label><label class="screen-field"><span>When</span><select v-model.number="condition.date"><option v-for="option in dateOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label></div></article><datalist id="screen-value-options"><option v-for="option in signalOptions" :key="option.value" :value="option.label" /></datalist></div>
              <label v-else class="screen-field mt-4"><span>Pattern</span><select v-model="draft.pattern"><option v-for="option in patternOptions" :key="option[0]" :value="option[0]">{{ option[1] }}</option></select><small>The screen finds symbols currently matching this technical formation.</small></label>
            </section>
            <div class="screen-run-bar">
              <p>{{ builderSummary }}</p>
              <div class="screen-run-actions">
              <button class="screen-run" type="button" :disabled="running || Boolean(validationMessage)" @click="runScreen"><LoaderCircle v-if="running" :size="17" class="animate-spin" /><Play v-else :size="17" />{{ running ? 'Running screen...' : selectedRecord && builderMode === 'edit' ? 'Save & run screen' : 'Run screen' }}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref="resultSection" class="screen-builder scroll-mt-4">
        <header class="border-b border-[var(--app-border-muted)] p-5"><p class="screen-eyebrow">Results</p><h3 class="mt-1 text-xl font-extrabold">Screen Result</h3><p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ selectedRecord?.name || draft.name || 'Run a screen to see matching symbols.' }}</p></header>
        <div v-if="runResult" class="screen-result-summary"><p><strong>Date:</strong> {{ resultDate || '—' }}<span v-if="resultDefinition" class="screen-result-definition">{{ resultDefinition }}</span></p><div><div class="result-symbol-heading"><strong>Symbols:</strong><button v-if="resultSymbols" type="button" :title="symbolsCopied ? 'Copied' : 'Copy all symbols'" :aria-label="symbolsCopied ? 'Symbols copied' : 'Copy all symbols'" @click="copyResultSymbols"><Check v-if="symbolsCopied" :size="14" /><Copy v-else :size="14" /></button></div><p class="result-symbol-list" :class="{ 'result-symbol-list--collapsed': canExpandResultSymbols && !resultSymbolsExpanded }">{{ resultSymbols || 'No matching symbols.' }}</p><button v-if="canExpandResultSymbols" class="result-symbol-toggle" type="button" :aria-expanded="resultSymbolsExpanded" @click="resultSymbolsExpanded = !resultSymbolsExpanded">{{ resultSymbolsExpanded ? 'Show less' : `Show all ${resultSymbolList.length} stocks` }}<ChevronUp v-if="resultSymbolsExpanded" :size="13" /><ChevronDown v-else :size="13" /></button></div></div>
        <template v-if="runResult?.rows.length">
          <div class="grid gap-2 border-b border-[var(--app-border-muted)] p-4 md:grid-cols-[minmax(220px,1fr)_220px]"><label class="screen-input flex items-center"><Search :size="15" class="mr-2" /><input v-model="resultQuery" class="w-full bg-transparent outline-none" placeholder="Search result rows" /></label><select v-model="resultSort" class="screen-input"><option value="">Sort by: Default</option><template v-for="column in resultColumns" :key="column"><option :value="`${column}:asc`">{{ column }}: Low to high</option><option :value="`${column}:desc`">{{ column }}: High to low</option></template></select></div>
          <div class="p-4"><AppDataTable :columns="resultTableColumns" :rows="pagedResultRows" :sort-key="resultSort.split(':')[0]" :sort-direction="resultSort.split(':')[1] === 'desc' ? 'desc' : 'asc'" empty-message="No matching stocks found." @sort="sortResultTable" /></div>
          <footer class="border-t border-[var(--app-border)] px-4 py-3"><IndicatorPagination :page="resultPage" :page-count="resultPageCount" :total="filteredResultRows.length" item-label="matches" @change="resultPage = $event" /></footer>
        </template>
        <div v-else class="flex min-h-56 flex-col items-center justify-center px-6 text-center"><Search :size="34" class="text-[var(--app-primary)]" /><h4 class="mt-3 text-base font-extrabold">No result rows yet</h4><p class="mt-1 max-w-md text-sm text-[var(--app-text-muted)]">Build and run a screen above, or open a saved screen from the list.</p></div>
      </section>
    </div>

    <ScreenPreviewModal v-if="previewRecord" :row="previewRecord" @close="previewRecord = null" @edit="editFromPreview" @view-results="viewFromPreview" />
  </div>
</template>

<style scoped>
.screen-tab{display:flex;height:3.25rem;flex-shrink:0;align-items:center;border-bottom:2px solid transparent;padding:0 1rem;font-size:.875rem;font-weight:800;color:var(--app-text-muted);transition:.2s}.screen-tab:hover{color:var(--app-text)}.screen-tab--active{border-color:var(--app-primary);color:var(--app-primary)}.screen-count{margin-left:.5rem;border-radius:999px;background:var(--app-primary-soft-alt);padding:.125rem .5rem;font-size:.75rem}.screen-input{height:2.25rem;min-width:0;border:1px solid var(--app-border);border-radius:.375rem;background:var(--app-surface);padding:0 .625rem;font-size:.8125rem}.screen-primary{display:inline-flex;height:2.25rem;align-items:center;justify-content:center;gap:.375rem;border-radius:.375rem;background:var(--app-primary);padding:0 .75rem;font-size:.8125rem;font-weight:800;color:white}.screen-primary:hover{background:var(--app-primary-hover)}.screen-secondary{display:inline-flex;height:2.25rem;align-items:center;justify-content:center;gap:.375rem;border:1px solid var(--app-border);border-radius:.375rem;background:var(--app-surface);padding:0 .75rem;font-size:.8125rem;font-weight:700;color:var(--app-text-secondary)}.screen-secondary:hover{background:var(--app-surface-soft)}.screen-icon{display:inline-flex;height:2rem;width:2rem;align-items:center;justify-content:center;border-radius:.375rem;color:var(--app-text-muted)}.screen-icon:hover{background:var(--app-primary-soft);color:var(--app-primary)}.screen-icon--danger:hover{color:var(--app-negative)}.screen-pill{display:inline-flex;border-radius:.375rem;background:var(--app-primary-soft);padding:.2rem .5rem;font-size:.75rem;font-weight:800;color:var(--app-primary)}.screen-rules{display:flex;flex-wrap:wrap;align-items:center;gap:.375rem;color:var(--app-text-secondary);line-height:1.4}.screen-rule-condition{display:inline-flex;min-height:1.625rem;max-width:100%;align-items:center;overflow:hidden;border:1px solid var(--app-border);border-radius:9999px;background:var(--app-surface-muted);padding:.1875rem .5625rem;white-space:nowrap;text-overflow:ellipsis}.screen-rule-relationship{display:inline-flex;min-width:2rem;height:1.5rem;flex:0 0 auto;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--app-primary) 30%,var(--app-border));border-radius:9999px;background:var(--app-primary-soft);padding:0 .375rem;color:var(--app-primary);font-size:.625rem;font-weight:800;line-height:1}.screen-eyebrow{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--app-text-muted)}.screen-builder,.screen-panel{border:1px solid var(--app-border-muted);border-radius:.5rem;background:var(--app-surface)}.screen-step{display:flex;align-items:center;gap:.75rem}.screen-step>span{display:flex;height:2rem;width:2rem;flex:none;align-items:center;justify-content:center;border-radius:999px;background:var(--app-primary);font-size:.8rem;font-weight:900;color:white}.screen-step h4{font-size:.9rem;font-weight:800}.screen-step p{font-size:.75rem;color:var(--app-text-muted)}.screen-panel{padding:1rem}.screen-condition-row{display:flex;align-items:center;gap:.75rem;border:1px solid var(--app-border-muted);border-radius:.5rem;background:var(--app-surface-soft);padding:1rem}.screen-condition-number{display:flex;height:2rem;width:2rem;flex:0 0 2rem;align-items:center;justify-content:center;border-radius:9999px;background:var(--app-primary);color:#fff;font-size:.8rem;font-weight:900}.screen-field{display:flex;min-width:0;flex-direction:column;gap:.35rem}.screen-field>span{font-size:.75rem;font-weight:800;color:var(--app-text-secondary)}.screen-field input,.screen-field select,.screen-field textarea{width:100%;border:1px solid var(--app-border);border-radius:.375rem;background:var(--app-surface);padding:.58rem .65rem;font-size:.8125rem;outline:none}.screen-field input:focus,.screen-field select:focus,.screen-field textarea:focus{border-color:var(--app-primary);box-shadow:0 0 0 2px var(--app-primary-soft)}.screen-field small{font-size:.7rem;color:var(--app-text-muted)}.screen-choice{border:1px solid var(--app-border);border-radius:.375rem;padding:.65rem;font-size:.8125rem;font-weight:800;color:var(--app-text-secondary)}.screen-choice--active{border-color:var(--app-primary);background:var(--app-primary-soft);color:var(--app-primary)}.screen-run{display:flex;width:100%;height:2.75rem;align-items:center;justify-content:center;gap:.5rem;border-radius:.4rem;background:var(--app-primary);font-size:.875rem;font-weight:900;color:white}.screen-run:hover:not(:disabled){background:var(--app-primary-hover)}.screen-run:disabled{cursor:not-allowed;opacity:.5}
.screen-panel>.mt-4.space-y-3>.screen-field:first-child{max-width:50%}.screen-run{width:auto;padding:0 1.25rem}
.screen-step>span,.screen-condition-number{background:var(--app-primary-soft);color:var(--app-primary)}.screen-field>span{color:var(--app-text-muted)}.screen-field .screen-field-error{color:var(--app-negative);font-size:.68rem;font-weight:400}.screen-run-bar{display:flex;min-height:4.25rem;align-items:center;justify-content:space-between;gap:1rem;border-radius:.5rem;background:var(--app-surface-muted);padding:.75rem}.screen-run-bar>p{min-width:0;color:var(--app-text-secondary);font-size:.875rem;line-height:1.5}.screen-run-actions{display:flex;flex:none;flex-direction:column;align-items:flex-end}.screen-run-actions .screen-run{min-width:9.5rem}.screen-run-actions>p{max-width:22rem}
.screen-collapsed-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem}.screen-collapsed-header>div{display:grid;gap:.15rem}.screen-collapsed-header strong{font-size:.875rem}.screen-collapsed-header span{color:var(--app-text-muted);font-size:.72rem}.screen-collapsed-header p{margin-top:.25rem;color:var(--app-text-secondary);font-size:.78rem;line-height:1.45}
.screen-result-summary{display:grid;gap:.75rem;border-bottom:1px solid var(--app-border-muted);background:var(--app-surface-soft);padding:1rem 1.25rem;color:var(--app-text-secondary);font-size:.8125rem;line-height:1.6}.screen-result-summary strong{color:var(--app-text);font-weight:800}.screen-result-definition{margin-left:1rem}.result-symbol-heading{display:flex;align-items:center;gap:.4rem}.result-symbol-heading button{display:inline-flex;width:1.65rem;height:1.65rem;align-items:center;justify-content:center;border-radius:.3rem;color:var(--app-text-muted)}.result-symbol-heading button:hover{background:var(--app-primary-soft);color:var(--app-primary)}.result-symbol-list{margin-top:.2rem;overflow-wrap:anywhere}.result-symbol-list--collapsed{max-height:3.2em;overflow:hidden}.result-symbol-toggle{display:inline-flex;align-items:center;gap:.2rem;margin-top:.35rem;color:var(--app-primary);font-size:.72rem;font-weight:800}.result-symbol-toggle:hover{text-decoration:underline}
@media(max-width:760px){.screen-panel>.mt-4.space-y-3>.screen-field:first-child{max-width:none}.screen-condition-row{align-items:flex-start;flex-direction:column}.screen-run-bar{align-items:stretch;flex-direction:column}.screen-run-actions{align-items:stretch}.screen-run-actions .screen-run{width:100%}}
</style>
