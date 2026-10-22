<script setup lang="ts">
import { computed, watch } from 'vue'
import {
  symbolCalculationOptions,
  symbolConditions,
  symbolOperatorOptions,
  type SymbolConditionFields,
} from '@/entities/my-stuff/model/symbol-condition'

const { condition } = defineProps<{ condition: SymbolConditionFields }>()
const isDerived = computed(() => condition.symbolCalculation >= 5)
const needsPeriod = computed(() => isDerived.value && ![12, 13].includes(condition.symbolCalculation))
const periodLabel = computed(() => [14, 15].includes(condition.symbolCalculation) ? 'Reference level' : 'Lookback period')

watch(() => condition.symbolCalculation, (calculation) => {
  if (calculation <= 4) condition.symbolOperator = calculation
})
</script>

<template>
  <div class="symbol-editor">
    <div class="condition-step">
      <div class="condition-step-heading"><span>1</span><div><strong>What should be calculated?</strong><small>Choose the Open, High, Low, Close, Volume, or Ratio field from the selected symbol.</small></div></div>
      <div class="basis-options">
        <button v-for="item in symbolConditions" :key="item.value" class="basis-option" :class="condition.symbolField === item.obj.label && 'basis-option--active'" type="button" @click="condition.symbolField = item.obj.label">
          <span class="radio-dot"><span v-if="condition.symbolField === item.obj.label" /></span>
          <span><strong>{{ item.obj.label.replace('Symbol ', '') }}</strong><small>{{ item.description }}</small></span>
        </button>
      </div>
    </div>

    <div class="condition-step">
      <div class="condition-step-heading"><span>2</span><div><strong>Define the rule</strong><small>Choose a calculation, then set the comparison and target value.</small></div></div>
      <div class="condition-fields condition-fields--rule">
        <label class="builder-label">Calculation<select v-model.number="condition.symbolCalculation" class="builder-input mt-1"><option v-for="item in symbolCalculationOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
        <label v-if="needsPeriod" class="builder-label">{{ periodLabel }}<input v-model="condition.symbolPeriod" class="builder-input mt-1" type="number" min="0" :step="[14, 15].includes(condition.symbolCalculation) ? 'any' : '1'" /></label>
        <label v-if="isDerived" class="builder-label">Comparison<select v-model.number="condition.symbolOperator" class="builder-input mt-1"><option v-for="item in symbolOperatorOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
        <label class="builder-label">Threshold value<input v-model="condition.symbolValue" class="builder-input mt-1" type="number" step="0.0001" placeholder="Enter value" /></label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.symbol-editor { margin-top:16px; }
.condition-step { margin-top:12px; border:1px solid var(--app-border-muted); border-radius:8px; background:var(--app-surface-soft); padding:14px; }
.condition-step:first-child { margin-top:0; }
.condition-step-heading { display:flex; align-items:flex-start; gap:10px; }
.condition-step-heading>span { display:flex; width:24px; height:24px; flex:none; align-items:center; justify-content:center; border-radius:9999px; background:var(--app-primary-soft); color:var(--app-primary); font-size:.7rem; font-weight:900; }
.condition-step-heading strong,.condition-step-heading small { display:block; }
.condition-step-heading strong { color:var(--app-text); font-size:.8rem; font-weight:900; }
.condition-step-heading small { margin-top:2px; color:var(--app-text-muted); font-size:.68rem; line-height:1.4; }
.basis-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:12px; }
.basis-option { display:flex; min-height:72px; align-items:flex-start; gap:9px; border:1px solid var(--app-border); border-radius:7px; background:var(--app-surface); padding:10px; text-align:left; }
.basis-option--active { border-color:var(--app-primary); background:var(--app-primary-soft); box-shadow:0 0 0 1px var(--app-primary); }
.basis-option .radio-dot { display:flex; width:18px; height:18px; flex:none; align-items:center; justify-content:center; border:2px solid var(--app-border-strong); border-radius:9999px; }
.basis-option--active .radio-dot { border-color:var(--app-primary); }
.basis-option .radio-dot span { width:8px; height:8px; border-radius:9999px; background:var(--app-primary); }
.basis-option strong,.basis-option small { display:block; }
.basis-option strong { color:var(--app-text); font-size:.72rem; font-weight:900; }
.basis-option small { margin-top:4px; color:var(--app-text-muted); font-size:.64rem; line-height:1.35; }
.condition-fields { display:grid; gap:10px; margin-top:12px; padding-left:34px; }
.condition-fields--rule { grid-template-columns:repeat(4,minmax(120px,1fr)); padding-left:0; }
.builder-label { color:var(--app-text-muted); font-size:.75rem; font-weight:700; line-height:1; }
.builder-input { display:block; width:100%; height:36px; border:1px solid var(--app-border); border-radius:6px; background:var(--app-surface); padding:0 10px; color:var(--app-text); font-size:.8125rem; font-weight:700; outline:none; transition:border-color 160ms ease,box-shadow 160ms ease; }
.builder-input:focus { border-color:var(--app-primary); box-shadow:0 0 0 3px var(--app-primary-shadow); }
.builder-input:disabled { cursor:default; background:var(--app-surface-muted); color:var(--app-text-secondary); opacity:1; }
.mt-1 { margin-top:.25rem; }
@media (max-width:800px) { .basis-options { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:900px) { .condition-fields--rule { grid-template-columns:repeat(2,minmax(140px,1fr)); } }
@media (max-width:700px) { .basis-options,.condition-fields--rule { grid-template-columns:1fr; padding-left:0; }.basis-option { min-height:0; } }
.condition-step-heading>span{width:20px;height:20px;font-size:.6rem;font-weight:800}.condition-step-heading strong{font-weight:800}.condition-step-heading small{font-size:.65rem;font-weight:400}
</style>
