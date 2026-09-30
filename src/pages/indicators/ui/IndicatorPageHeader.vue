<script setup lang="ts">
import { indicatorPageAds, type IndicatorAd } from '@/entities/indicator/model/indicator.ads'
import ListPageHeader from '@/shared/ui/ListPageHeader.vue'
import type { ListExplorerViewMode } from '@/shared/ui/list-page.types'

type IndicatorViewMode = ListExplorerViewMode

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    viewMode: IndicatorViewMode
    showViewModeToggle?: boolean
    ads?: IndicatorAd[]
  }>(),
  {
    showViewModeToggle: true,
    ads: () => indicatorPageAds,
  },
)

const emit = defineEmits<{
  'update:viewMode': [value: IndicatorViewMode]
}>()
</script>

<template>
  <ListPageHeader
    :title="props.title"
    :description="props.description"
    :view-mode="props.viewMode"
    :show-view-mode-toggle="props.showViewModeToggle"
    :ads="props.ads"
    @update:view-mode="emit('update:viewMode', $event)"
  />
</template>
