<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown } from '@lucide/vue'

type Market = { id: number; market: string; close: number; value: number; date: string }
const source: Array<[string, number, number, string?]> = [
  ['Bonds',43,3],['British Pound',36,4],['CRB Index',48,4],['Canadian Dollar',44,4],
  ['Cattle',47,4],['Cocoa',34,4],['Coffee',52,4],['Copper',69,5],['Corn',37,4],
  ['Cotton',59,4],['Crude Oil',58,4],['Euro',29,3],['Gold',55,4],['Heating Oil',69,4],
  ['Hogs',27,3],['S&P 500',47,4],['Japanese Yen',43,4],['Lumber',31,4,'2023-05-15'],
  ['Natural Gas',24,2],['Orange Juice',36,4],['Platinum',44,4],['Silver',47,4],
  ['Soybeans',59,4],['Sugar',63,4],['Swiss Franc',48,4],['US Dollar',60,5],['Wheat',37,4],
]
const rows: Market[] = source.map(([market, close, value, date], id) => ({ id, market, close, value, date: date ?? '2026-10-26' }))
const colors = ['#24916b','#65b987','#b6dfbc','#e5ebf3','#f0c1bd','#e58682','#c85059']
// The scale colors are theme-aware: the actual values live in CSS (see .ms-page vars).
const scaleColor = (index: number) => `var(--ms-scale-${index + 1})`
const sentiment = (value: number) => value < 4 ? 'Pessimism' : value > 4 ? 'Optimism' : 'Neutral'
const counts = colors.map((_, index) => rows.filter(row => row.value === index + 1).length)
const query = ref('')
const scope = ref('all')
const order = ref('source')
const sortKey = ref<'market' | 'date' | 'close' | 'value' | 'sentiment' | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')
const selectedId = ref(18)
const selected = computed(() => rows[selectedId.value]!)
const visible = computed(() => {
  const result = rows.filter(row => row.market.toLowerCase().includes(query.value.trim().toLowerCase()) && (scope.value === 'all' || sentiment(row.value).toLowerCase() === scope.value))
  if (sortKey.value) result.sort((a,b) => {
    const key = sortKey.value!
    const comparison = key === 'market' ? a.market.localeCompare(b.market) : key === 'date' ? a.date.localeCompare(b.date) : key === 'close' ? a.close-b.close : a.value-b.value
    return (sortDirection.value === 'asc' ? 1 : -1) * comparison || a.id-b.id
  })
  else if (order.value === 'name') result.sort((a, b) => a.market.localeCompare(b.market))
  else if (order.value === 'value-asc') result.sort((a, b) => a.value - b.value || a.id - b.id)
  else if (order.value === 'value-desc') result.sort((a, b) => b.value - a.value || a.id - b.id)
  else if (order.value === 'date') result.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
  return result
})
function sortBy(key: 'market' | 'date' | 'close' | 'value' | 'sentiment') {
  if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDirection.value = 'asc' }
  order.value = 'source'
}
function setOrder(value: string) { order.value = value; sortKey.value = null }
function reset() { query.value = ''; scope.value = 'all'; order.value = 'source'; sortKey.value = null; sortDirection.value = 'asc'; selectedId.value = 18 }
</script>

<template>
  <div class="ms-page">
    <div class="ms-stats">
      <div v-for="stat in [{label:'Markets covered',value:27,note:'Optix market overview',color:'#126df2'},{label:'Pessimism',value:4,note:'Positions 1–3',color:'#47a679'},{label:'Neutral',value:21,note:'Position 4',color:'#9aabc0'},{label:'Optimism',value:2,note:'Positions 5–7',color:'#da7e7b'}]" :key="stat.label" class="ms-stat" :style="{'--accent':stat.color}"><span>{{ stat.label }}</span><strong>{{ stat.value }}</strong><small>{{ stat.note }}</small></div>
    </div>
    <div class="ms-overview">
      <section class="ms-panel ms-dist-panel">
        <div class="ms-dist-head"><div><h3>Markets by sentiment position</h3><p>Counts cover all 27 markets, regardless of table filters.</p></div><span class="ms-chip">27 markets</span></div>
        <div class="ms-distribution"><div v-for="(count,index) in counts" :key="index" class="ms-dist-col"><strong>{{ count }}</strong><div class="ms-dist-track"><i :style="{height:`${count / 21 * 100}%`,background:index === 3 ? 'var(--ms-neutral)' : scaleColor(index)}"></i></div><span>{{ index + 1 }}</span></div></div>
        <div class="ms-scale-labels"><span>Pessimism</span><span>Neutral</span><span>Optimism</span></div>
      </section>
      <section class="ms-panel ms-spotlight">
        <div class="ms-spot-title"><div><span class="ms-eyebrow">SELECTED MARKET</span><h3>{{ selected.market }}</h3></div><span class="ms-chip" :class="sentiment(selected.value).toLowerCase()">{{ sentiment(selected.value) }}</span></div>
        <div class="ms-spot-numbers"><div><span>Current Optix</span><strong>{{ selected.close }}</strong></div><div><span>Position</span><strong>{{ selected.value }}<small>/ 7</small></strong></div><div class="ms-spot-date"><span>Data date</span><b>{{ selected.date }}</b><em v-if="selected.market === 'Lumber'">Earlier update</em></div></div>
        <div class="ms-gauge large" :aria-label="`Sentiment position ${selected.value} of 7`"><i v-for="index in 7" :key="index" :style="{background:scaleColor(index - 1)}"></i><b :style="{left:`calc(${(selected.value-.5)/7*100}% - 6px)`}"></b></div>
        <div class="ms-scale-labels"><span>Pessimism</span><span>Neutral</span><span>Optimism</span></div>
      </section>
    </div>
    <section class="ms-panel ms-readings">
      <div class="ms-panel-head"><div><h2>Optix readings by market</h2><p>Select a market to inspect its Optix reading and sentiment position above.</p></div><span class="ms-chip">{{ visible.length }} of 27 markets</span></div>
      <div class="ms-toolbar"><input v-model="query" type="search" placeholder="Search markets, commodities or currencies…" aria-label="Search markets"><select :value="order" aria-label="Sort markets" @change="setOrder(($event.target as HTMLSelectElement).value)"><option value="source">Default order</option><option value="name">Market A–Z</option><option value="value-asc">Position · low to high</option><option value="value-desc">Position · high to low</option><option value="date">Date · oldest first</option></select><button class="ms-reset" @click="reset">Reset</button></div>
      <div class="ms-filters"><button v-for="filter in [{key:'all',label:'All markets',count:27},{key:'pessimism',label:'Pessimism',count:4},{key:'neutral',label:'Neutral',count:21},{key:'optimism',label:'Optimism',count:2}]" :key="filter.key" :class="{active:scope === filter.key}" @click="scope = filter.key">{{ filter.label }} <span>{{ filter.count }}</span></button></div>
      <div class="ms-table-wrap"><table class="ms-table"><thead><tr><th v-for="column in [{key:'market',label:'Market'},{key:'date',label:'Data date'},{key:'close',label:'Current Optix'},{key:'value',label:'Position (1–7)'}]" :key="column.key"><button type="button" class="ms-sort-button" @click="sortBy(column.key as 'market' | 'date' | 'close' | 'value')">{{ column.label }}<ArrowUp v-if="sortKey === column.key && sortDirection === 'asc'" :size="13"/><ArrowDown v-else-if="sortKey === column.key" :size="13"/><ArrowUpDown v-else :size="13"/></button></th><th><div class="ms-scale-labels"><span>Pessimism</span><span>Neutral</span><span>Optimism</span></div></th><th><button type="button" class="ms-sort-button" @click="sortBy('sentiment')">Sentiment<ArrowUp v-if="sortKey === 'sentiment' && sortDirection === 'asc'" :size="13"/><ArrowDown v-else-if="sortKey === 'sentiment'" :size="13"/><ArrowUpDown v-else :size="13"/></button></th></tr></thead><tbody><tr v-for="row in visible" :key="row.id" :class="{'ms-selected':row.id === selectedId}"><th scope="row"><button @click="selectedId = row.id">{{ row.market }}</button></th><td :class="{'ms-earlier-date':row.market === 'Lumber'}">{{ row.date }}<i v-if="row.market === 'Lumber'" title="Earlier update date">●</i></td><td class="ms-number">{{ row.close }}</td><td class="ms-number strong">{{ row.value }}</td><td><div class="ms-gauge" :aria-label="`Sentiment position ${row.value} of 7`"><i v-for="index in 7" :key="index" :style="{background:scaleColor(index - 1)}"></i><b :style="{left:`calc(${(row.value-.5)/7*100}% - 4px)`}"></b></div></td><td><span class="ms-position" :class="sentiment(row.value).toLowerCase()">{{ sentiment(row.value) }}</span></td></tr><tr v-if="!visible.length"><td colspan="6" class="ms-empty">No markets match this view.</td></tr></tbody></table></div>
      <div class="ms-footer"><span>Position 1 = extreme pessimism · 4 = neutral · 7 = extreme optimism.</span><span>Current Optix and sentiment position are separate readings.</span></div>
    </section>
    <div class="ms-date-note"><b>Data dates.</b> 26 markets show 2026-10-26; Lumber was last updated on 2023-05-15. Check the date when comparing markets. The summary and distribution include all 27 rows.</div>
  </div>
</template>

<style scoped>
.ms-page{--ms-scale-1:#24916b;--ms-scale-2:#65b987;--ms-scale-3:#b6dfbc;--ms-scale-4:#e5ebf3;--ms-scale-5:#f0c1bd;--ms-scale-6:#e58682;--ms-scale-7:#c85059;--ms-neutral:#9eafc5;color:#1a3c66}.ms-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}.ms-stat,.ms-panel{border:1px solid #dce7f6;border-radius:7px;background:#fff}.ms-stat{padding:17px 20px;position:relative;overflow:hidden}.ms-stat:before{content:'';position:absolute;left:0;top:19px;bottom:19px;width:3px;background:var(--accent)}.ms-stat span,.ms-stat small{display:block;color:#7086a3;font-size:11px}.ms-stat strong{display:block;color:#123c71;font-size:31px;margin:8px 0}.ms-stat small{font-size:10px;color:#8395ac}.ms-overview{display:grid;grid-template-columns:1.15fr 1fr;gap:16px;margin-bottom:16px}.ms-dist-panel,.ms-spotlight{padding:22px 24px}.ms-dist-head,.ms-spot-title,.ms-panel-head{display:flex;justify-content:space-between;align-items:start;gap:14px}.ms-dist-head h3{font-size:16px;margin:0 0 6px}.ms-dist-head p,.ms-panel-head p{font-size:11px;color:#7b8fa9;margin:0}.ms-chip{display:inline-block;background:#eef5ff;color:#1769c9;border-radius:4px;padding:5px 9px;font-size:10px;white-space:nowrap}.ms-chip.pessimism,.ms-position.pessimism{background:#edf7ef;color:#38875e}.ms-chip.optimism,.ms-position.optimism{background:#fff0ee;color:#b25b61}.ms-chip.neutral,.ms-position.neutral{background:#f0f4f9;color:#8393a8}.ms-distribution{display:grid;grid-template-columns:repeat(7,1fr);gap:12px;margin-top:18px}.ms-dist-col{text-align:center;color:#5e7799;font-size:11px}.ms-dist-col strong{display:block;font-size:15px;margin-bottom:6px}.ms-dist-track{height:65px;position:relative;background:#f4f7fb;border-bottom:1px solid #dce7f4;border-radius:4px;margin-bottom:6px}.ms-dist-track i{position:absolute;bottom:0;left:0;right:0;border-radius:3px 3px 0 0}.ms-scale-labels{display:grid;grid-template-columns:3fr 1fr 3fr;text-align:center;color:#92a2b7;font-size:10px;margin-top:8px}.ms-spotlight{background:linear-gradient(115deg,#fff,#f5f9ff)}.ms-eyebrow{font-size:10px;font-weight:800;letter-spacing:1.2px;color:#1371d9}.ms-spot-title h3{font-size:21px;margin:7px 0 0}.ms-spot-numbers{display:flex;align-items:end;gap:28px;margin:20px 0 17px}.ms-spot-numbers span{display:block;font-size:10px;color:#8b9cb4;margin-bottom:5px}.ms-spot-numbers strong{font-size:28px;color:#1c477d}.ms-spot-numbers small{font-size:13px;color:#9cacc1;margin-left:4px;font-weight:400}.ms-spot-date{margin-left:auto;padding-bottom:4px}.ms-spot-date b{font-size:12px;color:#6882a1;font-weight:500}.ms-spot-date em{display:block;font-size:10px;font-style:normal;color:#a97432;margin-top:4px}.ms-gauge{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;position:relative;height:8px;max-width:310px;margin:auto}.ms-gauge i{border-radius:2px}.ms-gauge b{position:absolute;top:0;width:8px;height:8px;border-radius:50%;background:#183759;box-shadow:0 0 0 2px #fff}.ms-gauge.large{max-width:none;height:10px}.ms-gauge.large b{width:12px;height:12px;top:-1px;box-shadow:0 0 0 3px #fff,0 1px 4px #31577e44}.ms-panel-head{padding:18px}.ms-panel-head h2{font-size:16px;margin:0 0 5px}.ms-toolbar{display:flex;gap:10px;padding:0 18px 15px;flex-wrap:wrap}.ms-toolbar input,.ms-toolbar select,.ms-reset{border:1px solid #d7e4f5;border-radius:5px;background:#fff;color:#325574;padding:9px 11px;font:inherit;font-size:12px}.ms-toolbar input{flex:1;min-width:230px}.ms-reset{cursor:pointer;background:#f5f9ff}.ms-filters{display:flex;gap:7px;padding:0 18px 15px;flex-wrap:wrap}.ms-filters button{border:1px solid #dce7f5;background:#fff;color:#617b9b;padding:7px 13px;border-radius:5px;font-size:11px;cursor:pointer}.ms-filters button.active{background:#0d6af0;color:#fff;border-color:#0d6af0}.ms-filters button span{opacity:.6}.ms-table-wrap{overflow-x:auto}.ms-table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;font-variant-numeric:tabular-nums;min-width:800px}.ms-table thead th{background:var(--app-surface-muted);color:var(--app-text-secondary);font-size:.6875rem;font-weight:600;padding:13px 17px;border-bottom:1px solid var(--app-border);text-align:left}.ms-sort-button{display:inline-flex;align-items:center;gap:6px;border:0;background:none;padding:0;color:inherit;font:inherit;font-weight:600;cursor:pointer}.ms-table thead th:nth-child(3),.ms-table thead th:nth-child(4){text-align:right}.ms-table thead th:nth-child(5){width:34%;padding-left:25px;padding-right:25px}.ms-table thead .ms-scale-labels{margin:0}.ms-table tbody th,.ms-table tbody td{padding:10px 17px;border-bottom:1px solid #e7edf7;background:#fff;text-align:left;color:#6e829f;font-weight:400}.ms-table tbody tr:nth-child(even) th,.ms-table tbody tr:nth-child(even) td{background:#fbfcfe}.ms-table tbody th button{border:0;background:none;font:inherit;font-weight:600;color:#155eab;cursor:pointer;padding:0;text-align:left}.ms-table .ms-number{text-align:right;color:#3f5b7f;width:75px}.ms-table .ms-number.strong{font-weight:700;color:#173c6b}.ms-table tbody td:nth-child(5){padding:10px 25px}.ms-table tbody td:nth-child(2){white-space:nowrap;font-size:11px}.ms-position{font-size:10px;padding:4px 8px;border-radius:4px;display:inline-block;white-space:nowrap}.ms-selected th{box-shadow:inset 3px 0 #096cf2;background:#eef5ff!important}.ms-earlier-date{color:#a8793b!important}.ms-earlier-date i{font-size:6px;font-style:normal;vertical-align:middle;margin-left:6px}.ms-empty{text-align:center!important;padding:30px!important}.ms-footer{padding:14px 18px;font-size:11px;color:#7c8fa9;line-height:1.7;display:flex;justify-content:space-between;gap:15px}.ms-date-note{padding:12px 17px;margin-top:16px;background:#f6f9fe;border:1px solid #dee8f6;border-radius:6px;font-size:11px;color:#7086a3;line-height:1.7}.ms-date-note b{color:#405f86}@media(max-width:850px){.ms-overview{grid-template-columns:1fr}.ms-stats{grid-template-columns:repeat(2,1fr)}}

/* Dark theme */
:root[data-theme='dark'] .ms-page{--ms-scale-1:#0f8f63;--ms-scale-2:#34d399;--ms-scale-3:#86efac;--ms-scale-4:#2e4763;--ms-scale-5:#c2607a;--ms-scale-6:#f47b96;--ms-scale-7:#fb7185;--ms-neutral:#55708f;color:var(--app-text)}
:root[data-theme='dark'] .ms-stat,
:root[data-theme='dark'] .ms-panel{border-color:var(--app-border-muted);background:var(--app-surface)}
:root[data-theme='dark'] .ms-stat span,
:root[data-theme='dark'] .ms-stat small{color:var(--app-text-muted)}
:root[data-theme='dark'] .ms-stat strong{color:var(--app-text)}
:root[data-theme='dark'] .ms-dist-head p,
:root[data-theme='dark'] .ms-panel-head p{color:var(--app-text-muted)}
:root[data-theme='dark'] .ms-chip{background:var(--app-primary-soft);color:var(--app-primary)}
:root[data-theme='dark'] .ms-chip.pessimism,
:root[data-theme='dark'] .ms-position.pessimism{background:rgb(52 211 153 / .12);color:#34d399}
:root[data-theme='dark'] .ms-chip.optimism,
:root[data-theme='dark'] .ms-position.optimism{background:rgb(251 113 133 / .12);color:#fb7185}
:root[data-theme='dark'] .ms-chip.neutral,
:root[data-theme='dark'] .ms-position.neutral{background:var(--app-surface-muted);color:var(--app-text-muted)}
:root[data-theme='dark'] .ms-dist-col{color:var(--app-text-muted)}
:root[data-theme='dark'] .ms-dist-track{background:var(--app-surface-muted);border-color:var(--app-border-muted)}
:root[data-theme='dark'] .ms-scale-labels{color:var(--app-text-faint)}
:root[data-theme='dark'] .ms-spotlight{background:linear-gradient(115deg,var(--app-surface),var(--app-surface-muted))}
:root[data-theme='dark'] .ms-eyebrow{color:var(--app-primary)}
:root[data-theme='dark'] .ms-spot-numbers span{color:var(--app-text-muted)}
:root[data-theme='dark'] .ms-spot-numbers strong{color:var(--app-text)}
:root[data-theme='dark'] .ms-spot-numbers small{color:var(--app-text-faint)}
:root[data-theme='dark'] .ms-spot-date b{color:var(--app-text-secondary)}
:root[data-theme='dark'] .ms-spot-date em{color:#fbbf24}
:root[data-theme='dark'] .ms-gauge b{background:var(--app-text);box-shadow:0 0 0 2px var(--app-surface)}
:root[data-theme='dark'] .ms-gauge.large b{box-shadow:0 0 0 3px var(--app-surface),0 1px 4px rgb(0 0 0 / .4)}
:root[data-theme='dark'] .ms-toolbar input,
:root[data-theme='dark'] .ms-toolbar select,
:root[data-theme='dark'] .ms-reset{border-color:var(--app-border);background:var(--app-surface);color:var(--app-text-secondary)}
:root[data-theme='dark'] .ms-reset{background:var(--app-surface-muted)}
:root[data-theme='dark'] .ms-filters button{border-color:var(--app-border);background:var(--app-surface);color:var(--app-text-secondary)}
:root[data-theme='dark'] .ms-filters button.active{background:var(--app-primary);border-color:var(--app-primary);color:var(--app-on-primary)}
:root[data-theme='dark'] .ms-table tbody th,
:root[data-theme='dark'] .ms-table tbody td{border-color:var(--app-border-muted);background:var(--app-surface);color:var(--app-text-secondary)}
:root[data-theme='dark'] .ms-table tbody tr:nth-child(even) th,
:root[data-theme='dark'] .ms-table tbody tr:nth-child(even) td{background:var(--app-row-even)}
:root[data-theme='dark'] .ms-table tbody th button{color:var(--app-primary)}
:root[data-theme='dark'] .ms-table .ms-number{color:var(--app-text-secondary)}
:root[data-theme='dark'] .ms-table .ms-number.strong{color:var(--app-text)}
:root[data-theme='dark'] .ms-selected th{box-shadow:inset 3px 0 var(--app-primary);background:var(--app-primary-soft)!important}
:root[data-theme='dark'] .ms-earlier-date{color:#fbbf24!important}
:root[data-theme='dark'] .ms-footer{color:var(--app-text-muted)}
:root[data-theme='dark'] .ms-date-note{background:var(--app-surface-muted);border-color:var(--app-border-muted);color:var(--app-text-muted)}
:root[data-theme='dark'] .ms-date-note b{color:var(--app-text-secondary)}
</style>
