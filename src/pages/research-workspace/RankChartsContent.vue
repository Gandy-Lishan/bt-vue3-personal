<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type Metric = 'optix' | 'flow' | 'breadth'
type Category = 'commodities' | 'countries' | 'bonds' | 'currencies' | 'stocks' | 'sectors'
type Row = { name: string; value: number; index: number }
const pairs = (text: string): Row[] => text.split('|').map((part,index) => { const cut = part.lastIndexOf(':'); return {name:part.slice(0,cut),value:Number(part.slice(cut+1)),index} })
const datasets: Record<Category,{title:string;demo?:boolean;metrics:Metric[];rows:Partial<Record<Metric,Row[]>>}> = {
  commodities:{title:'Commodities',metrics:['optix'],rows:{optix:pairs('Natural Gas:24|Hogs:27|Lumber:31|Cocoa:34|Orange Juice:36|Corn:37|Wheat:37|Platinum:44|Silver:47|Cattle:47|Coffee:52|Gold:55|Soybeans:58|Crude Oil:58|Cotton:59|Sugar:63|Heating Oil:69|Copper:69|Unleaded Gas:70')}},
  countries:{title:'Countries',metrics:['optix','flow'],rows:{optix:pairs('Brazil:2|Argentina:6|Chile:14|Philippines:15|Emerging Markets:22|Peru:26|Turkey:32|Singapore:32|Spain:35|Netherlands:35|South Korea:36|China:37|Russia:37|Taiwan:38|Saudi Arabia:38|Colombia:38|Austria:38|Japan:39|Pakistan:39|Indonesia:41|India:43|Greece:43|Poland:43|South Africa:44|United Arab Emirates:44|Malaysia:45|Sweden:47|Egypt:49|Portugal:49|France:49|Finland:49|Belgium:50|United States:50|Italy:50|Nigeria:51|Vietnam:52|Mexico:53|New Zealand:57|Germany:58|United Kingdom:58|Hong Kong:59|Australia:61|Canada:61|Ireland:63|Thailand:63|Switzerland:64|Denmark:72|Norway:72|Qatar:75|Israel:82'),flow:pairs('Australia:0|Brazil:0|Canada:0|China:0|Emerging Markets:0|France:0|Germany:0|India:0|Italy:0|Japan:0|Russia:0|Spain:0|United Kingdom:0|Mexico:8|United States:50')}},
  bonds:{title:'Bonds',metrics:['optix'],rows:{optix:pairs('10-Year Optix:9|Eurodollar Optix:18|30-Year Optix:42|JNK Optix:58|HYG Optix:62|RSP Optix:70|BIL Optix:76|LQD Optix:78|BND Optix:83|TLT Optix:84|5-Year Optix:88|2-Year Optix:93')}},
  currencies:{title:'Currencies',metrics:['optix'],rows:{optix:pairs('Euro:29|Dollar Optimism Index:31|British Pound:36|Japanese Yen:43|Canadian Dollar:44|Swiss Franc:48|US Dollar:60')}},
  stocks:{title:'Stocks',metrics:['optix'],rows:{optix:pairs('Amc Networks-A:0|Fmc Corp:0|Jetblue Airways:1|Teco Energy Inc:1|Dow Chemical Co:98|Ryder System Inc:98|Range Resources:99|Lockheed Martin:99')}},
  sectors:{title:'Sectors',demo:true,metrics:['optix','flow','breadth'],rows:{optix:pairs('Communication Services:25|Consumer Discretionary:45|Consumer Staples:67|Energy:78|Financials:62|Health Care:84|Industrials:58|Information Technology:38|Materials:54|Real Estate:71|Utilities:81'),flow:pairs('Communication Services:-145|Consumer Discretionary:-80|Consumer Staples:120|Energy:285|Financials:170|Health Care:-210|Industrials:65|Information Technology:-340|Materials:35|Real Estate:-55|Utilities:95'),breadth:pairs('Communication Services:36|Consumer Discretionary:44|Consumer Staples:65|Energy:81|Financials:58|Health Care:74|Industrials:62|Information Technology:48|Materials:51|Real Estate:68|Utilities:77')}},
}
const metricLabels: Record<Metric,string> = {optix:'Optimism Index',flow:'Money Flow',breadth:'Oversold / Overbought Breadth'}
const category = ref<Category>('commodities')
const metric = ref<Metric>('optix')
const sort = ref('asc')
const search = ref('')
const view = ref<'chart'|'table'>('chart')
watch(category, () => { metric.value = 'optix'; search.value = '' })
const source = computed(() => datasets[category.value].rows[metric.value] ?? [])
const rows = computed(() => {
  const result = source.value.filter(row => row.name.toLowerCase().includes(search.value.trim().toLowerCase())).slice()
  if(sort.value === 'asc') result.sort((a,b) => a.value-b.value || a.index-b.index)
  if(sort.value === 'desc') result.sort((a,b) => b.value-a.value || a.index-b.index)
  if(sort.value === 'name') result.sort((a,b) => a.name.localeCompare(b.name))
  return result
})
const low = computed(() => rows.value.length ? Math.min(...rows.value.map(row => row.value)) : null)
const high = computed(() => rows.value.length ? Math.max(...rows.value.map(row => row.value)) : null)
const extremeNames = (value: number | null) => value === null ? 'No matching records' : (() => { const names = rows.value.filter(row => row.value === value).map(row => row.name); return names.slice(0,2).join(' · ') + (names.length > 2 ? ` · +${names.length-2} more` : '') })()
const domain = computed(() => { const max = Math.max(1,...source.value.map(row => Math.abs(row.value))); const magnitude = 10 ** Math.floor(Math.log10(max)); return metric.value === 'flow' ? Math.ceil(max/magnitude)*magnitude : 100 })
const ticks = computed(() => metric.value === 'flow' ? [-domain.value,-domain.value/2,0,domain.value/2,domain.value] : [0,25,50,75,100])
const chunks = computed(() => rows.value.length > 26 ? [rows.value.slice(0,Math.ceil(rows.value.length/2)),rows.value.slice(Math.ceil(rows.value.length/2))] : [rows.value])
function barStyle(value:number) { const delta = value - (metric.value === 'flow' ? 0 : 50); const size = metric.value === 'flow' ? Math.abs(delta)/domain.value*50 : Math.abs(delta); return {left:`${delta < 0 ? 50-size : 50}%`,width:`${size}%`} }
const reference = computed(() => metric.value === 'flow' ? 0 : 50)
</script>

<template>
  <section class="rank-workspace">
    <div class="rank-category-tabs" role="tablist" aria-label="Asset groups"><button v-for="(item,key) in datasets" :key="key" class="rank-category" :class="{active:category === key}" role="tab" :aria-selected="category === key" @click="category = key">{{ item.title }}<span>{{ item.rows.optix?.length }}</span></button></div>
    <div class="rank-summary"><div class="rank-stat"><span>Visible items</span><strong>{{ rows.length }}<small> / {{ source.length }}</small></strong><p>{{ datasets[category].title }} · {{ metricLabels[metric] }}</p></div><div class="rank-stat"><span>Lowest reading</span><strong>{{ low ?? '—' }}</strong><p>{{ extremeNames(low) }}</p></div><div class="rank-stat"><span>Highest reading</span><strong>{{ high ?? '—' }}</strong><p>{{ extremeNames(high) }}</p></div></div>
    <div class="rank-layout"><article class="rank-panel"><header class="rank-head"><div><h2>{{ datasets[category].title }} · {{ metricLabels[metric] }}</h2><p>Compare the selected list against the {{ reference }} reference.</p></div><span class="rank-snapshot">{{ datasets[category].demo ? 'Demo data' : 'Snapshot data' }}</span></header>
      <div class="rank-toolbar"><label for="rank-metric">Metric</label><select id="rank-metric" v-model="metric" aria-label="Ranking metric"><option v-for="option in datasets[category].metrics" :key="option" :value="option">{{ metricLabels[option] }}</option></select><select v-model="sort" aria-label="Sort ranking"><option value="asc">Value: low to high</option><option value="desc">Value: high to low</option><option value="name">Name: A–Z</option><option value="default">Default order</option></select><input v-model="search" type="search" placeholder="Find a name…" aria-label="Find a name in ranking"><div class="rank-view-toggle"><button :class="{active:view === 'chart'}" :aria-pressed="view === 'chart'" @click="view = 'chart'">Chart</button><button :class="{active:view === 'table'}" :aria-pressed="view === 'table'" @click="view = 'table'">Table</button></div></div>
      <div v-if="!rows.length" class="rank-empty">No matching records. Try another name or clear the search field.</div>
      <div v-else-if="view === 'table'" class="rank-results"><table class="rank-table"><thead><tr><th>Name</th><th>{{ metricLabels[metric] }}</th></tr></thead><tbody><tr v-for="row in rows" :key="row.index"><td>{{ row.name }}</td><td>{{ row.value }}</td></tr></tbody></table></div>
      <div v-else class="rank-results"><div class="rank-list-layout" :class="{two:chunks.length > 1}"><div v-for="(chunk,index) in chunks" :key="index"><div class="rank-axis"><span>Name</span><div class="rank-axis-values"><span v-for="(tick,tickIndex) in ticks" :key="tickIndex" :style="{left:`${tickIndex*25}%`}">{{ tick }}</span></div><span>Reading</span></div><div v-for="row in chunk" :key="row.index" class="rank-row" :title="`${row.name}: ${row.value}`"><div class="rank-name">{{ row.name }}</div><div class="rank-track"><span class="rank-bar" :class="row.value < reference ? 'low' : row.value === reference ? 'mid' : 'high'" :style="barStyle(row.value)"></span></div><div class="rank-value">{{ row.value }}</div></div></div></div></div>
      <div class="rank-footer"><div v-if="view === 'chart'" class="rank-legend"><span><i></i>Below {{ reference }}</span><span><i class="high"></i>Above {{ reference }}</span></div><span v-else>Reference: {{ reference }}</span><span>{{ rows.length }} displayed records</span></div></article>
      <aside class="rank-panel rank-aside"><header class="rank-head"><h2>How to read the ranking</h2></header><div class="rank-aside-body"><div class="rank-reference"><strong>{{ reference }}</strong><span>{{ metric === 'flow' ? 'Money Flow baseline' : 'Comparison reference' }}<br>{{ metric === 'flow' ? 'Negative ↔ positive' : 'Lower ↔ higher readings' }}</span></div><p v-if="view === 'chart'">{{ metric === 'flow' ? 'Bars extend left for negative values and right for positive values. The number at the end of each row is the flow reading.' : 'Bars show the distance from the 50 reference. Read the number at the end of each row for the exact value.' }}</p><p v-else>{{ metric === 'flow' ? 'The numeric column shows each asset’s flow reading. Negative values are below zero; positive values are above zero.' : 'The numeric column shows each asset’s reading. Compare values below or above the 50 reference.' }}</p><div v-if="view === 'chart'" class="rank-legend"><span><i></i>Below {{ reference }}</span><span><i class="high"></i>Above {{ reference }}</span></div><div class="rank-note">{{ datasets[category].demo ? (metric === 'flow' ? 'Sector flow readings use illustrative index units; zero is the comparison baseline.' : 'Sector readings are illustrative values on a 0–100 scale; 50 is the comparison midpoint.') : (metric === 'flow' ? 'Money Flow uses the reported readings; zero is the comparison baseline.' : 'Optix uses a 0–100 index scale; 50 is the comparison midpoint.') }}</div></div></aside></div>
    <div class="rank-page-note">Snapshot readings · This design preview does not use a live market feed.</div>
  </section>
</template>

<style scoped>
.rank-workspace{--rank-green:#54b87a;--rank-red:#d98189;--rank-edge:#dce7f5;color:#13325d}.rank-category-tabs{display:flex;gap:5px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid var(--rank-edge);border-radius:8px;padding:6px;margin-bottom:17px}.rank-category{font:600 13px Arial,sans-serif;padding:11px 16px;color:#647d9f;background:transparent;border:0;border-radius:5px;cursor:pointer}.rank-category.active{background:#eaf3ff;color:#0868ed}.rank-category span{font-size:10px;margin-left:6px;color:#8aa0ba}.rank-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-bottom:18px}.rank-stat,.rank-panel{border:1px solid var(--rank-edge);background:#fff;border-radius:8px;min-width:0}.rank-stat{padding:15px 18px}.rank-stat>span{font-size:11px;color:#768dad;font-weight:600;letter-spacing:.04em;text-transform:uppercase}.rank-stat strong{display:block;font-size:26px;color:#173761;line-height:1.3;margin:4px 0}.rank-stat strong small{font-size:14px;color:#91a1b8;font-weight:500}.rank-stat p{font-size:11px;color:#8091aa;line-height:1.5;overflow-wrap:anywhere;margin:0}.rank-layout{display:grid;grid-template-columns:minmax(0,1fr) 292px;gap:17px;align-items:start}.rank-panel{overflow:hidden}.rank-head{display:flex;gap:14px;justify-content:space-between;align-items:flex-start;padding:18px 19px 15px;border-bottom:1px solid #e8eef7}.rank-head h2{font-size:17px;margin:0;color:#173761}.rank-head p{font-size:12px;line-height:1.6;margin:5px 0 0;color:#7a8faa}.rank-snapshot{font-size:10px;white-space:nowrap;color:#6483ad;border:1px solid #dbe7f8;background:#f4f8ff;padding:5px 8px;border-radius:4px}.rank-toolbar{display:flex;gap:7px;align-items:center;padding:12px 17px;border-bottom:1px solid #e8eef7;flex-wrap:wrap;background:#fbfdff}.rank-toolbar select,.rank-toolbar input{font:12px Arial,sans-serif;color:#4c688f;border:1px solid #d7e4f5;border-radius:5px;background:#fff;height:34px;padding:0 10px;min-width:0}.rank-toolbar input{flex:1;min-width:130px}.rank-toolbar label{font-size:11px;color:#7690ae;font-weight:600}.rank-view-toggle{display:flex;gap:2px;border:1px solid #d7e4f5;padding:2px;background:#fff;border-radius:5px}.rank-view-toggle button{border:0;border-radius:3px;background:transparent;font:600 11px Arial,sans-serif;padding:6px 9px;color:#7b90ab;cursor:pointer}.rank-view-toggle button.active{color:#0c6eec;background:#edf5ff}.rank-results{padding:16px 18px 20px;min-width:0}.rank-list-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:26px}.rank-list-layout.two{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.rank-axis,.rank-row{display:grid;grid-template-columns:minmax(118px,.85fr) minmax(140px,1.6fr) 34px;gap:10px;align-items:center}.rank-axis{padding:0 0 12px;font-size:10px;color:#8ca0b9;border-bottom:1px solid #e8eef6}.rank-axis-values{position:relative;height:14px}.rank-axis-values span{position:absolute;top:0;transform:translateX(-50%);font-variant-numeric:tabular-nums}.rank-axis-values span:first-child{transform:none}.rank-axis-values span:last-child{transform:translateX(-100%)}.rank-axis-values span:nth-child(3){font-weight:700;color:#4f739f}.rank-axis>span:last-child{text-align:right}.rank-row{min-height:34px;border-bottom:1px solid #f0f4f9}.rank-row:hover{background:#f7fbff}.rank-name{font-size:12px;color:#31547c;line-height:1.35;padding:7px 0;overflow-wrap:anywhere}.rank-track{position:relative;height:34px;background:linear-gradient(to right,transparent 24.8%,#f0f4f9 24.8%,#f0f4f9 25.2%,transparent 25.2%,transparent 74.8%,#f0f4f9 74.8%,#f0f4f9 75.2%,transparent 75.2%)}.rank-track:before{content:'';position:absolute;left:50%;top:0;bottom:0;width:1px;background:#b7cce6}.rank-bar{height:13px;top:10px;position:absolute;border-radius:2px;background:var(--rank-red)}.rank-bar.low{background:var(--rank-green)}.rank-bar.mid{background:#9eafc5;min-width:2px;left:calc(50% - 1px)!important}.rank-value{text-align:right;font-size:12px;font-weight:650;color:#385475;font-variant-numeric:tabular-nums}.rank-footer{display:flex;gap:12px;justify-content:space-between;align-items:center;padding:12px 18px;border-top:1px solid #e9eff7;font-size:11px;color:#7990ad;background:#fbfdff}.rank-legend{display:flex;gap:15px;flex-wrap:wrap}.rank-legend i{display:inline-block;width:11px;height:7px;background:var(--rank-green);border-radius:2px;margin-right:5px}.rank-legend i.high{background:var(--rank-red)}.rank-aside .rank-head{padding:15px 16px 12px}.rank-aside .rank-head h2{font-size:14px}.rank-aside-body{padding:16px;font-size:13px;color:#4e6a8b;line-height:1.75}.rank-aside-body p{margin:0 0 11px}.rank-reference{display:flex;align-items:center;gap:12px;padding:10px 0 12px;margin-bottom:11px;border-bottom:1px solid #e7eef8}.rank-reference strong{font-size:30px;line-height:1;color:#0a6af0}.rank-reference span{font-size:12px;line-height:1.5;color:#567395}.rank-note{margin-top:16px;padding:12px 13px;border-left:3px solid #3b83e6;border-radius:0 5px 5px 0;background:#f0f6ff;color:#45678e;font-size:12px;line-height:1.65}.rank-table{width:100%;border-collapse:collapse;font-size:12px}.rank-table th{padding:11px 10px;background:#f4f8ff;color:#6e87a8;font-size:11px;text-align:left}.rank-table td{padding:11px 10px;border-bottom:1px solid #eaf0f8;color:#36567e}.rank-table td:last-child,.rank-table th:last-child{text-align:right;font-variant-numeric:tabular-nums}.rank-table tr:nth-child(even){background:#fbfdff}.rank-empty{padding:55px 20px;text-align:center;color:#7b8fa9;font-size:13px}.rank-page-note{font-size:11px;line-height:1.75;color:#7c8fac;padding:17px 2px}@media(max-width:1399px){.rank-list-layout.two{grid-template-columns:1fr}}@media(max-width:900px){.rank-layout{grid-template-columns:1fr}}@media(max-width:560px){.rank-summary{grid-template-columns:1fr}.rank-axis,.rank-row{grid-template-columns:minmax(110px,.9fr) minmax(100px,1.2fr) 28px;gap:7px}.rank-toolbar input{flex-basis:100%}.rank-footer{align-items:flex-start;flex-direction:column}.rank-name{font-size:11px}}

/* Dark theme */
:root[data-theme='dark'] .rank-workspace{--rank-green:#34d399;--rank-red:#fb7185;--rank-edge:var(--app-border-muted);color:var(--app-text)}
:root[data-theme='dark'] .rank-category-tabs,
:root[data-theme='dark'] .rank-stat,
:root[data-theme='dark'] .rank-panel{background:var(--app-surface)}
:root[data-theme='dark'] .rank-category{color:var(--app-text-secondary)}
:root[data-theme='dark'] .rank-category.active{background:var(--app-primary-soft);color:var(--app-primary)}
:root[data-theme='dark'] .rank-category span{color:var(--app-text-faint)}
:root[data-theme='dark'] .rank-stat>span{color:var(--app-text-muted)}
:root[data-theme='dark'] .rank-stat strong{color:var(--app-text)}
:root[data-theme='dark'] .rank-stat strong small{color:var(--app-text-faint)}
:root[data-theme='dark'] .rank-stat p{color:var(--app-text-muted)}
:root[data-theme='dark'] .rank-head{border-bottom-color:var(--app-border-muted)}
:root[data-theme='dark'] .rank-head h2{color:var(--app-text)}
:root[data-theme='dark'] .rank-head p{color:var(--app-text-muted)}
:root[data-theme='dark'] .rank-snapshot{color:var(--app-text-secondary);border-color:var(--app-border-muted);background:var(--app-primary-soft)}
:root[data-theme='dark'] .rank-toolbar{border-bottom-color:var(--app-border-muted);background:var(--app-surface-muted)}
:root[data-theme='dark'] .rank-toolbar select,
:root[data-theme='dark'] .rank-toolbar input{color:var(--app-text-secondary);border-color:var(--app-border);background:var(--app-surface)}
:root[data-theme='dark'] .rank-toolbar label{color:var(--app-text-muted)}
:root[data-theme='dark'] .rank-view-toggle{border-color:var(--app-border);background:var(--app-surface)}
:root[data-theme='dark'] .rank-view-toggle button{color:var(--app-text-muted)}
:root[data-theme='dark'] .rank-view-toggle button.active{color:var(--app-primary);background:var(--app-primary-soft)}
:root[data-theme='dark'] .rank-axis{color:var(--app-text-faint);border-bottom-color:var(--app-border-muted)}
:root[data-theme='dark'] .rank-axis-values span:nth-child(3){color:var(--app-text-secondary)}
:root[data-theme='dark'] .rank-row{border-bottom-color:var(--app-border-muted)}
:root[data-theme='dark'] .rank-row:hover{background:var(--app-surface-hover)}
:root[data-theme='dark'] .rank-name{color:var(--app-text-secondary)}
:root[data-theme='dark'] .rank-track{background:linear-gradient(to right,transparent 24.8%,var(--app-border-muted) 24.8%,var(--app-border-muted) 25.2%,transparent 25.2%,transparent 74.8%,var(--app-border-muted) 74.8%,var(--app-border-muted) 75.2%,transparent 75.2%)}
:root[data-theme='dark'] .rank-track:before{background:var(--app-border-strong)}
:root[data-theme='dark'] .rank-bar.mid{background:var(--app-text-faint)}
:root[data-theme='dark'] .rank-value{color:var(--app-text-secondary)}
:root[data-theme='dark'] .rank-footer{border-top-color:var(--app-border-muted);color:var(--app-text-muted);background:var(--app-surface-muted)}
:root[data-theme='dark'] .rank-aside-body{color:var(--app-text-secondary)}
:root[data-theme='dark'] .rank-reference{border-bottom-color:var(--app-border-muted)}
:root[data-theme='dark'] .rank-reference strong{color:var(--app-primary)}
:root[data-theme='dark'] .rank-reference span{color:var(--app-text-muted)}
:root[data-theme='dark'] .rank-note{border-left-color:var(--app-primary);background:var(--app-primary-soft);color:var(--app-text-secondary)}
:root[data-theme='dark'] .rank-table th{background:var(--app-surface-muted);color:var(--app-text-muted)}
:root[data-theme='dark'] .rank-table td{border-bottom-color:var(--app-border-muted);color:var(--app-text-secondary)}
:root[data-theme='dark'] .rank-table tr:nth-child(even){background:var(--app-row-even)}
:root[data-theme='dark'] .rank-empty{color:var(--app-text-muted)}
:root[data-theme='dark'] .rank-page-note{color:var(--app-text-muted)}
</style>
