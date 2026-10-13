<script setup lang="ts">
import { ref } from 'vue'
import { Menu, X, Star, Flame } from '@lucide/vue'
import type { IndicatorGroup, IndicatorSection } from '@/entities/indicator/model/indicator.types'

interface Props {
  activeSection: IndicatorSection
  activeGroupId: string
  activeSubgroupId?: string
  groups: IndicatorGroup[]
  featuredSections: Array<{ id: Exclude<IndicatorSection, 'indicators'>; label: string; icon: typeof Flame | typeof Star }>
  iconMap: Record<string, any>
}

interface Emits {
  (e: 'select-section', section: IndicatorSection): void
  (e: 'select-group', group: IndicatorGroup): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = ref(false)

function open() {
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

function selectSection(section: IndicatorSection) {
  emit('select-section', section)
  close()
}

function selectGroup(group: IndicatorGroup) {
  emit('select-group', group)
  close()
}

// 暴露 open 方法给父组件
defineExpose({ open, close })
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="xl:hidden fixed inset-0 z-50">
        <!-- 遮罩层 -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="close"
        />

        <!-- 抽屉内容 -->
        <Transition
          enter-active-class="transition duration-300 transform"
          enter-from-class="-translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition duration-200 transform"
          leave-from-class="translate-x-0"
          leave-to-class="-translate-x-full"
        >
          <div class="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[var(--app-surface)] shadow-xl overflow-y-auto">
            <!-- 抽屉头部 -->
            <div class="sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 flex items-center justify-between">
              <h2 class="text-base font-semibold text-[var(--app-text)]">指标分类</h2>
              <button
                @click="close"
                class="p-2 rounded-md text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]"
                aria-label="关闭分类"
              >
                <X :size="20" />
              </button>
            </div>

            <!-- 导航列表 -->
            <nav class="py-2">
              <!-- 精选分类 -->
              <div class="px-3 py-2 text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wide">
                精选
              </div>

              <button
                v-for="section in featuredSections"
                :key="section.id"
                class="flex w-full items-center gap-3 px-4 py-3 text-left transition"
                :class="activeSection === section.id ? 'bg-[var(--app-primary-soft)] text-[var(--app-text)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-primary)]'"
                type="button"
                @click="selectSection(section.id)"
              >
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                  :class="section.id === 'favorites' ? 'text-[var(--app-favorite)]' : 'text-[var(--app-primary)]'"
                >
                  <component :is="section.icon" :size="21" :fill="section.id === 'favorites' ? 'var(--app-favorite)' : 'var(--app-primary)'" />
                </span>
                <span class="min-w-0">
                  <span class="block text-sm font-semibold leading-5">{{ section.label }}</span>
                </span>
              </button>

              <!-- 分割线 -->
              <div class="my-3 border-t border-[var(--app-border-muted)]" />

              <!-- 指标分组 -->
              <div class="px-3 py-2 text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wide">
                指标分组
              </div>

              <button
                v-for="group in groups"
                :key="group.id"
                class="flex w-full items-center gap-3 px-4 py-3 text-left transition"
                :class="activeSection === 'indicators' && activeGroupId === group.id ? 'bg-[var(--app-primary-soft)] text-[var(--app-text)]' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-primary)]'"
                type="button"
                @click="selectGroup(group)"
              >
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                  :class="activeSection === 'indicators' && activeGroupId === group.id ? 'text-[var(--app-primary)]' : 'text-[var(--app-text-secondary)]'"
                >
                  <component :is="iconMap[group.icon as keyof typeof iconMap]" :size="21" />
                </span>
                <span class="min-w-0">
                  <span class="block text-sm font-semibold leading-5">{{ group.label }}</span>
                  <span class="block text-xs text-[var(--app-text-muted)]">
                    {{ group.views }} {{ group.views === 1 ? 'view' : 'views' }}
                  </span>
                </span>
              </button>
            </nav>

            <!-- 抽屉底部 App 下载提示 -->
            <div class="sticky bottom-0 border-t border-[var(--app-border)] bg-[var(--app-surface)] p-4">
              <div class="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-3 text-white">
                <p class="text-sm font-semibold">在 App 中体验完整功能</p>
                <p class="mt-1 text-xs opacity-90">实时信号 · 策略管理</p>
                <button class="mt-3 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-600">
                  立即下载
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
