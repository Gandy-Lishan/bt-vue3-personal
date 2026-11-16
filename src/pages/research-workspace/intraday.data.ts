import { businessDates, staticSeries } from './research.api'

export type IntradayItem = { id: string; name: string; group: 'index' | 'overview' | 'sp1500'; min: number; max: number; decimals: number; unit: string; description: string; zeroBaseline: boolean; anchor: number; values: number[]; change: number; updated: number }
type Spec = readonly [string, number, number, number, number, number, string, string, boolean?]
const legacy: Spec[] = [
  ['S&P 500',7522,7667,7350,7850,0,'pts','Index level'],['Nasdaq 100',28540,29412,28000,30000,0,'pts','Index level'],
  ['STEM.MR Model',41,46.7,0,100,1,'pts','Model reading · 0–100'],['STEM.MR Model - Nasdaq',54,58.5,0,100,1,'pts','Model reading · 0–100'],['STEM.MR Model - IWM',35,56.7,0,100,1,'pts','Model reading · 0–100'],
  ['Cumulative TICK',-800,620,-2200,2500,0,'ticks','Cumulative tick count',true],['Cumulative TICK - Nasdaq',-550,-350,-1800,1800,0,'ticks','Cumulative tick count',true],
  ['Price Oscillator',43,51.6,0,100,1,'pts','Oscillator reading · 0–100'],['Price Oscillator - Nasdaq',56,51.6,0,100,1,'pts','Oscillator reading · 0–100'],
  ['Up Issues Ratio',39,52,0,100,1,'%','Share of advancing issues'],['Up Issues Ratio - Nasdaq',33,64.8,0,100,1,'%','Share of advancing issues'],
  ['Up Volume Ratio',45,38.7,0,100,1,'%','Share of advancing volume'],['Up Volume Ratio - Nasdaq',39,65.5,0,100,1,'%','Share of advancing volume'],
  ['Arms Index',1.3,1.78,.3,2.8,2,'x','Volume / breadth ratio'],['Arms Index - Nasdaq',.7,.99,.3,2.1,2,'x','Volume / breadth ratio'],
  ['VIX Strength',67,47.4,0,100,1,'pts','Strength reading · 0–100'],['VXN Strength',62,42.5,0,100,1,'pts','Strength reading · 0–100'],['OEX Put/Call Ratio',.7,3,0,4,2,'x','Put / call ratio'],
]
const broad: Spec[] = [
  ['Stocks Above 50-Day Average',44.2,57.3,0,100,1,'%','S&P 1500 · stock participation'],['Stocks Above 200-Day Average',61.2,63.8,0,100,1,'%','S&P 1500 · stock participation'],
  ['Advancing Issues',43.5,56.2,0,100,1,'%','S&P 1500 · advancing stocks'],['Advancing Volume',47.8,59.6,0,100,1,'%','S&P 1500 · advancing volume'],
  ['Advance / Decline Ratio',.82,1.28,.3,2.8,2,'x','S&P 1500 · advancing / declining stocks'],['Net New Highs − Lows',-18,32,-160,180,0,'stocks','S&P 1500 · new highs minus new lows',true],
  ['5-Day Rate of Change',-.8,.72,-3,3,2,'%','S&P 1500 · index momentum',true],['Equal-Weight vs Cap-Weight Spread',-.21,.18,-1.5,1.5,2,'pp','S&P 1500 · return spread',true],
]
function makeItem(spec: Spec, index: number, group: IntradayItem['group'], seed: number): IntradayItem {
  const [name,start,end,min,max,decimals,unit,description,zeroBaseline = false] = spec
  const values = staticSeries({ seed, count: 140, start, end, min, max, volatility: (max - min) * (zeroBaseline ? .08 : .035) })
  return { id: `im-${group}-${index}`, name, group, min, max, decimals, unit, description, zeroBaseline, anchor: end, values, change: end - values[138], updated: 0 }
}
export const intradayDates = businessDates(10).flatMap((date) => Array.from({ length: 14 }, (_, index) => { const minutes = 570 + index * 30; return `${date} ${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}` }))
export function createIntradayItems() {
  const original = legacy.map((spec, index) => makeItem(spec, index, index < 2 ? 'index' : 'overview', 31 + index * 9))
  const indexes = original.slice(0, 2).concat(makeItem(['S&P 1500',1204.1,1249.3,1170,1290,1,'pts','Index level'], 2, 'index', 512))
  const overview = original.slice(2)
  const sp1500 = broad.map((spec, index) => makeItem(spec, index, 'sp1500', 701 + index * 17))
  return { indexes, overview, sp1500, all: [...indexes, ...overview, ...sp1500] }
}
