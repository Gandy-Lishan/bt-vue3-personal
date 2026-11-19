<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OptixPricePoint } from './optix-heatmap.api'

const props = withDefaults(defineProps<{ points: OptixPricePoint[]; name: string; expanded?: boolean }>(), { expanded: false })
const hovered = ref<number | null>(null)
const values = computed(() => props.points.map(point => point.close))
// The line stops short of the right edge so the last point stays hoverable.
const plotWidth = 236
const xAt = (index: number) => (index / Math.max(values.value.length - 1, 1) * plotWidth)
const path = computed(() => values.value.map((value, index) => `${index ? 'L' : 'M'} ${xAt(index).toFixed(1)} ${((100 - value) / 100 * 172).toFixed(1)}`).join(' '))
const last = computed(() => props.points.at(-1))
const lastX = computed(() => xAt(values.value.length - 1))
const lastY = computed(() => last.value ? (100 - last.value.close) / 100 * 172 : 0)
const active = computed(() => hovered.value === null ? null : props.points[hovered.value] ?? null)
const activeX = computed(() => hovered.value === null ? 0 : xAt(hovered.value))
const activeY = computed(() => active.value ? (100 - active.value.close) / 100 * 172 : 0)

function move(event: MouseEvent) {
  if (props.points.length < 2) return
  const bounds = event.currentTarget instanceof SVGElement ? event.currentTarget.getBoundingClientRect() : null
  if (!bounds?.width) return
  hovered.value = Math.max(0, Math.min(props.points.length - 1, Math.round((event.clientX - bounds.left) / bounds.width * (props.points.length - 1))))
}
</script>

<template>
  <div class="optix-history-chart" :class="{ expanded }">
    <svg viewBox="0 0 260 172" preserveAspectRatio="none" role="img" :aria-label="`${name} Optix history`" @mousemove="move" @mouseleave="hovered = null">
      <rect x="0" y="0" width="260" height="51.6" class="hm-zone-opt" />
      <rect x="0" y="120.4" width="260" height="51.6" class="hm-zone-pess" />
      <line v-for="level in [30, 70]" :key="level" x1="0" x2="260" :y1="(100 - level) / 100 * 172" :y2="(100 - level) / 100 * 172" class="hm-grid-line" stroke-dasharray="3 3" />
      <path :d="path" fill="none" class="hm-line" :stroke-width="expanded ? 1.5 : 2" />
      <line v-if="active" :x1="activeX" :x2="activeX" y1="0" y2="172" class="hm-hover-line" />
      <circle v-if="active" :cx="activeX" :cy="activeY" r="3.5" class="hm-hover-point" />
      <circle v-if="last" :cx="lastX" :cy="lastY" r="3" class="hm-last-point" />
      <g v-if="last && !active" :transform="`translate(${Math.min(lastX, 200)} ${Math.max(3, Math.min(151, lastY - 21))})`" class="hm-last-label">
        <rect width="60" height="18" rx="3" />
        <text x="30" y="12" text-anchor="middle">Last {{ last.close.toFixed(1) }}</text>
      </g>
    </svg>
    <div v-if="active" class="hm-tooltip" :style="{ left: `${Math.max(17, Math.min(83, activeX / 260 * 100))}%` }" role="status">
      <span>{{ active.date }}</span><strong>{{ active.close.toFixed(1) }}</strong>
    </div>
  </div>
</template>

<style scoped>
.optix-history-chart{position:relative}.optix-history-chart svg{display:block;width:100%;height:188px}.optix-history-chart.expanded svg{height:400px}.hm-zone-opt{fill:#fcf0f2}.hm-zone-pess{fill:#eff8f4}.hm-grid-line{stroke:#b7c8d9}.hm-line{stroke:#1672ed}.hm-hover-line{stroke:#8098b7;stroke-width:1;stroke-dasharray:3 3}.hm-hover-point,.hm-last-point{fill:#1672ed;stroke:#fff;stroke-width:1.5}.hm-last-label rect{fill:#1672ed}.hm-last-label text{fill:#fff;font-size:9px;font-weight:700}.hm-tooltip{position:absolute;top:7px;z-index:1;display:flex;gap:8px;align-items:center;transform:translateX(-50%);padding:6px 9px;border:1px solid #cbdcf2;border-radius:4px;background:#fff;box-shadow:0 3px 12px #16365f24;color:#365c8b;font-size:10px;white-space:nowrap;pointer-events:none}.hm-tooltip strong{color:#16416f;font-size:11px}:root[data-theme='dark'] .hm-zone-opt{fill:rgb(251 113 133 / .07)}:root[data-theme='dark'] .hm-zone-pess{fill:rgb(52 211 153 / .07)}:root[data-theme='dark'] .hm-grid-line{stroke:var(--app-border-strong)}:root[data-theme='dark'] .hm-line{stroke:var(--app-primary)}:root[data-theme='dark'] .hm-tooltip{background:var(--app-surface);border-color:var(--app-border);color:var(--app-text-secondary)}:root[data-theme='dark'] .hm-tooltip strong{color:var(--app-text)}
</style>
