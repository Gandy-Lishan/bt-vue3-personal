<script setup lang="ts">
import Highcharts from 'highcharts'
import type { ResearchPageData } from './research.types'
import { chartBase, dualPaneXAxes, endLabel, endMarker, paneLabels, researchColors, sharedPlotOptions, sharedTooltip, useResearchChart } from './researchChart'

const props = defineProps<{ chart: NonNullable<ResearchPageData['riskChart']>; period: number }>()
const { mountRef } = useResearchChart(() => [props.period, props.chart], () => {
  const { positive, negative, primary, text, textStrong, grid, border, surface } = researchColors()
  const dates = props.chart.dates.slice(-props.period)
  const prices = props.chart.price.slice(-props.period)
  const measures = props.chart.measure.slice(-props.period)
  const regimes = props.chart.regimes.slice(-props.period)
  const times = dates.map((date) => Date.parse(`${date}T12:00:00Z`))
  const bullet = (value: string) => `<span style="color:${primary}">●</span> ${value}`
  const segments: Highcharts.SeriesOptionsType[] = prices.slice(1).map((value, index) => ({ type: 'line', data: [[times[index], prices[index]], [times[index + 1], value]], xAxis: 0, yAxis: 0, color: regimes[index + 1] ? positive : negative, lineWidth: 2, marker: { enabled: false }, enableMouseTracking: false, showInLegend: false, animation: false }))
  const priceColor = regimes.at(-1) ? positive : negative
  const priceData = prices.map((value, index) => index === prices.length - 1 ? { x: times[index], y: value, marker: endMarker(priceColor, surface), dataLabels: endLabel('{y:,.0f}', priceColor) } : [times[index], value])
  const measureData = measures.map((value, index) => index === measures.length - 1 ? { x: times[index], y: value, marker: endMarker(primary, surface), dataLabels: endLabel('{y:.1f}%', primary) } : [times[index], value])
  return {
    ...chartBase([8, 10, 0, 4]),
    xAxis: dualPaneXAxes(border, text),
    yAxis: [
      { top: '0%', height: '39%', offset: 0, opposite: true, title: { text: undefined }, gridLineColor: grid, tickAmount: 3, labels: paneLabels(text, { formatter() { return Highcharts.numberFormat(Number(this.value), 0) } }) },
      { top: '55%', height: '39%', min: 0, max: 100, tickPositions: [0, 50, 100], offset: 0, opposite: true, title: { text: undefined }, gridLineColor: grid, labels: paneLabels(text, { format: '{value}%' }), plotBands: [{ from: 0, to: 35, color: 'rgba(217,132,152,.09)' }, { from: 67, to: 100, color: 'rgba(87,170,140,.09)' }], plotLines: [{ value: 35, color: negative, dashStyle: 'Dash', width: 1, label: { text: 'Risk-off <35%', align: 'right', x: -4, y: -5, style: { color: negative, fontSize: '10px', fontWeight: '400' } } }, { value: 67, color: positive, dashStyle: 'Dash', width: 1, label: { text: 'Risk-on >67%', align: 'right', x: -4, y: -5, style: { color: positive, fontSize: '10px', fontWeight: '400' } } }] },
    ],
    tooltip: sharedTooltip(surface, border, textStrong, (points) => {
      const price = points.find((point) => point.series.name === 'S&P 500 Index')?.y
      const risk = points.find((point) => point.series.name === 'Risk Measure')?.y
      return [
        bullet(`S&P 500 Index: <b>${Highcharts.numberFormat(Number(price), 1)}</b>`),
        bullet(`Risk Measure: <b>${Highcharts.numberFormat(Number(risk), 1)}%</b>`),
      ]
    }),
    plotOptions: sharedPlotOptions,
    series: [...segments, { type: 'line', name: 'S&P 500 Index', data: priceData, xAxis: 0, yAxis: 0, color: 'rgba(0,0,0,0.001)', lineWidth: 6, marker: { enabled: false }, dataLabels: { enabled: false }, zIndex: 3 }, { type: 'line', name: 'Risk Measure', data: measureData, xAxis: 1, yAxis: 1, color: primary, step: 'left', lineWidth: 2, marker: { enabled: false }, dataLabels: { enabled: false } }],
  }
})
</script>

<template><div :ref="mountRef" class="h-[390px] w-full min-w-0" data-testid="risk-highcharts" /></template>
