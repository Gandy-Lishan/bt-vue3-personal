<script setup lang="ts">
import { computed, ref } from 'vue'
import indexesData from '@/assets/indexes_list.json'
import stocksData from '@/assets/stocks_list.json'
import SearchSelect from '@/shared/ui/SearchSelect.vue'
import BacktestHelp from './BacktestHelp.vue'
import { trimTwoDecimals, validateNumeric, type NumericField } from './backtestValidation'

const form = defineModel<Record<string, string>>({ required: true })
const errors = ref<Partial<Record<NumericField | 'name', string>>>({})
function validateField(field: NumericField) {
  form.value[field] = trimTwoDecimals(String(form.value[field] ?? ''))
  errors.value[field] = validateNumeric(field, form.value[field])
}
function validateName() { errors.value.name = form.value.name.trim() ? '' : 'Please input backtest name' }
function validateAll() {
  for (const field of ['capital', 'commission', 'slippage', 'excludeOO'] as const) validateField(field)
  validateName()
  if (errors.value.capital || errors.value.commission || errors.value.slippage) open.value.trade = true
  if (errors.value.excludeOO) open.value.advanced = true
  if (errors.value.name) open.value.save = true
  return !Object.values(errors.value).some(Boolean)
}
defineExpose({ validateAll })
const symbolOptions = (() => {
  const entries = new Map<string, { value: string; label: string; description: string; meta: string }>()
  for (const item of stocksData as Array<{ stock?: string; symbol?: string; name?: string; category?: string }>) {
    const value = String(item.stock ?? item.symbol ?? '').trim().toUpperCase()
    if (value) entries.set(value, { value, label: value, description: String(item.name ?? ''), meta: String(item.category ?? 'Stock') })
  }
  for (const item of indexesData as Array<{ symbol?: string; name?: string; category?: string }>) {
    const value = String(item.symbol ?? '').trim().toUpperCase()
    if (value) entries.set(value, { value, label: value, description: String(item.name ?? ''), meta: String(item.category ?? 'Index') })
  }
  const defaults = ['SPX', 'SPY', 'NDX', 'AAPL', 'QQQ', 'MSFT']
  return [...defaults.filter((symbol) => entries.has(symbol)).map((symbol) => entries.get(symbol)!), ...[...entries.values()].filter((entry) => !defaults.includes(entry.value))]
})()
const modelOptions = [{ value: 'cash', label: 'cash' }, ...symbolOptions]
const periodHint = computed(() => {
  if (form.value.period === 'All History') return `Uses the full available history for ${form.value.symbol || 'SPX'}`
  const years = Number.parseInt(form.value.period, 10)
  if (!Number.isFinite(years)) return ''
  const end = new Date()
  const start = new Date(end)
  start.setFullYear(start.getFullYear() - years)
  return `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`
})
const open = ref({ market: true, trade: true, advanced: true, save: true })
function toggle(section: keyof typeof open.value) { open.value[section] = !open.value[section] }
</script>

<template>
  <div class="settings-card">
    <section class="settings-section">
      <button type="button" class="group-heading" :aria-expanded="open.market" @click="toggle('market')">Market &amp; Period <span>{{ open.market ? '⌄' : '›' }}</span></button>
      <div v-if="open.market" class="settings-grid">
        <label><span>Backtest Type<BacktestHelp topic="strategy" /></span><select v-model="form.strategy"><option value="Single">Single Symbol Backtest</option><option value="Dual">Dual Symbol Backtest</option></select></label>
        <label><span>Comparison Benchmark<BacktestHelp topic="benchmark" /></span><SearchSelect v-model="form.benchmark" :options="symbolOptions" placeholder="Search symbol" aria-label="Search comparison benchmark" /></label>
        <label><span>Primary Symbol<BacktestHelp topic="symbol" /></span><SearchSelect v-model="form.symbol" :options="symbolOptions" placeholder="Search symbol" aria-label="Search primary symbol" /></label>
        <label v-if="form.strategy === 'Dual'"><span>Second Symbol<BacktestHelp topic="symbol2" /></span><SearchSelect v-model="form.symbol2" :options="symbolOptions" placeholder="Search symbol" aria-label="Search second symbol" /></label>
        <label><span>Timeframe<BacktestHelp topic="frequency" /></span><select v-model="form.frequency"><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label>
        <label><span>Backtest Period<BacktestHelp topic="period" /></span><select v-model="form.period"><option>All History</option><option>1 Year</option><option>3 Years</option><option>5 Years</option><option>10 Years</option><option>15 Years</option><option>20 Years</option><option>Custom Date Range</option></select><small v-if="periodHint" class="period-hint">{{ periodHint }}</small></label>
        <label v-if="form.period === 'Custom Date Range'" class="full">Date Range<span class="date-range"><input v-model="form.startDate" type="date" aria-label="Start date" /><span>to</span><input v-model="form.endDate" type="date" aria-label="End date" /></span></label>
      </div>
    </section>
    <section class="settings-section">
      <button type="button" class="group-heading" :aria-expanded="open.trade" @click="toggle('trade')">Trade Settings <span>{{ open.trade ? '⌄' : '›' }}</span></button>
      <div v-if="open.trade" class="settings-grid">
        <label><span>Direction<BacktestHelp topic="direction" /></span><select v-model="form.direction"><option>Long</option><option>Short</option></select></label>
        <label><span>Model<BacktestHelp topic="model" /></span><SearchSelect v-model="form.model" :options="modelOptions" placeholder="Search model" aria-label="Search model" /></label>
        <label><span>Starting Capital<BacktestHelp topic="capital" /></span><input v-model="form.capital" type="text" inputmode="decimal" :aria-invalid="!!errors.capital" @input="validateField('capital')" /><small v-if="errors.capital" class="field-error">{{ errors.capital }}</small></label>
        <details class="costs full"><summary><strong>Trade Price &amp; Costs</strong><span>{{ form.tradePrice }} · Commission {{ form.commission || '0' }} · Slippage {{ form.slippage || '0' }}</span></summary><div class="cost-fields"><label><span>Trade Price<BacktestHelp topic="tradePrice" /></span><select v-model="form.tradePrice"><option>Current Close</option><option>Next Open</option></select></label><label><span>Commission<BacktestHelp topic="commission" /></span><input v-model="form.commission" type="text" inputmode="decimal" :aria-invalid="!!errors.commission" @input="validateField('commission')" /><small v-if="errors.commission" class="field-error">{{ errors.commission }}</small></label><label><span>Slippage<BacktestHelp topic="slippage" /></span><input v-model="form.slippage" type="text" inputmode="decimal" :aria-invalid="!!errors.slippage" @input="validateField('slippage')" /><small v-if="errors.slippage" class="field-error">{{ errors.slippage }}</small></label></div></details>
      </div>
    </section>
    <section class="settings-section">
      <button type="button" class="group-heading" :aria-expanded="open.advanced" @click="toggle('advanced')">Advanced Settings <span>{{ open.advanced ? '⌄' : '›' }}</span></button>
      <div v-if="open.advanced" class="settings-grid">
        <label><span>Market Environment<BacktestHelp topic="environment" /></span><select v-model="form.environment"><option value="Market Environment">Any</option><option>Bull Market</option><option>Bear Market</option></select></label>
        <label><span>Index MA Slope<BacktestHelp topic="maSlope" /></span><select v-model="form.maSlope"><option value="Index Moving Average Slope">Any</option><option>Positive</option><option>Negative</option></select></label>
        <label><span>Exclude Overlapping Obs.<BacktestHelp topic="excludeOO" /></span><input v-model="form.excludeOO" type="text" inputmode="numeric" :aria-invalid="!!errors.excludeOO" @input="validateField('excludeOO')" /><small v-if="errors.excludeOO" class="field-error">{{ errors.excludeOO }}</small></label>
      </div>
    </section>
    <section class="settings-section">
      <button type="button" class="group-heading" :aria-expanded="open.save" @click="toggle('save')">Save Details <span>{{ open.save ? '⌄' : '›' }}</span></button>
      <div v-if="open.save" class="settings-grid">
        <label><span>Backtest Name<BacktestHelp topic="name" /></span><input v-model="form.name" :aria-invalid="!!errors.name" @input="validateName" /><small v-if="errors.name" class="field-error">{{ errors.name }}</small></label>
        <label><span>User Tag<BacktestHelp topic="userTag" /></span><select v-model="form.userTag"><option>Backtest History (Private)</option><option>Backtest History (Public)</option></select></label>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-card{margin:0 0 10px;padding:8px;background:var(--app-surface);border:1px solid var(--app-border);border-radius:5px;color:var(--app-text)}
.settings-section{padding:0 0 8px;margin:8px 0 8px}
.settings-section:last-child{border:0;margin-bottom:0;padding-bottom:0}
.group-heading{display:flex;width:100%;justify-content:space-between;align-items:center;padding:7px 10px;border:0;border-radius:4px;background:#e7f1fd;color:#000;font-size:13px;font-weight:400;text-align:left}
.group-heading span{font-size:16px;font-weight:400;line-height:1}
.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem 1rem;padding:.8rem}
label{min-width:0;display:flex;flex-direction:column;align-items:stretch;gap:.3rem;color:var(--app-text-muted);font-size:.72rem;font-weight:500;line-height:1.25}
.period-hint{font-size:.66rem;font-weight:500;color:var(--app-text-muted)}
.field-error{font-size:.68rem;color:var(--app-negative,#dc2626);font-weight:500}
input[aria-invalid="true"]{border-color:var(--app-negative,#dc2626)}
input,select{box-sizing:border-box;width:100%;height:2.35rem;padding:0 .65rem;border:1px solid var(--app-border-strong);border-radius:6px;background:var(--app-surface);color:#000;font:inherit;font-size:.84rem;font-weight:700}
input::placeholder{color:var(--app-text-muted);font-weight:400}
:deep(.search-select__input){color:#000;font-weight:700}
input:focus,select:focus{outline:none;border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-primary-soft)}
.full{grid-column:1/-1}.date-range{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:8px}.date-range>span{font-size:.75rem}.date-range input{color-scheme:light}
.costs{border:1px solid var(--app-border-strong);border-radius:6px;margin-top:6px}.costs summary{display:flex;align-items:center;gap:.65rem;padding:.65rem .75rem;cursor:pointer;list-style:none;font-size:.79rem;color:var(--app-text-secondary)}.costs summary::-webkit-details-marker{display:none}.costs summary:before{content:'›';color:var(--app-primary);font-size:1.25rem;line-height:1}.costs[open] summary:before{transform:rotate(90deg)}.costs summary span{margin-left:auto;color:var(--app-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.77rem}.cost-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem;padding:.75rem;border-top:1px solid var(--app-border-muted)}
@media(max-width:600px){.settings-grid,.cost-fields{grid-template-columns:1fr}.full{grid-column:auto}.costs summary{flex-wrap:wrap}.costs summary span{flex-basis:100%;margin-left:1.5rem}.date-range{gap:6px}.date-range input{font-size:.75rem;padding:0 2px}}
</style>
