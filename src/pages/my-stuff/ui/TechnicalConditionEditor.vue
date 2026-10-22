<script setup lang="ts">
import { computed } from 'vue'
import type { TechnicalConditionFields } from '@/entities/my-stuff/model/technical-indicator'
import { technicalOperatorOptions } from '@/entities/my-stuff/model/technical-indicator'

const { condition } = defineProps<{ condition: TechnicalConditionFields }>()

const priceOptions = [
  { value: 'SC', label: 'Symbol Close' }, { value: 'SH', label: 'Symbol High' },
  { value: 'SO', label: 'Symbol Open' }, { value: 'SL', label: 'Symbol Low' },
]
const bandOptions = [{ value: 'LB', label: 'Low Band' }, { value: 'HB', label: 'High Band' }, { value: 'MB', label: 'Middle Band' }]
const alligatorOptions = [{ value: 'JAW', label: 'Jaw' }, { value: 'TEETH', label: 'Teeth' }, { value: 'LIPS', label: 'Lips' }]
const limitedOperators = computed(() => condition.technicalClass === 'ERI_like' || condition.technicalMode === 'histogram'
  ? technicalOperatorOptions.slice(0, 3)
  : technicalOperatorOptions)
const isNumeric = computed(() => ['CCI_like', 'ADX_like', 'ERI_like'].includes(condition.technicalClass)
  || (condition.technicalClass === 'MACD_like' && condition.technicalMode !== 'signal')
  || (condition.technicalClass === 'EFT_like' && condition.technicalMode !== 'signal')
  || (condition.technicalClass === 'Stochastics_like' && condition.technicalMode !== 'k-d'))

const leftOutputLabel = computed(() => {
  if (condition.technicalClass === 'MACD_like') return condition.technicalMode === 'histogram' ? 'Indicator histogram' : 'Indicator value'
  if (condition.technicalClass === 'EFT_like') return 'Indicator value'
  if (condition.technicalClass === 'Stochastics_like') return condition.technicalMode === 'd-value' ? '%D' : '%K'
  if (condition.technicalClass === 'ADX_like') return condition.technicalMode === 'negative' ? '-DI ADX' : '+DI ADX'
  if (condition.technicalClass === 'ERI_like') return condition.technicalMode === 'hist2' ? 'Indicator hist2' : 'Indicator hist1'
  return 'Indicator value'
})

const rightOutputLabel = computed(() => {
  if (condition.technicalClass === 'MACD_like' || condition.technicalClass === 'EFT_like') return 'Signal line'
  if (condition.technicalClass === 'Stochastics_like') return '%D'
  return 'Selected indicator'
})

const modeOptions = computed(() => {
  switch (condition.technicalClass) {
    case 'MACD_like': return [
      { value: 'value', title: 'Indicator value', text: 'Compare the MACD reading with a numeric threshold.' },
      { value: 'signal', title: 'Signal line', text: 'Compare MACD directly with its signal line.' },
      { value: 'histogram', title: 'Histogram value', text: 'Evaluate the MACD histogram against a threshold.' },
    ]
    case 'EFT_like': return [
      { value: 'value', title: 'Indicator value', text: 'Evaluate the current indicator reading.' },
      { value: 'signal', title: 'Signal line', text: 'Compare the indicator directly with its signal line.' },
    ]
    case 'Stochastics_like': return [
      { value: 'k-value', title: '%K value', text: 'Compare the fast stochastic line with a threshold.' },
      { value: 'd-value', title: '%D value', text: 'Compare the signal line with a threshold.' },
      { value: 'k-d', title: '%K vs %D', text: 'Compare the two stochastic lines directly.' },
    ]
    case 'ADX_like': return [
      { value: 'positive', title: '+DI ADX', text: 'Evaluate the positive directional indicator.' },
      { value: 'negative', title: '-DI ADX', text: 'Evaluate the negative directional indicator.' },
    ]
    case 'ERI_like': return [
      { value: 'hist1', title: 'Indicator hist1', text: 'Evaluate the first Elder Ray histogram.' },
      { value: 'hist2', title: 'Indicator hist2', text: 'Evaluate the second Elder Ray histogram.' },
    ]
    case 'MovingAverage_like': return [
      { value: 'price-ma', title: 'Price vs moving average', text: 'Compare an OHLC price with one moving average.' },
      { value: 'ma-ma', title: 'Two moving averages', text: 'Compare a fast and slow moving average.' },
      { value: 'ratio', title: 'Moving average ratio', text: 'Evaluate the ratio between moving averages.' },
    ]
    default: return []
  }
})
</script>

<template>
  <div class="technical-editor">
    <div v-if="modeOptions.length" class="condition-step">
      <div class="condition-step-heading">
        <span>1</span>
        <div><strong>What should be evaluated?</strong><small>Choose the technical indicator output or relationship to test.</small></div>
      </div>
      <div class="basis-options" :class="modeOptions.length === 2 && 'basis-options--two'">
        <button v-for="item in modeOptions" :key="item.value" class="basis-option" :class="condition.technicalMode === item.value && 'basis-option--active'" type="button" @click="condition.technicalMode = item.value">
          <span class="radio-dot"><span v-if="condition.technicalMode === item.value" /></span>
          <span><strong>{{ item.title }}</strong><small>{{ item.text }}</small></span>
        </button>
      </div>
    </div>

    <div class="condition-step">
      <div class="condition-step-heading">
        <span>{{ modeOptions.length ? 2 : 1 }}</span>
        <div><strong>Define the rule</strong><small>Choose the values and comparison that must be satisfied.</small></div>
      </div>
      <div class="technical-fields">
        <!-- Left operand -->
        <label v-if="condition.technicalClass === 'BollingerBands_like' || condition.technicalClass === 'LRF_like' || condition.technicalClass === 'Trailingstop_like' || (condition.technicalClass === 'MovingAverage_like' && condition.technicalMode === 'price-ma')" class="builder-label">Price<select v-model="condition.technicalLeft" class="builder-input mt-1"><option v-for="item in priceOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
        <label v-else-if="condition.technicalClass === 'Aligator_like'" class="builder-label">Left side<select v-model="condition.technicalLeft" class="builder-input mt-1"><optgroup label="Price"><option v-for="item in priceOptions" :key="item.value" :value="item.value">{{ item.label }}</option></optgroup><optgroup label="Alligator line"><option v-for="item in alligatorOptions" :key="item.value" :value="item.value">{{ item.label }}</option></optgroup></select></label>
        <label v-else-if="condition.technicalClass === 'MovingAverage_like'" class="builder-label">{{ condition.technicalMode === 'ratio' ? 'Moving average ratio' : 'First moving average' }}<span class="compound-input mt-1"><select v-model="condition.technicalMaType"><option value="SMA">Simple</option><option value="EMA">Exponential</option></select><input v-model="condition.technicalFastPeriod" type="number" min="1" step="1" aria-label="First moving average period" /></span></label>
        <label v-else class="builder-label">Indicator output<input class="builder-input mt-1" :value="leftOutputLabel" disabled /></label>

        <!-- Operator always stays between the two operands. -->
        <label class="builder-label">Comparison<select v-model.number="condition.technicalOperator" class="builder-input mt-1"><option v-for="item in limitedOperators" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>

        <!-- Right operand -->
        <label v-if="condition.technicalClass === 'BollingerBands_like'" class="builder-label">Band<select v-model="condition.technicalRight" class="builder-input mt-1"><option v-for="item in bandOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
        <label v-else-if="condition.technicalClass === 'Aligator_like'" class="builder-label">Right side<select v-model="condition.technicalRight" class="builder-input mt-1"><option v-for="item in alligatorOptions" :key="item.value" :value="item.value" :disabled="item.value === condition.technicalLeft">{{ item.label }}</option></select></label>
        <label v-else-if="condition.technicalClass === 'MovingAverage_like' && condition.technicalMode === 'ma-ma'" class="builder-label">Second moving average<span class="compound-input mt-1"><select v-model="condition.technicalMaType"><option value="SMA">Simple</option><option value="EMA">Exponential</option></select><input v-model="condition.technicalSlowPeriod" type="number" min="1" step="1" aria-label="Second moving average period" /></span></label>
        <label v-else-if="condition.technicalClass === 'MovingAverage_like' && condition.technicalMode === 'price-ma'" class="builder-label">Moving average<span class="compound-input mt-1"><select v-model="condition.technicalMaType"><option value="SMA">Simple</option><option value="EMA">Exponential</option></select><input v-model="condition.technicalFastPeriod" type="number" min="1" step="1" aria-label="Moving average period" /></span></label>
        <label v-else-if="isNumeric || (condition.technicalClass === 'MovingAverage_like' && condition.technicalMode === 'ratio')" class="builder-label">Threshold value<input v-model="condition.technicalValue" class="builder-input mt-1" type="number" step="any" placeholder="Enter value" /></label>
        <label v-else-if="condition.technicalClass === 'LRF_like' || condition.technicalClass === 'Trailingstop_like'" class="builder-label">Technical indicator<input class="builder-input mt-1" value="Selected indicator" disabled /></label>
        <label v-else class="builder-label">Compared with<input class="builder-input mt-1" :value="rightOutputLabel" disabled /></label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.technical-editor { margin-top:16px; }
.condition-step { margin-top:12px; border:1px solid var(--app-border-muted); border-radius:8px; background:var(--app-surface-soft); padding:14px; }
.condition-step:first-child { margin-top:0; }
.condition-step-heading { display:flex; align-items:flex-start; gap:10px; }
.condition-step-heading>span { display:flex; width:24px; height:24px; flex:none; align-items:center; justify-content:center; border-radius:9999px; background:var(--app-primary-soft); color:var(--app-primary); font-size:.7rem; font-weight:900; }
.condition-step-heading strong,.condition-step-heading small { display:block; }
.condition-step-heading strong { color:var(--app-text); font-size:.8rem; font-weight:900; }
.condition-step-heading small { margin-top:2px; color:var(--app-text-muted); font-size:.68rem; line-height:1.4; }
.basis-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:12px; }
.basis-options--two { grid-template-columns:repeat(2,minmax(0,1fr)); }
.basis-option { display:flex; min-height:78px; align-items:flex-start; gap:9px; border:1px solid var(--app-border); border-radius:7px; background:var(--app-surface); padding:10px; text-align:left; }
.basis-option--active { border-color:var(--app-primary); background:var(--app-primary-soft); box-shadow:0 0 0 1px var(--app-primary); }
.basis-option .radio-dot { display:flex; width:18px; height:18px; flex:none; align-items:center; justify-content:center; border:2px solid var(--app-border-strong); border-radius:9999px; }
.basis-option--active .radio-dot { border-color:var(--app-primary); }
.basis-option .radio-dot span { width:8px; height:8px; border-radius:9999px; background:var(--app-primary); }
.basis-option strong,.basis-option small { display:block; }
.basis-option strong { color:var(--app-text); font-size:.72rem; font-weight:900; }
.basis-option small { margin-top:4px; color:var(--app-text-muted); font-size:.64rem; line-height:1.35; }
.technical-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-top:12px; }
.builder-label { color:var(--app-text-muted); font-size:.75rem; font-weight:700; line-height:1; }
.builder-input { display:block; width:100%; height:36px; border:1px solid var(--app-border); border-radius:6px; background:var(--app-surface); padding:0 10px; color:var(--app-text); font-size:.8125rem; font-weight:700; outline:none; transition:border-color 160ms ease,box-shadow 160ms ease; }
.builder-input:focus { border-color:var(--app-primary); box-shadow:0 0 0 3px var(--app-primary-shadow); }
.builder-input:disabled { cursor:default; background:var(--app-surface-muted); color:var(--app-text-secondary); opacity:1; }
.compound-input { display:grid; height:36px; grid-template-columns:minmax(0,1.35fr) minmax(64px,.65fr); overflow:hidden; border:1px solid var(--app-border); border-radius:6px; background:var(--app-surface); }
.compound-input:focus-within { border-color:var(--app-primary); box-shadow:0 0 0 3px var(--app-primary-shadow); }
.compound-input select,.compound-input input { min-width:0; border:0; background:transparent; padding:0 9px; color:var(--app-text); font-size:.8125rem; font-weight:700; outline:none; }
.compound-input input { border-left:1px solid var(--app-border); }
.mt-1 { margin-top:.25rem; }
@media (max-width:800px) { .basis-options,.basis-options--two { grid-template-columns:1fr; }.basis-option { min-height:0; } }
@media (max-width:700px) { .technical-fields { grid-template-columns:1fr; padding-left:0; } }
.condition-step-heading>span{width:20px;height:20px;font-size:.6rem;font-weight:800}.condition-step-heading strong{font-weight:800}.condition-step-heading small{font-size:.65rem;font-weight:400}
</style>
