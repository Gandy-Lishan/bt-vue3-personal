<!--
  ReportsFilter.vue — Vue3 adapted version

  Original: Vue2 with el-select (multiple + collapse-tags), Vuex mapGetters, EventBus
  Adaptation: custom dropdown replicating the el-select multiple collapse-tags layout,
  Pinia store, direct DOM manipulation. Preserves original filtering logic.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useChartIQStore } from '@/entities/chartiq/model/chartiq.store'

type FilterOption = { value: string; label: string }
type MenuKey = 'market' | 'timeframe' | 'author'

const chartIQStore = useChartIQStore()
const rootRef = ref<HTMLElement | null>(null)
const openMenu = ref<MenuKey | ''>('')

const optionsMarket: FilterOption[] = [
  { value: 'bullish', label: 'Bullish' },
  { value: 'bearish', label: 'Bearish' },
]

const optionsTimeframe: FilterOption[] = [
  { value: 'Short-Term', label: 'Short-Term' },
  { value: 'Medium-Term', label: 'Medium-Term' },
  { value: 'Long-Term', label: 'Long-Term' },
]

const valueMarket = ref<string[]>(['bearish', 'bullish'])
const valueTimeframe = ref<string[]>(['Short-Term', 'Medium-Term', 'Long-Term'])
const valueAuthor = ref<string[]>([])
const optionsAuthor = ref<FilterOption[]>([])

const valueByKey: Record<MenuKey, typeof valueMarket> = {
  market: valueMarket,
  timeframe: valueTimeframe,
  author: valueAuthor,
}

const menus = computed(() => [
  { key: 'market' as MenuKey, placeholder: 'market type', options: optionsMarket, selected: valueMarket.value },
  { key: 'timeframe' as MenuKey, placeholder: 'timeframe', options: optionsTimeframe, selected: valueTimeframe.value },
  { key: 'author' as MenuKey, placeholder: 'author', options: optionsAuthor.value, selected: valueAuthor.value },
])

function selectedLabels(menu: { options: FilterOption[]; selected: string[] }) {
  return menu.selected.map((value) => menu.options.find((option) => option.value === value)?.label ?? value)
}

function filterReports() {
  document.querySelectorAll('.forecast').forEach((report) => {
    const reportAuthor = report.getAttribute('data-author')
    const reportTimeframe = report.getAttribute('data-timeframe')
    const reportMarket = report.getAttribute('data-market')
    if ((report as HTMLElement).id === 'stxForecast') return

    if (
      valueAuthor.value.includes(reportAuthor ?? '') &&
      valueTimeframe.value.includes(reportTimeframe ?? '') &&
      valueMarket.value.includes(reportMarket ?? '')
    ) {
      report.classList.remove('hidden')
    } else {
      report.classList.add('hidden')
    }
  })
}

function toggleMenu(key: MenuKey) {
  openMenu.value = openMenu.value === key ? '' : key
}

function toggleValue(key: MenuKey, value: string) {
  const list = valueByKey[key]
  list.value = list.value.includes(value)
    ? list.value.filter((item) => item !== value)
    : [...list.value, value]
  filterReports()
}

function removeValue(key: MenuKey, value: string) {
  const list = valueByKey[key]
  list.value = list.value.filter((item) => item !== value)
  filterReports()
}

function updateAuthorOptions() {
  const authorList = chartIQStore.forecastAuthorList as string[]
  if (authorList && authorList.length) {
    optionsAuthor.value = authorList.map((item) => ({ value: item, label: item }))
    valueAuthor.value = [...authorList]
    filterReports()
  }
}

watch(() => chartIQStore.forecastAuthorList, updateAuthorOptions)

/** Vue2 el-select closes its dropdown on outside click. */
function closeOnOutsideClick(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    openMenu.value = ''
  }
}

onMounted(() => {
  updateAuthorOptions()
  document.addEventListener('click', closeOnOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeOnOutsideClick)
})
</script>

<template>
  <div ref="rootRef" class="reports-filter">
    <div
      v-for="menu in menus"
      :key="menu.key"
      class="reports-filter__select"
      :class="{ 'is-open': openMenu === menu.key }"
      @click="toggleMenu(menu.key)"
    >
      <div class="reports-filter__tags">
        <span v-if="!menu.selected.length" class="reports-filter__placeholder">{{ menu.placeholder }}</span>
        <template v-else>
          <span class="reports-filter__tag">
            <span class="reports-filter__tag-text">{{ selectedLabels(menu)[0] }}</span>
            <button
              class="reports-filter__tag-close"
              type="button"
              aria-label="Remove selection"
              @click.stop="removeValue(menu.key, menu.selected[0])"
            >×</button>
          </span>
          <span v-if="menu.selected.length > 1" class="reports-filter__tag">+ {{ menu.selected.length - 1 }}</span>
        </template>
      </div>
      <span class="reports-filter__caret" />

      <div v-if="openMenu === menu.key" class="reports-filter__dropdown" @click.stop>
        <div
          v-for="item in menu.options"
          :key="item.value"
          class="reports-filter__option"
          :class="{ 'is-selected': menu.selected.includes(item.value) }"
          @click="toggleValue(menu.key, item.value)"
        >
          <span>{{ item.label }}</span>
          <span v-if="menu.selected.includes(item.value)" class="reports-filter__check">✓</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 旧版此处是 Element UI 的 el-select，样式沿用 Element 默认主题。
   这里保留 Element 的实际色值（含暗色覆盖），以复刻旧版外观。 */
.reports-filter {
  --rf-bg: #ffffff;
  --rf-border: #dddddd;
  --rf-text: #606266;
  --rf-placeholder: #c0c4cc;
  --rf-chip-bg: #f0f2f5;
  --rf-chip-text: #909399;
  --rf-close-bg: #c0c4cc;
  --rf-dropdown-border: #e4e7ed;
  --rf-option-hover: #f5f7fa;
  --rf-primary: #409eff;

  padding-left: 20px;
  height: 45px;
  display: flex;
  align-items: center;
}

:root[data-theme='dark'] .reports-filter {
  --rf-bg: var(--app-surface, #0f1b2b);
  --rf-border: var(--app-border, #29445f);
  --rf-text: var(--app-text-secondary, #d8e8ff);
  --rf-placeholder: var(--app-text-muted, #9fb2cc);
  --rf-chip-bg: var(--app-surface-muted, #142337);
  --rf-chip-text: var(--app-text-muted, #9fb2cc);
  --rf-close-bg: var(--app-border-strong, #3a5672);
  --rf-dropdown-border: var(--app-border, #29445f);
  --rf-option-hover: var(--app-surface-muted, #142337);
  --rf-primary: var(--app-primary, #61b4ff);
}

.reports-filter__select {
  position: relative;
  box-sizing: border-box;
  width: 193px;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 35px 0 10px;
  border: 1px solid var(--rf-border);
  border-radius: 4px;
  background: var(--rf-bg);
  color: var(--rf-text);
  font-size: 14px;
  cursor: pointer;
  user-select: none;
}

.reports-filter__select + .reports-filter__select {
  margin-left: 0;
}

.reports-filter__select.is-open {
  border-color: var(--rf-primary);
}

.reports-filter__tags {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 161px;
  white-space: nowrap;
}

.reports-filter__placeholder {
  color: var(--rf-placeholder);
  font-size: 14px;
}

.reports-filter__tag {
  display: inline-flex;
  flex: none;
  align-items: center;
  height: 24px;
  margin: 2px 0 2px 6px;
  padding: 0 8px;
  border-radius: 4px;
  background: var(--rf-chip-bg);
  color: var(--rf-chip-text);
  font-size: 12px;
  line-height: 22px;
}

/* el-select 的 tags 层覆盖在输入框 padding 上（标签距边框 6px） */
.reports-filter__tag:first-child {
  margin-left: -5px;
}

.reports-filter__tag-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.reports-filter__tag-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 2px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--rf-close-bg);
  color: var(--rf-bg);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.reports-filter__tag-close:hover {
  background: var(--rf-chip-text);
}

/* Element UI 下拉箭头是细线 chevron（el-icon-arrow-up），不是实心三角 */
.reports-filter__caret {
  position: absolute;
  top: 50%;
  right: 10px;
  width: 8px;
  height: 8px;
  margin-top: -6px;
  border-right: 1px solid var(--rf-close-bg);
  border-bottom: 1px solid var(--rf-close-bg);
  transform: rotate(45deg);
  transition: transform 0.2s;
}

.reports-filter__select.is-open .reports-filter__caret {
  margin-top: -2px;
  transform: rotate(225deg);
}

.reports-filter__dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 3000;
  min-width: 193px;
  max-height: 274px;
  overflow-y: auto;
  padding: 6px 0;
  border: 1px solid var(--rf-dropdown-border);
  border-radius: 4px;
  background: var(--rf-bg);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.reports-filter__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 34px;
  padding: 0 20px;
  color: var(--rf-text);
  font-size: 14px;
  line-height: 34px;
  cursor: pointer;
}

.reports-filter__option:hover {
  background: var(--rf-option-hover);
}

.reports-filter__option.is-selected {
  color: var(--rf-primary);
}

.reports-filter__check {
  color: var(--rf-primary);
  font-size: 12px;
}
</style>
