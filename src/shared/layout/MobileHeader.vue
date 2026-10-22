<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  ChevronDown,
  Menu,
  X,
  Bell,
  Moon,
  Sun,
  Home,
  Search,
} from '@lucide/vue'
import { useTheme } from '@/shared/theme/theme'
import HeaderSearchAutocomplete from './HeaderSearchAutocomplete.vue'

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

// Expandable group state
const expandedGroups = ref<Record<string, boolean>>({
  reports: false,
  trendVolatility: false,
  myStuff: false,
  correlation: false,
  extraTools: false,
  backtester: false,
  scanner: false,
})

function toggleGroup(group: string) {
  expandedGroups.value[group] = !expandedGroups.value[group]
}

// Notification count (can be fetched from store)
const notificationCount = 8
</script>

<template>
  <header class="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-[var(--chrome-border)] bg-[var(--chrome-bg)] shadow-sm">
    <div class="flex h-[66px] items-center justify-between px-[var(--page-gutter)]">
      <!-- Left: Logo + hamburger menu -->
      <div class="flex items-center gap-3">
        <button
          @click="toggleDrawer"
          class="inline-flex items-center justify-center p-2 rounded-md text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
          aria-label="Open navigation menu"
        >
          <Menu v-if="!isDrawerOpen" :size="22" />
          <X v-else :size="22" />
        </button>

        <RouterLink to="/" class="inline-flex items-center justify-center" @click.stop>
          <img :src="logoUrl" alt="Logo" class="h-8 w-auto object-contain" />
        </RouterLink>
      </div>

      <!-- Right: Action buttons -->
      <div class="flex items-center gap-1">
        <!-- Search button -->
        <button
          @click="toggleSearch"
          class="inline-flex items-center justify-center p-2 rounded-md text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
          aria-label="Search"
        >
          <Search :size="20" />
        </button>

        <!-- Notifications -->
        <a
          href="/notifications"
          class="relative inline-flex items-center justify-center p-2 rounded-md text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
          aria-label="Notifications"
        >
          <Bell :size="20" />
          <span
            v-if="notificationCount > 0"
            class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4b63] px-1 text-[0.625rem] font-normal text-white"
          >
            {{ notificationCount > 9 ? '9+' : notificationCount }}
          </span>
        </a>

        <!-- Theme toggle -->
        <button
          class="inline-flex items-center justify-center p-2 rounded-md text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
          type="button"
          :aria-label="themeToggleLabel"
          :title="themeToggleLabel"
          @click="toggleThemeMode"
        >
          <Sun v-if="isDarkTheme" :size="18" />
          <Moon v-else :size="18" />
        </button>

        <!-- Back to classic site -->
        <a
          href="https://users.sentimentrader.com/users/"
          class="inline-flex items-center justify-center p-2 rounded-md text-[var(--chrome-accent)] hover:bg-[var(--chrome-hover)] transition"
          title="Back to Classic Site"
        >
          <Home :size="20" />
        </a>
      </div>
    </div>

    <!-- Full-screen search overlay -->
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isSearchOpen" class="md:hidden fixed inset-0 z-[60] flex flex-col bg-[var(--chrome-bg)]">
        <div class="flex h-[66px] shrink-0 items-center gap-3 border-b border-[var(--chrome-border)] bg-[var(--chrome-bg)] px-[var(--page-gutter)]">
          <button
            @click="toggleSearch"
            class="inline-flex items-center justify-center p-2 rounded-md text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
            aria-label="Close search"
          >
            <X :size="22" />
          </button>
          <div class="flex-1">
            <HeaderSearchAutocomplete mobile @close="toggleSearch" />
          </div>
        </div>
      </div>
    </Transition>
  </header>

  <!-- Drawer navigation -->
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
        <!-- Overlay -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="toggleDrawer"
        />

        <!-- Drawer content -->
        <Transition
          enter-active-class="transition duration-300 transform"
          enter-from-class="-translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition duration-200 transform"
          leave-from-class="translate-x-0"
          leave-to-class="-translate-x-full"
        >
          <div class="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[var(--chrome-bg)] shadow-xl overflow-y-auto">
            <!-- Drawer header -->
            <div class="sticky top-0 z-10 border-b border-[var(--chrome-border)] bg-[var(--chrome-bg)] px-4 py-3 flex items-center justify-between">
              <img :src="logoUrl" alt="Logo" class="h-7 w-auto" />
              <button
                @click="toggleDrawer"
                class="p-2 rounded-md text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)]"
                aria-label="Close navigation"
              >
                <X :size="20" />
              </button>
            </div>

            <!-- Navigation list -->
            <nav class="py-2">
              <!-- Main features -->
              <div class="px-3 py-2 text-xs font-semibold text-[var(--chrome-text-muted)] uppercase tracking-wide">
                Main Features
              </div>

              <RouterLink
                to="/"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                :class="{ 'bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] border-r-2 border-[var(--chrome-accent)]': route.path === '/' }"
                @click="toggleDrawer"
              >
                <span class="font-medium">Dashboard</span>
              </RouterLink>

              <!-- Reports group -->
              <div>
                <button
                  class="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                  :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/MR') }"
                  @click="toggleGroup('reports')"
                >
                  <span class="font-medium">Reports</span>
                  <ChevronDown
                    :size="16"
                    class="transition-transform"
                    :class="{ 'rotate-180': expandedGroups.reports }"
                  />
                </button>
                <div v-show="expandedGroups.reports" class="bg-[var(--chrome-surface-soft)]">
                  <RouterLink
                    to="/MR/reports"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path === '/MR/reports' }"
                    @click="toggleDrawer"
                  >
                    Reports Library
                  </RouterLink>
                  <RouterLink
                    to="/MR/active_studies"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.includes('active_studies') }"
                    @click="toggleDrawer"
                  >
                    Active Studies
                  </RouterLink>
                  <RouterLink
                    to="/MR/minutes"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.includes('/minutes') }"
                    @click="toggleDrawer"
                  >
                    Intraday Minutes
                  </RouterLink>
                  <RouterLink
                    to="/MR/archived_studies"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.includes('archived_studies') }"
                    @click="toggleDrawer"
                  >
                    Archived Studies
                  </RouterLink>
                </div>
              </div>

              <RouterLink
                to="/indicators"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                :class="{ 'bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] border-r-2 border-[var(--chrome-accent)]': route.path.startsWith('/indicators') }"
                @click="toggleDrawer"
              >
                <span class="font-medium">Indicators</span>
              </RouterLink>

              <!-- Trend & Volatility group -->
              <div>
                <button
                  class="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                  :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/trend_score') || route.path.startsWith('/historical') }"
                  @click="toggleGroup('trendVolatility')"
                >
                  <span class="font-medium">Trend & Volatility</span>
                  <ChevronDown
                    :size="16"
                    class="transition-transform"
                    :class="{ 'rotate-180': expandedGroups.trendVolatility }"
                  />
                </button>
                <div v-show="expandedGroups.trendVolatility" class="bg-[var(--chrome-surface-soft)]">
                  <RouterLink
                    to="/trend_score"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/trend_score') }"
                    @click="toggleDrawer"
                  >
                    Trend Score
                  </RouterLink>
                  <RouterLink
                    to="/historical"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/historical') }"
                    @click="toggleDrawer"
                  >
                    Historical Volatility
                  </RouterLink>
                </div>
              </div>

              <RouterLink
                to="/strategy"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                :class="{ 'bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] border-r-2 border-[var(--chrome-accent)]': route.path.startsWith('/strategy') }"
                @click="toggleDrawer"
              >
                <span class="font-medium">Strategies</span>
              </RouterLink>

              <RouterLink
                to="/market/predict"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                :class="{ 'bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] border-r-2 border-[var(--chrome-accent)]': route.path.startsWith('/market') }"
                @click="toggleDrawer"
              >
                <span class="font-medium">Market Prediction</span>
              </RouterLink>

              <!-- Divider -->
              <div class="my-2 border-t border-[var(--chrome-border)]" />

              <div class="px-3 py-2 text-xs font-semibold text-[var(--chrome-text-muted)] uppercase tracking-wide">
                Tools
              </div>

              <!-- BacktestEdge group -->
              <div>
                <button
                  class="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                  :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/backtester') }"
                  @click="toggleGroup('backtester')"
                >
                  <span class="font-medium">BacktestEdge</span>
                  <ChevronDown
                    :size="16"
                    class="transition-transform"
                    :class="{ 'rotate-180': expandedGroups.backtester }"
                  />
                </button>
                <div v-show="expandedGroups.backtester" class="bg-[var(--chrome-surface-soft)]">
                  <RouterLink
                    to="/backtester/sr/setup"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.includes('/setup') }"
                    @click="toggleDrawer"
                  >
                    Backtest Set Up
                  </RouterLink>
                  <RouterLink
                    to="/backtester/list/history"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.includes('/history') }"
                    @click="toggleDrawer"
                  >
                    Backtest List
                  </RouterLink>
                  <RouterLink
                    to="/backtester/list/favorites"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    My Favorite Backtests
                  </RouterLink>
                  <RouterLink
                    to="/backtester/list/sample"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Sample Backtests
                  </RouterLink>
                  <RouterLink
                    to="/backtester/list/analyst"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Analysts' Backtests
                  </RouterLink>
                  <RouterLink
                    to="/backtester/list/shared"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Shared Backtests
                  </RouterLink>
                </div>
              </div>

              <!-- Smart Scanner group -->
              <div>
                <button
                  class="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                  :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/scannerai') }"
                  @click="toggleGroup('scanner')"
                >
                  <span class="font-medium">Smart Scanner</span>
                  <ChevronDown
                    :size="16"
                    class="transition-transform"
                    :class="{ 'rotate-180': expandedGroups.scanner }"
                  />
                </button>
                <div v-show="expandedGroups.scanner" class="bg-[var(--chrome-surface-soft)]">
                  <RouterLink
                    to="/scannerai"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path === '/scannerai' }"
                    @click="toggleDrawer"
                  >
                    Smart Stock Scanner
                  </RouterLink>
                  <RouterLink
                    to="/scannerai/option"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.includes('/option') }"
                    @click="toggleDrawer"
                  >
                    Smart Option Scanner
                  </RouterLink>
                </div>
              </div>

              <RouterLink
                to="/seasonality"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                :class="{ 'bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] border-r-2 border-[var(--chrome-accent)]': route.path.startsWith('/seasonality') }"
                @click="toggleDrawer"
              >
                <span class="font-medium">Seasonality</span>
              </RouterLink>

              <!-- My Stuff group -->
              <div>
                <button
                  class="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                  :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/myindicator') || route.path.startsWith('/my_signals') || route.path.startsWith('/my_screen') || route.path.startsWith('/watchlist') }"
                  @click="toggleGroup('myStuff')"
                >
                  <span class="font-medium">My Stuff</span>
                  <ChevronDown
                    :size="16"
                    class="transition-transform"
                    :class="{ 'rotate-180': expandedGroups.myStuff }"
                  />
                </button>
                <div v-show="expandedGroups.myStuff" class="bg-[var(--chrome-surface-soft)]">
                  <RouterLink
                    to="/myindicator"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/myindicator') }"
                    @click="toggleDrawer"
                  >
                    My Indicator
                  </RouterLink>
                  <RouterLink
                    to="/my_signals"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/my_signals') }"
                    @click="toggleDrawer"
                  >
                    My Signal
                  </RouterLink>
                  <RouterLink
                    to="/my_screen"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/my_screen') }"
                    @click="toggleDrawer"
                  >
                    My Screen
                  </RouterLink>
                  <RouterLink
                    to="/watchlist"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/watchlist') }"
                    @click="toggleDrawer"
                  >
                    My Watch List
                  </RouterLink>
                  <RouterLink
                    to="/my-stuff/concierge"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    :class="{ 'text-[var(--chrome-accent)]': route.path === '/my-stuff/concierge' }"
                    @click="toggleDrawer"
                  >
                    My Stuff Concierge Setup Service
                  </RouterLink>
                </div>
              </div>

              <!-- Correlation group -->
              <div>
                <button
                  class="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                  :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/cpm') }"
                  @click="toggleGroup('correlation')"
                >
                  <span class="font-medium">Correlation</span>
                  <ChevronDown
                    :size="16"
                    class="transition-transform"
                    :class="{ 'rotate-180': expandedGroups.correlation }"
                  />
                </button>
                <div v-show="expandedGroups.correlation" class="bg-[var(--chrome-surface-soft)]">
                  <RouterLink
                    to="/cpm/list"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Pattern Match
                  </RouterLink>
                  <RouterLink
                    to="/cpm/symbol"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Symbol Correlation
                  </RouterLink>
                  <RouterLink
                    to="/cpm/asset"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Asset Correlation
                  </RouterLink>
                  <RouterLink
                    to="/cpm/pattern"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Date Range Correlation
                  </RouterLink>
                  <RouterLink
                    to="/cpm/transmission"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Beta Analyzer
                  </RouterLink>
                </div>
              </div>

              <RouterLink
                to="/swing_trading_dashboard"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                :class="{ 'bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] border-r-2 border-[var(--chrome-accent)]': route.path.startsWith('/swing_trading') }"
                @click="toggleDrawer"
              >
                <span class="font-medium">Swing Trading</span>
              </RouterLink>

              <RouterLink
                to="https://autotrader-ui-dev-e20d0e03fac4.herokuapp.com/home/aitrade"
                target="_blank"
                class="flex items-center gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
              >
                <span class="font-medium">AI Trading</span>
              </RouterLink>

              <!-- Extra Tools group -->
              <div>
                <button
                  class="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-[var(--chrome-text)] hover:bg-[var(--chrome-hover)] transition"
                  :class="{ 'text-[var(--chrome-accent)]': route.path.startsWith('/tools') }"
                  @click="toggleGroup('extraTools')"
                >
                  <span class="font-medium">Extra Tools</span>
                  <ChevronDown
                    :size="16"
                    class="transition-transform"
                    :class="{ 'rotate-180': expandedGroups.extraTools }"
                  />
                </button>
                <div v-show="expandedGroups.extraTools" class="bg-[var(--chrome-surface-soft)]">
                  <a
                    href="https://users.sentimentrader.com/users/intraday/"
                    target="_blank"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Intraday Charts
                  </a>
                  <a
                    href="https://users.sentimentrader.com/users/country_breadth_overview/"
                    target="_blank"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Global Breadth Overview
                  </a>
                  <a
                    href="https://users.sentimentrader.com/users/market_overview/"
                    target="_blank"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Market Sentiment Overview
                  </a>
                  <a
                    href="https://users.sentimentrader.com/users/heatmap_optix/ALL"
                    target="_blank"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Optix Heatmap
                  </a>
                  <a
                    href="https://users.sentimentrader.com/users/charts/risk_levels"
                    target="_blank"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Risk Levels
                  </a>
                  <a
                    href="https://users.sentimentrader.com/users/ranks/"
                    target="_blank"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Ranks
                  </a>
                  <a
                    href="https://users.sentimentrader.com/users/seasonality_calendar/"
                    target="_blank"
                    class="flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-[var(--chrome-text-secondary)] hover:bg-[var(--chrome-hover)] transition"
                    @click="toggleDrawer"
                  >
                    Seasonality Calendar
                  </a>
                </div>
              </div>
            </nav>

            <!-- Drawer bottom -->
            <div class="sticky bottom-0 border-t border-[var(--chrome-border)] bg-[var(--chrome-bg)] p-4 space-y-3">
              <!-- App download CTA -->
              <div class="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-3 text-white">
                <p class="text-sm font-semibold">Get the full experience in our app</p>
                <p class="mt-1 text-xs opacity-90">Real-time signals · Strategy management · Charts</p>
                <button class="mt-3 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-600">
                  Download Now
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
