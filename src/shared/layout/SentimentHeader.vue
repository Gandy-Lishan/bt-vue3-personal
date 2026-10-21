<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Bell,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Home,
  KeyRound,
  LogOut,
  MessageCircle,
  Moon,
  Play,
  Settings,
  Sun,
  User,
} from '@lucide/vue'
import { hasAuthenticatedCookie, canAccessNavigationItem, getCurrentAccessLevels, getCurrentUsername } from '@/shared/auth/permission'
import { useTheme } from '@/shared/theme/theme'
import HeaderSearchAutocomplete from './HeaderSearchAutocomplete.vue'

interface NavItem {
  label: string
  path: string
  keyPath: string
  external?: boolean
  subMenu?: NavItem[]
  permissions?: string[]
}

const route = useRoute()
const { isDarkTheme, themeToggleLabel, toggleThemeMode } = useTheme()

// Reactive auth state — refreshes on route change so nav updates after login/logout
const isAuthenticated = ref(hasAuthenticatedCookie())
const accessLevelsSnapshot = ref(getCurrentAccessLevels())
const currentUsername = ref(getCurrentUsername())

function refreshAuthState() {
  isAuthenticated.value = hasAuthenticatedCookie()
  accessLevelsSnapshot.value = getCurrentAccessLevels()
  currentUsername.value = getCurrentUsername()
}

watch(() => route.path, refreshAuthState)
// The light logo is dark artwork; the dark theme needs the white variant instead.
const lightLogoUrl = 'https://cdn.prod.website-files.com/650486dd4239644e595569c1/650486dd4239644e59556a01_ST%20Logo.png'
const logoUrl = computed(() => (isDarkTheme.value ? '/avatar-sentimen-dark.png' : lightLogoUrl))

const tutorialItems: NavItem[] = [
  { label: 'Walkthrough Videos', keyPath: '1-3', path: 'https://users.sentimentrader.com/users/walkthrough_videos/', external: true },
  { label: 'Webinar Videos', keyPath: '1-6', path: 'https://users.sentimentrader.com/users/webinar_videos/', external: true },
  { label: 'Backtest Videos', keyPath: '1-2', path: 'https://users.sentimentrader.com/users/backtest_videos/', external: true },
  { label: "Analyst's Backtest Videos", keyPath: '1-4', path: 'https://users.sentimentrader.com/users/analysts_backtest_videos/', external: true },
  { label: 'Other Tools Videos', keyPath: '1-5', path: 'https://users.sentimentrader.com/users/others_videos/', external: true },
]

const helpItems: NavItem[] = [
  { label: 'Getting Started', keyPath: '2-1', path: 'https://users.sentimentrader.com/users/getting_started/', external: true },
  { label: "Knowledge Base / FAQ's", keyPath: '2-2', path: 'https://users.sentimentrader.com/users/knowledge_base/', external: true },
  { label: 'Glossary of Terms', keyPath: '2-3', path: 'https://users.sentimentrader.com/users/knowledge_base_article/Glossary%20of%20terms', external: true },
  { label: 'Whats New', keyPath: '2-4', path: 'https://users.sentimentrader.com/users/knowledge_base_article/Whats%20New%20-%20Updates%20and%20New%20Features', external: true },
  { label: 'BacktestEdge Document', keyPath: '2-5', path: '/doc' },
  { label: 'Smart Stock Scanner Document', keyPath: '2-6', path: '/doc/scannerdoc/0' },
]

const accountItems: NavItem[] = [
  { label: 'Website Preferences', keyPath: '3-1', path: 'https://users.sentimentrader.com/users/preferences/', external: true },
  { label: 'Manage Account', keyPath: '3-2', path: 'https://account.sentimentrader.com/', external: true },
  { label: 'Manage Password', keyPath: '3-3', path: 'https://users.sentimentrader.com/users/account/mypassword/', external: true },
  { label: 'Contact Support', keyPath: '3-4', path: 'https://users.sentimentrader.com/users/account/support/', external: true },
  { label: 'Status Page', keyPath: '3-5', path: 'http://status.sentimentrader.com/', external: true },
  { label: 'Log out', keyPath: '3-6', path: '/logout' },
]

const navItems: NavItem[] = [
  { label: 'Dashboard', keyPath: '14', path: '/', permissions: ['everything', 'premium', 'research', 'datalite'] },
  {
    label: 'Reports',
    keyPath: '10',
    path: '/MR',
    permissions: ['everything', 'premium', 'research', 'corelite', 'reports'],
    subMenu: [
      { label: 'Reports Library', keyPath: '10-1', path: '/MR/reports' },
      { label: 'Active Studies', keyPath: '10-8', path: '/MR/active_studies' },
      { label: 'Intraday Minutes', keyPath: '10-9', path: '/MR/minutes' },
      { label: 'Archived Studies', keyPath: '10-6', path: '/MR/archived_studies' },
    ],
  },
  { label: 'Indicators', keyPath: '11', path: '/indicators', permissions: ['everything', 'premium', 'research', 'corelite', 'datalite'] },
  {
    label: 'Trend & Volatility',
    keyPath: '12',
    path: '/trend_score',
    permissions: ['everything', 'premium', 'research', 'corelite', 'datalite'],
    subMenu: [
      { label: 'Trend Score', keyPath: '12-1', path: '/trend_score' },
      { label: 'Historical Volatility', keyPath: '12-2', path: '/historical' },
    ],
  },
  { label: 'Strategies', keyPath: '3', path: '/strategy', permissions: ['everything', 'premium', 'research', 'corelite', 'datalite'] },
  {
    label: 'BacktestEdge',
    keyPath: '4',
    path: '/backtester',
    permissions: ['everything', 'premium', 'research', 'datalite'],
    subMenu: [
      { label: 'Backtest Set Up', keyPath: '4-1', path: '/backtester/sr/setup' },
      { label: 'Backtest List', keyPath: '4-2', path: '/backtester/list/history' },
      { label: 'My Favorite Backtests', keyPath: '4-3', path: '/backtester/list/favorites' },
      { label: 'Sample Backtests', keyPath: '4-4', path: '/backtester/list/sample' },
      { label: "Analysts' Backtests", keyPath: '4-5', path: '/backtester/list/analyst' },
      { label: 'Subscriber Shared Backtests', keyPath: '4-7', path: '/backtester/list/shared' },
      { label: 'Backtest Concierge Setup Service', keyPath: '4-6', path: '/contact' },
    ],
  },
  {
    label: 'Smart Scanner',
    keyPath: '5',
    path: '/scannerai',
    permissions: ['everything', 'premium', 'research', 'corelite'],
    subMenu: [
      { label: 'Smart Stock Scanner', keyPath: '5-1', path: '/scannerai' },
      { label: 'Smart Option Scanner', keyPath: '5-2', path: '/scannerai/option' },
    ],
  },
  { label: 'Seasonality', keyPath: '7', path: '/seasonality', permissions: ['everything', 'premium', 'research', 'corelite', 'datalite'] },
  {
    label: 'Correlation',
    keyPath: '8',
    path: '/cpm',
    permissions: ['everything', 'premium', 'research', 'corelite', 'datalite'],
    subMenu: [
      { label: 'Correlation Pattern Match', keyPath: '8-1', path: '/cpm/list' },
      { label: 'Symbol Correlation', keyPath: '8-2', path: '/cpm/symbol' },
      { label: 'Asset Correlation', keyPath: '8-3', path: '/cpm/asset' },
      { label: 'Date Range Correlation', keyPath: '8-4', path: '/cpm/pattern' },
      { label: 'Beta Analyzer', keyPath: '8-5', path: '/cpm/transmission' },
    ],
  },
  {
    label: 'My Stuff',
    keyPath: '6',
    path: '/my-stuff',
    permissions: ['everything', 'premium', 'research', 'corelite', 'datalite'],
    subMenu: [
      { label: 'My Signal', keyPath: '6-2', path: '/my-stuff/signals' },
      { label: 'My Indicator', keyPath: '6-1', path: '/my-stuff/indicators' },
      { label: 'My Screen', keyPath: '6-3', path: '/my-stuff/screens' },
      { label: 'My Watch List', keyPath: '6-4', path: '/my-stuff/watchlist' },
      { label: 'My Stuff Concierge Setup Service', keyPath: '6-5', path: '/my-stuff/concierge' },
    ],
  },
  { label: 'Swing Trading', keyPath: '16', path: '/swing_trading_dashboard' },
  { label: 'AI Trading', keyPath: '10-ai', path: 'https://autotrader-ui-dev-e20d0e03fac4.herokuapp.com/home/aitrade', external: true, permissions: ['ai-admin'] },
  { label: 'Market Prediction', keyPath: '13', path: '/market/predict', permissions: ['everything', 'premium', 'research', 'datalite'] },
  {
    label: 'Extra Tools',
    keyPath: '15',
    path: '/tools',
    subMenu: [
      { label: 'Intraday charts', keyPath: '15-1', path: 'https://users.sentimentrader.com/users/intraday/', external: true },
      { label: 'Global Breadth Overview', keyPath: '15-2', path: 'https://users.sentimentrader.com/users/country_breadth_overview/', external: true },
      { label: 'Market Sentiment Overview', keyPath: '15-4', path: 'https://users.sentimentrader.com/users/market_overview/', external: true },
      { label: 'Optix Heatmap', keyPath: '15-5', path: 'https://users.sentimentrader.com/users/heatmap_optix/ALL', external: true },
      { label: 'Risk Levels', keyPath: '15-9', path: 'https://users.sentimentrader.com/users/charts/risk_levels', external: true },
      { label: 'Ranks', keyPath: '15-11', path: 'https://users.sentimentrader.com/users/ranks/', external: true },
      { label: 'Seasonality Calendar', keyPath: '15-13', path: 'https://users.sentimentrader.com/users/seasonality_calendar/', external: true },
    ],
  },
]

function permittedNavItem(item: NavItem): NavItem | null {
  const levels = accessLevelsSnapshot.value
  const authenticated = isAuthenticated.value
  const subMenu = item.subMenu?.filter((subItem) =>
    canAccessNavigationItem(subItem.path, subItem.permissions ?? item.permissions, subItem.external, levels, authenticated),
  )
  const parentAllowed = canAccessNavigationItem(item.path, item.permissions, item.external, levels, authenticated)

  if (!parentAllowed && !subMenu?.length) return null
  return subMenu ? { ...item, subMenu } : item
}

const visibleNavItems = computed(() => navItems.map(permittedNavItem).filter((item): item is NavItem => item !== null))

function isActive(item: NavItem) {
  if (item.path === '/') return route.path === '/'
  if (item.path === '/indicators') return route.path.startsWith('/indicators')
  if (item.path === '/trend_score') return route.path.startsWith('/trend_score') || route.path.startsWith('/historical')
  return route.path.startsWith(item.path)
}

function firstPath(item: NavItem) {
  return item.subMenu?.[0]?.path ?? item.path
}
</script>

<template>
  <header class="no-print relative z-20 border-b border-[var(--chrome-border)] bg-[var(--chrome-bg)] text-sm font-normal text-[var(--chrome-text)] shadow-[0_10px_30px_rgba(5,16,31,0.18)]">
    <div class="flex h-[66px] items-center gap-6 px-[var(--page-gutter)]">
      <RouterLink class="flex min-w-[200px] items-center" to="/">
        <img :src="logoUrl" alt="SentimenTrader logo" width="175" height="35" class="h-[35px] w-[175px] object-contain" />
      </RouterLink>

      <div class="mx-auto w-full max-w-[720px]">
        <HeaderSearchAutocomplete />
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <RouterLink
          v-if="!isAuthenticated"
          to="/pricing"
          class="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-[var(--chrome-text)] transition hover:bg-[var(--chrome-hover)]"
        >
          Pricing
        </RouterLink>
        <a class="relative inline-flex items-center justify-center rounded-md p-2 text-[var(--chrome-text)] transition hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-text)]" href="/notifications" aria-label="Notifications">
          <Bell :size="18" />
          <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4b63] px-1 text-[0.625rem] font-normal text-white">8</span>
        </a>
        <button
          class="inline-flex items-center justify-center rounded-md p-2 text-[var(--chrome-text)] transition hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-text)]"
          type="button"
          :aria-label="themeToggleLabel"
          :title="themeToggleLabel"
          @click="toggleThemeMode"
        >
          <Sun v-if="isDarkTheme" :size="18" />
          <Moon v-else :size="18" />
        </button>
        <a class="inline-flex items-center justify-center rounded-md p-2 text-[var(--chrome-accent)] transition hover:bg-[var(--chrome-hover)]" href="https://users.sentimentrader.com/users/" title="Back to Classic Site">
          <Home :size="20" />
        </a>

        <div class="group relative">
          <button class="inline-flex h-9 items-center gap-2 rounded-md border border-transparent px-3 text-sm font-normal text-[var(--chrome-text)] transition hover:bg-[var(--chrome-hover)]">
            Tutorial & Webinar Videos
            <ChevronDown :size="14" />
          </button>
          <div class="invisible absolute right-0 top-full z-30 mt-1 min-w-[250px] rounded-md border border-[var(--chrome-menu-border)] bg-[var(--chrome-menu-bg)] py-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
            <a v-for="item in tutorialItems" :key="item.keyPath" :href="item.path" target="_blank" class="flex items-center gap-2 px-3 py-2 text-sm font-normal text-[var(--chrome-text)] hover:bg-[var(--chrome-menu-hover)]">
              <Play :size="15" />
              {{ item.label }}
            </a>
          </div>
        </div>

        <div class="group relative">
          <button class="inline-flex h-9 items-center gap-2 rounded-md border border-transparent px-3 text-sm font-normal text-[var(--chrome-text)] transition hover:bg-[var(--chrome-hover)]">
            Help
            <ChevronDown :size="14" />
          </button>
          <div class="invisible absolute right-0 top-full z-30 mt-1 min-w-[260px] rounded-md border border-[var(--chrome-menu-border)] bg-[var(--chrome-menu-bg)] py-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
            <component
              :is="item.external ? 'a' : 'RouterLink'"
              v-for="item in helpItems"
              :key="item.keyPath"
              :href="item.external ? item.path : undefined"
              :to="!item.external ? item.path : undefined"
              :target="item.external ? '_blank' : undefined"
              class="flex items-center gap-2 px-3 py-2 text-sm font-normal text-[var(--chrome-text)] hover:bg-[var(--chrome-menu-hover)]"
            >
              <CircleHelp v-if="item.keyPath === '2-2'" :size="15" />
              <BookOpen v-else :size="15" />
              {{ item.label }}
            </component>
          </div>
        </div>

        <div class="group relative">
          <button class="inline-flex h-9 items-center gap-2 rounded-md border border-transparent px-3 text-sm font-normal text-[var(--chrome-text)] transition hover:bg-[var(--chrome-hover)]">
            <!-- White on the accent disc in both themes, so it stays off the chrome text token. -->
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chrome-accent)] text-white">
              <User :size="18" />
            </span>
            My Account
            <ChevronDown :size="14" />
          </button>
          <div class="invisible absolute right-0 top-full z-30 mt-1 min-w-[220px] rounded-md border border-[var(--chrome-menu-border)] bg-[var(--chrome-menu-bg)] py-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
            <div class="border-b border-[var(--chrome-border-muted)] px-3 pb-2 mb-1">
              <p class="truncate text-sm font-medium text-[var(--chrome-text)]">{{ currentUsername }}</p>
            </div>
            <component
              :is="item.external ? 'a' : 'RouterLink'"
              v-for="item in accountItems"
              :key="item.keyPath"
              :href="item.external ? item.path : undefined"
              :to="!item.external ? item.path : undefined"
              :target="item.external ? '_blank' : undefined"
              class="flex items-center gap-2 px-3 py-2 text-sm font-normal text-[var(--chrome-text)] hover:bg-[var(--chrome-menu-hover)]"
            >
              <Settings v-if="item.keyPath === '3-1'" :size="15" />
              <User v-else-if="item.keyPath === '3-2'" :size="15" />
              <KeyRound v-else-if="item.keyPath === '3-3'" :size="15" />
              <MessageCircle v-else-if="item.keyPath === '3-4'" :size="15" />
              <LogOut v-else-if="item.keyPath === '3-6'" :size="15" />
              <CircleHelp v-else :size="15" />
              {{ item.label }}
            </component>
          </div>
        </div>
      </div>
    </div>

    <nav class="relative flex h-11 items-stretch overflow-visible border-t border-[var(--chrome-border-muted)] bg-[var(--chrome-bg)] px-[var(--page-gutter)] text-[var(--chrome-text)]">
      <div v-for="item in visibleNavItems" :key="item.keyPath" class="group relative flex min-w-0">
        <component
          :is="item.external ? 'a' : 'RouterLink'"
          :href="item.external ? item.path : undefined"
          :to="!item.external ? firstPath(item) : undefined"
          :target="item.external ? '_blank' : undefined"
          class="flex items-center whitespace-nowrap px-2.5 text-sm font-normal text-[var(--chrome-text)] transition hover:bg-[var(--chrome-hover)]"
          :class="{ 'bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] shadow-[inset_0_-4px_0_var(--chrome-accent)]': isActive(item) }"
        >
          {{ item.label }}
          <ChevronDown v-if="item.subMenu?.length" class="ml-1" :size="13" />
        </component>
        <div
          v-if="item.subMenu?.length"
          class="absolute left-0 top-full z-30 hidden min-w-[230px] rounded-b-md border border-[var(--chrome-menu-border)] bg-[var(--chrome-menu-bg-alt)] py-2 shadow-xl group-hover:block"
        >
          <component
            :is="subItem.external ? 'a' : 'RouterLink'"
            v-for="subItem in item.subMenu"
            :key="subItem.keyPath"
            :href="subItem.external ? subItem.path : undefined"
            :to="!subItem.external ? subItem.path : undefined"
            :target="subItem.external ? '_blank' : undefined"
            class="block px-4 py-2 text-sm font-normal text-[var(--chrome-text)] hover:bg-[var(--chrome-menu-hover)]"
          >
            {{ subItem.label }}
          </component>
        </div>
      </div>
    </nav>
  </header>
</template>
