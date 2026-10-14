import type Highcharts from 'highcharts/highstock'

export const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface IndicatorChartTheme {
  dark: boolean
  surface: string
  surfaceMuted: string
  surfaceSoft: string
  text: string
  textSecondary: string
  textMuted: string
  grid: string
  border: string
  primary: string
  marketLine: string
  positive: string
  negative: string
  tooltipBg: string
  navigatorMask: string
  navigatorTrack: string
  scrollbarBar: string
  scrollbarButton: string
}

export function cssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export function isDarkTheme() {
  if (typeof document === 'undefined') return false
  return document.documentElement.dataset.theme === 'dark'
}

export function indicatorChartTheme(): IndicatorChartTheme {
  const dark = isDarkTheme()
  return {
    dark,
    surface: cssVar('--app-surface', '#ffffff'),
    surfaceMuted: cssVar('--app-surface-muted', '#f6faff'),
    surfaceSoft: cssVar('--app-surface-soft', '#f8fbff'),
    text: cssVar('--app-text', '#071b4f'),
    textSecondary: cssVar('--app-text-secondary', '#173267'),
    textMuted: cssVar('--app-text-muted', '#6f7fa8'),
    grid: cssVar('--chart-grid', '#dbe5f2'),
    border: cssVar('--app-border', '#d5e3f7'),
    primary: cssVar('--app-primary', '#006cff'),
    marketLine: cssVar('--chart-primary', '#111827'),
    positive: cssVar('--app-positive', '#047857'),
    negative: cssVar('--app-negative', '#be123c'),
    tooltipBg: cssVar('--chart-tooltip-bg', '#ffffff'),
    navigatorMask: dark ? 'rgba(97, 180, 255, 0.12)' : 'rgba(22, 119, 255, 0.06)',
    navigatorTrack: dark ? 'rgba(15, 27, 43, 0.38)' : 'rgba(255, 255, 255, 0.18)',
    scrollbarBar: dark ? 'rgba(97, 180, 255, 0.14)' : 'rgba(22, 119, 255, 0.08)',
    scrollbarButton: dark ? 'rgba(20, 35, 55, 0.72)' : 'rgba(255, 255, 255, 0.38)',
  }
}

export function baseHighchartsChartOptions(theme: IndicatorChartTheme): Highcharts.ChartOptions {
  return {
    animation: false,
    backgroundColor: theme.surface,
    plotBackgroundColor: theme.surface,
    alignTicks: false,
    style: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    },
  }
}

export function axisLabelStyle(theme: IndicatorChartTheme, fontSize = '10px'): Highcharts.CSSObject {
  return {
    color: theme.textSecondary,
    fontSize,
  }
}

export function axisTitleStyle(theme: IndicatorChartTheme, fontSize = '10px'): Highcharts.CSSObject {
  return {
    color: theme.text,
    fontSize
  }
}

export function chartUiScale() {
  const value = Number(cssVar('--chart-ui-scale', '1'))
  return Number.isFinite(value) && value > 0 ? value : 1
}

export function chartSize(value: number) {
  return Number((value * chartUiScale()).toFixed(2))
}

export function chartFontSize(value: number) {
  return `${chartSize(value)}px`
}

export function highchartsCrosshairOptions(): Highcharts.AxisCrosshairOptions {
  return {
    width: 1,
    color: cssVar('--app-text-muted', '#7383a7'),
    dashStyle: 'ShortDash',
    snap: false,
    zIndex: 4,
  }
}

export function disabledSeriesStates(): Highcharts.SeriesStatesOptionsObject {
  return {
    hover: {
      enabled: false,
    },
    inactive: {
      enabled: false,
    },
  }
}

/**
 * The overview strip under every stock chart. Shared so the navigator reads the
 * same wherever it appears, and labelled by year only — at overview scale the
 * month is noise, and the slider is too short to fit it.
 */
export function chartNavigatorOptions(
  theme: IndicatorChartTheme,
  data: Array<[number, number]>,
): Highcharts.NavigatorOptions {
  return {
    enabled: true,
    height: chartSize(40),
    margin: chartSize(20),
    maskFill: theme.navigatorMask,
    outlineColor: theme.border,
    series: {
      data,
      color: theme.primary,
      lineColor: theme.primary,
      lineWidth: 1,
      opacity: 0.9,
      type: 'line',
    },
    xAxis: {
      gridLineColor: theme.grid,
      labels: {
        format: '{value:%Y}',
        style: { color: theme.textSecondary, fontSize: chartFontSize(9) },
      },
    },
    handles: {
      backgroundColor: theme.scrollbarButton,
      borderColor: theme.border,
    },
  }
}

export function chartScrollbarOptions(theme: IndicatorChartTheme): Highcharts.ScrollbarOptions {
  return {
    enabled: true,
    height: chartSize(8),
    barBackgroundColor: theme.scrollbarBar,
    barBorderColor: theme.dark ? 'rgba(97, 180, 255, 0.28)' : 'rgba(143, 182, 242, 0.35)',
    buttonBackgroundColor: theme.scrollbarButton,
    buttonBorderColor: theme.dark ? 'rgba(97, 180, 255, 0.28)' : 'rgba(143, 182, 242, 0.45)',
    rifleColor: theme.dark ? 'rgba(216, 232, 255, 0.48)' : 'rgba(23, 50, 103, 0.35)',
    trackBackgroundColor: theme.navigatorTrack,
    trackBorderColor: theme.border,
  }
}
