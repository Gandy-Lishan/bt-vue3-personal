<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FileUp, Trash2 } from '@lucide/vue'
import { fetchMyIndicatorOptions, uploadUserDefinedDatesCsv, uploadUserIndicatorCsv, type UserIndicatorOption } from '@/entities/my-stuff/api/user-indicator.api'
import type { UserIndicatorFields } from '@/entities/my-stuff/model/user-indicator'
import SearchSelect from '@/shared/ui/SearchSelect.vue'

const props = defineProps<{ condition: UserIndicatorFields; symbol: string; timeframe: string }>()
const fileInput = ref<HTMLInputElement | null>(null)
const options = ref<UserIndicatorOption[]>([])
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const selectedFileName = ref('')

const comparisons = [
  { value: '>', label: 'Above (>)' }, { value: '=', label: 'Equals (=)' }, { value: '<', label: 'Below (<)' },
  { value: 'CrossAbove', label: 'Crosses above' }, { value: 'CrossBelow', label: 'Crosses below' },
]
const calculations = [
  'Above (>)', 'Equals (=)', 'Below (<)', 'Crosses above', 'Crosses below', 'Rate of Change', '% of Previous Range',
  'MA Ratio', 'Range Rank', 'DrawDown %', 'DrawUp %', 'Net Change', 'All-time High', 'All-time Low',
  'Consecutive Bars Above', 'Consecutive Bars Below', 'N-Bars High', 'N-Bars Low', 'N-Bars Ago',
].map((label, value) => ({ value, label }))
const basisOptions = [
  { value: 'value', title: 'Indicator value', text: 'Evaluate the current indicator reading.' },
  { value: 'movingAverage', title: 'Moving average value', text: 'Evaluate a smoothed indicator reading.' },
  { value: 'valueVsMovingAverage', title: 'Value vs moving average', text: 'Compare the indicator directly with its average.' },
] as const
const sourceLabel = computed(() => props.condition.userSource === 'upload' ? 'User Upload' : props.condition.userSource === 'defined-dates' ? 'User Defined Dates' : 'My Indicator')

function selectSaved(option: { value: string }) {
  const selected = options.value.find((item) => item.value === option.value)
  if (!selected) return
  props.condition.userSourceRef = selected.sourceRef
  props.condition.userTimeframe = selected.timeframe
}
function clearUpload() {
  props.condition.indicator = ''
  props.condition.userSourceRef = ''
  selectedFileName.value = ''
  if (fileInput.value) fileInput.value.value = ''
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  error.value = ''
  uploading.value = true
  try {
    const result = props.condition.userSource === 'defined-dates'
      ? await uploadUserDefinedDatesCsv(file, props.symbol, props.timeframe)
      : await uploadUserIndicatorCsv(file)
    props.condition.indicator = result.name
    props.condition.userSourceRef = result.sourceRef
    props.condition.userTimeframe = ''
    selectedFileName.value = file.name
  } catch (reason) {
    clearUpload()
    error.value = reason instanceof Error ? reason.message : 'Unable to upload the CSV file.'
  } finally {
    uploading.value = false
  }
}
function updateCalculation() {
  if (props.condition.calculation <= 4) props.condition.comparison = comparisons[props.condition.calculation]?.value ?? props.condition.comparison
}
onMounted(async () => {
  loading.value = true
  try { options.value = await fetchMyIndicatorOptions() }
  catch { error.value = 'Unable to load My Indicator choices.' }
  finally { loading.value = false }
})
</script>

<template>
  <div class="user-editor">
    <section class="step">
      <header><span>1</span><div><strong>Choose indicator</strong><small>{{ condition.userSource === 'my-indicator' ? 'Search the indicators you created in My Stuff.' : condition.userSource === 'defined-dates' ? 'Upload a one-column CSV containing the dates that should evaluate to 1.' : 'Upload the CSV indicator data you want to evaluate.' }}</small></div></header>
      <div class="source-control">
        <div v-if="condition.userSource === 'my-indicator'">
          <label>Indicator<SearchSelect v-model="condition.indicator" class="mt-1" :options="options" :placeholder="loading ? 'Loading indicators…' : 'Search My Indicator'" empty-message="No My Indicator found." @select="selectSaved" /></label>
        </div>
        <div v-else class="upload-box">
          <input ref="fileInput" class="sr-only" type="file" accept=".csv,text/csv" @change="upload" />
          <button v-if="!condition.userSourceRef" class="upload-button" type="button" :disabled="uploading" @click="fileInput?.click()"><FileUp :size="17" />{{ uploading ? 'Uploading…' : condition.userSource === 'defined-dates' ? 'Choose dates CSV' : 'Choose CSV file' }}</button>
          <div v-else class="uploaded"><span><strong>{{ condition.indicator }}</strong><small>{{ selectedFileName || 'Uploaded CSV' }}</small></span><button type="button" title="Remove upload" @click="clearUpload"><Trash2 :size="16" /></button></div>
          <small class="hint">{{ condition.userSource === 'defined-dates' ? 'Daily timeframe only. Maximum 1 MB. Required column: Date (YYYY-MM-DD).' : 'Maximum 1 MB. Filename must start with a letter. Required columns: Date, Close.' }}</small>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </section>

    <section class="step">
      <header><span>2</span><div><strong>What should be evaluated?</strong><small>Choose the raw indicator, its moving average, or compare the two.</small></div></header>
      <div class="basis-options"><button v-for="basis in basisOptions" :key="basis.value" class="choice" :class="condition.sentimentBasis === basis.value && 'active'" type="button" @click="condition.sentimentBasis = basis.value"><i><i v-if="condition.sentimentBasis === basis.value" /></i><span><strong>{{ basis.title }}</strong><small>{{ basis.text }}</small></span></button></div>
    </section>

    <section v-if="condition.sentimentBasis !== 'value'" class="step">
      <header><span>3</span><div><strong>Moving average settings</strong><small>Choose how the average is calculated and its period.</small></div></header>
      <div class="fields ma"><label>Average type<select v-model="condition.maType"><option value="S">Simple</option><option value="E">Exponential</option></select></label><label>MA period<input v-model="condition.maPeriod" type="number" min="1" step="1" /></label></div>
    </section>

    <section class="step">
      <header><span>{{ condition.sentimentBasis === 'value' ? 3 : 4 }}</span><div><strong>Define the rule</strong><small>{{ condition.sentimentBasis === 'valueVsMovingAverage' ? `Choose how ${sourceLabel} compares with its moving average.` : 'Choose a calculation, then enter only the parameters it needs.' }}</small></div></header>
      <div v-if="condition.sentimentBasis === 'valueVsMovingAverage'" class="fields rule"><label>Comparison<select v-model="condition.comparison"><option v-for="option in comparisons" :key="option.value" :value="option.value">{{ option.label }}</option></select></label></div>
      <div v-else class="fields rule"><label>Calculation<select v-model.number="condition.calculation" @change="updateCalculation"><option v-for="option in calculations" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><label v-if="condition.calculation > 4 && ![12, 13].includes(condition.calculation)">{{ [14, 15].includes(condition.calculation) ? 'Reference level' : 'Lookback period' }}<input v-model="condition.calculationPeriod" type="number" min="1" /></label><label v-if="condition.calculation > 4">Comparison<select v-model="condition.comparison"><option v-for="option in comparisons" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><label>{{ [14, 15].includes(condition.calculation) ? 'Bars required' : 'Threshold value' }}<input v-model="condition.value" type="number" step="any" placeholder="Enter value" /></label></div>
    </section>
  </div>
</template>

<style scoped>
.user-editor{min-width:0;margin-top:16px}.step{min-width:0;margin-top:12px;border:1px solid var(--app-border-muted);border-radius:8px;background:var(--app-surface-soft);padding:14px}.step header{display:flex;min-width:0;gap:10px}.step header>span{display:flex;width:24px;height:24px;flex:none;align-items:center;justify-content:center;border-radius:9999px;background:var(--app-primary-soft);color:var(--app-primary);font-size:.7rem;font-weight:900}.step strong,.step small{display:block}.step header strong{font-size:.8rem;font-weight:900}.step header small,.hint{margin-top:2px;color:var(--app-text-muted);font-size:.68rem}.basis-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.choice{display:flex;min-width:0;min-height:72px;gap:9px;border:1px solid var(--app-border);border-radius:7px;background:var(--app-surface);padding:10px;text-align:left}.choice.active{border-color:var(--app-primary);background:var(--app-primary-soft);box-shadow:0 0 0 1px var(--app-primary)}.choice>i{display:flex;width:18px;height:18px;flex:none;align-items:center;justify-content:center;border:2px solid var(--app-border-strong);border-radius:9999px}.choice.active>i{border-color:var(--app-primary)}.choice>i>i{width:8px;height:8px;border-radius:50%;background:var(--app-primary)}.choice strong{font-size:.72rem}.choice small{margin-top:4px;color:var(--app-text-muted);font-size:.64rem}.source-control{min-width:0;margin-top:12px}.fields{display:grid;min-width:0;grid-template-columns:minmax(0,280px);gap:10px;margin-top:12px;padding-left:34px}.source-control label,.fields label{display:block;min-width:0;color:var(--app-text-muted);font-size:.75rem;font-weight:700;line-height:1}.fields.ma{grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),240px))}.fields.rule{grid-template-columns:repeat(auto-fit,minmax(min(120px,100%),1fr));padding-left:0}.fields input,.fields select{display:block;min-width:0;width:100%;height:36px;margin-top:4px;border:1px solid var(--app-border);border-radius:6px;background:var(--app-surface);padding:0 10px;color:var(--app-text);font-size:.8125rem;font-weight:700}.upload-box{min-width:0;border:1px dashed var(--app-border-strong);border-radius:7px;background:var(--app-surface);padding:12px}.upload-button{display:inline-flex;max-width:100%;height:36px;align-items:center;gap:7px;border:1px solid var(--app-primary);border-radius:6px;padding:0 13px;color:var(--app-primary);font-size:.75rem;font-weight:850}.uploaded{display:flex;min-width:0;align-items:center;justify-content:space-between}.uploaded span{min-width:0}.uploaded strong,.uploaded small{overflow-wrap:anywhere}.uploaded strong{font-size:.76rem}.uploaded small{color:var(--app-text-muted);font-size:.67rem}.error{margin-top:8px;color:var(--app-negative);font-size:.7rem;font-weight:700}@media(max-width:700px){.basis-options,.fields,.fields.ma,.fields.rule{grid-template-columns:1fr}.fields{padding-left:0}}
.user-editor{margin-top:10px}.step{margin-top:10px;padding:11px}.step header>span{width:20px;height:20px;font-size:.6rem;font-weight:800}.step header strong{font-weight:800}.step header small{font-size:.65rem;font-weight:400}
</style>
