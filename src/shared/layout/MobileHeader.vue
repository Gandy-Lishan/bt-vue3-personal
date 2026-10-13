<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Menu,
  X,
  Bell,
  Moon,
  Sun,
  Home,
  Search,
} from '@lucide/vue'
import { useTheme } from '@/shared/theme/theme'

const route = useRoute()
const { isDarkTheme, themeToggleLabel, toggleThemeMode } = useTheme()
const isDrawerOpen = ref(false)
const isSearchOpen = ref(false)

const lightLogoUrl = 'https://cdn.prod.website-files.com/650486dd4239644e595569c1/650486dd4239644e59556a01_ST%20Logo.png'
const logoUrl = computed(() => (isDarkTheme.value ? '/avatar-sentimen-dark.png' : lightLogoUrl))

const toggleDrawer = () => {
  isDrawerOpen.value = !isDrawerOpen.value
}

const toggleSearch = () => {
  isSearchOpen.value = !isSearchOpen.value
}

// 通知数量（可以从 store 获取）
const notificationCount = 8
</script>

<template>
  <header class="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-[var(--chrome-border)] bg-[var(--chrome-bg)] shadow-sm">
    <div class="flex h-14 items-center justify-between px-4">
      <!-- 左侧：Logo + 汉堡菜单 -->
      <div class="flex items-center gap-3">
        <button
          @click="toggleDrawer"
          class="p-2 rounded-md text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
          aria-label="打开导航菜单"
        >
          <Menu v-if="!isDrawerOpen" :size="22" />
          <X v-else :size="22" />
        </button>

        <RouterLink to="/">
          <img :src="logoUrl" alt="Logo" class="h-8 w-auto object-contain" />
        </RouterLink>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="flex items-center gap-1">
        <!-- 搜索按钮 -->
        <button
          @click="toggleSearch"
          class="p-2 rounded-md text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
          aria-label="搜索"
        >
          <Search :size="20" />
        </button>

        <!-- 通知 -->
        <a
          href="/notifications"
          class="relative p-2 rounded-md text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
          aria-label="通知"
        >
          <Bell :size="20" />
          <span
            v-if="notificationCount > 0"
            class="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4b63] px-1 text-[0.625rem] font-normal text-white"
          >
            {{ notificationCount > 9 ? '9+' : notificationCount }}
          </span>
        </a>

        <!-- 主题切换 -->
        <button
          class="p-2 rounded-md text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
          type="button"
          :aria-label="themeToggleLabel"
          :title="themeToggleLabel"
          @click="toggleThemeMode"
        >
          <Sun v-if="isDarkTheme" :size="18" />
          <Moon v-else :size="18" />
        </button>

        <!-- 返回经典站点 -->
        <a
          href="https://users.sentimentrader.com/users/"
          class="p-2 rounded-md text-[var(--chrome-accent)] hover:bg-[var(--chrome-hover)] transition"
          title="Back to Classic Site"
        >
          <Home :size="20" />
        </a>
      </div>
    </div>

    <!-- 搜索框展开 -->
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="isSearchOpen" class="border-t border-[var(--chrome-border)] bg-[var(--chrome-bg)] p-3">
        <div class="relative">
          <input
            type="text"
            placeholder="搜索指标、策略..."
            class="w-full rounded-lg border border-[var(--chrome-field-border)] bg-[var(--chrome-input-bg)] px-4 py-2.5 text-sm text-[var(--chrome-text)] placeholder:text-[var(--chrome-text-muted)] focus:border-[var(--chrome-accent)] focus:outline-none"
          />
        </div>
      </div>
    </Transition>
  </header>

  <!-- 抽屉式导航 -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isDrawerOpen"
        class="md:hidden fixed inset-0 z-50"
      >
        <!-- 遮罩层 -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="toggleDrawer"
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
          <div class="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[var(--chrome-bg)] shadow-xl overflow-y-auto">
            <!-- 抽屉头部 -->
            <div class="sticky top-0 z-10 border-b border-[var(--chrome-border)] bg-[var(--chrome-bg)] px-4 py-3 flex items-center justify-between">
              <img :src="logoUrl" alt="Logo" class="h-7 w-auto" />
              <button
                @click="toggleDrawer"
                class="p-2 rounded-md text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)]"
                aria-label="关闭导航"
              >
                <X :size="20" />
              </button>
            </div>

            <!-- 导航列表 -->
            <nav class="py-2">
              <!-- 这里将复用 SentimentHeader 的 navItems -->
              <div class="px-3 py-2 text-xs font-semibold text-[var(--chrome-text-muted)] uppercase tracking-wide">
                主要功能
              </div>

              <!-- 示例导航项（后续会从 store 或 props 传入） -->
              <RouterLink
                to="/"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                :class="{ 'bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] border-r-2 border-[var(--chrome-accent)]': route.path === '/' }"
                @click="toggleDrawer"
              >
                <span class="font-medium">Dashboard</span>
              </RouterLink>

              <RouterLink
                to="/indicators"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                :class="{ 'bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] border-r-2 border-[var(--chrome-accent)]': route.path.startsWith('/indicators') }"
                @click="toggleDrawer"
              >
                <span class="font-medium">Indicators</span>
              </RouterLink>

              <RouterLink
                to="/strategy"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                :class="{ 'bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] border-r-2 border-[var(--chrome-accent)]': route.path.startsWith('/strategy') }"
                @click="toggleDrawer"
              >
                <span class="font-medium">Strategies</span>
              </RouterLink>

              <!-- 分割线 -->
              <div class="my-2 border-t border-[var(--chrome-border)]" />

              <div class="px-3 py-2 text-xs font-semibold text-[var(--chrome-text-muted)] uppercase tracking-wide">
                工具
              </div>

              <RouterLink
                to="/backtester"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                @click="toggleDrawer"
              >
                <span class="font-medium">BacktestEdge</span>
              </RouterLink>

              <RouterLink
                to="/scannerai"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                @click="toggleDrawer"
              >
                <span class="font-medium">Smart Scanner</span>
              </RouterLink>

              <RouterLink
                to="/seasonality"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                @click="toggleDrawer"
              >
                <span class="font-medium">Seasonality</span>
              </RouterLink>
            </nav>

            <!-- 抽屉底部 -->
            <div class="sticky bottom-0 border-t border-[var(--chrome-border)] bg-[var(--chrome-bg)] p-4 space-y-3">
              <!-- App 下载提示 -->
              <div class="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-3 text-white">
                <p class="text-sm font-semibold">在 App 中体验完整功能</p>
                <p class="mt-1 text-xs opacity-90">实时信号 · 策略管理 · 图表分析</p>
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
