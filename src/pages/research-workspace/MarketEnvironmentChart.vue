<script setup lang="ts">
import Highcharts from 'highcharts'
import type { ResearchPageData } from './research.types'
import { chartBase, dualPaneXAxes, endLabel, endMarker, liftDataLabels, paneLabels, researchColors, sharedPlotOptions, sharedTooltip, useResearchChart } from './researchChart'

const props = defineProps<{ chart: NonNullable<ResearchPageData['environmentChart']>; period: number }>()
const { mountRef } = useResearchChart(() => [props.period, props.chart], () => {
  const { positive, primary, textStrong, text, grid, border, surface } = researchColors()
  const stockColor = textStrong
  const dates = props.chart.dates.slice(-props.period)
  const prices = props.chart.price.slice(-props.period)
  const scores = props.chart.score.slice(-props.period)
  const times = dates.map((date) => Date.parse(`${date}T12:00:00Z`))
  const priceData = prices.map((value, index) => index === prices.length - 1 ? { x: times[index], y: value, marker: endMarker(stockColor, surface), dataLabels: endLabel('{y:,.0f}', stockColor, surface) } : [times[index], value])
  const scoreData = scores.map((value, index) => index === scores.length - 1 ? { x: times[index], y: value, marker: endMarker(primary, surface), dataLabels: endLabel('{y:.0f}', primary) } : [times[index], value])
  return {
    ...chartBase([8, 5, 0, 4], { events: { render: liftDataLabels } }),
    xAxis: dualPaneXAxes(border, text),
    yAxis: [
      { top: '0%', height: '39%', offset: 0, opposite: true, title: { text: undefined }, gridLineColor: grid, tickAmount: 3, labels: paneLabels(text, { formatter() { return Highcharts.numberFormat(Number(this.value), 0) } }) },
      { top: '55%', height: '39%', min: 0, max: 8, tickPositions: [0, 2, 4, 6, 8], offset: 0, opposite: true, title: { text: undefined }, gridLineColor: grid, labels: paneLabels(text), plotBands: [{ from: 5, to: 8, color: 'rgba(87,170,140,.09)' }], plotLines: [{ value: 5, color: positive, dashStyle: 'Dash', width: 1, label: { text: 'Healthy ≥5', align: 'right', x: -4, y: -5, style: { color: positive, fontSize: '10px' } } }] },
    ],
    tooltip: sharedTooltip(surface, border, textStrong, (points) => {
      const price = points.find((point) => point.series.name === 'S&P 500 Index')?.y
      const score = points.find((point) => point.series.name === 'Healthy components')?.y
      return [
        `S&P 500 Index: <b>${Highcharts.numberFormat(Number(price), 0)}</b>`,
        `Healthy components: <b>${Highcharts.numberFormat(Number(score), 0)} / 8</b>`,
      ]
    }),
    plotOptions: sharedPlotOptions,
    series: [
      { type: 'line', name: 'S&P 500 Index', data: priceData, xAxis: 0, yAxis: 0, color: stockColor, lineWidth: 2, marker: { enabled: false }, dataLabels: { enabled: false } },
      { type: 'line', name: 'Healthy components', data: scoreData, xAxis: 1, yAxis: 1, color: primary, step: 'left', lineWidth: 2, marker: { enabled: false }, dataLabels: { enabled: false } },
    ],
  }
})
</script>

<template><div :ref="mountRef" class="h-[390px] w-full min-w-0" data-testid="environment-highcharts" /></template>
