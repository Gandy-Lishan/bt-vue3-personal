<script setup lang="ts">
import { computed, ref } from 'vue'

type Asset = { name: string; group: string; endpoint: number; index: number; history: number[] }
const universe: Array<[string,string,number]> = [
  ['AMJ','Other',89],['PDBC','Major ETFs',83],['TLT','Major ETFs',78],['BND','Major ETFs',72],['2-Year','Other',91],['5-Year','Other',85],['LQD','Major ETFs',66],['XLE','Major ETFs',74],['XOP','Major ETFs',69],['OIH','Major ETFs',58],['BIL','Major ETFs',46],['XLRE','Major ETFs',55],['Gold','Commodities',42],['Nat Gas','Commodities',18],['Crude','Commodities',51],['Copper','Commodities',65],['Heat Oil','Commodities',59],['Coffee','Commodities',38],['Cotton','Commodities',44],['Sugar','Commodities',49],['Soybeans','Commodities',28],['Wheat','Commodities',35],['Platinum','Commodities',48],['GLD','Major ETFs',24],['GDX','Major ETFs',31],['UNG','Major ETFs',22],['IYZ','Major ETFs',44],['SPY','Major ETFs',54],['QQQ','Major ETFs',61],['IWM','Major ETFs',45],['XLK','Major ETFs',68],['VGT','Major ETFs',79],['HYG','Major ETFs',36],['EWA','Country ETFs',57],['EWU','Country ETFs',53],['EWH','Country ETFs',39],['EWG','Country ETFs',63],['EWC','Country ETFs',52],['EWJ','Country ETFs',47],['EWL','Country ETFs',33],['NORW','Country ETFs',75],['Finland','Other',41],['Denmark','Other',62],['Bitcoin','Other',29],['Bond','Other',26],
]
const round = (value: number) => Math.round(value * 10) / 10
function makeHistory(endpoint: number, index: number) {
  const values: number[] = []
  let value = 29 + index * 11 % 46
  for (let i = 0; i < 400; i++) {
    const target = value + (endpoint - value) * (i / 399)
    const wave = Math.sin(i * .19 + index * 2.3) * 7 + Math.sin(i * .051 + index) * 8 + Math.sin(i * .67 + index * .8) * 2
    values.push(round(Math.max(2, Math.min(98, target + wave))))
  }
  values[399] = round(endpoint + index % 7 * .13)
  return values
}
const assets: Asset[] = universe.map(([name,group,endpoint],index) => ({name,group,endpoint,index,history:makeHistory(endpoint,index)}))
const groups = ['All assets','Commodities','Country ETFs','Major ETFs','Other']
const windows = [0,3,5,10,20,50,100,200]
const group = ref('All assets')
const query = ref('')
const windowSize = ref(0)
const sort = ref('high')
const selectedName = ref<string | null>('IYZ')
const expanded = ref(false)
function smoothed(asset: Asset) {
  const period = windowSize.value || 1
  const result: number[] = []
  let sum = 0
  asset.history.forEach((value,index) => { sum += Math.round(value * 10); if (index >= period) sum -= Math.round(asset.history[index-period]! * 10); if (index >= period-1) result.push(round(sum / period / 10)) })
  return result
}
type Reading = { asset: Asset; value: number; change: number; recent: number[] }
function read(asset: Asset): Reading { const values = smoothed(asset); const value = values.at(-1)!; return {asset,value,change:round(value-values.at(-6)!),recent:values.slice(-63)} }
const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = assets.filter(asset => (group.value === 'All assets' || asset.group === group.value) && (!q || asset.name.toLowerCase().includes(q))).map(read)
  list.sort((a,b) => sort.value === 'name' ? a.asset.name.localeCompare(b.asset.name) : sort.value === 'low' ? a.value-b.value || a.asset.name.localeCompare(b.asset.name) : sort.value === 'change' ? b.change-a.change || a.asset.name.localeCompare(b.asset.name) : b.value-a.value || a.asset.name.localeCompare(b.asset.name))
  return list
})
const selected = computed(() => visible.value.find(row => row.asset.name === selectedName.value) ?? visible.value[0])
const bins = computed(() => ({pess:visible.value.filter(row => row.value < 30).length,opt:visible.value.filter(row => row.value > 70).length}))
const status = (value: number) => value < 30 ? 'Pessimism' : value > 70 ? 'Optimism' : 'Neutral'
// Tile colors are theme-aware: the actual values live in CSS (see .hm-page vars).
function palette(value: number): [string,string] {
  const bucket = value <= 15 ? 1 : value < 30 ? 2 : value < 45 ? 3 : value <= 55 ? 4 : value <= 70 ? 5 : value <= 85 ? 6 : 7
  return [`var(--hm-${bucket}-bg)`, `var(--hm-${bucket}-ink)`]
}
const delta = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`
const arrow = (value: number) => value > 0 ? '↗' : value < 0 ? '↘' : '—'
function reset() { group.value = 'All assets'; query.value = '' }
function linePath(values: number[], width=260, height=172) { return values.map((value,index) => `${index ? 'L':'M'} ${(index/(values.length-1)*width).toFixed(1)} ${((100-value)/100*height).toFixed(1)}`).join(' ') }
</script>

<template>
  <div class="hm-page">
    <section class="hm-panel hm-controls">
      <div class="hm-control-top"><div class="hm-group-tabs"><button v-for="item in groups" :key="item" :class="{active:group === item}" :aria-pressed="group === item" @click="group = item">{{ item }} <span>{{ item === 'All assets' ? assets.length : assets.filter(asset => asset.group === item).length }}</span></button></div><input v-model="query" type="search" placeholder="Find an asset…" aria-label="Search heatmap assets"></div>
      <div class="hm-control-bottom"><div class="hm-ma-control"><span>Moving average (sessions)</span><div class="hm-window-buttons"><button v-for="period in windows" :key="period" :class="{active:windowSize === period}" :aria-pressed="windowSize === period" @click="windowSize = period">{{ period || 'None' }}</button></div></div><label class="hm-sort-wrap">Order <select v-model="sort" aria-label="Sort heatmap"><option value="high">Optix: high to low</option><option value="low">Optix: low to high</option><option value="name">Name: A–Z</option><option value="change">5-session change (pts)</option></select></label></div>
    </section>
    <div class="hm-layout"><section class="hm-panel hm-map"><div class="hm-summary"><div><strong>{{ visible.length }}</strong> <span>of 45 demo assets</span></div><div class="hm-bins"><span><i class="pess"></i><b>{{ bins.pess }}</b> Pessimism</span><span><i class="neutral"></i><b>{{ visible.length-bins.pess-bins.opt }}</b> Neutral</span><span><i class="opt"></i><b>{{ bins.opt }}</b> Optimism</span></div></div>
      <div class="hm-grid"><button v-for="row in visible" :key="row.asset.name" class="hm-tile" :class="{selected:selected?.asset.name === row.asset.name}" :style="{'--tile-bg':palette(row.value)[0],'--tile-ink':palette(row.value)[1]}" :aria-pressed="selected?.asset.name === row.asset.name" @click="selectedName = row.asset.name"><span>{{ row.asset.name }}</span><strong>{{ row.value.toFixed(1) }}</strong><small>{{ arrow(row.change) }} {{ delta(row.change) }}</small></button><div v-if="!visible.length" class="hm-empty"><strong>No matching assets</strong><span>Try another name or asset group.</span><button @click="reset">Reset filters</button></div></div>
      <div class="hm-guide"><h3><i>i</i> How to read this heatmap</h3><div class="hm-guide-main"><div><b>Color = Optix sentiment level · 0–100</b><div class="hm-legend"><i v-for="value in [7,23,38,50,62,77,93]" :key="value" :style="{background:palette(value)[0]}"></i></div><div class="hm-axis"><span>0</span><span>30</span><span>50</span><span>70</span><span>100</span></div><div class="hm-labels"><span>Pessimism</span><span>Neutral</span><span>Optimism</span></div></div><div class="hm-guide-change"><b>Change below each value</b><p>Change is in <strong>Optix points</strong> versus <strong>5 sessions ago</strong>, using the selected moving average.</p></div></div><div class="hm-guide-foot"><span class="hm-demo">Demo data</span> 30 and 70 are illustrative reference levels.</div></div>
    </section><aside v-if="selected" class="hm-panel hm-detail"><div class="hm-detail-top"><span class="hm-eyebrow">SELECTED ASSET</span><div class="hm-name"><h2>{{ selected.asset.name }}</h2><span :class="status(selected.value).toLowerCase()">{{ status(selected.value) }}</span></div><p>{{ selected.asset.group }} · {{ windowSize ? `${windowSize}-session average` : 'Unsmoothed' }}</p></div><div class="hm-reading"><span>OPTIMISM INDEX</span><div><strong>{{ selected.value.toFixed(1) }}</strong> / 100</div><p>{{ arrow(selected.change) }} {{ delta(selected.change) }} pts <small>vs 5 sessions ago</small></p></div><div class="hm-range"><div class="hm-range-bar"><i :style="{left:`${selected.value}%`}"></i></div><div class="hm-labels"><span>Pessimism</span><span>Neutral</span><span>Optimism</span></div></div><div class="hm-history-title"><h3>Optix history</h3><span>63 sessions</span><button aria-label="Expand history" @click="expanded = true">↗</button></div><div class="hm-chart"><svg viewBox="0 0 260 172" preserveAspectRatio="none" role="img" :aria-label="`${selected.asset.name} Optix history`"><rect x="0" y="0" width="260" height="51.6" class="hm-zone-opt"/><rect x="0" y="120.4" width="260" height="51.6" class="hm-zone-pess"/><line v-for="level in [30,70]" :key="level" x1="0" x2="260" :y1="(100-level)/100*172" :y2="(100-level)/100*172" class="hm-grid-line" stroke-dasharray="3 3"/><path :d="linePath(selected.recent)" fill="none" class="hm-line" stroke-width="2"/></svg></div><div class="hm-range-stats"><div><span>63-session low</span><b>{{ Math.min(...selected.recent).toFixed(1) }}</b></div><div><span>63-session high</span><b>{{ Math.max(...selected.recent).toFixed(1) }}</b></div></div><div class="hm-detail-foot"><span class="hm-demo">Demo data</span><span>27 Oct 2026 · illustrative series</span></div></aside><aside v-else class="hm-panel hm-inspector-empty">The detail panel follows the assets visible in your current filters.</aside></div>
    <div v-if="expanded && selected" class="hm-modal" role="dialog" aria-modal="true" aria-label="Expanded Optix history" @click.self="expanded = false"><div><button class="hm-close" @click="expanded = false">Close ×</button><h2>{{ selected.asset.name }} Optix history</h2><svg viewBox="0 0 260 172" preserveAspectRatio="none" role="img"><rect x="0" y="0" width="260" height="51.6" class="hm-zone-opt"/><rect x="0" y="120.4" width="260" height="51.6" class="hm-zone-pess"/><path :d="linePath(selected.recent)" fill="none" class="hm-line" stroke-width="1.5"/></svg></div></div>
  </div>
</template>

<style scoped>
.hm-page{--hm-1-bg:#27866f;--hm-1-ink:#fff;--hm-2-bg:#a7dcca;--hm-2-ink:#164d42;--hm-3-bg:#e1f0e8;--hm-3-ink:#254b47;--hm-4-bg:#f1f4f9;--hm-4-ink:#2a4569;--hm-5-bg:#f7e6e8;--hm-5-ink:#764659;--hm-6-bg:#e5a6b2;--hm-6-ink:#663447;--hm-7-bg:#c96b83;--hm-7-ink:#fff;color:#16365f}
.hm-zone-opt{fill:#fcf0f2}
.hm-zone-pess{fill:#eff8f4}
.hm-grid-line{stroke:#b7c8d9}
.hm-line{stroke:#1672ed}.hm-panel{background:#fff;border:1px solid #dce7f5;border-radius:8px}.hm-controls{margin-bottom:15px}.hm-control-top,.hm-control-bottom{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 15px;flex-wrap:wrap}.hm-control-top{border-bottom:1px solid #e9eff7}.hm-control-bottom{background:#fbfdff}.hm-group-tabs,.hm-window-buttons{display:flex;flex-wrap:wrap;gap:4px}.hm-group-tabs button,.hm-window-buttons button{border:1px solid transparent;border-radius:5px;background:transparent;color:#6981a0;padding:8px 10px;font-size:11px;font-weight:600;cursor:pointer}.hm-group-tabs button span{font-size:9px;color:#8ba1bd}.hm-group-tabs button.active,.hm-window-buttons button.active{background:#edf5ff;border-color:#d7e6fc;color:#0868ed}.hm-control-top input,.hm-sort-wrap select{border:1px solid #dae6f5;border-radius:5px;background:#fff;color:#2a4b75;padding:8px 10px;font-size:11px}.hm-control-top input{margin-left:auto;min-width:165px;width:210px}.hm-ma-control,.hm-sort-wrap{display:flex;align-items:center;gap:10px;color:#7690af;font-size:10px;font-weight:600}.hm-window-buttons button{background:#fff;border-color:#e0e9f5;padding:5px 8px;font-size:10px;font-weight:400}.hm-layout{display:grid;grid-template-columns:minmax(0,1fr) 284px;gap:16px;align-items:start}.hm-map{overflow:hidden}.hm-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 17px 15px;border-bottom:1px solid #e7eef7}.hm-summary strong{font-size:22px;color:#173c69}.hm-summary span{font-size:10px;color:#8196b0}.hm-bins{display:flex;gap:13px;align-items:center;flex-wrap:wrap}.hm-bins span{display:flex;align-items:center;gap:4px}.hm-bins b{font-size:11px;color:#476a93}.hm-bins i{width:6px;height:6px;border-radius:2px}.hm-bins .pess{background:#69b79c}.hm-bins .neutral{background:#d9e1ed}.hm-bins .opt{background:#d790a3}.hm-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;padding:15px}.hm-tile{position:relative;display:flex;min-width:0;height:78px;flex-direction:column;justify-content:center;text-align:left;border:1px solid #00000007;border-radius:5px;background:var(--tile-bg);color:var(--tile-ink);padding:9px 10px;cursor:pointer}.hm-tile:hover{box-shadow:inset 0 0 0 2px #5b9ff3}.hm-tile.selected{outline:2px solid #0873f5;outline-offset:1px}.hm-tile.selected:after{content:'';position:absolute;top:5px;right:5px;width:5px;height:5px;border-radius:50%;background:#0873f5}.hm-tile span{font-size:10px;font-weight:650;white-space:nowrap}.hm-tile strong{font-size:22px;line-height:1.1;margin:5px 0 3px;font-variant-numeric:tabular-nums}.hm-tile small{font-size:9px;opacity:.83}.hm-empty{grid-column:1/-1;min-height:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#8095af;font-size:12px}.hm-empty strong{font-size:16px}.hm-empty button{padding:7px 12px;background:#eef5ff;color:#176bcb;border:1px solid #d7e6fc;border-radius:4px;cursor:pointer}.hm-guide{padding:18px 20px 0;background:#f4f8ff;border-top:1px solid #cbdcf2;border-left:3px solid #3684ed}.hm-guide h3{font-size:14px;margin:0 0 16px}.hm-guide h3 i{display:inline-flex;align-items:center;justify-content:center;width:19px;height:19px;border-radius:50%;background:#e2edff;color:#176bcb;font:12px Georgia}.hm-guide-main{display:grid;grid-template-columns:1.15fr 1fr;gap:26px}.hm-guide-main b{font-size:12px;color:#24496f}.hm-legend{display:flex;height:10px;gap:2px;margin-top:10px}.hm-legend i{flex:1}.hm-axis,.hm-labels{display:flex;justify-content:space-between;color:#597394;font-size:10px;margin-top:5px}.hm-guide-change{border-left:1px solid #d3e0f2;padding-left:24px}.hm-guide-change p{font-size:12px;line-height:1.75;color:#4b6687}.hm-guide-change p strong{color:#254d7d}.hm-guide-foot{border-top:1px solid #d8e4f4;margin-top:16px;padding:11px 0 12px;color:#536e8c;font-size:11px}.hm-demo{display:inline-block;border:1px solid #c1d6f1;background:#e8f0fc;color:#305e94;border-radius:3px;padding:2px 5px;font-size:10px;margin-right:7px}.hm-detail{overflow:hidden}.hm-detail-top{padding:17px 17px 0}.hm-eyebrow{font-size:10px;color:#7e99b9;letter-spacing:1px}.hm-name{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0 5px}.hm-name h2{font-size:22px;margin:0}.hm-name span{font-size:9px;border:1px solid #e0e8f2;border-radius:4px;padding:4px 6px;color:#7a8fa9;background:#f4f7fb}.hm-name span.pessimism{background:#eef8f3;color:#25856b}.hm-name span.optimism{background:#fff0f3;color:#bd5875}.hm-detail-top p{font-size:10px;color:#91a2b8;margin:0}.hm-reading{padding:22px 17px 13px}.hm-reading>span{font-size:9px;letter-spacing:1px;color:#8da1b9}.hm-reading>div{font-size:12px;color:#9caec3}.hm-reading strong{font-size:42px;color:#16416f}.hm-reading p{font-size:11px;color:#4f76a6}.hm-reading small{font-size:9px;color:#8da1ba}.hm-range{padding:0 17px 19px}.hm-range-bar{height:8px;border-radius:5px;position:relative;background:linear-gradient(to right,#69b79c 0 30%,#d9e1ed 30% 70%,#d790a3 70%)}.hm-range-bar i{position:absolute;top:-3px;width:4px;height:14px;background:#173a65;border:2px solid #fff;border-radius:3px}.hm-history-title{display:flex;align-items:center;gap:10px;padding:14px 17px 0;border-top:1px solid #e7eef8}.hm-history-title h3{font-size:11px;margin:0}.hm-history-title span{font-size:9px;color:#92a4ba;margin-left:auto}.hm-history-title button{border:1px solid #e0e9f5;background:#f9fbff;color:#6b8ab0;border-radius:4px;cursor:pointer}.hm-chart{padding:5px 8px 0}.hm-chart svg{width:100%;height:188px}.hm-range-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:9px 17px 15px}.hm-range-stats div{display:flex;flex-direction:column;gap:5px}.hm-range-stats span{font-size:9px;color:#90a4bc}.hm-range-stats b{font-size:13px;color:#456b98}.hm-detail-foot{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px 15px;border-top:1px solid #e8eff8;background:#fbfdff;font-size:8px;color:#90a5bf}.hm-inspector-empty{padding:20px;font-size:11px;color:#8499b3}.hm-modal{position:fixed;inset:0;z-index:1000;background:#0c2545aa;display:grid;place-items:center;padding:24px}.hm-modal>div{width:min(900px,100%);background:#fff;border-radius:8px;padding:20px}.hm-modal svg{width:100%;height:400px}.hm-close{float:right;border:0;background:#eef5ff;padding:8px 12px;cursor:pointer}@media(max-width:1250px){.hm-layout{grid-template-columns:minmax(0,1fr) 258px}.hm-grid{grid-template-columns:repeat(6,minmax(0,1fr))}}@media(max-width:1050px){.hm-layout{grid-template-columns:1fr}.hm-grid{grid-template-columns:repeat(8,minmax(0,1fr))}}@media(max-width:700px){.hm-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.hm-guide-main{grid-template-columns:1fr}.hm-guide-change{border-left:0;border-top:1px solid #d3e0f2;padding:13px 0 0}.hm-control-top input{width:100%;margin-left:0}}@media(max-width:440px){.hm-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}

/* Dark theme */
:root[data-theme='dark'] .hm-page{--hm-1-bg:#0f7a56;--hm-1-ink:#d5f6e7;--hm-2-bg:rgb(52 211 153 / .30);--hm-2-ink:#a7f3d0;--hm-3-bg:rgb(52 211 153 / .13);--hm-3-ink:#cdeedd;--hm-4-bg:rgb(148 180 214 / .13);--hm-4-ink:#d8e8ff;--hm-5-bg:rgb(251 113 133 / .13);--hm-5-ink:#f4d6dc;--hm-6-bg:rgb(251 113 133 / .30);--hm-6-ink:#f9c2cb;--hm-7-bg:#9e4a5e;--hm-7-ink:#ffe4e9;color:var(--app-text)}
:root[data-theme='dark'] .hm-zone-opt{fill:rgb(251 113 133 / .07)}
:root[data-theme='dark'] .hm-zone-pess{fill:rgb(52 211 153 / .07)}
:root[data-theme='dark'] .hm-grid-line{stroke:var(--app-border-strong)}
:root[data-theme='dark'] .hm-line{stroke:var(--app-primary)}
:root[data-theme='dark'] .hm-panel{border-color:var(--app-border-muted);background:var(--app-surface)}
:root[data-theme='dark'] .hm-control-top{border-bottom-color:var(--app-border-muted)}
:root[data-theme='dark'] .hm-control-bottom{background:var(--app-surface-muted)}
:root[data-theme='dark'] .hm-group-tabs button,
:root[data-theme='dark'] .hm-window-buttons button{color:var(--app-text-secondary)}
:root[data-theme='dark'] .hm-group-tabs button span{color:var(--app-text-faint)}
:root[data-theme='dark'] .hm-group-tabs button.active,
:root[data-theme='dark'] .hm-window-buttons button.active{background:var(--app-primary-soft);border-color:var(--app-border);color:var(--app-primary)}
:root[data-theme='dark'] .hm-control-top input,
:root[data-theme='dark'] .hm-sort-wrap select{border-color:var(--app-border);background:var(--app-surface);color:var(--app-text-secondary)}
:root[data-theme='dark'] .hm-ma-control,
:root[data-theme='dark'] .hm-sort-wrap{color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-window-buttons button{background:var(--app-surface);border-color:var(--app-border-muted)}
:root[data-theme='dark'] .hm-summary{border-bottom-color:var(--app-border-muted)}
:root[data-theme='dark'] .hm-summary strong{color:var(--app-text)}
:root[data-theme='dark'] .hm-summary span{color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-bins b{color:var(--app-text-secondary)}
:root[data-theme='dark'] .hm-bins .pess{background:#34d399}
:root[data-theme='dark'] .hm-bins .neutral{background:var(--app-border-strong)}
:root[data-theme='dark'] .hm-bins .opt{background:#fb7185}
:root[data-theme='dark'] .hm-tile:hover{box-shadow:inset 0 0 0 2px var(--app-primary)}
:root[data-theme='dark'] .hm-tile.selected{outline-color:var(--app-primary)}
:root[data-theme='dark'] .hm-tile.selected:after{background:var(--app-primary)}
:root[data-theme='dark'] .hm-empty{color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-empty button{background:var(--app-primary-soft);border-color:var(--app-border);color:var(--app-primary)}
:root[data-theme='dark'] .hm-guide{background:var(--app-primary-soft);border-top-color:var(--app-border);border-left-color:var(--app-primary)}
:root[data-theme='dark'] .hm-guide h3 i{background:var(--app-primary-soft);color:var(--app-primary)}
:root[data-theme='dark'] .hm-guide-main b{color:var(--app-text-secondary)}
:root[data-theme='dark'] .hm-axis,
:root[data-theme='dark'] .hm-labels{color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-guide-change{border-left-color:var(--app-border-muted)}
:root[data-theme='dark'] .hm-guide-change p{color:var(--app-text-secondary)}
:root[data-theme='dark'] .hm-guide-change p strong{color:var(--app-text)}
:root[data-theme='dark'] .hm-guide-foot{border-top-color:var(--app-border-muted);color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-demo{border-color:var(--app-border);background:var(--app-primary-soft);color:var(--app-primary)}
:root[data-theme='dark'] .hm-eyebrow{color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-name span{border-color:var(--app-border-muted);background:var(--app-surface-muted);color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-name span.pessimism{background:rgb(52 211 153 / .12);color:#34d399}
:root[data-theme='dark'] .hm-name span.optimism{background:rgb(251 113 133 / .12);color:#fb7185}
:root[data-theme='dark'] .hm-detail-top p{color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-reading>span{color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-reading>div{color:var(--app-text-faint)}
:root[data-theme='dark'] .hm-reading strong{color:var(--app-text)}
:root[data-theme='dark'] .hm-reading p{color:var(--app-text-secondary)}
:root[data-theme='dark'] .hm-reading small{color:var(--app-text-faint)}
:root[data-theme='dark'] .hm-range-bar{background:linear-gradient(to right,rgb(52 211 153 / .75) 0 30%,rgb(148 180 214 / .35) 30% 70%,rgb(251 113 133 / .75) 70%)}
:root[data-theme='dark'] .hm-range-bar i{background:var(--app-text);border-color:var(--app-surface)}
:root[data-theme='dark'] .hm-history-title{border-top-color:var(--app-border-muted)}
:root[data-theme='dark'] .hm-history-title span{color:var(--app-text-faint)}
:root[data-theme='dark'] .hm-history-title button{border-color:var(--app-border-muted);background:var(--app-surface-muted);color:var(--app-text-secondary)}
:root[data-theme='dark'] .hm-range-stats span{color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-range-stats b{color:var(--app-text-secondary)}
:root[data-theme='dark'] .hm-detail-foot{border-top-color:var(--app-border-muted);background:var(--app-surface-muted);color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-inspector-empty{color:var(--app-text-muted)}
:root[data-theme='dark'] .hm-modal{background:var(--app-overlay)}
:root[data-theme='dark'] .hm-modal>div{background:var(--app-surface)}
:root[data-theme='dark'] .hm-close{background:var(--app-primary-soft);color:var(--app-primary)}
@media(max-width:700px){:root[data-theme='dark'] .hm-guide-change{border-top-color:var(--app-border-muted)}}
</style>
