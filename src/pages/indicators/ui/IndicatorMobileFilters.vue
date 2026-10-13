<script setup lang="ts">
import { ref } from 'vue'
import { Filter, ChevronDown, Search, RotateCcw, Download } from '@lucide/vue'

interface Emits {
  (e: 'reset'): void
  (e: 'download'): void
}

const emit = defineEmits<Emits>()

const isExpanded = ref(false)

function toggle() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="xl:hidden">
    <!-- 折叠状态：只显示搜索和筛选按钮 -->
    <div class="flex gap-2 px-4 py-3">
      <!-- 搜索框 -->
      <label class="flex h-10 flex-1 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3">
        <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
        <input
          type="text"
          class="w-full bg-transparent text-sm outline-none placeholder:text-[var(--app-text-muted)]"
          placeholder="搜索指标..."
        />
      </label>

      <!-- 筛选按钮 -->
      <button
        @click="toggle"
        class="flex h-10 items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]"
        type="button"
      >
        <Filter :size="16" />
        <span class="hidden sm:inline">筛选</span>
        <ChevronDown :size="14" :class="{ 'rotate-180': isExpanded }" />
      </button>
    </div>

    <!-- 展开状态：显示所有筛选器 -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="isExpanded" class="border-t border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 space-y-2">
        <!-- 时间框架 -->
        <select class="w-full h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text-secondary)]">
          <option value="">所有时间框架</option>
          <option>短期</option>
          <option>中期</option>
          <option>长期</option>
        </select>

        <!-- 情绪类型 -->
        <select class="w-full h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text-secondary)]">
          <option value="">所有情绪类型</option>
          <option value="pessimistic">悲观</option>
          <option value="neutral">中性</option>
          <option value="optimistic">乐观</option>
        </select>

        <!-- 排序 -->
        <select class="w-full h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text-secondary)]">
          <option value="">排序：默认</option>
          <option>名称：A-Z</option>
          <option>名称：Z-A</option>
          <option>最新</option>
          <option>最旧</option>
        </select>

        <!-- 操作按钮 -->
        <div class="flex gap-2 pt-2">
          <button
            @click="emit('reset')"
            class="flex flex-1 h-10 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]"
            type="button"
          >
            <RotateCcw :size="16" />
            重置
          </button>
          <button
            @click="emit('download')"
            class="flex flex-1 h-10 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]"
            type="button"
          >
            <Download :size="16" />
            CSV
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
