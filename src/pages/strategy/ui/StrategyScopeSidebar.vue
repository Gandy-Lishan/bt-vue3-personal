<script setup lang="ts">
import { computed } from 'vue'
import { BarChart3, BriefcaseBusiness, FileText, LineChart, Network, PieChart, Shield, Star } from '@lucide/vue'
import type { Component } from 'vue'
import type { StrategyScopeKey, StrategyScopeOption } from '@/entities/strategy/model/strategy.types'

const props = defineProps<{
  scopes: StrategyScopeOption[]
  activeScope: StrategyScopeKey
}>()

defineEmits<{
  select: [scope: StrategyScopeKey]
}>()

const navigationScopes = computed(() => props.scopes.filter((scope) => scope.key !== 'basket'))
const basketScope = computed(() => props.scopes.find((scope) => scope.key === 'basket'))

const iconByScope: Record<StrategyScopeKey, Component> = {
  all: FileText,
  legacy: LineChart,
  index: BarChart3,
  bond: Shield,
  factors: Network,
  sector: PieChart,
  favorites: Star,
  basket: BriefcaseBusiness,
}

function iconTone(scope: StrategyScopeOption) {
  if (scope.key === 'favorites') return 'text-[var(--app-favorite)]'
  if (props.activeScope === scope.key) return 'text-[var(--app-primary)]'
  return 'text-[var(--app-text-secondary)]'
}

function countLabel(scope: StrategyScopeOption) {
  if (scope.count === undefined || scope.key === 'basket') return ''
  return `${scope.count} ${scope.count === 1 ? 'strategy' : 'strategies'}`
}
</script>

<template>
  <aside class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
    <div class="px-1 pb-2 text-[0.68rem] font-extrabold uppercase tracking-wide text-[var(--app-text-muted)]">
      Strategy Scope
    </div>
    <template v-for="scope in navigationScopes" :key="scope.key">
      <button
        class="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition"
        :class="props.activeScope === scope.key ? 'bg-[var(--app-primary-soft)] text-[var(--app-text)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-primary)]'"
        type="button"
        @click="$emit('select', scope.key)"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          :class="iconTone(scope)"
        >
          <component
            :is="iconByScope[scope.key]"
            :size="21"
            :fill="scope.key === 'favorites' ? 'var(--app-favorite)' : 'none'"
          />
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold leading-5">{{ scope.label }}</span>
          <span v-if="countLabel(scope)" class="block text-xs text-[var(--app-text-muted)]">
            {{ countLabel(scope) }}
          </span>
        </span>
      </button>
    </template>

    <div v-if="basketScope" class="mt-3 border-t border-[var(--app-border-muted)] pt-3">
      <div class="px-1 pb-2 text-[0.68rem] font-extrabold uppercase tracking-wide text-[var(--app-text-muted)]">
        Portfolio Tools
      </div>
      <button
        class="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition"
        :class="props.activeScope === 'basket' ? 'bg-[var(--app-primary-soft)] text-[var(--app-text)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-primary)]'"
        type="button"
        @click="$emit('select', 'basket')"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          :class="iconTone(basketScope)"
        >
          <BriefcaseBusiness :size="21" />
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold leading-5">{{ basketScope.label }}</span>
        </span>
      </button>
    </div>
  </aside>
</template>
