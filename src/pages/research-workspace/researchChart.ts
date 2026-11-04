import { nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import Highcharts from 'highcharts'
import { useTheme } from '@/shared/theme/theme'

const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

export function researchColors() {
  return {
    primary: css('--app-primary', '#1672ed'),
    positive: css('--app-positive', '#57aa8c'),
    negative: css('--app-negative', '#d98498'),
    text: css('--app-text-muted', '#6b7280'),
    textStrong: css('--app-text', '#111111'),
    grid: css('--chart-grid', '#e5e7eb'),
    border: css('--app-border', '#d8dee8'),
    surface: css('--app-surface', '#fff'),
  }
}

export function chartBase(spacing: [number, number, number, number], extra: Highcharts.ChartOptions = {}): Pick<Highcharts.Options, 'chart' | 'accessibility' | 'title' | 'credits' | 'legend'> {
  return {
    chart: { backgroundColor: 'transparent', height: 390, spacing, animation: false, ...extra },
    accessibility: { enabled: false },
    title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false },
  }
}

// Moves data-label groups to the end of the SVG so the last-value pill covers
// overlapping right-side axis labels instead of hiding behind them.
export function liftDataLabels(this: Highcharts.Chart) {
  const svg = this.container?.querySelector('svg')
  this.container?.querySelectorAll('.highcharts-data-labels').forEach((group) => svg?.appendChild(group))
}

export function dualPaneXAxes(border: string, text: string): Highcharts.XAxisOptions[] {
  return [0, 1].map((index) => ({ type: 'datetime' as const, top: index ? '55%' : '0%', height: '39%', offset: 0, lineColor: border, tickColor: border, tickLength: 5, tickAmount: 3, labels: { style: { color: text, fontSize: '10px' }, format: '{value:%b %e}' }, crosshair: { color: text, dashStyle: 'ShortDash' as const, width: 1 } }))
}

export function paneLabels(text: string, extra: Highcharts.YAxisLabelsOptions = {}): Highcharts.YAxisLabelsOptions {
  return { x: 6, align: 'left', style: { color: text, fontSize: '10px' }, ...extra }
}

export function endLabel(format: string, color: string, textColor = '#fff'): Highcharts.DataLabelsOptions {
  return { enabled: true, crop: false, overflow: 'allow', format, align: 'left', x: 7, y: 4, padding: 4, borderRadius: 3, backgroundColor: color, style: { color: textColor, fontSize: '9px', fontWeight: '600', textOutline: 'none' } }
}

export function endMarker(color: string, surface: string) {
  return { enabled: true, radius: 3.3, fillColor: color, lineColor: surface, lineWidth: 1.8 }
}

export const sharedPlotOptions: Highcharts.PlotOptions = {
  series: { animation: false, marker: { states: { hover: { enabled: false } } }, states: { hover: { halo: { size: 0 } }, inactive: { opacity: 1 } } },
}

export function sharedTooltip(surface: string, border: string, textStrong: string, lines: (points: Highcharts.Point[]) => string[]): Highcharts.TooltipOptions {
  return {
    shared: true, useHTML: true, backgroundColor: surface, borderColor: border, borderRadius: 6, shadow: true,
    style: { color: textStrong, fontSize: '12px' },
    formatter(this: { x?: number; points?: Highcharts.Point[] }) {
      return `<b>${Highcharts.dateFormat('%b %e, %Y', Number(this.x))}</b><br/>${lines(this.points ?? []).join('<br/>')}`
    },
  }
}

export function useResearchChart(deps: () => unknown[], build: () => Highcharts.Options) {
  const root = ref<HTMLElement | null>(null)
  let instance: Highcharts.Chart | null = null
  let observer: ResizeObserver | null = null
  const { isDarkTheme } = useTheme()
  function render() {
    if (!root.value) return
    instance?.destroy()
    instance = Highcharts.chart(root.value, build())
  }
  watch(deps, () => nextTick(render), { deep: true })
  // Re-render on theme switches: CSS variables are captured once per render.
  watch(isDarkTheme, () => nextTick(render))
  onMounted(() => {
    render()
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => instance?.reflow())
      if (root.value) observer.observe(root.value)
    }
  })
  onBeforeUnmount(() => { observer?.disconnect(); instance?.destroy() })
  function mountRef(el: Element | ComponentPublicInstance | null) { root.value = el as HTMLElement | null }
  return { root, mountRef }
}
