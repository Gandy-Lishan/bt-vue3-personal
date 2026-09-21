<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  page: number
  pageCount: number
  total: number
  itemLabel: string
}>()

const emit = defineEmits<{
  change: [page: number]
}>()

type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

const requestedPage = ref(String(props.page))

const normalizedPageCount = computed(() => Math.max(1, props.pageCount))

const visiblePages = computed<PageItem[]>(() => {
  const totalPages = normalizedPageCount.value
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: PageItem[] = [1]
  let start = Math.max(2, props.page - 2)
  let end = Math.min(totalPages - 1, props.page + 2)

  if (props.page <= 4) {
    start = 2
    end = 5
  } else if (props.page >= totalPages - 3) {
    start = totalPages - 4
    end = totalPages - 1
  }

  if (start > 2) {
    pages.push('ellipsis-start')
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (end < totalPages - 1) {
    pages.push('ellipsis-end')
  }

  pages.push(totalPages)

  return pages
})

watch(
  () => props.page,
  (page) => {
    requestedPage.value = String(page)
  },
)

function clampPage(page: number) {
  if (!Number.isFinite(page)) return props.page
  return Math.max(1, Math.min(Math.trunc(page), normalizedPageCount.value))
}

function changePage(page: number) {
  const nextPage = clampPage(page)
  requestedPage.value = String(nextPage)

  if (nextPage !== props.page) {
    emit('change', nextPage)
  }
}

function goToRequestedPage() {
  const trimmedValue = requestedPage.value.trim()
  const nextPage = Number(trimmedValue)

  if (!trimmedValue || !Number.isFinite(nextPage)) {
    requestedPage.value = String(props.page)
    return
  }

  changePage(nextPage)
}
</script>

<template>
  <nav class="indicator-pagination" aria-label="Pagination">
    <form class="indicator-pagination__jump" @submit.prevent="goToRequestedPage">
      <span>Go to</span>
      <input
        v-model="requestedPage"
        class="indicator-pagination__input"
        type="number"
        inputmode="numeric"
        min="1"
        :max="normalizedPageCount"
        aria-label="Go to page"
      />
      <button class="indicator-pagination__button" type="submit">
        Go
      </button>
    </form>

    <div class="indicator-pagination__pages" aria-label="Pages">
      <template v-for="item in visiblePages" :key="item">
        <button
          v-if="typeof item === 'number'"
          class="indicator-pagination__page"
          :class="{ 'indicator-pagination__page--active': item === page }"
          type="button"
          :aria-current="item === page ? 'page' : undefined"
          @click="changePage(item)"
        >
          {{ item }}
        </button>
        <span v-else class="indicator-pagination__ellipsis">...</span>
      </template>
    </div>

    <div class="indicator-pagination__status">
      <button class="indicator-pagination__button" type="button" :disabled="page <= 1" @click="changePage(page - 1)">
        Previous
      </button>
      <span class="indicator-pagination__summary">
        Page {{ page }} / {{ normalizedPageCount }} | {{ total }} {{ itemLabel }}
      </span>
      <button class="indicator-pagination__button" type="button" :disabled="page >= normalizedPageCount" @click="changePage(page + 1)">
        Next
      </button>
    </div>
  </nav>
</template>

<style scoped>
.indicator-pagination {
  display: grid;
  grid-template-columns: minmax(190px, 1fr) auto minmax(250px, 1fr);
  align-items: center;
  gap: 12px;
  color: var(--app-text-secondary);
  font-size: 0.8125rem;
  font-weight: 700;
}

.indicator-pagination__jump,
.indicator-pagination__pages,
.indicator-pagination__status {
  display: flex;
  align-items: center;
  gap: 7px;
}

.indicator-pagination__jump {
  justify-self: start;
}

.indicator-pagination__pages {
  justify-self: center;
}

.indicator-pagination__status {
  justify-self: end;
}

.indicator-pagination__input,
.indicator-pagination__button,
.indicator-pagination__page {
  height: 32px;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  background: var(--app-surface);
  color: var(--app-text);
}

.indicator-pagination__input {
  width: 64px;
  padding: 0 10px;
  font-weight: 800;
}

.indicator-pagination__button {
  padding: 0 12px;
  font-weight: 800;
}

.indicator-pagination__button:disabled {
  cursor: not-allowed;
  color: var(--app-text-muted);
  opacity: 0.55;
}

.indicator-pagination__page {
  width: 32px;
  font-weight: 800;
}

.indicator-pagination__page--active {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.indicator-pagination__ellipsis {
  min-width: 20px;
  text-align: center;
  color: var(--app-text-muted);
}

.indicator-pagination__summary {
  white-space: nowrap;
  color: var(--app-text);
}

@media (max-width: 1024px) {
  .indicator-pagination {
    grid-template-columns: 1fr;
  }

  .indicator-pagination__jump,
  .indicator-pagination__pages,
  .indicator-pagination__status {
    justify-self: start;
    flex-wrap: wrap;
  }
}
</style>
