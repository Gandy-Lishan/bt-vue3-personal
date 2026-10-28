<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ArrowRight, BarChart3, Check, ChevronDown, ChevronUp, CircleCheck, Clock3, Copy, Info, Layers3, PlayCircle, Plus, Settings, Trash2 } from '@lucide/vue'
import indexesData from '@/assets/indexes_list.json'
import stocksData from '@/assets/stocks_list.json'
import { fetchMySignals } from '@/entities/my-stuff/api/my-signal.api'
import { fetchSentimentIndicatorOptions, type SignalIndicatorOption } from '@/entities/my-stuff/api/sentiment-indicator.api'
import type { MySignalRow } from '@/entities/my-stuff/model/my-signal.types'
import {
  findTechnicalIndicator,
  resetTechnicalFields,
  technicalConditionComplete,
  technicalConditionSentence,
  technicalIndicatorOptions,
  type TechnicalConditionFields,
} from '@/entities/my-stuff/model/technical-indicator'
import {
  resetSymbolFields,
  symbolConditionComplete,
  symbolConditionSentence,
  type SymbolConditionFields,
} from '@/entities/my-stuff/model/symbol-condition'
import { userIndicatorConditionComplete, type UserIndicatorFields } from '@/entities/my-stuff/model/user-indicator'
import SearchSelect from '@/shared/ui/SearchSelect.vue'
import { hasFormValue } from '@/shared/utils/form-value'
import TechnicalConditionEditor from './ui/TechnicalConditionEditor.vue'
import SymbolConditionEditor from './ui/SymbolConditionEditor.vue'
import UserIndicatorEditor from './ui/UserIndicatorEditor.vue'

type LogicType = 'single' | 'samebar' | 'timeorder'
type ConditionType = 'Sentiment' | 'Symbol OHLCV' | 'Technical' | 'User'
type SentimentBasis = 'value' | 'movingAverage' | 'valueVsMovingAverage'
interface BuilderCondition extends TechnicalConditionFields, SymbolConditionFields, UserIndicatorFields {
  id: number
  type: ConditionType
  indicator: string
  comparison: string
  value: string | number
  sentimentBasis: SentimentBasis
  maType: 'S' | 'E'
  maPeriod: string | number
  calculation: number
  calculationPeriod: string | number
}

const comparisonOptions = [
  { value: '>', label: 'Above (>)' },
  { value: '=', label: 'Equals (=)' },
  { value: '<', label: 'Below (<)' },
  { value: 'CrossAbove', label: 'Crosses above' },
  { value: 'CrossBelow', label: 'Crosses below' },
]
const sentimentCalculationOptions = [
  { value: 0, label: 'Above (>)', short: 'above' },
  { value: 1, label: 'Equals (=)', short: 'equal to' },
  { value: 2, label: 'Below (<)', short: 'below' },
  { value: 3, label: 'Crosses above', short: 'crosses above' },
  { value: 4, label: 'Crosses below', short: 'crosses below' },
  { value: 5, label: 'Rate of Change', short: 'rate of change' },
  { value: 6, label: '% of Previous Range', short: '% of previous range' },
  { value: 7, label: 'MA Ratio', short: 'MA ratio' },
  { value: 8, label: 'Range Rank', short: 'range rank' },
  { value: 9, label: 'DrawDown %', short: 'drawdown' },
  { value: 10, label: 'DrawUp %', short: 'drawup' },
  { value: 11, label: 'Net Change', short: 'net change' },
  { value: 12, label: 'All-time High', short: 'all-time high' },
  { value: 13, label: 'All-time Low', short: 'all-time low' },
  { value: 14, label: 'Consecutive Bars Above', short: 'consecutive bars above' },
  { value: 15, label: 'Consecutive Bars Below', short: 'consecutive bars below' },
  { value: 16, label: 'N-Bars High', short: 'N-bars high' },
  { value: 17, label: 'N-Bars Low', short: 'N-bars low' },
  { value: 18, label: 'N-Bars Ago', short: 'N-bars ago' },
]
const conditionTypeOptions: Array<{ value: ConditionType; label: string }> = [
  { value: 'Sentiment', label: 'Sentiment Indicator' },
  { value: 'Technical', label: 'Technical Indicator' },
  { value: 'Symbol OHLCV', label: 'Symbol OHLCV' },
  { value: 'User', label: 'User-Defined Input' },
]
function conditionTypeLabel(type: ConditionType) {
  return conditionTypeOptions.find((option) => option.value === type)?.label ?? type
}

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => route.name === 'my-signal-edit')
const loading = ref(isEdit.value)
const loadError = ref('')
const dirty = ref(false)
const expandedCondition = ref(0)
const nextConditionId = ref(2)
const activeEditorStep = ref<'basic' | 'criteria'>('basic')
const basicSection = ref<HTMLElement | null>(null)
const criteriaSection = ref<HTMLElement | null>(null)
const sentimentIndicatorOptions = ref<SignalIndicatorOption[]>([])
const sentimentIndicatorsLoading = ref(false)
const sentimentIndicatorsError = ref(false)
const indicatorListController = new AbortController()

const symbolSearchOptions = [...new Map([
  ...(stocksData as Array<{ stock?: string; symbol?: string; name?: string; category?: string }>).map((entry) => ({
    value: String(entry.stock ?? entry.symbol ?? '').trim().toUpperCase(),
    label: String(entry.stock ?? entry.symbol ?? '').trim().toUpperCase(),
    description: String(entry.name ?? '').trim(),
    meta: String(entry.category ?? 'Stock'),
  })),
  ...(indexesData as Array<{ symbol?: string; name?: string; category?: string }>).map((entry) => ({
    value: String(entry.symbol ?? '').trim().toUpperCase(),
    label: String(entry.symbol ?? '').trim().toUpperCase(),
    description: String(entry.name ?? '').trim(),
    meta: String(entry.category ?? 'Index'),
  })),
].filter((entry) => entry.value && entry.description).map((entry) => [entry.value, entry])).values()]

function newCondition(id: number): BuilderCondition {
  return {
    id, type: 'Sentiment', indicator: '', comparison: 'CrossAbove', value: '', sentimentBasis: 'value', maType: 'S', maPeriod: '21', calculation: 3, calculationPeriod: '21',
    technicalClass: '', technicalMode: 'default', technicalOperator: 3, technicalValue: '', technicalLeft: 'SC', technicalRight: '', technicalMaType: 'SMA', technicalFastPeriod: '5', technicalSlowPeriod: '21',
    symbolField: 'Symbol Close', symbolCalculation: 3, symbolPeriod: '21', symbolOperator: 3, symbolValue: '',
    userSource: 'my-indicator', userSourceRef: '', userTimeframe: '',
  }
}
function defaultSignalName(date = new Date()) {
  const stamp = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  return `Signal ${stamp}`
}
const form = reactive({ name: defaultSignalName(), symbol: 'SPY', timeframe: 'Daily', logic: 'single' as LogicType, score: 1, period: 21, conditions: [newCondition(1)] as BuilderCondition[] })
function conditionIsComplete(condition: BuilderCondition) {
  if (!condition.indicator.trim()) return false
  if (condition.type === 'Technical') return technicalConditionComplete(condition)
  if (condition.type === 'Symbol OHLCV') return symbolConditionComplete(condition)
  if (condition.type === 'User') return userIndicatorConditionComplete(condition)
  if (condition.type !== 'Sentiment') return Boolean(condition.comparison && hasFormValue(condition.value))
  if (condition.sentimentBasis !== 'value' && !hasFormValue(condition.maPeriod)) return false
  if (condition.sentimentBasis === 'valueVsMovingAverage') return Boolean(condition.comparison)
  if (condition.calculation > 4 && ![12, 13].includes(condition.calculation) && !hasFormValue(condition.calculationPeriod)) return false
  return Boolean(hasFormValue(condition.value) && (condition.calculation <= 4 || condition.comparison))
}
const formComplete = computed(() => Boolean(form.name.trim() && form.symbol.trim() && form.timeframe && form.conditions.length && form.conditions.every(conditionIsComplete)))
const basicComplete = computed(() => Boolean(form.name.trim() && form.symbol.trim() && form.timeframe))
const conditionsComplete = computed(() => form.conditions.length > 0 && form.conditions.every(conditionIsComplete))
const nextStepHint = computed(() => {
  if (!basicComplete.value) return 'Start with a name, symbol, and timeframe.'
  if (!conditionsComplete.value) return 'Next, choose a trigger method and complete each condition.'
  return 'Everything required is complete. Review the preview, then save your signal.'
})
const logicSummary = computed(() => {
  const count = form.conditions.length
  if (form.logic === 'timeorder') return `Trigger when all ${count} conditions occur in numbered order within ${form.period} ${form.timeframe.toLowerCase()} bars.`
  if (form.logic === 'samebar') return `Trigger when at least ${Math.min(form.score, count)} of ${count} conditions are true on the same bar.`
  return `Trigger when any one of your ${count} conditions is true.`
})
const connectorLabel = computed(() => form.logic === 'timeorder' ? `THEN · within ${form.period} bars` : form.logic === 'single' || form.score <= 1 ? 'OR' : form.score >= form.conditions.length ? 'AND' : `ANY ${form.score} OF ${form.conditions.length}`)

function conditionSentence(condition: BuilderCondition) {
  const comparison: Record<string, string> = { CrossAbove: 'crosses above', CrossBelow: 'crosses below', '>': 'is above', '<': 'is below', '=': 'equals', '>=': 'is at or above', '<=': 'is at or below' }
  if (condition.type === 'Technical') return technicalConditionSentence(condition.indicator, condition)
  if (condition.type === 'Symbol OHLCV') return symbolConditionSentence(condition.indicator, condition)
  if (condition.type === 'Sentiment' || condition.type === 'User') {
    const indicator = condition.indicator || 'Choose an indicator'
    const maName = `${condition.maType === 'S' ? 'simple' : 'exponential'} ${condition.maPeriod || '—'}-bar moving average`
    if (condition.sentimentBasis === 'valueVsMovingAverage') {
      return `${indicator} ${comparison[condition.comparison] ?? condition.comparison} its ${maName}.`
    }
    const subject = condition.sentimentBasis === 'movingAverage' ? `${maName} of ${indicator}` : indicator
    const calculation = sentimentCalculationOptions.find((item) => item.value === condition.calculation)
    if (condition.calculation <= 4) return `${subject} ${calculation?.short ?? ''} ${condition.value || 'a value'}.`
    const parameter = [12, 13].includes(condition.calculation) ? '' : ` (${condition.calculationPeriod || '—'})`
    return `${subject} ${calculation?.short ?? ''}${parameter} ${comparison[condition.comparison] ?? condition.comparison} ${condition.value || 'a value'}.`
  }
  return `${condition.indicator || 'Choose an indicator'} ${comparison[condition.comparison] ?? condition.comparison} ${condition.value || 'a value'}.`
}
function selectTechnicalIndicator(condition: BuilderCondition, indicator: string) {
  const definition = findTechnicalIndicator(indicator)
  if (!definition) {
    condition.technicalClass = ''
    return
  }
  if (condition.technicalClass !== definition.class) resetTechnicalFields(condition, definition.class)
}
function changeConditionType(condition: BuilderCondition) {
  condition.indicator = ''
  condition.comparison = 'CrossAbove'
  condition.value = ''
  condition.technicalClass = ''
  condition.userSource = 'my-indicator'
  condition.userSourceRef = ''
  condition.userTimeframe = ''
  if (condition.type === 'Symbol OHLCV') resetSymbolFields(condition)
}
function changeUserSource(condition: BuilderCondition) {
  condition.indicator = ''
  condition.userSourceRef = ''
  condition.userTimeframe = ''
}

function parseConditions(description: string) {
  const metadata = /^(samebar|timeorder|single)(?:[ -]?multi)?[ -]?condition|^score\s*:|^period\s*:/i
  return description.split(/\s*[·•]\s*|\s*;\s*(?=[A-Za-z%])/).map((value) => value.trim()).filter((value) => value && !metadata.test(value)).map((label, index) => {
    const match = label.match(/^(.+)\s+(CrossAbove|CrossBelow|Above|Below|>=|<=|>|<|=)\s+(.+)$/i)
    return { ...newCondition(index + 1), indicator: match?.[1]?.trim() ?? label, comparison: match?.[2]?.trim() ?? 'CrossAbove', value: match?.[3]?.trim() ?? '' }
  })
}
function hydrate(row: MySignalRow) {
  form.name = row.name; form.symbol = row.symbol; form.timeframe = row.timeframe
  const relation = Number(row.raw.relation ?? 1)
  form.logic = relation === 2 ? 'samebar' : relation === 3 ? 'timeorder' : 'single'
  form.score = Number(row.raw.score ?? 1); form.period = Number(row.raw.signals_in_market ?? 21)
  const parsed = parseConditions(row.description)
  form.conditions = parsed.length ? parsed : [newCondition(1)]
  nextConditionId.value = Math.max(...form.conditions.map((item) => item.id)) + 1
  dirty.value = false
}
async function loadEditSignal() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const rows = await fetchMySignals('mine'); const id = String(route.params.id ?? '')
    const row = rows.find((item) => item.id === id || item.url === id || encodeURIComponent(item.id) === id)
    if (!row) throw new Error('Signal not found.')
    hydrate(row)
  } catch (error) { loadError.value = error instanceof Error ? error.message : 'Unable to load signal.' } finally { loading.value = false }
}
async function loadSentimentIndicators() {
  sentimentIndicatorsLoading.value = true
  sentimentIndicatorsError.value = false
  try {
    sentimentIndicatorOptions.value = await fetchSentimentIndicatorOptions(indicatorListController.signal)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    sentimentIndicatorsError.value = true
  } finally {
    sentimentIndicatorsLoading.value = false
  }
}
function addCondition() { if (form.conditions.length < 5) { form.conditions.push(newCondition(nextConditionId.value++)); expandedCondition.value = form.conditions.length - 1; if (form.logic === 'single') form.logic = 'samebar' } }
function duplicateCondition(index: number) { const source = form.conditions[index]; if (source && form.conditions.length < 5) { form.conditions.splice(index + 1, 0, { ...source, id: nextConditionId.value++ }); expandedCondition.value = index + 1 } }
function removeCondition(index: number) { if (form.conditions.length > 1) { form.conditions.splice(index, 1); form.score = Math.min(form.score, form.conditions.length); expandedCondition.value = Math.min(expandedCondition.value, form.conditions.length - 1) } }
function resetForm() { form.name = defaultSignalName(); form.symbol = 'SPY'; form.timeframe = 'Daily'; form.logic = 'single'; form.score = 1; form.period = 21; form.conditions = [newCondition(nextConditionId.value++)]; expandedCondition.value = 0 }
function selectEditorStep(step: 'basic' | 'criteria') {
  activeEditorStep.value = step
  void nextTick(() => {
    const target = step === 'basic' ? basicSection.value : criteriaSection.value
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
function leaveBuilder() { void router.push('/my-stuff/signals') }
function handleBeforeUnload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }

watch(form, () => { dirty.value = true }, { deep: true })
watch(() => form.logic, (logic) => { if (logic === 'single') form.score = 1 })
watch(() => form.conditions.length, (length) => { form.score = Math.min(Math.max(1, form.score), length) })
onBeforeRouteLeave(() => !dirty.value || window.confirm('Leave without saving your changes?'))
onMounted(() => { window.addEventListener('beforeunload', handleBeforeUnload); void loadEditSignal(); void loadSentimentIndicators() })
onBeforeUnmount(() => { indicatorListController.abort(); window.removeEventListener('beforeunload', handleBeforeUnload) })
</script>

<template>
  <main class="min-h-screen bg-[var(--app-bg)] px-[var(--page-gutter)] py-5">
    <section class="signal-builder-header">
      <nav class="signal-builder-breadcrumb" aria-label="Signal builder breadcrumb">
        <button class="signal-builder-breadcrumb__back" type="button" @click="leaveBuilder"><ChevronLeft :size="16" />Back to Signal List</button>
        <span class="signal-builder-breadcrumb__divider" />
        <span class="signal-builder-breadcrumb__item">{{ isEdit ? 'Edit Signal' : 'Create New Signal' }}</span>
      </nav>
      <div class="signal-builder-header__row">
        <div>
          <h1 class="signal-builder-title">{{ isEdit ? 'Edit Signal' : 'Create New Signal' }}</h1>
          <p class="signal-builder-description">Define the rules for your custom signal using sentiment indicators and conditions.</p>
        </div>
        <button class="secondary-button h-8 px-3 text-xs shrink-0" type="button"><PlayCircle :size="15" />Watch Tutorial</button>
      </div>
    </section>

    <div class="signal-editor-page">
    <nav class="progress-track" aria-label="Signal setup progress"><button class="progress-step" :class="[basicComplete && 'progress-step--complete', activeEditorStep === 'basic' && 'progress-step--selected']" type="button" @click="selectEditorStep('basic')"><span>1</span><strong>Basic Setup</strong></button><div class="progress-line" :class="basicComplete && 'progress-line--active'" /><button class="progress-step" :class="[conditionsComplete && 'progress-step--complete', activeEditorStep === 'criteria' && 'progress-step--selected']" type="button" @click="selectEditorStep('criteria')"><span>2</span><strong>Define Criteria</strong></button><div class="progress-line" :class="conditionsComplete && 'progress-line--active'" /><div class="progress-step"><span>3</span><strong>Review &amp; Save</strong></div></nav>
    <div class="builder-guide" role="status"><Info :size="16" /><span><strong>Quick guide:</strong> {{ nextStepHint }}</span><small>Name &amp; market → trigger logic → conditions → review</small></div>

    <div v-if="loading" class="flex min-h-[520px] items-center justify-center text-sm text-[var(--app-text-muted)]">Loading signal...</div>
    <div v-else-if="loadError" class="m-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{ loadError }} <button class="ml-2 font-extrabold underline" type="button" @click="leaveBuilder">Return to list</button></div>
    <div v-else class="builder-shell">
      <main class="min-w-0 space-y-4">
        <section ref="basicSection" class="builder-card editor-step-section" :class="activeEditorStep === 'basic' && 'editor-step-section--active'" @focusin="activeEditorStep = 'basic'"><h3 class="section-title">Basic Information</h3><p class="section-description">Set a name, symbol and timeframe for your signal.</p><div class="mt-4 grid gap-4 md:grid-cols-3"><label class="builder-label">Name<input v-model="form.name" class="builder-input mt-1" placeholder="e.g. Silver momentum confirmation" /></label><div class="builder-label">Symbol<SearchSelect v-model="form.symbol" class="mt-1" :options="symbolSearchOptions" placeholder="Search symbol" aria-label="Search signal symbol" /></div><label class="builder-label">Timeframe<select v-model="form.timeframe" class="builder-input mt-1"><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label></div></section>

        <div ref="criteriaSection" class="criteria-section-group" :class="activeEditorStep === 'criteria' && 'criteria-section-group--active'" @focusin="activeEditorStep = 'criteria'">
        <section class="builder-card signal-criteria-card">
          <h3 class="section-title">How should this signal trigger?</h3>
          <div class="criteria-options">
            <button
              v-for="option in [
                { value: 'single', title: 'Any one condition', text: 'Trigger when any one of your conditions is true.' },
                { value: 'samebar', title: 'Conditions on the same bar', text: 'Trigger when multiple conditions are true on the same bar.' },
                { value: 'timeorder', title: 'Conditions in time order', text: 'Trigger when conditions are true in a specific sequence.' },
              ]"
              :key="option.value"
              class="criteria-option"
              :class="form.logic === option.value && 'criteria-option--active'"
              type="button"
              @click="form.logic = option.value as LogicType"
            >
              <span class="radio-dot"><span v-if="form.logic === option.value" /></span>
              <span><strong>{{ option.title }}</strong><small>{{ option.text }}</small></span>
            </button>
          </div>

          <div v-if="form.logic === 'samebar'" class="criteria-config">
            <p>Trigger when at least <strong>{{ form.score }}</strong> of <strong>{{ form.conditions.length }}</strong> conditions are true on the same bar.</p>
            <div class="criteria-required">
              <span>Required</span>
              <select v-model.number="form.score" class="criteria-select" aria-label="Required conditions">
                <option v-for="count in form.conditions.length" :key="count" :value="count">{{ count }}</option>
              </select>
              <span>of</span>
              <select class="criteria-select" :value="form.conditions.length" aria-label="Total conditions" disabled>
                <option :value="form.conditions.length">{{ form.conditions.length }}</option>
              </select>
            </div>
          </div>
          <div v-else-if="form.logic === 'timeorder'" class="criteria-config">
            <p>{{ logicSummary }}</p>
            <label class="criteria-required">Complete within<input v-model.number="form.period" class="criteria-number" type="number" min="1" />bars</label>
          </div>
        </section>

        <section class="builder-card">
          <h3 class="section-title">Build your conditions</h3>
          <div class="mt-4 space-y-2">
            <template v-for="(condition, index) in form.conditions" :key="condition.id">
              <div v-if="index" class="connector-pill">{{ connectorLabel }}</div>
              <article class="condition-card" :class="expandedCondition === index && 'condition-card--open'">
                <header class="flex items-center gap-3">
                  <span class="condition-number">{{ index + 1 }}</span>
                  <span class="type-chip" :class="`type-chip--${condition.type.toLowerCase()}`">{{ conditionTypeLabel(condition.type) }}</span>
                  <button class="min-w-0 flex-1 truncate text-left text-xs font-medium" type="button" @click="expandedCondition = expandedCondition === index ? -1 : index">{{ conditionSentence(condition) }}</button>
                  <button class="link-button hidden sm:inline-flex" type="button" @click="expandedCondition = index">Edit</button>
                  <button class="icon-button" type="button" title="Duplicate" @click="duplicateCondition(index)"><Copy :size="15" /></button>
                  <button class="icon-button" type="button" :title="expandedCondition === index ? 'Collapse' : 'Expand'" @click="expandedCondition = expandedCondition === index ? -1 : index"><ChevronUp v-if="expandedCondition === index" :size="17" /><ChevronDown v-else :size="17" /></button>
                </header>

                <div v-if="expandedCondition === index" class="mt-4 border-t border-[var(--app-border-muted)] pt-4">
                  <div class="grid gap-3 md:grid-cols-[230px_minmax(0,1fr)]">
                    <label class="builder-label">Indicator type<select v-model="condition.type" class="builder-input mt-1" @change="changeConditionType(condition)"><option v-for="option in conditionTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
                    <div class="builder-label">{{ condition.type === 'User' ? 'Input source' : 'Indicator' }}<SearchSelect v-if="condition.type === 'Sentiment'" v-model="condition.indicator" class="mt-1" :options="sentimentIndicatorOptions" :placeholder="sentimentIndicatorsLoading ? 'Loading indicators…' : sentimentIndicatorsError ? 'Unable to load indicators' : 'Search sentiment indicator'" :aria-label="`Search sentiment indicator for condition ${index + 1}`" :max-visible="20" /><SearchSelect v-else-if="condition.type === 'Technical'" v-model="condition.indicator" class="mt-1" :options="technicalIndicatorOptions" placeholder="Search technical indicator" :aria-label="`Search technical indicator for condition ${index + 1}`" :max-visible="20" @update:model-value="selectTechnicalIndicator(condition, $event)" /><SearchSelect v-else-if="condition.type === 'Symbol OHLCV'" v-model="condition.indicator" class="mt-1" :options="symbolSearchOptions" placeholder="Search symbol" :aria-label="`Search symbol for condition ${index + 1}`" :max-visible="20" /><div v-else-if="condition.type === 'User'" class="mt-1"><select v-model="condition.userSource" class="builder-input" @change="changeUserSource(condition)"><option value="my-indicator">My Indicator — use an indicator you created</option><option value="upload">Uploaded Indicator Data — upload a Date, Close CSV</option><option value="defined-dates">Defined Dates — upload selected trading dates</option></select><small class="mt-1.5 block text-[.68rem] font-medium leading-5 text-[var(--app-text-muted)]">{{ condition.userSource === 'my-indicator' ? 'Select from indicators saved in My Stuff.' : condition.userSource === 'defined-dates' ? 'Upload a Date-only CSV. Available for the Daily timeframe.' : 'Upload one Date, Close CSV file, up to 1 MB.' }}</small></div></div>
                  </div>

                  <template v-if="condition.type === 'Sentiment'">
                    <div class="condition-step">
                      <div class="condition-step-heading"><span>1</span><div><strong>What should be evaluated?</strong><small>Choose the raw indicator, its moving average, or compare the two.</small></div></div>
                      <div class="basis-options">
                        <button v-for="basis in [{ value: 'value', title: 'Indicator value', text: 'Evaluate the current indicator reading.' }, { value: 'movingAverage', title: 'Moving average value', text: 'Evaluate a smoothed indicator reading.' }, { value: 'valueVsMovingAverage', title: 'Value vs moving average', text: 'Compare the indicator directly with its average.' }]" :key="basis.value" class="basis-option" :class="condition.sentimentBasis === basis.value && 'basis-option--active'" type="button" @click="condition.sentimentBasis = basis.value as SentimentBasis"><span class="radio-dot"><span v-if="condition.sentimentBasis === basis.value" /></span><span><strong>{{ basis.title }}</strong><small>{{ basis.text }}</small></span></button>
                      </div>
                    </div>

                    <div v-if="condition.sentimentBasis !== 'value'" class="condition-step">
                      <div class="condition-step-heading"><span>2</span><div><strong>Moving average settings</strong><small>Choose how the average is calculated and its period.</small></div></div>
                      <div class="condition-fields condition-fields--ma">
                        <label class="builder-label">Average type<select v-model="condition.maType" class="builder-input mt-1"><option value="S">Simple</option><option value="E">Exponential</option></select></label>
                        <label class="builder-label">MA period<input v-model="condition.maPeriod" class="builder-input mt-1" type="number" min="1" step="1" placeholder="21" /></label>
                      </div>
                    </div>

                    <div class="condition-step">
                      <div class="condition-step-heading"><span>{{ condition.sentimentBasis === 'value' ? 2 : 3 }}</span><div><strong>Define the rule</strong><small>{{ condition.sentimentBasis === 'valueVsMovingAverage' ? 'Choose how the indicator should compare with its moving average.' : 'Choose a calculation, then enter only the parameters it needs.' }}</small></div></div>
                      <div v-if="condition.sentimentBasis === 'valueVsMovingAverage'" class="condition-fields condition-fields--rule">
                        <label class="builder-label">Comparison<select v-model="condition.comparison" class="builder-input mt-1"><option v-for="option in comparisonOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
                      </div>
                      <div v-else class="condition-fields condition-fields--rule">
                        <label class="builder-label">Calculation<select v-model.number="condition.calculation" class="builder-input mt-1" @change="condition.calculation <= 4 && (condition.comparison = comparisonOptions[condition.calculation]?.value ?? condition.comparison)"><option v-for="option in sentimentCalculationOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
                        <label v-if="condition.calculation > 4 && ![12, 13].includes(condition.calculation)" class="builder-label">{{ [14, 15].includes(condition.calculation) ? 'Reference level' : 'Lookback period' }}<input v-model="condition.calculationPeriod" class="builder-input mt-1" type="number" min="1" :step="[14, 15].includes(condition.calculation) ? 'any' : '1'" /></label>
                        <label v-if="condition.calculation > 4" class="builder-label">Comparison<select v-model="condition.comparison" class="builder-input mt-1"><option v-for="option in comparisonOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
                        <label class="builder-label">{{ [14, 15].includes(condition.calculation) ? 'Bars required' : 'Threshold value' }}<input v-model="condition.value" class="builder-input mt-1" type="number" step="any" placeholder="Enter value" /></label>
                      </div>
                    </div>
                  </template>

                  <UserIndicatorEditor v-else-if="condition.type === 'User'" :condition="condition" :symbol="form.symbol" :timeframe="form.timeframe" />

                  <TechnicalConditionEditor v-else-if="condition.type === 'Technical' && condition.technicalClass" :condition="condition" />
                  <div v-else-if="condition.type === 'Technical'" class="mt-4 rounded-md border border-dashed border-[var(--app-border)] p-4 text-center text-xs text-[var(--app-text-muted)]">Choose a technical indicator to configure its available rule.</div>
                  <SymbolConditionEditor v-else-if="condition.type === 'Symbol OHLCV' && condition.indicator" :condition="condition" />
                  <div v-else-if="condition.type === 'Symbol OHLCV'" class="mt-4 rounded-md border border-dashed border-[var(--app-border)] p-4 text-center text-xs text-[var(--app-text-muted)]">Choose the symbol you want to calculate.</div>
                  <div v-else class="mt-4 grid gap-3 md:grid-cols-2">
                    <label class="builder-label">Comparison<select v-model="condition.comparison" class="builder-input mt-1"><option v-for="option in comparisonOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
                    <label class="builder-label">Value<input v-model="condition.value" class="builder-input mt-1" placeholder="Value or reference" /></label>
                  </div>

                  <div class="mt-4 flex items-center justify-between gap-3">
                    <p class="validity-line" :class="conditionIsComplete(condition) && 'validity-line--valid'"><Check :size="16" /><span><strong>Rule preview</strong>{{ conditionSentence(condition) }}</span></p>
                    <button v-if="form.logic !== 'single'" class="icon-button hover:!text-[var(--app-negative)]" type="button" :disabled="form.conditions.length === 1" title="Delete" @click="removeCondition(index)"><Trash2 :size="16" /></button>
                  </div>
                </div>
              </article>
            </template>
            <template v-if="form.logic !== 'single'">
              <button class="add-condition" type="button" :disabled="form.conditions.length >= 5" @click="addCondition"><Plus :size="17" />Add another condition</button>
              <p class="text-center text-xs text-[var(--app-text-muted)]">Up to 5 conditions</p>
            </template>
          </div>
        </section>
        </div>
      </main>

      <aside class="preview-column">
        <section class="preview-panel compact-preview">
          <div class="flex items-center gap-3"><span class="preview-icon"><BarChart3 :size="21" /></span><div><h3 class="section-title">Signal Preview</h3><p class="section-description">Live preview of your signal.</p></div></div>
          <h4 class="compact-preview-name">{{ form.name || 'Untitled Signal' }}</h4>
          <div class="preview-tags"><span>{{ form.symbol || '—' }}</span><span>{{ form.timeframe }}</span><span>{{ form.logic === 'timeorder' ? 'TimeOrder Multi-Condition' : form.logic === 'samebar' ? 'SameBar Multi-Condition' : 'Single-Condition' }}</span></div>

          <div v-if="form.logic !== 'single'" class="compact-rule-summary">
            <Layers3 v-if="form.logic === 'samebar'" :size="19" /><Clock3 v-else :size="19" />
            <div><strong>{{ form.logic === 'samebar' ? `Same-bar rule · ${connectorLabel}` : `Sequence window · ${form.period} ${form.timeframe.toLowerCase()} bars` }}</strong><small>{{ logicSummary }}</small></div>
          </div>

          <h4 class="compact-section-heading">Trigger Condition</h4>
          <div class="compact-trigger-flow">
            <span v-if="form.logic !== 'single'" class="compact-window-badge">{{ form.logic === 'timeorder' ? `Entire sequence ≤ ${form.period} bars` : `${form.score} of ${form.conditions.length} required` }}</span>
            <template v-for="(condition, index) in form.conditions" :key="condition.id">
              <div v-if="index" class="compact-connector"><i /><span>{{ connectorLabel }}</span><i /></div>
              <article class="compact-condition"><span class="compact-condition-number">{{ index + 1 }}</span><p>{{ conditionSentence(condition) }}</p></article>
            </template>
            <div class="compact-trigger-result"><span>{{ form.logic === 'timeorder' ? 'Sequence complete' : form.logic === 'samebar' ? `${form.score}+ conditions met` : 'Condition met' }}</span><ArrowRight :size="15" /><strong>Signal triggered</strong></div>
          </div>

        </section>
        <section class="validation-panel"><h4><CircleCheck :size="18" />Validation Checklist</h4><div :class="basicComplete && 'validation-item--complete'" class="validation-item"><Check :size="15" /><span><strong>Basic information complete</strong><small>Name, symbol and timeframe are set.</small></span></div><div :class="form.conditions.length > 0 && 'validation-item--complete'" class="validation-item"><Check :size="15" /><span><strong>At least one condition added</strong><small>You have {{ form.conditions.length }} condition(s) defined.</small></span></div><div :class="conditionsComplete && 'validation-item--complete'" class="validation-item"><Check :size="15" /><span><strong>Condition rules complete</strong><small>Every condition needs an indicator, rule and value.</small></span></div><div class="validation-item validation-item--complete"><Check :size="15" /><span><strong>Scoring logic selected</strong><small>Conditions are set to {{ connectorLabel }}.</small></span></div></section>
        <div class="preview-actions"><button class="link-button" type="button" @click="resetForm">Reset</button><button class="primary-button" type="button" :disabled="!formComplete">Save Signal</button></div>
      </aside>
    </div>

    <div class="result-bar"><strong>Result <span>(Natural Language)</span></strong><p>{{ logicSummary }}</p><button class="link-button" type="button"><Settings :size="15" />Signal Options (Advanced)</button></div>
    </div>
  </main>
</template>

<style scoped>
.signal-builder-header { border:1px solid var(--app-border); border-radius:10px; background:var(--app-surface); padding:18px 22px; margin-bottom:14px; }
.signal-builder-header__row { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.signal-builder-breadcrumb { display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:0.8125rem; font-weight:700; line-height:1.2; color:var(--app-text-secondary); }
.signal-builder-breadcrumb__back { display:inline-flex; align-items:center; gap:4px; color:var(--app-primary); font-weight:700; background:none; border:none; cursor:pointer; padding:0; }
.signal-builder-breadcrumb__back:hover { text-decoration:underline; }
.signal-builder-breadcrumb__divider { width:1px; height:14px; background:var(--app-border); }
.signal-builder-breadcrumb__item { color:inherit; font-weight:500; }
.signal-builder-title { font-size:1.75rem; font-weight:700; color:var(--app-text); line-height:1.15; }
.signal-builder-description { margin-top:6px; color:var(--app-text-muted); font-size:.82rem; }

.signal-editor-page :deep(input::placeholder),.signal-editor-page :deep(textarea::placeholder) { font-weight:400 !important; }
.signal-editor-page { min-width:0; padding:12px; background:var(--app-surface-soft); }.section-description { color:var(--app-text-muted); font-size:.78rem; }
.progress-track { display:flex; align-items:center; margin:12px 6px; }.progress-step { display:flex; flex:none; align-items:center; gap:8px; color:var(--app-text-muted); font-size:.76rem; }.progress-track button.progress-step { border-radius:6px; padding:3px 5px; transition:background-color .15s ease,color .15s ease; }.progress-track button.progress-step:hover { background:var(--app-surface); color:var(--app-text); }.progress-step span { display:flex; width:27px; height:27px; align-items:center; justify-content:center; border-radius:9999px; background:var(--app-surface-muted); font-weight:900; }.progress-step--complete { color:var(--app-primary); }.progress-step--complete span { background:var(--app-primary); color:white; }.progress-step--selected:not(.progress-step--complete) { color:var(--app-text); }.progress-line { height:1px; flex:1; margin:0 11px; background:var(--app-border-strong); }.progress-line--active { background:var(--app-primary); }
.builder-guide { display:flex; min-width:0; align-items:center; gap:8px; margin:0 0 12px; border:1px solid color-mix(in srgb,var(--app-primary) 20%,var(--app-border)); border-radius:7px; background:var(--app-primary-soft); padding:8px 11px; color:var(--app-text-secondary); font-size:.74rem; }.builder-guide>svg { flex:none; color:var(--app-primary); }.builder-guide span { min-width:0; flex:1; }.builder-guide strong { color:var(--app-text); }.builder-guide small { flex:none; color:var(--app-text-muted); font-size:.66rem; }
.builder-shell { display:grid; grid-template-columns:minmax(0,2.1fr) minmax(320px,1fr); gap:12px; }.builder-card,.preview-panel,.validation-panel { border:1px solid var(--app-border); border-radius:8px; background:var(--app-surface); padding:14px; }.preview-column { position:sticky; top:10px; align-self:start; display:grid; gap:10px; }.preview-panel { min-height:0; }.section-title { font-size:1rem; font-weight:850; color:var(--app-text); }
.editor-step-section,.criteria-section-group { scroll-margin-top:16px; }
.editor-step-section--active { animation:step-attention-basic 1.8s ease-out 1; }
.criteria-section-group { position:relative; display:grid; gap:12px; min-width:0; border:0; border-radius:10px; padding:0; }
.criteria-section-group--active::after { position:absolute; z-index:10; inset:0; border-radius:10px; pointer-events:none; content:""; animation:step-attention-criteria 1.8s ease-out 1; }
@keyframes step-attention-basic { 0%,32%,64%,100% { box-shadow:none; } 16%,48%,80% { box-shadow:inset 0 0 0 3px color-mix(in srgb,var(--app-negative) 35%,transparent),inset 0 0 14px color-mix(in srgb,var(--app-negative) 16%,transparent); } }
@keyframes step-attention-criteria { 0%,32%,64%,100% { box-shadow:none; } 16%,48%,80% { box-shadow:inset 0 0 0 3px color-mix(in srgb,var(--app-negative) 35%,transparent),inset 0 0 14px color-mix(in srgb,var(--app-negative) 16%,transparent); } }
.signal-criteria-card { padding:16px; }
.criteria-question { color:var(--app-text); font-size:1.18rem; font-weight:900; line-height:1.25; }
.criteria-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-top:14px; }
.criteria-option { display:flex; min-height:90px; align-items:flex-start; gap:12px; border:1px solid var(--app-border-strong); border-radius:8px; background:var(--app-surface); padding:13px; text-align:left; transition:border-color .15s ease,background-color .15s ease,box-shadow .15s ease; }
.criteria-option:hover { border-color:var(--app-primary); }
.criteria-option--active { border-color:var(--app-primary); background:var(--app-primary-soft); box-shadow:0 0 0 1px var(--app-primary); }
.criteria-option strong { display:block; color:var(--app-text); font-size:.95rem; font-weight:900; line-height:1.35; }
.criteria-option small { display:block; margin-top:5px; color:var(--app-text-muted); font-size:.75rem; line-height:1.4; }
.criteria-option .radio-dot { width:23px; height:23px; margin-top:1px; }
.criteria-config { display:flex; min-height:50px; align-items:center; justify-content:space-between; gap:16px; margin-top:12px; border-radius:8px; background:var(--app-surface-soft); padding:9px 12px; color:var(--app-text-secondary); font-size:.8rem; }
.criteria-config p { line-height:1.45; }
.criteria-config p strong { color:var(--app-text); font-weight:900; }
.criteria-required { display:flex; flex:none; align-items:center; gap:10px; color:var(--app-text-secondary); font-weight:700; }
.criteria-select,.criteria-number { width:64px; height:42px; border:1px solid var(--app-border-strong); border-radius:7px; background:var(--app-surface); padding:0 10px; color:var(--app-text); font-size:.9rem; font-weight:700; outline:none; }
.criteria-select:focus,.criteria-number:focus { border-color:var(--app-primary); box-shadow:0 0 0 3px var(--app-primary-soft); }
.criteria-select:disabled { cursor:default; opacity:1; }
.criteria-number { width:76px; }
.builder-input { display:block; width:100%; height:36px; border:1px solid var(--app-border); border-radius:6px; background:var(--app-surface); padding:0 10px; color:var(--app-text); font-size:.8125rem; font-weight:700; outline:none; transition:border-color 160ms ease,box-shadow 160ms ease; }.builder-input:focus { border-color:var(--app-primary); box-shadow:0 0 0 3px var(--app-primary-shadow); }.builder-label { color:var(--app-text-muted); font-size:.75rem; font-weight:700; line-height:1; }
.summary-field { border-right:1px solid var(--app-border); padding-right:16px; }.summary-field:last-child { border:0; }.summary-field span { display:block; font-size:.75rem; color:var(--app-text-muted); }.summary-field strong { display:block; margin-top:5px; font-size:.95rem; }.link-button { display:inline-flex; align-items:center; gap:5px; color:var(--app-primary); font-size:.8rem; font-weight:800; }
.logic-card { display:flex; min-height:104px; gap:14px; border:1px solid var(--app-border); border-radius:7px; padding:16px; text-align:left; }.logic-card--active { border-color:var(--app-primary); background:var(--app-primary-soft); box-shadow:0 0 0 1px var(--app-primary); }.logic-card small { display:block; margin-top:7px; color:var(--app-text-muted); line-height:1.45; }.radio-dot { display:flex; width:22px; height:22px; flex:none; align-items:center; justify-content:center; border:2px solid var(--app-border-strong); border-radius:9999px; }.logic-card--active .radio-dot { border-color:var(--app-primary); }.radio-dot span { width:10px; height:10px; border-radius:9999px; background:var(--app-primary); }
.logic-config { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:14px; border-radius:7px; background:var(--app-surface-soft); padding:12px 14px; font-size:.8rem; color:var(--app-text-secondary); }.compact-select,.compact-input { height:34px; width:70px; border:1px solid var(--app-border); border-radius:6px; background:var(--app-surface); padding:0 9px; }.compact-input { width:76px; }
.logic-card--compact { min-height:78px; padding:12px; }.scoring-panel { display:grid; grid-template-columns:minmax(210px,1fr) minmax(220px,1fr) minmax(220px,1fr); gap:10px; margin-top:14px; border-radius:7px; background:var(--app-surface-soft); padding:10px; }.scoring-panel>div { padding:8px; }.scoring-panel>div span { margin-left:6px; color:var(--app-text-muted); font-size:.72rem; }.scoring-panel>div small { display:block; margin-top:8px; color:var(--app-text-muted); font-size:.68rem; }.score-card { position:relative; display:flex; align-items:flex-start; gap:10px; border:1px solid var(--app-border); border-radius:7px; background:var(--app-surface); padding:10px; text-align:left; }.score-card--active { border-color:var(--app-primary); box-shadow:0 0 0 1px var(--app-primary); }.score-card small { display:block; margin-top:4px; color:var(--app-text-muted); font-size:.66rem; }.score-card b { position:absolute; top:9px; right:9px; border-radius:9999px; background:var(--app-primary-soft); padding:3px 7px; color:var(--app-primary); font-size:.62rem; }
.condition-card { min-width:0; overflow:hidden; border:1px solid var(--app-border); border-radius:7px; padding:10px 14px; }.condition-card>header { min-width:0; }.condition-card>header>button.min-w-0 { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.condition-card--open { border-color:var(--app-primary); }.condition-number,.preview-number { display:flex; width:27px; height:27px; flex:none; align-items:center; justify-content:center; border-radius:9999px; background:var(--app-primary); color:white; font-size:.68rem; font-weight:800; }.preview-number { background:var(--app-primary-soft); color:var(--app-primary); }.type-chip { flex:none; border-radius:9999px; padding:4px 11px; background:var(--app-primary-soft); color:var(--app-primary); font-size:.7rem; font-weight:400; }.type-chip--price { background:#e8f3ff; }
.condition-step { margin-top:10px; border:1px solid var(--app-border-muted); border-radius:8px; background:var(--app-surface-soft); padding:11px; }
.condition-step-heading { display:flex; align-items:flex-start; gap:10px; }
.condition-step-heading>span { display:flex; width:20px; height:20px; flex:none; align-items:center; justify-content:center; border-radius:9999px; background:var(--app-primary-soft); color:var(--app-primary); font-size:.6rem; font-weight:800; }
.condition-step-heading strong,.condition-step-heading small { display:block; }
.condition-step-heading strong { color:var(--app-text); font-size:.76rem; font-weight:800; }
.condition-step-heading small { margin-top:2px; color:var(--app-text-muted); font-size:.65rem; font-weight:400; line-height:1.4; }
.basis-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:12px; }
.basis-option { display:flex; min-height:78px; align-items:flex-start; gap:9px; border:1px solid var(--app-border); border-radius:7px; background:var(--app-surface); padding:10px; text-align:left; }
.basis-option--active { border-color:var(--app-primary); background:var(--app-primary-soft); box-shadow:0 0 0 1px var(--app-primary); }
.basis-option .radio-dot { width:18px; height:18px; }
.basis-option .radio-dot span { width:8px; height:8px; }
.basis-option strong,.basis-option small { display:block; }
.basis-option strong { color:var(--app-text); font-size:.72rem; font-weight:900; }
.basis-option small { margin-top:4px; color:var(--app-text-muted); font-size:.64rem; line-height:1.35; }
.condition-fields { display:grid; grid-template-columns:minmax(180px,280px); gap:10px; margin-top:12px; padding-left:34px; }
.condition-fields--ma { grid-template-columns:minmax(160px,240px) minmax(120px,180px); }
.condition-fields--rule { grid-template-columns:repeat(4,minmax(120px,1fr)); padding-left:0; }
.icon-button { display:inline-flex; width:31px; height:31px; align-items:center; justify-content:center; border-radius:5px; color:var(--app-text-muted); }.icon-button:hover:not(:disabled) { background:var(--app-primary-soft); color:var(--app-primary); }.icon-button:disabled { opacity:.3; }.validity-line { display:flex; flex:1; align-items:center; gap:8px; border-radius:6px; background:var(--app-surface-soft); padding:9px 11px; color:var(--app-text-muted); font-size:.78rem; }.validity-line--valid { background:#eaf8ef; color:#197344; }.connector-pill { width:max-content; margin:0 auto; border-radius:9999px; background:var(--app-primary-soft); padding:3px 12px; color:var(--app-primary); font-size:.66rem; font-weight:900; }.add-condition { display:flex; width:100%; height:38px; align-items:center; justify-content:center; gap:7px; border:1px dashed var(--app-primary); border-radius:6px; color:var(--app-primary); font-size:.8rem; font-weight:850; }.add-condition:disabled { opacity:.4; }
.validity-line span { min-width:0; overflow-wrap:anywhere; }
.validity-line span strong { display:block; margin-bottom:2px; font-size:.65rem; text-transform:uppercase; letter-spacing:.04em; }
.status-pill { display:inline-flex; align-items:center; gap:5px; border-radius:9999px; background:#fff7df; padding:6px 10px; color:#986800; font-size:.7rem; font-weight:850; }.status-pill--ready { background:#e9f8ef; color:#197344; }.secondary-button,.primary-button { display:inline-flex; height:38px; align-items:center; justify-content:center; gap:7px; border:1px solid var(--app-border); border-radius:6px; padding:0 16px; color:var(--app-primary); font-size:.8rem; font-weight:850; }.primary-button { border-color:var(--app-primary); background:var(--app-primary); color:white; }.primary-button:disabled { cursor:not-allowed; opacity:.45; }
.preview-tags { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }.preview-tags span { min-width:64px; border-radius:9999px; background:var(--app-primary-soft); padding:5px 10px; text-align:center; color:var(--app-primary); font-size:.68rem; font-weight:400; }.logic-flow { min-width:0; border:1px solid var(--app-border-muted); border-radius:7px; background:var(--app-surface-soft); padding:12px; }.logic-flow h4,.validation-panel h4 { display:flex; align-items:center; gap:8px; font-size:.8rem; font-weight:850; }.flow-node { display:flex; min-width:0; max-width:310px; align-items:center; gap:10px; margin:12px auto 0; border:1px solid var(--app-border-strong); border-radius:7px; background:var(--app-surface); padding:8px 10px; }.flow-node div { min-width:0; }.flow-node strong,.flow-node small { display:block; overflow-wrap:anywhere; font-size:.7rem; }.flow-node small { margin-top:2px; color:var(--app-text-muted); }.flow-connector { display:flex; height:48px; flex-direction:column; align-items:center; justify-content:center; }.flow-connector span { border-radius:8px; background:var(--app-primary-soft); padding:4px 18px; color:var(--app-primary); font-size:.64rem; font-weight:900; }.flow-connector i { width:1px; height:13px; background:var(--app-primary); }.trigger-node { max-width:230px; margin:12px auto; border:1px solid #9fd9b5; border-radius:7px; background:#e9f8ef; padding:9px; text-align:center; color:#197344; font-size:.78rem; font-weight:900; }.next-summary { display:flex; gap:9px; border-top:1px solid var(--app-border); padding-top:12px; }.next-summary strong { font-size:.72rem; }.next-summary p { margin-top:4px; color:var(--app-text-muted); font-size:.67rem; line-height:1.5; }
.compact-preview { min-width:0; }
.preview-icon { display:flex; width:36px; height:36px; flex:none; align-items:center; justify-content:center; border-radius:8px; background:var(--app-primary-soft); color:var(--app-primary); }
.compact-preview-name { margin-top:14px; overflow-wrap:anywhere; color:var(--app-text); font-size:.95rem; font-weight:900; line-height:1.3; }
.compact-rule-summary { display:flex; align-items:flex-start; gap:9px; margin-top:12px; border:1px solid var(--app-primary); border-radius:7px; background:var(--app-primary-soft); padding:10px; color:var(--app-primary); }
.compact-rule-summary>svg { flex:none; margin-top:1px; }.compact-rule-summary strong,.compact-rule-summary small { display:block; }.compact-rule-summary strong { color:var(--app-text); font-size:.7rem; font-weight:900; }.compact-rule-summary small { margin-top:3px; color:var(--app-text-secondary); font-size:.62rem; line-height:1.4; }
.compact-section-heading { margin-top:14px; color:var(--app-text); font-size:.78rem; font-weight:900; }
.compact-trigger-flow { position:relative; margin-top:7px; border:1px solid var(--app-border); border-radius:7px; background:var(--app-surface-soft); padding:10px; }.compact-trigger-flow:has(.compact-window-badge) { padding-top:39px; }
.compact-window-badge { position:absolute; top:9px; right:9px; border:1px solid var(--app-primary); border-radius:9999px; background:var(--app-primary-soft); padding:3px 8px; color:var(--app-primary); font-size:.56rem; font-weight:900; }
.compact-condition { display:flex; min-width:0; min-height:42px; align-items:center; gap:8px; border:1px solid var(--app-border-strong); border-radius:9999px; background:var(--app-surface); padding:4px 11px 4px 4px; box-shadow:0 1px 2px color-mix(in srgb,var(--app-text) 7%,transparent); }
.compact-condition-number { display:flex; width:31px; height:31px; flex:0 0 31px; align-items:center; justify-content:center; border-radius:9999px; background:var(--app-primary-soft); color:var(--app-primary); font-size:.65rem; font-weight:900; }.compact-condition p { min-width:0; flex:1; overflow-wrap:anywhere; text-align:center; color:var(--app-text); font-size:.62rem; font-weight:800; line-height:1.35; }
.compact-connector { display:flex; height:38px; flex-direction:column; align-items:center; justify-content:center; gap:2px; }.compact-connector i { width:1px; height:7px; background:var(--app-text-muted); }.compact-connector span { border:1px solid var(--app-border-strong); border-radius:9999px; background:var(--app-primary-soft); padding:2px 9px; color:var(--app-primary); font-size:.55rem; font-weight:900; }
.compact-trigger-result { display:flex; align-items:center; justify-content:center; gap:6px; margin-top:10px; border:1px solid color-mix(in srgb,var(--app-positive) 45%,var(--app-border)); border-radius:9999px; background:color-mix(in srgb,var(--app-positive) 10%,var(--app-surface)); padding:8px 10px; color:var(--app-positive); font-size:.62rem; font-weight:800; text-align:center; }.compact-trigger-result strong { font-weight:900; }
.validation-panel { padding:14px; }.validation-item { display:flex; gap:9px; margin-top:10px; color:var(--app-text-muted); }.validation-item>svg { margin-top:2px; border-radius:9999px; background:var(--app-surface-muted); padding:2px; }.validation-item strong,.validation-item small { display:block; font-size:.68rem; }.validation-item small { margin-top:2px; font-weight:400; }.validation-item--complete { color:#168248; }.history-note { display:flex; align-items:center; gap:8px; border:1px solid #b9d5f5; border-radius:7px; background:#eef6ff; padding:11px; color:#456788; font-size:.67rem; }.preview-actions { display:grid; grid-template-columns:1fr 1fr; align-items:center; gap:8px; }.result-bar { display:flex; align-items:center; gap:18px; margin-top:14px; border:1px solid var(--app-border); border-radius:8px; background:var(--app-surface); padding:12px 16px; font-size:.72rem; }.result-bar strong { flex:none; }.result-bar strong span { color:var(--app-text-muted); font-weight:500; }.result-bar p { flex:1; color:var(--app-text-secondary); }
.condition-card { max-width:100%; }
.condition-card>header { min-width:0; max-width:100%; overflow:hidden; }
.condition-card>header>button.flex-1 { display:block; width:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.validity-line { min-width:0; max-width:100%; overflow:hidden; }
.validity-line>svg { flex:none; }
.validity-line>span { display:block; width:0; min-width:0; flex:1; overflow-wrap:anywhere; word-break:break-word; }
@media (max-width:1200px) { .builder-shell { grid-template-columns:1fr; }.preview-column { position:static; }.scoring-panel { grid-template-columns:1fr; } } @media (max-width:900px) { .condition-fields--rule { grid-template-columns:repeat(2,minmax(140px,1fr)); }.builder-guide small { display:none; } } @media (max-width:800px) { .criteria-options,.basis-options { grid-template-columns:1fr; }.criteria-option,.basis-option { min-height:0; }.criteria-config { align-items:flex-start; flex-direction:column; }.criteria-required { align-self:stretch; justify-content:flex-end; } } @media (max-width:700px) { .signal-editor-page { padding:12px; }.progress-step strong { display:none; }.builder-card,.preview-panel { padding:14px; }.signal-criteria-card { padding:16px; }.criteria-question { font-size:1.15rem; }.criteria-required { flex-wrap:wrap; justify-content:flex-start; }.condition-fields,.condition-fields--ma,.condition-fields--rule { grid-template-columns:1fr; padding-left:0; }.preview-actions { grid-template-columns:1fr; }.result-bar { align-items:flex-start; flex-direction:column; } }
</style>
