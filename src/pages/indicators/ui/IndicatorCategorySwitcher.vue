<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, ChevronRight } from '@lucide/vue'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'

const emit = defineEmits<{ change: [] }>()
const store = useIndicatorStore()
const route = useRoute()
const router = useRouter()
const groups = computed(() => store.groups.filter((group) => group.id !== 'all'))
const isOpen = ref(false)
const expandedGroupId = ref(store.activeGroupId)
const selectionLabel = computed(() => {
  if (store.activeSection !== 'indicators') return store.listLabel
  return `${store.activeGroup.label} / ${store.activeSubgroup.label}`
})

function toggleMenu() {
  if (!isOpen.value) expandedGroupId.value = store.activeGroupId
  isOpen.value = !isOpen.value
}

function selectSubgroup(groupId: string, subgroupId: string) {
  store.setSection('indicators')
  store.setGroup(groupId)
  store.setSubgroup(subgroupId)
  isOpen.value = false
  emit('change')
  void store.ensureCurrentList()
  void router.replace({ query: { ...route.query, list: store.listKey } })
}
</script>

<template>
  <div class="mb-4 shrink-0" @keydown.esc="isOpen = false">
    <p class="mb-1 text-xs font-medium text-[var(--app-text-secondary)]">Browse indicators</p>
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-left text-sm text-[var(--app-text)] hover:border-[var(--app-primary)]"
      :aria-expanded="isOpen"
      aria-controls="indicator-category-menu"
      @click="toggleMenu"
    >
      <span class="min-w-0 truncate" :title="selectionLabel">{{ selectionLabel }}</span>
      <ChevronDown :size="16" class="shrink-0 transition-transform" :class="isOpen ? 'rotate-180' : ''" />
    </button>
    <div v-if="isOpen" id="indicator-category-menu" class="mt-1 max-h-64 overflow-y-auto rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] py-1 shadow-sm">
      <div v-for="group in groups" :key="group.id">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-[var(--app-surface-soft)]"
          :class="expandedGroupId === group.id ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]'"
          :aria-expanded="expandedGroupId === group.id"
          @click="expandedGroupId = expandedGroupId === group.id ? '' : group.id"
        >
          <span>{{ group.label }}</span>
          <ChevronRight :size="15" class="shrink-0 transition-transform" :class="expandedGroupId === group.id ? 'rotate-90' : ''" />
        </button>
        <div v-if="expandedGroupId === group.id" class="border-l-2 border-[var(--app-border)] ml-4">
          <button
            v-for="subgroup in group.subgroups"
            :key="subgroup.id"
            type="button"
            class="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--app-primary-soft)]"
            :class="store.activeSection === 'indicators' && store.activeSubgroupId === subgroup.id ? 'font-semibold text-[var(--app-primary)]' : 'text-[var(--app-text-secondary)]'"
            @click="selectSubgroup(group.id, subgroup.id)"
          >
            {{ subgroup.fullName ?? subgroup.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
