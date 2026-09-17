<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** One entry per line. Most indicators have a single line. */
    series: number[][]
    /** Used when there is one line; a stacked chart colours by position instead. */
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

const lines = computed(() => props.series.filter((line) => line.length >= 2))

/**
 * A stacked chart compares its lines against each other, so they must share one Y scale.
 * Scaling each line to its own range would make two very different series look identical.
 */
const bounds = computed(() => {
  const values = lines.value.flat()
  if (!values.length) return null

  return { min: Math.min(...values), max: Math.max(...values) }
})

const hasPoints = computed(() => lines.value.length > 0 && bounds.value !== null)

function lineStroke(index: number) {
  if (lines.value.length > 1) {
    return index === 0 ? 'var(--app-primary)' : 'var(--app-negative)'
  }

  if (props.tone === 'red') return 'var(--app-negative)'
  if (props.tone === 'blue') return 'var(--app-primary)'
  if (props.tone === 'black') return 'var(--chart-primary)'
  return 'var(--app-positive)'
}

function polyline(line: number[]) {
  const { min, max } = bounds.value ?? { min: 0, max: 1 }
  const range = max - min || 1

  return line
    .map((value, index) => {
      const x = (index / Math.max(1, line.length - 1)) * props.width
      const y = props.height - ((value - min) / range) * (props.height - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
</script>

<template>
  <svg v-if="hasPoints" data-testid="indicator-sparkline" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
    <polyline
      v-for="(line, index) in lines"
      :key="index"
      :points="polyline(line)"
      fill="none"
      :stroke="lineStroke(index)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
