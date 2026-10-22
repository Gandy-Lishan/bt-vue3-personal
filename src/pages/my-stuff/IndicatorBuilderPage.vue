<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Beaker, BellRing, Check, Filter, ListChecks, PlayCircle, Plus, Save, SlidersHorizontal, Trash2 } from '@lucide/vue'
import indexesData from '@/assets/indexes_list.json'
import stocksData from '@/assets/stocks_list.json'
import { createMyIndicator, fetchMyIndicators, updateMyIndicator, type CreateMyIndicatorPayload, type MyIndicatorRow } from '@/entities/my-stuff/api/user-indicator.api'
import { fetchSentimentIndicatorOptions, type SignalIndicatorOption } from '@/entities/my-stuff/api/sentiment-indicator.api'
import { technicalIndicatorOptions } from '@/entities/my-stuff/model/technical-indicator'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'
import SearchSelect from '@/shared/ui/SearchSelect.vue'

type Category = 'Indicator Spread' | 'Indicator Ratio' | 'Indicator Addition' | 'Symbol Spread' | 'Symbol Ratio' | 'Symbol Addition' | 'Weighted Indicator Combination' | 'Symbol OHLCV' | 'Indicator Resample' | 'Technical Indicator'
type Calculation = 'Indicator Value' | 'Open' | 'High' | 'Low' | 'Close' | 'Volume' | 'Simple Moving Average' | 'Exponential Moving Average' | 'Rate of Change' | 'Amplitude'
interface ComponentForm { source: string; url: string; calculation: Calculation; period: string; shift: string; weight: string }
interface BuilderOption { value: string; label: string; description?: string; meta?: string; url: string }

const router = useRouter()
const route = useRoute()
const controller = new AbortController()
const sections = [
  { label: 'My Signal', path: '/my-stuff/signals', description: 'Create and monitor custom market signals.', icon: BellRing },
  { label: 'My Indicator', path: '/my-stuff/indicators', description: 'Build and manage personal indicators.', icon: SlidersHorizontal },
  { label: 'My Screen', path: '/my-stuff/screens', description: 'Save and run stock screens.', icon: Filter },
  { label: 'My Watch List', path: '/my-stuff/watchlist', description: 'Keep the symbols you follow together.', icon: ListChecks },
]
const pairCategories: Category[] = ['Indicator Spread', 'Indicator Ratio', 'Indicator Addition', 'Symbol Spread', 'Symbol Ratio', 'Symbol Addition']
const categories: Category[] = [...pairCategories, 'Weighted Indicator Combination', 'Symbol OHLCV', 'Indicator Resample', 'Technical Indicator']
const timeframes = ['Daily', 'Weekly', 'Monthly']
const indicatorOptions = ref<SignalIndicatorOption[]>([])
const loadingOptions = ref(true)
const loadingRecord = ref(false)
const saving = ref(false)
const validated = ref(false)
const message = ref('')
const form = reactive({ name: '', category: 'Indicator Spread' as Category, timeframe: 'Daily', optimismEnabled: false, optimism: '', pessimismEnabled: false, pessimism: '', benchmark: 'SPX' })
const components = reactive<ComponentForm[]>([
  { source: '', url: '', calculation: 'Indicator Value', period: '', shift: '0', weight: '50' },
  { source: '', url: '', calculation: 'Simple Moving Average', period: '20', shift: '0', weight: '50' },
])
const primaryComponent = computed(() => components[0]!)
const technicalIndicator = ref('')
const technicalCode = ref('')
const ohlcvSmoothing = ref<'None' | 'SMA' | 'EMA'>('None')
const ohlcvPeriod = ref('20')
const isEdit = computed(() => route.name === 'my-indicator-edit')
const recordUrl = computed(() => typeof route.query.url === 'string' ? route.query.url : '')
const rawSymbolOptions: BuilderOption[] = [
  ...(stocksData as Array<{ stock?: string; name?: string; category?: string }>).map((item) => ({ value: String(item.stock ?? ''), label: String(item.stock ?? ''), description: String(item.name ?? ''), meta: String(item.category ?? 'Stock'), url: String(item.stock ?? '') })),
  ...(indexesData as Array<{ symbol?: string; name?: string; category?: string }>).map((item) => ({ value: String(item.symbol ?? ''), label: String(item.symbol ?? ''), description: String(item.name ?? ''), meta: String(item.category ?? 'Index'), url: String(item.symbol ?? '') })),
].filter((item) => item.value)
const symbolOptions = [...new Map<string, BuilderOption>(rawSymbolOptions.map((item) => [item.value, item])).values()]

const isPair = computed(() => pairCategories.includes(form.category))
const isWeighted = computed(() => form.category === 'Weighted Indicator Combination')
const isOhlcv = computed(() => form.category === 'Symbol OHLCV')
const isResample = computed(() => form.category === 'Indicator Resample')
const isTechnical = computed(() => form.category === 'Technical Indicator')
const isIndicator = computed(() => form.category.startsWith('Indicator'))
const operation = computed(() => form.category.endsWith('Spread') ? 'Subtract' : form.category.endsWith('Ratio') ? 'Divide' : 'Add')
const operationSymbol = computed(() => operation.value === 'Subtract' ? '−' : operation.value === 'Divide' ? '÷' : '＋')
const sourceOptions = computed(() => isIndicator.value ? indicatorOptions.value : symbolOptions)
const weightedSourceOptions = computed(() => [...indicatorOptions.value, ...symbolOptions])
const technicalOptions = technicalIndicatorOptions.map((item) => ({ ...item, url: item.value }))
const calculationOptions = computed<Calculation[]>(() => isIndicator.value
  ? ['Indicator Value', 'Simple Moving Average', 'Exponential Moving Average']
  : ['Close', 'Open', 'High', 'Low', 'Simple Moving Average', 'Exponential Moving Average', 'Rate of Change', 'Amplitude'])
const needsPeriod = (item: ComponentForm) => ['Simple Moving Average', 'Exponential Moving Average', 'Rate of Change'].includes(item.calculation)
const canShift = computed(() => Boolean(components[0]?.url && components[0]?.url === components[1]?.url))
function shortCalculation(item: ComponentForm) {
  const shift = Number(item.shift) > 0 ? `, Shift ${item.shift}` : ''
  if (item.calculation === 'Simple Moving Average') return `SMA(${item.period || '?'}${shift})`
  if (item.calculation === 'Exponential Moving Average') return `EMA(${item.period || '?'}${shift})`
  if (item.calculation === 'Rate of Change') return `ROC(${item.period || '?'}${shift})`
  return `${item.calculation}${Number(item.shift) ? ` (Shift ${item.shift})` : ''}`
}
const componentText = (item: ComponentForm) => `${item.source || 'Select a source'} ${shortCalculation(item)}`
const formula = computed(() => {
  if (isWeighted.value) return components.map((item) => `${item.source || 'Select a source'} ${item.weight || 0}%`).join(' ＋ ')
  if (isOhlcv.value) return `${components[0]?.source || 'Select a symbol'} · ${componentText(components[0]!).replace(`${components[0]?.source || 'Select a symbol'} `, '')}`
  if (isResample.value) return `${components[0]?.source || 'Select an indicator'} · Resample to ${form.timeframe}`
  if (isTechnical.value) return `${components[0]?.source || 'Select a symbol'} · ${technicalIndicator.value || 'Select a technical indicator'}`
  return `${componentText(components[0]!)} ${operationSymbol.value} ${componentText(components[1]!)}`
})
const explanation = computed(() => {
  if (isWeighted.value) return 'Combines the selected inputs using percentage weights that total 100%.'
  if (isOhlcv.value) return `Uses ${components[0]?.calculation || 'a price field'} from ${components[0]?.source || 'the selected symbol'}.`
  if (isResample.value) return `Resamples ${components[0]?.source || 'the selected indicator'} to ${form.timeframe}.`
  if (isTechnical.value) return `Calculates ${technicalIndicator.value || 'the selected technical indicator'} for ${components[0]?.source || 'the selected symbol'}.`
  const verb = operation.value === 'Subtract' ? 'subtracts' : operation.value === 'Divide' ? 'divides' : 'adds'
  return `This indicator ${verb} ${componentText(components[1]!)} ${operation.value === 'Add' ? 'to' : operation.value === 'Subtract' ? 'from' : 'into'} ${componentText(components[0]!)}.`
})
function selectSource(index: number, option: { value: string; url?: string }) { const item = components[index]; if (item) { item.source = option.value; item.url = option.url ?? option.value } }
function addWeightedComponent() {
  if (components.length >= 10) return
  components.push({ source: '', url: '', calculation: 'Indicator Value', period: '', shift: '0', weight: '0' })
}
function removeWeightedComponent(index: number) { if (components.length > 2) components.splice(index, 1) }
function validateForm() {
  message.value = ''
  if (!form.name.trim()) return void (message.value = 'Enter an indicator name.')
  const activeComponents = isPair.value || isWeighted.value ? components : components.slice(0, 1)
  if (activeComponents.some((item) => !item.url)) return void (message.value = isPair.value ? 'Choose both data sources.' : 'Choose a data source.')
  if (isTechnical.value && !technicalIndicator.value) return void (message.value = 'Choose a technical indicator.')
  if (isWeighted.value && components.reduce((total, item) => total + Number(item.weight || 0), 0) !== 100) return void (message.value = 'Weights must add up to 100%.')
  if (isOhlcv.value && ohlcvSmoothing.value !== 'None' && (!/^\d+$/.test(ohlcvPeriod.value) || Number(ohlcvPeriod.value) <= 0)) return void (message.value = 'Moving-average period must be a positive whole number.')
  if ((isPair.value || isOhlcv.value) && activeComponents.some((item) => needsPeriod(item) && (!/^\d+$/.test(item.period) || Number(item.period) <= 0))) return void (message.value = 'Moving-average and rate-of-change periods must be positive whole numbers.')
  if (isPair.value && components.some((item) => !/^\d+$/.test(item.shift) || Number(item.shift) < 0)) return void (message.value = 'Shift must be zero or a positive whole number.')
  if (isPair.value && !canShift.value && Number(components[1]?.shift)) return void (message.value = 'Shift is available only when both components use the same source.')
  validated.value = true; message.value = 'Formula validated and ready to save.'
}
function encodeCalculation(item: ComponentForm) {
  if (item.calculation === 'Indicator Value') return { ma: 'i', field: 'c' }
  if (item.calculation === 'Simple Moving Average') return { ma: item.period, field: 'c' }
  if (item.calculation === 'Exponential Moving Average') return { ma: `${item.period}e`, field: 'c' }
  if (item.calculation === 'Rate of Change') return { ma: `${item.period}roc`, field: 'c' }
  if (item.calculation === 'Amplitude') return { ma: 'amplitude', field: 'c' }
  return { ma: '0', field: ({ Open: 'o', High: 'h', Low: 'l', Close: 'c' } as Record<string, string>)[item.calculation] ?? 'c' }
}
function indicatorPayload(): CreateMyIndicatorPayload {
  const base = { name: form.name.trim(), time_frame: form.timeframe.toLowerCase(), extreme_optimism: form.optimismEnabled ? form.optimism : 0, extreme_pessimism: form.pessimismEnabled ? form.pessimism : 0, benchmark: form.benchmark }
  if (isWeighted.value) {
    const mulIndicator = Object.fromEntries([
      ...components.map((item, index) => [`indicator_${index + 1}`, item.url.replace(/@indicator$/, '')]),
      ['combine_type', components.map((item) => symbolOptions.some((option) => option.value === item.url) ? 'sy' : 'si').join('_')],
    ])
    const weights = components.map((item) => (Number(item.weight) / 100).toFixed(2).replace(/^-/, 'n')).join('_')
    return { ...base, indicator_1: 'model_smart_money', indicator_2: 'model_smart_money', ma: '1_1_1', calculate: 'weight_combination', combine_type: 'indicator', extreme_optimism: 0, extreme_pessimism: 0, next_process: 'sh0_c|sh0_c', mul_indicator: JSON.stringify(mulIndicator), indicator_weight: weights }
  }
  if (isOhlcv.value) {
    const ma = ohlcvSmoothing.value === 'None' ? '0' : ohlcvSmoothing.value === 'EMA' ? `${ohlcvPeriod.value}e` : ohlcvPeriod.value
    return { ...base, indicator_1: components[0]!.url, indicator_2: 'model_smart_money', ma, calculate: components[0]!.calculation.toLowerCase(), combine_type: 'ohlcv', extreme_optimism: 0, extreme_pessimism: 0, next_process: 'sh0_c' }
  }
  if (isResample.value) return { ...base, indicator_1: components[0]!.url.replace(/@indicator$/, ''), indicator_2: 'model_smart_money', ma: '1_1_1', calculate: form.timeframe.toLowerCase(), combine_type: 'resample', next_process: 'sh0_c|sh0_c' }
  if (isTechnical.value) {
    const option = technicalIndicatorOptions.find((item) => item.value === technicalIndicator.value)
    const code = technicalCode.value || `TI:${option?.label ?? technicalIndicator.value};IDS:CCI;SC:CCI/3/10`
    return { ...base, indicator_1: components[0]!.url, indicator_2: 'model_smart_money', ma: '1_1_1', calculate: 'technical', combine_type: 'technical_indicator', extreme_optimism: 0, extreme_pessimism: 0, next_process: 'sh0_c|sh0_c', tech_code: code }
  }
  const left = encodeCalculation(components[0]!); const right = encodeCalculation(components[1]!)
  return { ...base, indicator_1: components[0]!.url.replace(/@indicator$/, ''), indicator_2: components[1]!.url.replace(/@indicator$/, ''), ma: `${left.ma}_${right.ma}_1`, calculate: form.category.split(' ')[1]!.toLowerCase(), combine_type: isIndicator.value ? 'indicator' : 'symbol', next_process: `sh0_${left.field}|sh${components[1]!.shift || 0}_${right.field}` }
}
function decodeCalculation(ma: string, field: string): Pick<ComponentForm, 'calculation' | 'period'> {
  if (/^\d+e$/.test(ma)) return { calculation: 'Exponential Moving Average', period: ma.slice(0, -1) }
  if (/^\d+roc$/.test(ma)) return { calculation: 'Rate of Change', period: ma.slice(0, -3) }
  if (/^\d+$/.test(ma) && !['0', '1'].includes(ma)) return { calculation: 'Simple Moving Average', period: ma }
  if (ma === 'amplitude' || ma === 'amplify') return { calculation: 'Amplitude', period: '' }
  if (ma === 'i') return { calculation: 'Indicator Value', period: '' }
  return { calculation: ({ o: 'Open', h: 'High', l: 'Low', c: 'Close' } as Record<string, Calculation>)[field] ?? 'Close', period: '' }
}
function titleCaseCalculation(value: unknown, fallback: Calculation): Calculation {
  const text = String(value ?? '').toLowerCase()
  return ({ open: 'Open', high: 'High', low: 'Low', close: 'Close', volume: 'Volume' } as Record<string, Calculation>)[text] ?? fallback
}
function hydrateForm(row: MyIndicatorRow) {
  loadingRecord.value = true
  form.name = row.name
  form.category = row.category as Category
  form.timeframe = row.timeframe
  form.optimism = String(row.raw.extreme_optimism ?? '')
  form.pessimism = String(row.raw.extreme_pessimism ?? '')
  form.optimismEnabled = Boolean(form.optimism && form.optimism !== '0')
  form.pessimismEnabled = Boolean(form.pessimism && form.pessimism !== '0')
  form.benchmark = String(row.raw.benchmark ?? 'SPX')
  if (isWeighted.value) {
    components.splice(0, components.length, ...row.included.map((item) => ({ source: item.name, url: item.url, calculation: 'Indicator Value' as Calculation, period: '', shift: '0', weight: item.weight?.replace('%', '') ?? '0' })))
    loadingRecord.value = false
    return
  }
  if (isOhlcv.value) {
    const item = row.included[0]
    components.splice(0, components.length, { source: item?.name ?? '', url: item?.url ?? String(row.raw.indicator_1 ?? ''), calculation: titleCaseCalculation(row.raw.calculate, 'Close'), period: '', shift: '0', weight: '' })
    const maValue = String(row.raw.ma ?? '0')
    ohlcvSmoothing.value = maValue === '0' ? 'None' : maValue.endsWith('e') ? 'EMA' : 'SMA'
    ohlcvPeriod.value = maValue.replace(/e$/, '') === '0' ? '20' : maValue.replace(/e$/, '')
    loadingRecord.value = false
    return
  }
  if (isResample.value || isTechnical.value) {
    const item = row.included[0]
    components.splice(0, components.length, { source: item?.name ?? '', url: item?.url ?? String(row.raw.indicator_1 ?? ''), calculation: isTechnical.value ? 'Close' : 'Indicator Value', period: '', shift: '0', weight: '' })
    if (isTechnical.value) {
      technicalCode.value = String(row.raw.tech_code ?? '')
      const technicalName = technicalCode.value.match(/TI:([^;]+)/)?.[1] ?? ''
      technicalIndicator.value = technicalIndicatorOptions.find((item) => item.label === technicalName || item.value === technicalName)?.value ?? technicalName
    }
    loadingRecord.value = false
    return
  }
  const ma = String(row.raw.ma ?? '').split('_')
  const process = String(row.raw.next_process ?? '').split('|')
  for (const index of [0, 1]) {
    const component = components[index]!
    const included = row.included[index]
    const field = process[index]?.match(/_([a-z]+)$/i)?.[1] ?? 'c'
    const decoded = decodeCalculation(ma[index] ?? '', field)
    component.source = included?.name ?? ''
    component.url = included?.url ?? String(row.raw[`indicator_${index + 1}`] ?? '')
    component.calculation = decoded.calculation
    component.period = decoded.period
    component.shift = process[index]?.match(/sh(\d+)_/)?.[1] ?? '0'
  }
  loadingRecord.value = false
}
async function saveIndicator() {
  validateForm(); if (!validated.value) return
  saving.value = true
  try {
    if (isEdit.value) await updateMyIndicator(recordUrl.value, indicatorPayload(), controller.signal)
    else await createMyIndicator(indicatorPayload(), controller.signal)
    void router.push('/my-stuff/indicators')
  } catch (error) { message.value = error instanceof Error ? error.message : 'Unable to save the indicator.' }
  finally { saving.value = false }
}
watch(() => form.category, () => {
  if (loadingRecord.value) return
  validated.value = false
  const count = isPair.value || isWeighted.value ? 2 : 1
  components.splice(0, components.length, ...Array.from({ length: count }, (_, index) => ({ source: '', url: '', calculation: isIndicator.value || isWeighted.value ? 'Indicator Value' as Calculation : 'Close' as Calculation, period: index ? '20' : '', shift: '0', weight: isWeighted.value ? '50' : '' })))
  technicalIndicator.value = ''
  technicalCode.value = ''
  ohlcvSmoothing.value = 'None'
  ohlcvPeriod.value = '20'
}, { flush: 'sync' })
watch(technicalIndicator, () => { if (!loadingRecord.value) technicalCode.value = '' }, { flush: 'sync' })
watch([form, components], () => { validated.value = false; if (message.value === 'Formula validated and ready to save.') message.value = '' }, { deep: true })
onMounted(async () => {
  try {
    const [options, rows] = await Promise.all([
      fetchSentimentIndicatorOptions(controller.signal),
      isEdit.value ? fetchMyIndicators(controller.signal) : Promise.resolve([]),
    ])
    indicatorOptions.value = options
    if (isEdit.value) {
      const row = rows.find((item) => item.url === recordUrl.value)
      if (!row) message.value = 'Unable to find this indicator.'
      else hydrateForm(row)
    }
  } catch (error) { message.value = error instanceof Error ? error.message : 'Unable to load the indicator.' }
  finally { loadingOptions.value = false; loadingRecord.value = false }
})
onBeforeUnmount(() => controller.abort())
</script>

<template>
  <ListExplorerPage title="My Stuff" description="Your personal indicators, signals, screens and watch lists." :panel-title="isEdit ? 'Edit Indicator' : 'Create New Indicator'" panel-description="Combine market data into a reusable custom indicator." :show-view-mode-toggle="false" sidebar-width="220px" content-class="indicator-builder-panel">
    <template #sidebar><aside class="h-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3"><RouterLink v-for="section in sections" :key="section.path" :to="section.path" class="mb-1 flex items-center gap-3 rounded-md px-3 py-3 text-left transition" :class="section.label === 'My Indicator' ? 'bg-[var(--app-primary-soft)]' : 'hover:bg-[var(--app-surface-soft)]'"><component :is="section.icon" :size="20" class="text-[var(--app-primary)]" /><span class="min-w-0"><span class="block text-sm font-semibold">{{ section.label }}</span><span class="block truncate text-xs text-[var(--app-text-muted)]">{{ section.description }}</span></span></RouterLink></aside></template>
    <template #title-actions><button class="secondary-button h-8 px-3 text-xs" type="button" @click="router.push('/my-stuff/indicators')"><ArrowLeft :size="15" />Back to list</button></template>
    <template #summary><button class="secondary-button h-8 px-3 text-xs" type="button"><PlayCircle :size="15" />Watch Tutorial</button></template>
    <div class="builder-shell">
      <section class="builder-card setup-card"><h2><span class="section-number">1</span>Indicator Setup</h2><div class="setup-grid"><label>Name<input v-model="form.name" class="builder-input" placeholder="e.g. Sugar Optix MA100 Spread" /></label><label>Category<select v-model="form.category" class="builder-input"><option v-for="item in categories" :key="item">{{ item }}</option></select></label><label>Timeframe<select v-model="form.timeframe" class="builder-input"><option v-for="item in timeframes" :key="item">{{ item }}</option></select></label></div></section>
      <section class="builder-card formula-section"><div class="formula-heading"><h2><span class="section-number">2</span>Build Formula</h2><p class="section-copy">Configure the inputs required for {{ form.category }}.</p></div>
        <div v-if="isPair" class="component-grid"><template v-for="(item, index) in components" :key="index"><article class="component-card"><header><strong>{{ index ? 'B' : 'A' }}</strong>{{ index ? 'Second' : 'First' }} {{ isIndicator ? 'indicator' : 'symbol' }}</header><div class="component-body"><label>Source<SearchSelect v-model="item.source" :options="sourceOptions" :placeholder="loadingOptions ? 'Loading sources…' : 'Search source'" @select="selectSource(index, $event)" /></label><div class="component-options"><label>Calculation<select v-model="item.calculation" class="builder-input"><option v-for="option in calculationOptions" :key="option">{{ option }}</option></select></label><label v-if="needsPeriod(item)">Period<input v-model="item.period" class="builder-input" inputmode="numeric" /></label><label v-if="index === 1 && canShift && Number(item.shift) > 0">Shift (bars)<input v-model="item.shift" class="builder-input" inputmode="numeric" /></label></div></div></article><div v-if="index === 0" class="formula-operator"><span>{{ operationSymbol }}</span><strong>{{ operation }}</strong></div></template></div>
        <div v-else-if="isWeighted" class="weighted-grid"><article v-for="(item, index) in components" :key="index" class="component-card weighted-card"><header><strong>{{ index + 1 }}</strong>Weighted input<button type="button" :disabled="components.length <= 2" aria-label="Remove weighted input" @click="removeWeightedComponent(index)"><Trash2 :size="15" /></button></header><div class="component-body weighted-fields"><label>Indicator or symbol<SearchSelect v-model="item.source" :options="weightedSourceOptions" placeholder="Search input" @select="selectSource(index, $event)" /></label><label>Weight (%)<input v-model="item.weight" class="builder-input" type="number" step="1" /></label></div></article><button v-if="components.length < 10" class="add-component" type="button" @click="addWeightedComponent"><Plus :size="16" />Add weighted input</button></div>
        <div v-else class="special-form-grid"><article class="component-card"><header><strong>1</strong>{{ isResample ? 'Source indicator' : 'Source symbol' }}</header><div class="component-body"><label>Source<SearchSelect v-model="primaryComponent.source" :options="sourceOptions" :placeholder="loadingOptions ? 'Loading sources…' : 'Search source'" @select="selectSource(0, $event)" /></label><div v-if="isOhlcv" class="component-options"><label>Price field<select v-model="primaryComponent.calculation" class="builder-input"><option v-for="field in ['Open', 'High', 'Low', 'Close', 'Volume']" :key="field">{{ field }}</option></select></label><label>Smoothing<select v-model="ohlcvSmoothing" class="builder-input"><option>None</option><option>SMA</option><option>EMA</option></select></label><label v-if="ohlcvSmoothing !== 'None'">Period<input v-model="ohlcvPeriod" class="builder-input" inputmode="numeric" /></label></div><label v-if="isTechnical">Technical indicator<SearchSelect v-model="technicalIndicator" :options="technicalOptions" placeholder="Search technical indicator" /></label><div v-if="isResample" class="special-note">Target timeframe: <strong>{{ form.timeframe }}</strong></div></div></article></div>
        <div class="formula-summary"><div><strong>{{ isPair ? `Formula: A ${operationSymbol} B` : form.category }}</strong><span>{{ formula }}</span><small>{{ explanation }}</small></div><div class="formula-summary-actions"><span v-if="validated" class="validated"><Check :size="15" />Formula valid</span><button class="secondary-button" type="button" @click="validateForm"><Beaker :size="17" />Validate &amp; Preview</button><button class="primary-button" type="button" :disabled="saving || loadingRecord" @click="saveIndicator"><Save :size="17" />{{ saving ? 'Saving…' : isEdit ? 'Update Indicator' : 'Save Indicator' }}</button></div></div>
      </section>
      <section v-if="isPair || isResample" class="builder-card thresholds-card"><h2><span class="section-number">3</span>Thresholds <small>(Optional)</small></h2><div class="thresholds"><label><span><input v-model="form.optimismEnabled" type="checkbox" />Extreme Optimism</span><input v-model="form.optimism" class="builder-input" placeholder="Enter value" :disabled="!form.optimismEnabled" /></label><label><span><input v-model="form.pessimismEnabled" type="checkbox" />Extreme Pessimism</span><input v-model="form.pessimism" class="builder-input" placeholder="Enter value" :disabled="!form.pessimismEnabled" /></label></div></section>
      <section class="builder-card preview-card"><div><h2><span class="section-number">{{ isPair || isResample ? 4 : 3 }}</span>Preview</h2><span v-if="validated" class="validated"><Check :size="15" />Formula validated · Preview up to date</span></div><div class="preview-placeholder"><SlidersHorizontal :size="28" /><strong>{{ form.name || 'Your indicator preview' }}</strong><span>{{ formula }}</span><small>Chart preview will use the selected benchmark: {{ form.benchmark }}</small></div></section>
      <div v-if="message" class="builder-message" :class="validated ? 'success' : 'error'">{{ message }}</div>
    </div>
  </ListExplorerPage>
</template>

<style scoped>
.builder-shell{display:grid;gap:14px;padding:12px;background:var(--app-bg)}.builder-card{border:1px solid var(--app-border);border-radius:10px;background:var(--app-surface);padding:16px}.builder-card h2{display:flex;align-items:center;gap:8px;font-size:1rem;font-weight:900}.builder-card h2 small{color:var(--app-text-muted);font-size:.72rem;font-weight:650}.section-number{display:inline-flex;width:23px;height:23px;align-items:center;justify-content:center;border-radius:50%;background:var(--app-primary-soft);color:var(--app-primary);font-size:.72rem;font-weight:900}.setup-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:12px}.builder-shell label{color:var(--app-text-muted);font-size:.75rem;font-weight:700}.builder-input{display:block;width:100%;height:38px;margin-top:6px;border:1px solid var(--app-border);border-radius:6px;background:var(--app-surface);padding:0 11px;color:var(--app-text);font-size:.8125rem;outline:none}.builder-input:focus{border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-primary-shadow)}.builder-input:disabled{background:var(--app-surface-muted);opacity:.65}.formula-section{padding:16px}.formula-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:16px}.section-copy{color:var(--app-text-muted);font-size:.75rem}.component-grid{display:grid;grid-template-columns:minmax(0,1fr) 90px minmax(0,1fr);align-items:center;gap:14px;margin-top:16px}.component-card{align-self:stretch;border:1px solid var(--app-border);border-radius:9px;overflow:visible}.component-card header{display:flex;align-items:center;gap:7px;border-radius:9px 9px 0 0;background:var(--app-primary-soft);padding:11px 14px;color:var(--app-primary);font-size:.8rem;font-weight:800}.component-card header strong{display:inline-flex;width:25px;height:25px;align-items:center;justify-content:center;border-radius:50%;background:var(--app-primary);color:white;font-size:.72rem}.component-body{display:grid;gap:14px;padding:14px}.component-body :deep(.search-select){margin-top:6px}.component-options{display:grid;grid-template-columns:minmax(130px,1fr) repeat(2,minmax(90px,.45fr));gap:10px;align-items:start}.component-options>label:only-child{grid-column:1/-1}.component-options label small{display:block;margin-top:5px;color:var(--app-text-muted);font-size:.62rem;font-weight:500}.formula-operator{display:grid;justify-items:center;gap:7px}.formula-operator span{display:flex;width:46px;height:46px;align-items:center;justify-content:center;border:1px solid var(--app-border-strong);border-radius:8px;background:var(--app-surface);font-size:1.25rem;font-weight:700}.formula-operator strong{font-size:.72rem;color:var(--app-text-muted)}.weighted-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}.weighted-card header button{display:inline-flex;margin-left:auto;padding:5px;border-radius:5px;color:var(--app-text-muted)}.weighted-card header button:hover:not(:disabled){background:var(--app-surface);color:var(--app-negative)}.weighted-card header button:disabled{opacity:.35}.weighted-fields{grid-template-columns:minmax(0,1fr) 110px;align-items:end}.add-component{display:flex;min-height:48px;align-items:center;justify-content:center;gap:7px;border:1px dashed var(--app-border-strong);border-radius:8px;color:var(--app-primary);font-size:.76rem;font-weight:800}.special-form-grid{margin-top:16px}.special-form-grid>.component-card{max-width:760px}.special-note{border-radius:6px;background:var(--app-surface-muted);padding:10px 12px;color:var(--app-text-secondary);font-size:.75rem}.formula-summary{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:16px;border-radius:8px;background:var(--app-primary-soft);padding:12px 14px}.formula-summary>div:first-child{display:grid;gap:3px;min-width:0}.formula-summary strong{font-size:.82rem}.formula-summary span,.formula-summary small{overflow:hidden;color:var(--app-text-secondary);font-size:.72rem;text-overflow:ellipsis;white-space:nowrap}.formula-summary-actions{display:flex;flex:none;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:12px}.thresholds{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:14px}.thresholds label{display:grid;grid-template-columns:minmax(135px,.65fr) minmax(120px,1fr);align-items:center;gap:12px}.thresholds label>span{display:flex;align-items:center;gap:7px;color:var(--app-text-muted);font-size:.75rem;font-weight:700}.thresholds .builder-input{margin-top:0}.preview-card>div:first-child{display:flex;align-items:center;gap:14px}.validated{display:inline-flex!important;align-items:center;gap:5px!important;color:var(--app-positive)!important;font-size:.75rem!important;font-weight:800;white-space:nowrap!important}.preview-placeholder{display:flex;min-height:150px;margin-top:12px;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px dashed var(--app-border-strong);border-radius:8px;background:var(--app-surface-soft);color:var(--app-text-muted);text-align:center}.preview-placeholder strong{color:var(--app-text)}.preview-placeholder span{font-size:.8rem}.preview-placeholder small{font-size:.7rem}.secondary-button,.primary-button{display:inline-flex;height:40px;align-items:center;justify-content:center;gap:7px;border-radius:6px;padding:0 18px;font-size:.8rem;font-weight:850}.secondary-button{border:1px solid var(--app-primary);color:var(--app-primary)}.primary-button{background:var(--app-primary);color:#fff}.primary-button:disabled{opacity:.55}.builder-message{border-radius:7px;padding:10px 13px;font-size:.78rem;font-weight:700}.builder-message.success{background:color-mix(in srgb,var(--app-positive) 12%,transparent);color:var(--app-positive)}.builder-message.error{background:color-mix(in srgb,var(--app-negative) 10%,transparent);color:var(--app-negative)}@media(max-width:1100px){.component-options{grid-template-columns:1fr 1fr}.component-options>label:first-child{grid-column:1/-1}.formula-heading{display:block}.section-copy{margin-top:4px}}@media(max-width:760px){.setup-grid,.thresholds,.weighted-grid{grid-template-columns:1fr}.component-grid{grid-template-columns:1fr}.formula-operator{padding:4px}.component-options,.weighted-fields{grid-template-columns:1fr}.component-options>label:first-child{grid-column:auto}.formula-summary{align-items:stretch;flex-direction:column}.formula-summary-actions{justify-content:flex-start}.thresholds label{grid-template-columns:1fr}.thresholds .builder-input{margin-top:6px}}
</style>
