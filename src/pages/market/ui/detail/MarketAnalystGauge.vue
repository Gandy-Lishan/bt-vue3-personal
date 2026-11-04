<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import type { MarketAnalystConsensusItem } from '@/entities/market/model/market-detail.types'

const props = defineProps<{
  items: MarketAnalystConsensusItem[]
  latestRating: number | null
}>()

const CHART_SIZE = 280
const CHART_WIDTH = CHART_SIZE + 84
const RADIUS = CHART_SIZE / 2 - 20
const INNER_RADIUS = RADIUS - 10
const LABEL_RADIUS = CHART_SIZE / 2 - 5

const gaugeId = useId()

const gaugeItems = computed(() => {
  const order = ['Strong Sell', 'Sell', 'Hold', 'Buy', 'Strong Buy']
  return order
    .map((label) => props.items.find((item) => item.label === label))
    .filter((item): item is MarketAnalystConsensusItem => Boolean(item))
})

const segments = computed(() => {
  const angleSpan = 180 / Math.max(1, gaugeItems.value.length)
  let currentAngle = 180

  return gaugeItems.value.map((item, index) => {
    const startAngle = currentAngle
    const endAngle = currentAngle + angleSpan
    currentAngle = endAngle
    return {
      ...item,
      index,
      startAngle,
      endAngle,
      nextColor: gaugeItems.value[(index + 1) % gaugeItems.value.length]?.color ?? item.color,
    }
  })
})

const labels = computed(() => segments.value.map((segment) => {
  const center = CHART_SIZE / 2
  const midAngle = (segment.startAngle + segment.endAngle) / 2
  const radians = (midAngle * Math.PI) / 180
  const x = center + Math.cos(radians) * LABEL_RADIUS
  const baseY = center + Math.sin(radians) * LABEL_RADIUS

  if (segment.label === 'Strong Buy') {
    return { text: segment.label, x: x + 25, y: baseY + 18, secondLine: 'Buy', secondY: baseY + 32 }
  }
  if (segment.label === 'Strong Sell') {
    return { text: segment.label, x: x - 15, y: baseY + 18, secondLine: 'Sell', secondY: baseY + 32 }
  }
  return { text: segment.label, x, y: baseY, secondLine: '', secondY: 0 }
}))

const targetAngle = computed(() => (props.latestRating ? props.latestRating : 270))
const pointerAngle = ref(0)
let animationFrame = 0

function reduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function animatePointer() {
  cancelAnimationFrame(animationFrame)
  const endAngle = targetAngle.value

  if (reduceMotion()) {
    pointerAngle.value = endAngle
    return
  }

  const startAngle = 0
  const duration = 800
  let startTime: number | null = null

  const animate = (currentTime: number) => {
    if (startTime === null) startTime = currentTime
    const progress = Math.min((currentTime - startTime) / duration, 1)
    pointerAngle.value = startAngle + (endAngle - startAngle) * progress

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate)
    } else {
      pointerAngle.value = endAngle
    }
  }

  animationFrame = requestAnimationFrame(animate)
}

const pointer = computed(() => {
  const radians = (pointerAngle.value * Math.PI) / 180
  return {
    x: Math.cos(radians) * (CHART_SIZE / 2 - 60),
    y: Math.sin(radians) * (CHART_SIZE / 2 - 60),
  }
})

function arcPath(startAngle: number, endAngle: number) {
  const center = CHART_SIZE / 2
  const startRadians = (startAngle * Math.PI) / 180
  const endRadians = (endAngle * Math.PI) / 180
  const outerStartX = center + Math.cos(startRadians) * RADIUS
  const outerStartY = center + Math.sin(startRadians) * RADIUS
  const outerEndX = center + Math.cos(endRadians) * RADIUS
  const outerEndY = center + Math.sin(endRadians) * RADIUS
  const innerEndX = center + Math.cos(endRadians) * INNER_RADIUS
  const innerEndY = center + Math.sin(endRadians) * INNER_RADIUS
  const innerStartX = center + Math.cos(startRadians) * INNER_RADIUS
  const innerStartY = center + Math.sin(startRadians) * INNER_RADIUS
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${outerStartX} ${outerStartY}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${outerEndX} ${outerEndY}`,
    `L ${innerEndX} ${innerEndY}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}`,
    'Z',
  ].join(' ')
}

function gradientStart(segment: (typeof segments.value)[number]) {
  const center = CHART_SIZE / 2
  const radians = (segment.startAngle * Math.PI) / 180
  return {
    x: center + Math.cos(radians) * RADIUS,
    y: center + Math.sin(radians) * RADIUS,
  }
}

function gradientEnd(segment: (typeof segments.value)[number]) {
  const center = CHART_SIZE / 2
  const radians = (segment.endAngle * Math.PI) / 180
  return {
    x: center + Math.cos(radians) * RADIUS,
    y: center + Math.sin(radians) * RADIUS,
  }
}

onMounted(animatePointer)
watch(targetAngle, animatePointer)
onBeforeUnmount(() => cancelAnimationFrame(animationFrame))
</script>

<template>
  <svg
    :width="CHART_WIDTH"
    :height="CHART_SIZE / 2"
    :viewBox="`-38 0 ${CHART_WIDTH} ${CHART_SIZE / 2}`"
    class="max-w-full overflow-visible"
    role="img"
    :aria-label="`Analyst recommendation gauge, latest rating ${latestRating ?? 'unavailable'}`"
  >
    <defs>
      <linearGradient
        v-for="segment in segments"
        :id="`market-analyst-gauge-${gaugeId}-${segment.index}`"
        :key="segment.label"
        gradientUnits="userSpaceOnUse"
        :x1="gradientStart(segment).x"
        :y1="gradientStart(segment).y"
        :x2="gradientEnd(segment).x"
        :y2="gradientEnd(segment).y"
      >
        <stop offset="0%" :stop-color="segment.color" />
        <stop offset="100%" :stop-color="segment.nextColor" />
      </linearGradient>
    </defs>

    <path
      v-for="segment in segments"
      :key="segment.label"
      :d="arcPath(segment.startAngle, segment.endAngle)"
      :fill="`url(#market-analyst-gauge-${gaugeId}-${segment.index})`"
      class="cursor-pointer transition-opacity hover:opacity-80"
    />

    <g :transform="`translate(${CHART_SIZE / 2}, ${CHART_SIZE / 2})`">
      <line
        :x1="0"
        :y1="0"
        :x2="pointer.x"
        :y2="pointer.y"
        stroke="var(--app-text)"
        stroke-width="3"
        stroke-linecap="round"
      />
      <circle cx="0" cy="0" r="4" fill="var(--app-text)" />
    </g>

    <text
      v-for="label in labels"
      :key="label.text"
      :x="label.x"
      :y="label.y"
      text-anchor="middle"
      class="fill-[var(--app-text-muted)] text-xs font-semibold"
    >
      {{ label.text }}
      <tspan v-if="label.secondLine" :x="label.x" :y="label.secondY">{{ label.secondLine }}</tspan>
    </text>
  </svg>
</template>
