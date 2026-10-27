<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Beaker, BellRing, Check, Filter, ListChecks, PlayCircle, Plus, Save, SlidersHorizontal, Trash2 } from '@lucide/vue'
// @ts-ignore lodash does not ship with TS declarations
import { debounce } from 'lodash'
import indexesData from '@/assets/indexes_list.json'
import stocksData from '@/assets/stocks_list.json'
import { createMyIndicator, createMyIndicatorForPreview, deleteMyIndicator, fetchMyIndicators, getMyIndicatorData, updateMyIndicator, type CreateMyIndicatorPayload, type MyIndicatorRow } from '@/entities/my-stuff/api/user-indicator.api'
import { fetchSentimentIndicatorOptions, type SignalIndicatorOption } from '@/entities/my-stuff/api/sentiment-indicator.api'
import { technicalIndicatorOptions } from '@/entities/my-stuff/model/technical-indicator'
import { useChartIQStore } from '@/entities/chartiq/model/chartiq.store'
// @ts-ignore ChartIQ does not ship with TS declarations
import { CIQ } from '@/shared/lib/chartiq/st-development/js/components'
import { timeframeTransform } from '@/shared/lib/chartiq/utils'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'
import LoadingOverlay from '@/shared/ui/LoadingOverlay.vue'
import SearchSelect from '@/shared/ui/SearchSelect.vue'
// 【Vue2→Vue3 完全一致迁移】旧版 MIForm.vue 的 chart 同步逻辑依赖的映射与数据构造
import { buildLegacyChartData, buildWeightData, calculationToMAType, chartIndicatorUrl, CHART_START_DATE, isIndicatorChartUrl, legacyCategory, restoreIndicatorChartUrl } from './model/indicator-chart-adapter'
import IndicatorBuilderChartIQ from './ui/IndicatorBuilderChartIQ.vue'

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
  { source: '', url: '', calculation: 'Indicator Value', period: '', shift: '0', weight: '50' },
])
const primaryComponent = computed(() => components[0]!)
const technicalIndicator = ref('')
const technicalCode = ref('')
const ohlcvSmoothing = ref<'None' | 'SMA' | 'EMA'>('None')
const ohlcvPeriod = ref('20')
const isEdit = computed(() => route.name === 'my-indicator-edit')
const recordUrl = computed(() => typeof route.query.url === 'string' ? route.query.url : '')
/* ── ChartIQ（对应旧版 MyIndicator/create 的 MIChart + MIForm 图表部分） ── */
const chartIQStore = useChartIQStore()
const chartMounted = ref(false)
const chartReady = ref(false)
const legacyChartData = ref<Record<string, unknown> | null>(null)
// 用户选择的整体 timeframe（旧版 userSelectedTimeFrame），用于 findMaxFreq
const userSelectedTimeFrame = ref('daily')
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
// 【照搬旧版】WIC 下拉是 sentimentList（Indicator）在前、symbolList（Symbol）在后，
// 同名 ticker 需要用 kind 判别，才能正确加 `@indicator` 后缀 / 更新 weightData.type
const weightedSourceOptions = computed(() => [
  ...indicatorOptions.value.map((item) => ({ ...item, kind: 'Indicator' as const })),
  ...symbolOptions.map((item) => ({ ...item, kind: 'Symbol' as const })),
])
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
/* ═══════════════════════════════════════════════════════════════════
 * ChartIQ 实时同步（对应旧版 MIForm.vue 的方法，调用顺序与参数形状照搬）
 * ═══════════════════════════════════════════════════════════════════ */

/** 旧版 this.data 中同步给 chart/store 的扁平结构 */
function chartState() {
  return {
    categories: legacyCategory(form.category),
    indicator_1: components[0]?.source ?? '',
    indicator_1_url: components[0]?.url ?? '',
    indicator_2: components[1]?.source ?? '',
    indicator_2_url: components[1]?.url ?? '',
  }
}

/** 旧版 checkInput.MAType */
function componentMAType(item: ComponentForm) {
  return calculationToMAType(item.calculation)
}

/** 旧版 checkInput.value */
function componentMAValue(item: ComponentForm): string | number {
  const type = componentMAType(item)
  if (!['MA', 'EMA', 'roc'].includes(type)) return ''
  return item.period === '' ? '' : Number(item.period)
}

/** OHLCV 平滑：旧版 CheckInput 的 MAType 仅 MA/EMA，无平滑时 showInput=false */
function ohlcvMAType() {
  return ohlcvSmoothing.value === 'EMA' ? 'EMA' : 'MA'
}

function ohlcvMAValue(): string | number {
  return ohlcvPeriod.value === '' ? '' : Number(ohlcvPeriod.value)
}

function ohlcvShowInput() {
  return ohlcvSmoothing.value !== 'None'
}

/** 旧版 MIForm.manageMICondStudies 原文移植 */
function manageMICondStudies(value: unknown, type: string, field: 'ma1' | 'ma2', showInput: boolean) {
  if (!chartReady.value) return
  const categories = legacyCategory(form.category)
  let fieldName: string | undefined = 'field'
  let criteria = 'entry1'
  if (categories === 'OHLCV') {
    fieldName = CIQ.findSymbolIndicator(`Symbol ${components[0]?.calculation ?? 'Close'}`, null)?.field
    criteria = 'entry1'
  } else if (categories.includes('Symbol')) {
    criteria = field === 'ma1' ? 'entry1' : 'entry2'
  } else {
    fieldName = field === 'ma1' ? components[0]?.url : components[1]?.url
    // 不是 symbol 类型的话，不用关心双股票条件，默认为 entry1
    criteria = 'entry1'
  }
  const index = field === 'ma1' ? 0 : 1
  if (type === 'i') {
    CIQ.addOwnIndicatorMAStudy(0, 'MA', fieldName, criteria, index, false, categories)
  }
  if (['EMA', 'MA'].includes(type)) {
    if (categories.includes('Indicator') && canShift.value && field === 'ma2') {
      const shiftedStudy = Object.values(CIQ.stxx.layout.studies).find((study: any) => study.type === 'ShiftedSentimentIndicator') as any
      if (shiftedStudy && shiftedStudy.inputs) fieldName = shiftedStudy.inputs.display
    }
    CIQ.addOwnIndicatorMAStudy(value, type, fieldName, criteria, index, showInput, categories)
  }
  if (type === 'roc') {
    CIQ.addOwnIndicatorROCStudy(value, 'Close', criteria, index, showInput)
  }
  if (type === 'amplitude' || type === 'amplify') {
    CIQ.addOwnIndicatorAmplitudeStudy(criteria, index, showInput)
  }
  if (['o', 'h', 'l', 'c'].includes(type)) {
    CIQ.addSymbolOHLCVStudy(criteria, index)
  }
}

/** 旧版 refreshMAState */
function refreshMAState() {
  if (!isPair.value) return
  const first = components[0]!
  const second = components[1]!
  manageMICondStudies(componentMAValue(first), componentMAType(first), 'ma1', true)
  manageMICondStudies(componentMAValue(second), componentMAType(second), 'ma2', true)
}

/** 旧版 findMaxFreq + getMaxTimeframe（周期取 indicator 的 updated，即 option.meta） */
function findMaxFreq() {
  const updatedFor = (url: string) => indicatorOptions.value
    .find((option) => chartIndicatorUrl(option.url).toLowerCase() === url.toLowerCase())?.meta?.toLowerCase()
  let frequencyArray: Array<string | undefined> = []
  const categories = legacyCategory(form.category)
  if (categories === 'Resample') {
    frequencyArray = [updatedFor(components[0]?.url ?? '')]
  } else if (form.category !== 'Weighted Indicator Combination') {
    if (categories.includes('Indicator')) {
      frequencyArray = [updatedFor(components[0]?.url ?? ''), updatedFor(components[1]?.url ?? '')]
    }
  } else {
    frequencyArray = components.map((item) => (
      isIndicatorChartUrl(item.url, indicatorOptions.value) ? updatedFor(item.url) : undefined
    ))
  }
  const validTimeframes = ['daily', 'weekly', 'monthly']
  const filtered = [...frequencyArray.filter((item): item is string => Boolean(item)), userSelectedTimeFrame.value]
    .filter((item) => validTimeframes.includes(item))
  if (!filtered.length) return 'daily'
  return filtered.reduce((max, item) => (validTimeframes.indexOf(item) > validTimeframes.indexOf(max) ? item : max))
}

/** 读取原生 select/input 的当前值（避免依赖 v-model 与 @change 的监听顺序） */
function eventValue(event: Event) {
  return (event.target as HTMLSelectElement | null)?.value ?? ''
}

/** 旧版 changeTimeFrame 的图表部分 */
async function handleTimeframeChange(value: string) {
  form.timeframe = value
  if (isResample.value) {
    // 旧版 Resample 的 timeframe 由 condition 控制（changeResampleCondition 不改 userSelectedTimeFrame）
    chartIQStore.getFrequency(timeframeTransform(value.toLowerCase()))
    return
  }
  userSelectedTimeFrame.value = value.toLowerCase()
  chartIQStore.getFrequency(timeframeTransform(findMaxFreq()))
  if (!chartReady.value) return
  if (form.category === 'Weighted Indicator Combination') {
    await chartIQStore.set_miFormWeightedListRefresh()
  } else if (isOhlcv.value) {
    await changeOhlcvSymbol(components[0]?.url ?? '')
  } else if (isTechnical.value) {
    CIQ.stxx.loadChart({
      symbol: components[0]?.url || CIQ.stxx.chart.symbol,
      startDate: CHART_START_DATE,
      endDate: new Date(),
    }, () => {
      CIQ.hideCover()
      chartIQStore.set_mi_create_loading(false)
    })
  } else {
    await chartIQStore.set_miFormStateRefresh()
    refreshMAState()
  }
}

/** 旧版 handleShiftChange */
async function handleShiftChange(val: string | number, showInput: boolean) {
  if (!chartReady.value) return
  if (components[0]?.url !== components[1]?.url) return
  const categories = legacyCategory(form.category)
  CIQ.addCover()
  chartIQStore.set_mi_create_loading(true)
  // shift 变更时同步 shift 状态到 store
  await chartIQStore.set_mi_form_shift({ display: true, showInput, value: Number(val) })
  // offset 仅供显示
  const offset = showInput ? Number(val) : 0
  if (categories.includes('Indicator')) {
    CIQ.addIndicatorShift(components[1]!.source, components[1]!.url, offset)
    // 当 shift 变化时，需要重新添加 ma2（如果启用了）
    const second = components[1]!
    if (componentMAValue(second) !== '' && ['MA', 'EMA'].includes(componentMAType(second))) {
      manageMICondStudies(componentMAValue(second), componentMAType(second), 'ma2', true)
    }
  } else {
    CIQ.addSymbolShift(offset)
  }
}

/** 旧版 changeSymbol（symbol OHLCV） */
async function changeOhlcvSymbol(symbol: string) {
  if (!chartReady.value) return
  // 用 await 包裹 indicator 加载流程，确保其在 stma 加载之前执行
  await chartIQStore.set_miFormSOHLCVChange({ data: { symbol } })
  manageMICondStudies(ohlcvMAValue(), ohlcvMAType(), 'ma1', ohlcvShowInput())
}

/** 旧版 handleRowSelect / addRow / deleteRow 的图表刷新 */
function refreshWeightedList() {
  if (!chartReady.value) return
  chartIQStore.getFrequency(timeframeTransform(findMaxFreq()))
  chartIQStore.set_miFormWeightedListChange({
    data: buildWeightData(components, indicatorOptions.value),
    url: null,
  })
}

/** 旧版 changeResampleIndicator */
async function changeResampleIndicator(option: { value: string; url?: string; meta?: string; label?: string }) {
  if (!chartReady.value) return
  const url = option.url ?? option.value
  const item = components[0]
  if (item) {
    item.source = option.value
    item.url = url
  }
  // timeframe 用不上，直接同步为 condition 的值；切换 Indicator 后把 condition 切回 daily
  form.timeframe = 'Daily'
  userSelectedTimeFrame.value = 'daily'
  await CIQ.changeUserOwnIndicatorResample({
    url,
    updated: option.meta ?? '',
    label: option.label ?? option.value,
  })
}

/** 旧版 handleSelectTech：ticker 选择 */
function changeTechnicalTicker(option: { value: string; url?: string }) {
  if (!chartReady.value) return
  const item = components[0]
  if (!item) return
  item.source = option.value
  item.url = option.url ?? option.value
  CIQ.objIndicator = []
  CIQ.stxx.loadChart({
    symbol: item.url || CIQ.stxx.chart.symbol,
    startDate: CHART_START_DATE,
    endDate: new Date(),
  }, () => {
    CIQ.hideCover()
    chartIQStore.set_mi_create_loading(false)
  })
}

/** 旧版 handleSelectTech：technical indicator 选择 */
function changeTechnicalIndicator(option: { value: string; url?: string }) {
  if (!chartReady.value) return
  for (const studyInstanceName in CIQ.stxx.layout.studies) {
    CIQ.Studies.removeStudy(CIQ.stxx, CIQ.stxx.layout.studies[studyInstanceName])
  }
  CIQ.Studies.addStudy(CIQ.stxx, option.url ?? option.value, {}, null, {
    criteria: 'entry1',
    index: 0,
  })
  CIQ.hideCover()
  chartIQStore.set_mi_create_loading(false)
}

/** 旧版 handleSelect：按当前分类分发到对应图表逻辑 */
async function selectSource(index: number, option: { value: string; url?: string; meta?: string; label?: string; kind?: 'Indicator' | 'Symbol' }) {
  const item = components[index]
  if (!item) return
  const previousUrl = item.url
  item.source = option.value
  // 【照搬旧版 sentimentList】stock 同名 indicator 的 chart url 带 `@indicator` 后缀
  const selectingIndicator = option.kind ? option.kind === 'Indicator' : isIndicator.value
  const baseUrl = option.url ?? option.value
  item.url = selectingIndicator ? chartIndicatorUrl(baseUrl) : baseUrl

  if (form.category === 'Weighted Indicator Combination') {
    refreshWeightedList()
    return
  }
  if (isOhlcv.value) {
    await changeOhlcvSymbol(item.url)
    return
  }
  if (isResample.value) {
    await changeResampleIndicator({ ...option, url: item.url })
    return
  }
  if (isTechnical.value) {
    changeTechnicalTicker(option)
    return
  }
  if (!isPair.value || !chartReady.value) return
  // 防止重复加载同一个 indicator
  if (previousUrl === item.url) return
  const categories = legacyCategory(form.category)
  if (categories.includes('Symbol')) {
    // 旧版 selectSymbol 同步 shift 状态
    chartIQStore.set_mi_form_shift({
      display: components[0]?.url === components[1]?.url,
      showInput: Number(components[1]?.shift ?? 0) > 0,
      value: Number(components[1]?.shift ?? 0),
    })
  }
  chartIQStore.getFrequency(timeframeTransform(findMaxFreq()))
  await chartIQStore.set_miFormStateChange(chartState())
  manageMICondStudies(componentMAValue(item), componentMAType(item), index === 0 ? 'ma1' : 'ma2', true)
}

/** 旧版 CheckInput 的 select change：立即刷新 study */
function handleCalculationChange(index: number, event: Event) {
  const item = components[index]
  const value = (event.target as HTMLSelectElement | null)?.value
  if (!item || !value) return
  // 旧版 handleSelect 切换前保留原输入值（仅非数字时才清空）
  const legacyValue = item.period === '' ? '' : item.period
  item.calculation = value as Calculation
  item.period = ['Simple Moving Average', 'Exponential Moving Average', 'Rate of Change'].includes(value) ? item.period : ''
  if (!chartReady.value) return
  if (form.category === 'Weighted Indicator Combination' || isResample.value || isTechnical.value || isOhlcv.value) return
  if (value === 'Indicator Value') {
    // 旧版 handleSelect：MAType 为 'i' 时以 ('MA', 原值, false) 调用，
    // addOwnIndicatorMAStudy 会先移除该 index 的旧 MA study
    manageMICondStudies(legacyValue, 'MA', index === 0 ? 'ma1' : 'ma2', false)
    return
  }
  manageMICondStudies(componentMAValue(item), componentMAType(item), index === 0 ? 'ma1' : 'ma2', true)
}

/** 旧版 CheckInput 的 input（500ms debounce）：周期 */
const handlePeriodChange = debounce((index: number) => {
  const item = components[index]
  if (!item || !chartReady.value || !isPair.value) return
  manageMICondStudies(componentMAValue(item), componentMAType(item), index === 0 ? 'ma1' : 'ma2', true)
}, 500)

/** 旧版 shiftForm 的 input（500ms debounce） */
const handleShiftInput = debounce(() => {
  const value = components[1]?.shift ?? '0'
  void handleShiftChange(value, Number(value) > 0)
}, 500)

/** 旧版 OHLCV price field change */
function handleOhlcvConditionChange(event: Event) {
  const item = components[0]
  const value = (event.target as HTMLSelectElement | null)?.value
  if (!item || !value) return
  item.calculation = value as Calculation
  manageMICondStudies(ohlcvMAValue(), ohlcvMAType(), 'ma1', ohlcvShowInput())
}

/** 旧版 OHLCV smoothing change（选中 None 等价于取消勾选：移除 MA） */
function handleOhlcvSmoothingChange(event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value as 'None' | 'SMA' | 'EMA' | undefined
  if (!value) return
  ohlcvSmoothing.value = value
  manageMICondStudies(ohlcvMAValue(), ohlcvMAType(), 'ma1', ohlcvShowInput())
}

/** 旧版 maohlcvForm 的 input（500ms debounce） */
const handleOhlcvPeriodChange = debounce(() => {
  manageMICondStudies(ohlcvMAValue(), ohlcvMAType(), 'ma1', ohlcvShowInput())
}, 500)

/* ═══════════════════════════════════════════════════════════════════
 * Preview 管线（旧版 MIForm.savePreviewIndicator + previewIndicator）
 * ═══════════════════════════════════════════════════════════════════ */

async function runPreview() {
  if (!chartReady.value) return
  CIQ.addCover()
  chartIQStore.set_mi_create_loading(true)
  try {
    const payload: CreateMyIndicatorPayload = {
      ...indicatorPayload(),
      // 在名字后加上四位随机小数
      name: `${form.name.trim()}_${Math.round(Math.random() * 10000) / 10000}`,
    }
    const { status, body } = await createMyIndicatorForPreview(payload, controller.signal)
    let url: string | null = null
    if (status === 406) {
      // 说明这条数据已经存在了，直接请求数据
      url = String((body.data as Record<string, unknown> | undefined)?.url ?? '')
      if (url) {
        const indicatorData = await getMyIndicatorData(url, controller.signal)
        ;(CIQ as any).previewIndicatorDataCache = (CIQ as any).previewIndicatorDataCache || {}
        ;(CIQ as any).previewIndicatorDataCache[url] = indicatorData.data
      }
      chartIQStore.set_mi_create_loading(false)
      CIQ.hideCover()
    }
    if (status === 405) {
      message.value = 'No data available for this symbol'
      chartIQStore.set_mi_create_loading(false)
      CIQ.hideCover()
    }
    if (status === 201) {
      url = String(body.url ?? '')
      if (url) {
        const indicatorData = await getMyIndicatorData(url, controller.signal)
        // 暂存，删除临时记录后仍可用于预览
        ;(CIQ as any).previewIndicatorDataCache = (CIQ as any).previewIndicatorDataCache || {}
        ;(CIQ as any).previewIndicatorDataCache[url] = indicatorData.data
        await deleteMyIndicator(url, controller.signal)
      }
    }
    if (!url) {
      chartIQStore.set_mi_create_loading(false)
      CIQ.hideCover()
      return
    }
    const combined = `${form.name}CREATE${url}`
    const extremes = {
      op: form.optimismEnabled ? form.optimism : 0,
      ep: form.pessimismEnabled ? form.pessimism : 0,
    }
    const categories = legacyCategory(form.category)
    if (categories.includes('Symbol')) {
      CIQ.previewUserOwnIndicator(
        [components[0]!.url, components[1]!.url, combined],
        combined,
        components[0]!.url,
        extremes,
        categories,
      )
    } else if (categories.includes('Indicator')) {
      CIQ.previewUserOwnIndicator(
        [components[0]!.url, components[1]!.url, combined],
        combined,
        null,
        extremes,
      )
    } else if (form.category === 'Weighted Indicator Combination') {
      CIQ.previewUserOwnIndicator(
        [...buildWeightData(components, indicatorOptions.value).map((item) => item.indicator_url), combined],
        combined,
        CIQ.stxx.chart.symbol,
      )
    } else if (categories === 'OHLCV') {
      CIQ.previewUserOwnIndicator([combined], combined, components[0]!.url)
    } else if (categories === 'Resample') {
      // timeframe 直接和更改的 condition 一致
      chartIQStore.getFrequency(timeframeTransform(form.timeframe.toLowerCase()))
      CIQ.previewUserOwnIndicator([combined], combined, null, extremes, 'Resample')
    }
    // Technical：旧版无该分支，不刷新图表
    chartIQStore.set_mi_create_loading(false)
  } catch {
    chartIQStore.set_mi_create_loading(false)
    CIQ.hideCover()
  }
}

const previewIndicator = debounce(runPreview, 500)

function handlePreviewClick() {
  validateForm()
  if (!validated.value) return
  void previewIndicator()
}

/* ═══════════════════════════════════════════════════════════════════
 * Benchmark 双向同步（旧版 watch handleGetMiBenmark）
 * ═══════════════════════════════════════════════════════════════════ */
watch(() => chartIQStore.miBenmark, async (newVal) => {
  if (!chartReady.value || loadingRecord.value) return
  form.benchmark = newVal
  const categories = legacyCategory(form.category)
  if (categories.includes('Indicator')) {
    // 如果是空图标切换，则跳过还原表单 indicator 条件
    if (!components[0]?.source && !components[1]?.source) return
    await chartIQStore.set_miFormStateRefresh()
    refreshMAState()
  }
  if (categories.includes('Symbol')) {
    const item = components[0]
    if (item) {
      item.source = newVal
      item.url = newVal
    }
    refreshMAState()
    // 旧版只传一个参数，showInput 为 undefined（falsy），即 offset 归零
    await handleShiftChange(components[1]?.shift ?? 0, false)
  }
  if (categories === 'WIC') {
    const index = components.findIndex((item) => Boolean(item.url)
      && !isIndicatorChartUrl(item.url, indicatorOptions.value))
    if (index !== -1) {
      components[index]!.source = newVal
      components[index]!.url = newVal
    }
    await chartIQStore.set_miFormWeightedListRefresh({
      data: buildWeightData(components, indicatorOptions.value),
      url: null,
    })
  }
  if (categories === 'OHLCV') {
    const item = components[0]
    if (item) {
      item.source = newVal
      item.url = newVal
    }
    manageMICondStudies(ohlcvMAValue(), ohlcvMAType(), 'ma1', ohlcvShowInput())
  }
  if (categories === 'Technical' && components[0]) {
    components[0]!.source = newVal
    components[0]!.url = newVal
  }
  if (categories === 'Resample' && components[0]?.url) {
    // 旧版只从 CIQ.findSentiIndicator 取 chart_name，且不传 updated，也不改表单 source
    const senti = CIQ.findSentiIndicator(null, components[0]!.url)
    await changeResampleIndicator({
      value: components[0]!.source,
      url: components[0]!.url,
      label: senti?.chart_name,
    })
  }
})
function addWeightedComponent() {
  if (components.length >= 10) return
  // 旧版 addRow 只追加行，不刷新图表
  components.push({ source: '', url: '', calculation: 'Indicator Value', period: '', shift: '0', weight: '0' })
}
function removeWeightedComponent(index: number) {
  if (components.length <= 2) return
  components.splice(index, 1)
  // 旧版 deleteRow 只更新 weightList，不重算 frequency
  if (!chartReady.value) return
  chartIQStore.set_miFormWeightedListChange({
    data: buildWeightData(components, indicatorOptions.value),
    url: null,
  })
}
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
  // 旧版 displayData: this.userSelectedTimeFrame = data.timeframe
  userSelectedTimeFrame.value = row.timeframe.toLowerCase()
  form.optimism = String(row.raw.extreme_optimism ?? '')
  form.pessimism = String(row.raw.extreme_pessimism ?? '')
  form.optimismEnabled = Boolean(form.optimism && form.optimism !== '0')
  form.pessimismEnabled = Boolean(form.pessimism && form.pessimism !== '0')
  form.benchmark = String(row.raw.benchmark ?? 'SPX')
  if (isWeighted.value) {
    // 旧版 getWeightedIndicatorData + processIndicators：Indicator 行还原 `@indicator` 后缀
    components.splice(0, components.length, ...row.included.map((item) => ({ source: item.name, url: item.kind === 'Indicator' ? restoreIndicatorChartUrl(item.url, indicatorOptions.value) : item.url, calculation: 'Indicator Value' as Calculation, period: '', shift: '0', weight: item.weight?.replace('%', '') ?? '0' })))
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
    const restoredUrl = included?.url ?? String(row.raw[`indicator_${index + 1}`] ?? '')
    // 旧版 list/table.vue 仅对 indicator_1_url 还原 `@indicator` 后缀
    component.url = isIndicator.value && index === 0 ? restoreIndicatorChartUrl(restoredUrl, indicatorOptions.value) : restoredUrl
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
  components.splice(0, components.length, ...Array.from({ length: count }, () => ({ source: '', url: '', calculation: isIndicator.value || isWeighted.value ? 'Indicator Value' as Calculation : 'Close' as Calculation, period: '', shift: '0', weight: isWeighted.value ? '50' : '' })))
  technicalIndicator.value = ''
  technicalCode.value = ''
  ohlcvSmoothing.value = 'None'
  ohlcvPeriod.value = '20'
  // 旧版 changeCategories 的图表部分
  if (!chartReady.value) return
  CIQ.isOHLCVSelectedMI = isOhlcv.value
  chartIQStore.set_chart_type(isOhlcv.value ? 'candle' : 'line')
  CIQ.stxx?.setChartType(chartIQStore.chartType)
  void chartIQStore.set_miFormStateChange(chartState())
}, { flush: 'sync' })
watch(technicalIndicator, () => { if (!loadingRecord.value) technicalCode.value = '' }, { flush: 'sync' })
watch([form, components], () => { validated.value = false; if (message.value === 'Formula validated and ready to save.') message.value = '' }, { deep: true })
function mountChart() {
  if (chartMounted.value) return
  // 旧版 created 中 commit myindicator benchmark；新 store 默认 AAPL，这里恢复旧版缺省 SPX
  chartIQStore.set_mi_benchmark(form.benchmark || 'SPX')
  chartMounted.value = true
}
function onChartReady() {
  chartReady.value = true
}
onMounted(async () => {
  let editRow: MyIndicatorRow | undefined
  try {
    const [options, rows] = await Promise.all([
      fetchSentimentIndicatorOptions(controller.signal),
      isEdit.value ? fetchMyIndicators(controller.signal) : Promise.resolve([]),
    ])
    indicatorOptions.value = options
    if (isEdit.value) {
      editRow = rows.find((item) => item.url === recordUrl.value)
      if (!editRow) message.value = 'Unable to find this indicator.'
      else hydrateForm(editRow)
    }
  } catch (error) { message.value = error instanceof Error ? error.message : 'Unable to load the indicator.' }
  finally {
    loadingOptions.value = false
    loadingRecord.value = false
    // 编辑进入时先把数据还原成旧版 chart_data，图表 onChartReady 时交给
    // CIQ.displayUserOwnIndicatorLayout 还原
    if (editRow) legacyChartData.value = buildLegacyChartData(editRow, indicatorOptions.value)
    mountChart()
  }
})
onBeforeUnmount(() => {
  previewIndicator.cancel()
  handlePeriodChange.cancel()
  handleShiftInput.cancel()
  handleOhlcvPeriodChange.cancel()
  controller.abort()
})
</script>

<template>
  <ListExplorerPage title="My Stuff" description="Your personal indicators, signals, screens and watch lists." :panel-title="isEdit ? 'Edit Indicator' : 'Create New Indicator'" panel-description="Combine market data into a reusable custom indicator." :show-view-mode-toggle="false" sidebar-width="220px" content-class="indicator-builder-panel">
    <template #sidebar><aside class="h-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3"><RouterLink v-for="section in sections" :key="section.path" :to="section.path" class="mb-1 flex items-center gap-3 rounded-md px-3 py-3 text-left transition" :class="section.label === 'My Indicator' ? 'bg-[var(--app-primary-soft)]' : 'hover:bg-[var(--app-surface-soft)]'"><component :is="section.icon" :size="20" class="text-[var(--app-primary)]" /><span class="min-w-0"><span class="block text-sm font-semibold">{{ section.label }}</span><span class="block truncate text-xs text-[var(--app-text-muted)]">{{ section.description }}</span></span></RouterLink></aside></template>
    <template #title-actions><button class="secondary-button h-8 px-3 text-xs" type="button" @click="router.push('/my-stuff/indicators')"><ArrowLeft :size="15" />Back to list</button></template>
    <template #summary><button class="secondary-button h-8 px-3 text-xs" type="button"><PlayCircle :size="15" />Watch Tutorial</button></template>
    <div class="builder-shell">
      <div class="builder-form-area">
        <section class="builder-card setup-card"><h2><span class="section-number">1</span>Indicator Setup</h2><div class="setup-grid"><label>Name<input v-model="form.name" class="builder-input" placeholder="e.g. Sugar Optix MA100 Spread" /></label><label>Category<select v-model="form.category" class="builder-input"><option v-for="item in categories" :key="item">{{ item }}</option></select></label><label>Timeframe<select v-model="form.timeframe" class="builder-input" @change="handleTimeframeChange(eventValue($event))"><option v-for="item in timeframes" :key="item">{{ item }}</option></select></label></div></section>
        <section class="builder-card formula-section"><div class="formula-heading"><h2><span class="section-number">2</span>Build Formula</h2><p class="section-copy">Configure the inputs required for {{ form.category }}.</p></div>
        <div v-if="isPair" class="component-grid"><template v-for="(item, index) in components" :key="index"><article class="component-card"><header><strong>{{ index ? 'B' : 'A' }}</strong>{{ index ? 'Second' : 'First' }} {{ isIndicator ? 'indicator' : 'symbol' }}</header><div class="component-body"><label>Source<SearchSelect v-model="item.source" :options="sourceOptions" :placeholder="loadingOptions ? 'Loading sources…' : 'Search source'" @select="selectSource(index, $event)" /></label><div class="component-options"><label>Calculation<select v-model="item.calculation" class="builder-input" @change="handleCalculationChange(index, $event)"><option v-for="option in calculationOptions" :key="option">{{ option }}</option></select></label><label v-if="needsPeriod(item)">Period<input v-model="item.period" class="builder-input" inputmode="numeric" @input="handlePeriodChange(index)" /></label><label v-if="index === 1 && canShift && Number(item.shift) > 0">Shift (bars)<input v-model="item.shift" class="builder-input" inputmode="numeric" @input="handleShiftInput()" /></label></div></div></article><div v-if="index === 0" class="formula-operator"><span>{{ operationSymbol }}</span><strong>{{ operation }}</strong></div></template></div>
        <div v-else-if="isWeighted" class="weighted-grid"><article v-for="(item, index) in components" :key="index" class="component-card weighted-card"><header><strong>{{ index + 1 }}</strong>Weighted input<button type="button" :disabled="components.length <= 2" aria-label="Remove weighted input" @click="removeWeightedComponent(index)"><Trash2 :size="15" /></button></header><div class="component-body weighted-fields"><label>Indicator or symbol<SearchSelect v-model="item.source" :options="weightedSourceOptions" placeholder="Search input" @select="selectSource(index, $event)" /></label><label>Weight (%)<input v-model="item.weight" class="builder-input" type="number" step="1" /></label></div></article><button v-if="components.length < 10" class="add-component" type="button" @click="addWeightedComponent"><Plus :size="16" />Add weighted input</button></div>
        <div v-else class="special-form-grid"><article class="component-card"><header><strong>1</strong>{{ isResample ? 'Source indicator' : 'Source symbol' }}</header><div class="component-body"><label>Source<SearchSelect v-model="primaryComponent.source" :options="sourceOptions" :placeholder="loadingOptions ? 'Loading sources…' : 'Search source'" @select="selectSource(0, $event)" /></label><div v-if="isOhlcv" class="component-options"><label>Price field<select v-model="primaryComponent.calculation" class="builder-input" @change="handleOhlcvConditionChange($event)"><option v-for="field in ['Open', 'High', 'Low', 'Close', 'Volume']" :key="field">{{ field }}</option></select></label><label>Smoothing<select v-model="ohlcvSmoothing" class="builder-input" @change="handleOhlcvSmoothingChange($event)"><option>None</option><option>SMA</option><option>EMA</option></select></label><label v-if="ohlcvSmoothing !== 'None'">Period<input v-model="ohlcvPeriod" class="builder-input" inputmode="numeric" @input="handleOhlcvPeriodChange()" /></label></div><label v-if="isTechnical">Technical indicator<SearchSelect v-model="technicalIndicator" :options="technicalOptions" placeholder="Search technical indicator" @select="changeTechnicalIndicator($event)" /></label><div v-if="isResample" class="special-note">Target timeframe: <strong>{{ form.timeframe }}</strong></div></div></article></div>
        <div class="formula-summary"><div><strong>{{ isPair ? `Formula: A ${operationSymbol} B` : form.category }}</strong><span>{{ formula }}</span><small>{{ explanation }}</small></div><div class="formula-summary-actions"><span v-if="validated" class="validated"><Check :size="15" />Formula valid</span><button class="secondary-button" type="button" @click="handlePreviewClick"><Beaker :size="17" />Validate &amp; Preview</button><button class="primary-button" type="button" :disabled="saving || loadingRecord" @click="saveIndicator"><Save :size="17" />{{ saving ? 'Saving…' : isEdit ? 'Update Indicator' : 'Save Indicator' }}</button></div></div>
        </section>
        <section v-if="isPair || isResample" class="builder-card thresholds-card"><h2><span class="section-number">3</span>Thresholds <small>(Optional)</small></h2><div class="thresholds"><label><span><input v-model="form.optimismEnabled" type="checkbox" />Extreme Optimism</span><input v-model="form.optimism" class="builder-input" placeholder="Enter value" :disabled="!form.optimismEnabled" /></label><label><span><input v-model="form.pessimismEnabled" type="checkbox" />Extreme Pessimism</span><input v-model="form.pessimism" class="builder-input" placeholder="Enter value" :disabled="!form.pessimismEnabled" /></label></div></section>
        <LoadingOverlay
          :is-loading="chartIQStore.isCreateLoading"
          :show-progress="false"
          :percentage="0"
          progress-text="Loading..."
        />
      </div>
      <section class="builder-card preview-card"><div><h2><span class="section-number">{{ isPair || isResample ? 4 : 3 }}</span>Preview</h2><span v-if="validated" class="validated"><Check :size="15" />Formula validated · Preview up to date</span></div><IndicatorBuilderChartIQ
          v-if="chartMounted"
          :symbol="form.benchmark || 'SPX'"
          :chart-data="legacyChartData"
          @chart-ready="onChartReady"
        />
        <div v-else class="preview-placeholder"><SlidersHorizontal :size="28" /><strong>{{ form.name || 'Your indicator preview' }}</strong><span>{{ formula }}</span><small>Chart preview will use the selected benchmark: {{ form.benchmark }}</small></div></section>
      <div v-if="message" class="builder-message" :class="validated ? 'success' : 'error'">{{ message }}</div>
    </div>
  </ListExplorerPage>
</template>

<style scoped>
.builder-shell{display:grid;gap:14px;padding:12px;background:var(--app-bg)}.builder-form-area{position:relative;display:grid;gap:14px}.builder-card{border:1px solid var(--app-border);border-radius:10px;background:var(--app-surface);padding:16px}.builder-card h2{display:flex;align-items:center;gap:8px;font-size:1rem;font-weight:900}.builder-card h2 small{color:var(--app-text-muted);font-size:.72rem;font-weight:650}.section-number{display:inline-flex;width:23px;height:23px;align-items:center;justify-content:center;border-radius:50%;background:var(--app-primary-soft);color:var(--app-primary);font-size:.72rem;font-weight:900}.setup-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:12px}.builder-shell label{color:var(--app-text-muted);font-size:.75rem;font-weight:700}.builder-input{display:block;width:100%;height:38px;margin-top:6px;border:1px solid var(--app-border);border-radius:6px;background:var(--app-surface);padding:0 11px;color:var(--app-text);font-size:.8125rem;outline:none}.builder-input:focus{border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-primary-shadow)}.builder-input:disabled{background:var(--app-surface-muted);opacity:.65}.formula-section{padding:16px}.formula-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:16px}.section-copy{color:var(--app-text-muted);font-size:.75rem}.component-grid{display:grid;grid-template-columns:minmax(0,1fr) 90px minmax(0,1fr);align-items:center;gap:14px;margin-top:16px}.component-card{align-self:stretch;border:1px solid var(--app-border);border-radius:9px;overflow:visible}.component-card header{display:flex;align-items:center;gap:7px;border-radius:9px 9px 0 0;background:var(--app-primary-soft);padding:11px 14px;color:var(--app-primary);font-size:.8rem;font-weight:800}.component-card header strong{display:inline-flex;width:25px;height:25px;align-items:center;justify-content:center;border-radius:50%;background:var(--app-primary);color:white;font-size:.72rem}.component-body{display:grid;gap:14px;padding:14px}.component-body :deep(.search-select){margin-top:6px}.component-options{display:grid;grid-template-columns:minmax(130px,1fr) repeat(2,minmax(90px,.45fr));gap:10px;align-items:start}.component-options>label:only-child{grid-column:1/-1}.component-options label small{display:block;margin-top:5px;color:var(--app-text-muted);font-size:.62rem;font-weight:500}.formula-operator{display:grid;justify-items:center;gap:7px}.formula-operator span{display:flex;width:46px;height:46px;align-items:center;justify-content:center;border:1px solid var(--app-border-strong);border-radius:8px;background:var(--app-surface);font-size:1.25rem;font-weight:700}.formula-operator strong{font-size:.72rem;color:var(--app-text-muted)}.weighted-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}.weighted-card header button{display:inline-flex;margin-left:auto;padding:5px;border-radius:5px;color:var(--app-text-muted)}.weighted-card header button:hover:not(:disabled){background:var(--app-surface);color:var(--app-negative)}.weighted-card header button:disabled{opacity:.35}.weighted-fields{grid-template-columns:minmax(0,1fr) 110px;align-items:end}.add-component{display:flex;min-height:48px;align-items:center;justify-content:center;gap:7px;border:1px dashed var(--app-border-strong);border-radius:8px;color:var(--app-primary);font-size:.76rem;font-weight:800}.special-form-grid{margin-top:16px}.special-form-grid>.component-card{max-width:760px}.special-note{border-radius:6px;background:var(--app-surface-muted);padding:10px 12px;color:var(--app-text-secondary);font-size:.75rem}.formula-summary{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:16px;border-radius:8px;background:var(--app-primary-soft);padding:12px 14px}.formula-summary>div:first-child{display:grid;gap:3px;min-width:0}.formula-summary strong{font-size:.82rem}.formula-summary span,.formula-summary small{overflow:hidden;color:var(--app-text-secondary);font-size:.72rem;text-overflow:ellipsis;white-space:nowrap}.formula-summary-actions{display:flex;flex:none;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:12px}.thresholds{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:14px}.thresholds label{display:grid;grid-template-columns:minmax(135px,.65fr) minmax(120px,1fr);align-items:center;gap:12px}.thresholds label>span{display:flex;align-items:center;gap:7px;color:var(--app-text-muted);font-size:.75rem;font-weight:700}.thresholds .builder-input{margin-top:0}.preview-card>div:first-child{display:flex;align-items:center;gap:14px}.validated{display:inline-flex!important;align-items:center;gap:5px!important;color:var(--app-positive)!important;font-size:.75rem!important;font-weight:800;white-space:nowrap!important}.preview-placeholder{display:flex;min-height:150px;margin-top:12px;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px dashed var(--app-border-strong);border-radius:8px;background:var(--app-surface-soft);color:var(--app-text-muted);text-align:center}.preview-placeholder strong{color:var(--app-text)}.preview-placeholder span{font-size:.8rem}.preview-placeholder small{font-size:.7rem}.secondary-button,.primary-button{display:inline-flex;height:40px;align-items:center;justify-content:center;gap:7px;border-radius:6px;padding:0 18px;font-size:.8rem;font-weight:850}.secondary-button{border:1px solid var(--app-primary);color:var(--app-primary)}.primary-button{background:var(--app-primary);color:#fff}.primary-button:disabled{opacity:.55}.builder-message{border-radius:7px;padding:10px 13px;font-size:.78rem;font-weight:700}.builder-message.success{background:color-mix(in srgb,var(--app-positive) 12%,transparent);color:var(--app-positive)}.builder-message.error{background:color-mix(in srgb,var(--app-negative) 10%,transparent);color:var(--app-negative)}@media(max-width:1100px){.component-options{grid-template-columns:1fr 1fr}.component-options>label:first-child{grid-column:1/-1}.formula-heading{display:block}.section-copy{margin-top:4px}}@media(max-width:760px){.setup-grid,.thresholds,.weighted-grid{grid-template-columns:1fr}.component-grid{grid-template-columns:1fr}.formula-operator{padding:4px}.component-options,.weighted-fields{grid-template-columns:1fr}.component-options>label:first-child{grid-column:auto}.formula-summary{align-items:stretch;flex-direction:column}.formula-summary-actions{justify-content:flex-start}.thresholds label{grid-template-columns:1fr}.thresholds .builder-input{margin-top:6px}}
</style>
