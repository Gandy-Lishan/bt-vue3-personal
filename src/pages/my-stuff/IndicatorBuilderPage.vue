<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Beaker, BellRing, Check, ContactRound, Filter, Info, ListChecks, PlayCircle, Save, SlidersHorizontal } from '@lucide/vue'
import indexesData from '@/assets/indexes_list.json'
import stocksData from '@/assets/stocks_list.json'
import { createMyIndicator } from '@/entities/my-stuff/api/user-indicator.api'
import { fetchSentimentIndicatorOptions, type SignalIndicatorOption } from '@/entities/my-stuff/api/sentiment-indicator.api'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'
import SearchSelect from '@/shared/ui/SearchSelect.vue'

type Category = 'Indicator Spread' | 'Indicator Ratio' | 'Indicator Addition' | 'Symbol Spread' | 'Symbol Ratio' | 'Symbol Addition'
type Calculation = 'Indicator Value' | 'Open' | 'High' | 'Low' | 'Close' | 'Simple Moving Average' | 'Exponential Moving Average' | 'Rate of Change' | 'Amplitude'
interface ComponentForm { source: string; url: string; calculation: Calculation; period: string; shift: string }
interface BuilderOption { value: string; label: string; description?: string; meta?: string; url: string }

const router = useRouter()
const controller = new AbortController()
const sections = [
  { label: 'My Signal', path: '/my-stuff/signals', description: 'Create and monitor custom market signals.', icon: BellRing },
  { label: 'My Indicator', path: '/my-stuff/indicators', description: 'Build and manage personal indicators.', icon: SlidersHorizontal },
  { label: 'My Screen', path: '/my-stuff/screens', description: 'Save and run stock screens.', icon: Filter },
  { label: 'My Watch List', path: '/my-stuff/watchlist', description: 'Keep the symbols you follow together.', icon: ListChecks },
  { label: 'Concierge Service', path: '/my-stuff/concierge', description: 'Ask our team to help with setup.', icon: ContactRound },
]
const categories: Category[] = ['Indicator Spread', 'Indicator Ratio', 'Indicator Addition', 'Symbol Spread', 'Symbol Ratio', 'Symbol Addition']
const timeframes = ['Daily', 'Weekly', 'Monthly']
const indicatorOptions = ref<SignalIndicatorOption[]>([])
const loadingOptions = ref(true)
const saving = ref(false)
const validated = ref(false)
const message = ref('')
const form = reactive({ name: '', category: 'Indicator Spread' as Category, timeframe: 'Daily', optimismEnabled: false, optimism: '', pessimismEnabled: false, pessimism: '', benchmark: 'SPX' })
const components = reactive<ComponentForm[]>([
  { source: '', url: '', calculation: 'Indicator Value', period: '', shift: '0' },
  { source: '', url: '', calculation: 'Simple Moving Average', period: '20', shift: '0' },
])
const rawSymbolOptions: BuilderOption[] = [
  ...(stocksData as Array<{ stock?: string; name?: string; category?: string }>).map((item) => ({ value: String(item.stock ?? ''), label: String(item.stock ?? ''), description: String(item.name ?? ''), meta: String(item.category ?? 'Stock'), url: String(item.stock ?? '') })),
  ...(indexesData as Array<{ symbol?: string; name?: string; category?: string }>).map((item) => ({ value: String(item.symbol ?? ''), label: String(item.symbol ?? ''), description: String(item.name ?? ''), meta: String(item.category ?? 'Index'), url: String(item.symbol ?? '') })),
].filter((item) => item.value)
const symbolOptions = [...new Map<string, BuilderOption>(rawSymbolOptions.map((item) => [item.value, item])).values()]

const isIndicator = computed(() => form.category.startsWith('Indicator'))
const operation = computed(() => form.category.endsWith('Spread') ? 'Subtract' : form.category.endsWith('Ratio') ? 'Divide' : 'Add')
const operationSymbol = computed(() => operation.value === 'Subtract' ? '−' : operation.value === 'Divide' ? '÷' : '＋')
const sourceOptions = computed(() => isIndicator.value ? indicatorOptions.value : symbolOptions)
const calculationOptions = computed<Calculation[]>(() => isIndicator.value
  ? ['Indicator Value', 'Simple Moving Average', 'Exponential Moving Average']
  : ['Close', 'Open', 'High', 'Low', 'Simple Moving Average', 'Exponential Moving Average', 'Rate of Change', 'Amplitude'])
const needsPeriod = (item: ComponentForm) => ['Simple Moving Average', 'Exponential Moving Average', 'Rate of Change'].includes(item.calculation)
const canShift = computed(() => Boolean(components[0]?.url && components[0]?.url === components[1]?.url))
function shortCalculation(item: ComponentForm) {
  if (item.calculation === 'Simple Moving Average') return `SMA(${item.period || '?'}, Shift ${item.shift || 0})`
  if (item.calculation === 'Exponential Moving Average') return `EMA(${item.period || '?'}, Shift ${item.shift || 0})`
  if (item.calculation === 'Rate of Change') return `ROC(${item.period || '?'}, Shift ${item.shift || 0})`
  return `${item.calculation}${Number(item.shift) ? ` (Shift ${item.shift})` : ''}`
}
const componentText = (item: ComponentForm) => `${item.source || 'Select a source'} ${shortCalculation(item)}`
const formula = computed(() => `${componentText(components[0]!)} ${operationSymbol.value} ${componentText(components[1]!)}`)
const explanation = computed(() => {
  const verb = operation.value === 'Subtract' ? 'subtracts' : operation.value === 'Divide' ? 'divides' : 'adds'
  return `This indicator ${verb} ${componentText(components[1]!)} ${operation.value === 'Add' ? 'to' : operation.value === 'Subtract' ? 'from' : 'into'} ${componentText(components[0]!)}.`
})
const steps = computed(() => [
  `Take ${componentText(components[0]!)}.`,
  `Calculate ${componentText(components[1]!)}.`,
  `${operation.value} the two values to create the indicator.`,
])

function selectSource(index: number, option: { value: string; url?: string }) { const item = components[index]; if (item) { item.source = option.value; item.url = option.url ?? option.value } }
function validateForm() {
  message.value = ''
  if (!form.name.trim()) return void (message.value = 'Enter an indicator name.')
  if (components.some((item) => !item.url)) return void (message.value = 'Choose both data sources.')
  if (components.some((item) => needsPeriod(item) && (!/^\d+$/.test(item.period) || Number(item.period) <= 0))) return void (message.value = 'Moving-average and rate-of-change periods must be positive whole numbers.')
  if (components.some((item) => !/^\d+$/.test(item.shift) || Number(item.shift) < 0)) return void (message.value = 'Shift must be zero or a positive whole number.')
  if (!canShift.value && Number(components[1]?.shift)) return void (message.value = 'Shift is available only when both components use the same source.')
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
async function saveIndicator() {
  validateForm(); if (!validated.value) return
  const left = encodeCalculation(components[0]!); const right = encodeCalculation(components[1]!)
  saving.value = true
  try {
    await createMyIndicator({ name: form.name.trim(), indicator_1: components[0]!.url.replace(/@indicator$/, ''), indicator_2: components[1]!.url.replace(/@indicator$/, ''), time_frame: form.timeframe.toLowerCase(), ma: `${left.ma}_${right.ma}_1`, calculate: form.category.split(' ')[1]!.toLowerCase(), combine_type: isIndicator.value ? 'indicator' : 'symbol', extreme_optimism: form.optimismEnabled ? form.optimism : 0, extreme_pessimism: form.pessimismEnabled ? form.pessimism : 0, benchmark: form.benchmark, next_process: `sh0_${left.field}|sh${components[1]!.shift || 0}_${right.field}` }, controller.signal)
    void router.push('/my-stuff/indicators')
  } catch (error) { message.value = error instanceof Error ? error.message : 'Unable to save the indicator.' }
  finally { saving.value = false }
}
watch(() => form.category, () => { validated.value = false; components.forEach((item) => { item.source = ''; item.url = ''; item.calculation = isIndicator.value ? 'Indicator Value' : 'Close'; item.period = ''; item.shift = '0' }) })
watch([form, components], () => { validated.value = false; if (message.value === 'Formula validated and ready to save.') message.value = '' }, { deep: true })
onMounted(async () => { try { indicatorOptions.value = await fetchSentimentIndicatorOptions(controller.signal) } finally { loadingOptions.value = false } })
onBeforeUnmount(() => controller.abort())
</script>

<template>
  <ListExplorerPage title="My Stuff" description="Your personal indicators, signals, screens and watch lists." panel-title="Create New Indicator" panel-description="Combine market data into a reusable custom indicator." :show-view-mode-toggle="false" sidebar-width="220px" content-class="indicator-builder-panel">
    <template #sidebar><aside class="h-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3"><RouterLink v-for="section in sections" :key="section.path" :to="section.path" class="mb-1 flex items-center gap-3 rounded-md px-3 py-3 text-left transition" :class="section.label === 'My Indicator' ? 'bg-[var(--app-primary-soft)]' : 'hover:bg-[var(--app-surface-soft)]'"><component :is="section.icon" :size="20" class="text-[var(--app-primary)]" /><span class="min-w-0"><span class="block text-sm font-semibold">{{ section.label }}</span><span class="block truncate text-xs text-[var(--app-text-muted)]">{{ section.description }}</span></span></RouterLink></aside></template>
    <template #title-actions><button class="secondary-button h-8 px-3 text-xs" type="button" @click="router.push('/my-stuff/indicators')"><ArrowLeft :size="15" />Back to list</button></template>
    <template #summary><button class="secondary-button h-8 px-3 text-xs" type="button"><PlayCircle :size="15" />Watch Tutorial</button></template>
    <div class="builder-shell">
      <nav class="progress-track" aria-label="Indicator setup progress"><div class="progress-step progress-step--complete"><span><Check :size="14" /></span><strong>Basic Setup</strong></div><div class="progress-line progress-line--active" /><div class="progress-step progress-step--selected"><span>2</span><strong>Build Formula</strong></div><div class="progress-line" /><div class="progress-step"><span>3</span><strong>Preview &amp; Save</strong></div></nav>
      <section class="builder-card setup-card"><h2>Indicator Setup</h2><div class="setup-grid"><label>Name<input v-model="form.name" class="builder-input" placeholder="e.g. Sugar Optix MA100 Spread" /></label><label>Category<select v-model="form.category" class="builder-input"><option v-for="item in categories" :key="item">{{ item }}</option></select></label><label>Timeframe<select v-model="form.timeframe" class="builder-input"><option v-for="item in timeframes" :key="item">{{ item }}</option></select></label></div></section>
      <section class="builder-card formula-section"><div class="formula-workspace"><div><h2>Build Formula</h2><p class="section-copy">Combine two data components using a supported mathematical operation.</p><div class="component-grid">
        <template v-for="(item, index) in components" :key="index"><article class="component-card"><header><span>{{ index + 1 }}</span>Component {{ index ? 'B' : 'A' }}</header><div class="component-body"><label>Source <Info :size="14" /><SearchSelect v-model="item.source" :options="sourceOptions" :placeholder="loadingOptions ? 'Loading sources…' : 'Search source'" @select="selectSource(index, $event)" /></label><label>Calculation <Info :size="14" /><select v-model="item.calculation" class="builder-input"><option v-for="option in calculationOptions" :key="option">{{ option }}</option></select></label><div v-if="needsPeriod(item) || index === 1" class="minor-grid"><label v-if="needsPeriod(item)">Period<input v-model="item.period" class="builder-input" inputmode="numeric" /></label><label v-if="index === 1">Shift<input v-model="item.shift" class="builder-input" inputmode="numeric" :disabled="!canShift" /></label></div></div></article><div v-if="index === 0" class="formula-operator"><span>{{ operationSymbol }}</span><strong>{{ operation }}</strong></div></template>
      </div><div class="formula-result"><strong>Result (Preview)</strong><span>{{ formula }}</span></div><div class="formula-actions"><span /><button class="secondary-button" type="button" @click="validateForm"><Beaker :size="17" />Validate Formula</button></div></div>
      <aside class="calculation-panel"><h3>How this indicator is calculated</h3><p>{{ explanation }}</p><ol><li v-for="(step, index) in steps" :key="step"><span>{{ index + 1 }}</span>{{ step }}</li></ol><div class="calculation-result"><strong>Result:</strong> {{ formula }}</div><hr /><h3>Thresholds <small>(Optional)</small></h3><div class="thresholds"><label><span><input v-model="form.optimismEnabled" type="checkbox" />Extreme Optimism</span><input v-model="form.optimism" class="builder-input" placeholder="Enter value" :disabled="!form.optimismEnabled" /></label><label><span><input v-model="form.pessimismEnabled" type="checkbox" />Extreme Pessimism</span><input v-model="form.pessimism" class="builder-input" placeholder="Enter value" :disabled="!form.pessimismEnabled" /></label></div></aside></div></section>
      <section class="builder-card preview-card"><div><h2>Preview</h2><span v-if="validated" class="validated"><Check :size="15" />Formula validated · Preview up to date</span></div><div class="preview-placeholder"><SlidersHorizontal :size="28" /><strong>{{ form.name || 'Your indicator preview' }}</strong><span>{{ formula }}</span><small>Chart preview will use the selected benchmark: {{ form.benchmark }}</small></div></section>
      <div v-if="message" class="builder-message" :class="validated ? 'success' : 'error'">{{ message }}</div>
      <footer class="builder-footer"><button class="secondary-button" type="button" @click="router.push('/my-stuff/indicators')"><ArrowLeft :size="16" />Back</button><button class="primary-button" type="button" :disabled="saving" @click="saveIndicator"><Save :size="17" />{{ saving ? 'Saving…' : 'Save Indicator' }}</button></footer>
    </div>
  </ListExplorerPage>
</template>

<style scoped>
.builder-shell{display:grid;gap:14px;padding:12px;background:var(--app-bg)}.progress-track{display:flex;align-items:center;margin:6px 6px 2px}.progress-step{display:flex;flex:none;align-items:center;gap:8px;color:var(--app-text-muted);font-size:.76rem}.progress-step span{display:flex;width:27px;height:27px;align-items:center;justify-content:center;border-radius:9999px;background:var(--app-surface-muted);font-weight:900}.progress-step--complete{color:var(--app-primary)}.progress-step--complete span{background:var(--app-primary);color:white}.progress-step--selected{color:var(--app-text)}.progress-line{height:1px;flex:1;margin:0 11px;background:var(--app-border-strong)}.progress-line--active{background:var(--app-primary)}.builder-card{border:1px solid var(--app-border);border-radius:10px;background:var(--app-surface);padding:16px}.builder-card h2{font-size:1rem;font-weight:900}.setup-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:12px}.builder-shell label,.setup-grid label,.component-body label{color:var(--app-text-muted);font-size:.75rem;font-weight:700}.builder-input{display:block;width:100%;height:38px;margin-top:6px;border:1px solid var(--app-border);border-radius:6px;background:var(--app-surface);padding:0 11px;color:var(--app-text);font-size:.8125rem;outline:none}.builder-input:focus{border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-primary-shadow)}.builder-input:disabled{background:var(--app-surface-muted);opacity:.65}.formula-section{padding:0}.formula-workspace{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(340px,.85fr)}.formula-workspace>div{padding:16px}.section-copy{margin-top:3px;color:var(--app-text-muted);font-size:.75rem}.component-grid{display:grid;grid-template-columns:minmax(0,1fr) 90px minmax(0,1fr);align-items:center;gap:12px;margin-top:13px}.component-card{align-self:stretch;border:1px solid var(--app-border);border-radius:9px;overflow:visible}.component-card header{display:flex;align-items:center;gap:10px;border-radius:9px 9px 0 0;background:var(--app-primary-soft);padding:10px 14px;color:var(--app-primary);font-size:.8rem;font-weight:900}.component-card header span{display:inline-flex;width:26px;height:26px;align-items:center;justify-content:center;border-radius:50%;background:var(--app-primary);color:#fff}.component-body{display:grid;gap:14px;padding:14px}.component-body label>svg{display:inline;margin-left:4px;color:var(--app-text-muted);vertical-align:middle}.component-body :deep(.search-select){margin-top:6px}.minor-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.formula-operator{display:grid;justify-items:center;gap:7px}.formula-operator span{display:flex;width:46px;height:46px;align-items:center;justify-content:center;border:1px solid var(--app-border-strong);border-radius:50%;font-size:1.4rem;font-weight:500}.formula-operator strong{font-size:.72rem;color:var(--app-text-muted)}.formula-result{display:grid;gap:6px;margin-top:12px;border-radius:7px;background:var(--app-primary-soft);padding:10px 13px;font-size:.78rem}.formula-actions{display:flex;justify-content:space-between;margin-top:12px}.calculation-panel{border-left:1px solid var(--app-border);padding:16px}.calculation-panel h3{font-size:.9rem;font-weight:900}.calculation-panel h3 small{font-weight:600;color:var(--app-text-muted)}.calculation-panel>p{margin-top:6px;color:var(--app-text-secondary);font-size:.78rem;line-height:1.5}.calculation-panel ol{display:grid;gap:13px;margin-top:15px}.calculation-panel li{display:flex;align-items:center;gap:10px;color:var(--app-text-secondary);font-size:.77rem}.calculation-panel li span{display:flex;width:27px;height:27px;flex:0 0 27px;align-items:center;justify-content:center;border-radius:50%;background:var(--app-primary-soft);color:var(--app-primary);font-weight:900}.calculation-result{margin-top:16px;border-radius:7px;background:var(--app-primary-soft);padding:11px;font-size:.75rem}.calculation-panel hr{margin:18px 0;border-color:var(--app-border-muted)}.thresholds{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.thresholds label>span{display:flex;align-items:center;gap:7px;color:var(--app-text-muted);font-size:.75rem;font-weight:700}.preview-card>div:first-child{display:flex;align-items:center;gap:14px}.validated{display:inline-flex;align-items:center;gap:5px;color:var(--app-positive);font-size:.75rem;font-weight:800}.preview-placeholder{display:flex;min-height:150px;margin-top:12px;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px dashed var(--app-border-strong);border-radius:8px;background:var(--app-surface-soft);color:var(--app-text-muted);text-align:center}.preview-placeholder strong{color:var(--app-text)}.preview-placeholder span{font-size:.8rem}.preview-placeholder small{font-size:.7rem}.builder-footer{display:flex;justify-content:space-between}.secondary-button,.primary-button{display:inline-flex;height:40px;align-items:center;justify-content:center;gap:7px;border-radius:6px;padding:0 18px;font-size:.8rem;font-weight:850}.secondary-button{border:1px solid var(--app-primary);color:var(--app-primary)}.primary-button{background:var(--app-primary);color:#fff}.primary-button:disabled{opacity:.55}.builder-message{border-radius:7px;padding:10px 13px;font-size:.78rem;font-weight:700}.builder-message.success{background:color-mix(in srgb,var(--app-positive) 12%,transparent);color:var(--app-positive)}.builder-message.error{background:color-mix(in srgb,var(--app-negative) 10%,transparent);color:var(--app-negative)}@media(max-width:1100px){.formula-workspace{grid-template-columns:1fr}.calculation-panel{border-top:1px solid var(--app-border);border-left:0}}@media(max-width:760px){.setup-grid,.thresholds{grid-template-columns:1fr}.progress-step strong{display:none}.component-grid{grid-template-columns:1fr}.formula-operator{padding:4px}.minor-grid{grid-template-columns:1fr}}
</style>
