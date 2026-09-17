<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    points: number[]
    tone?: 'green' | 'red' | 'blue' | 'black'
    height?: number
    width?: number
  }>(),
  {
    tone: 'green',
    height: 34,
    width: 128,
  },
)

const strokeClass = computed(() => {
  if (props.tone === 'red') return 'var(--app-negative)'
  if (props.tone === 'blue') return 'var(--app-primary)'
  if (props.tone === 'black') return 'var(--chart-primary)'
  return 'var(--app-positive)'
})

const hasPoints = computed(() => props.points.length >= 2)

const polyline = computed(() => {
  const values = props.points
  if (!hasPoints.value) return ''

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * props.width
      const y = props.height - ((value - min) / range) * (props.height - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})
</script>

<template>
  <svg v-if="hasPoints" data-testid="indicator-sparkline" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
    <defs>
      <linearGradient :id="`spark-fill-${tone}-${width}-${height}`" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" :stop-color="strokeClass" stop-opacity="0.24" />
        <stop offset="1" :stop-color="strokeClass" stop-opacity="0" />
      </linearGradient>
    </defs>
    <polyline :points="polyline" fill="none" :stroke="strokeClass" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
