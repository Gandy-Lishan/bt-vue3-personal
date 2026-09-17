<script setup lang="ts">
import { computed } from 'vue'
import {
  normalizeSentimentScore,
  sentimentLabelFromScore,
  sentimentMeterCells,
} from '@/entities/indicator/model/indicator.sentiment'

const props = defineProps<{
  score: number
}>()

const normalizedScore = computed(() => normalizeSentimentScore(props.score))
const cells = computed(() => sentimentMeterCells(normalizedScore.value))
const label = computed(() => sentimentLabelFromScore(normalizedScore.value))
</script>

<template>
  <div class="flex items-center gap-1" :aria-label="`${label} sentiment`" :title="label">
    <span
      v-for="cell in cells"
      :key="cell.id"
      class="h-4 w-4 rounded-[2px] border"
      :class="[
        cell.startsOptimisticSide ? 'ml-2' : '',
        cell.active && cell.tone === 'green' ? 'border-emerald-500 bg-emerald-500' : '',
        cell.active && cell.tone === 'red' ? 'border-rose-400 bg-rose-400' : '',
        !cell.active ? 'border-[var(--app-border-strong)] bg-[var(--app-surface)]' : '',
      ]"
    />
  </div>
</template>
