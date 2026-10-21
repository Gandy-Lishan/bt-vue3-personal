<!--
  ReportsFilter.vue — Vue3 adapted version

  Original: Vue2 with el-select, Vuex mapGetters, EventBus
  Adaptation: native select elements, Pinia store, direct DOM manipulation
  Preserves original filtering logic.
-->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useChartIQStore } from '@/entities/chartiq/model/chartiq.store'

const chartIQStore = useChartIQStore()

const optionsMarket = [
  { value: 'bullish', label: 'Bullish' },
  { value: 'bearish', label: 'Bearish' },
]

const optionsTimeframe = [
  { value: 'Short-Term', label: 'Short-Term' },
  { value: 'Medium-Term', label: 'Medium-Term' },
  { value: 'Long-Term', label: 'Long-Term' },
]

const valueMarket = ref<string[]>(['bearish', 'bullish'])
const valueTimeframe = ref<string[]>(['Short-Term', 'Medium-Term', 'Long-Term'])
const valueAuthor = ref<string[]>([])
const optionsAuthor = ref<Array<{ value: string; label: string }>>([])

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

function updateAuthorOptions() {
  const authorList = chartIQStore.forecastAuthorList as string[]
  if (authorList && authorList.length) {
    optionsAuthor.value = authorList.map((item) => ({ value: item, label: item }))
    valueAuthor.value = [...authorList]
    filterReports()
  }
}

watch(() => chartIQStore.forecastAuthorList, updateAuthorOptions)

onMounted(() => {
  updateAuthorOptions()
})
</script>

<template>
  <div class="reports-filter">
    <select v-model="valueMarket" multiple @change="filterReports">
      <option v-for="item in optionsMarket" :key="item.value" :value="item.value">
        {{ item.label }}
      </option>
    </select>
    <select v-model="valueTimeframe" multiple @change="filterReports">
      <option v-for="item in optionsTimeframe" :key="item.value" :value="item.value">
        {{ item.label }}
      </option>
    </select>
    <select v-model="valueAuthor" multiple @change="filterReports">
      <option v-for="item in optionsAuthor" :key="item.value" :value="item.value">
        {{ item.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.reports-filter {
  padding-left: 20px;
  height: 45px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reports-filter select {
  margin-left: 0;
}
</style>
