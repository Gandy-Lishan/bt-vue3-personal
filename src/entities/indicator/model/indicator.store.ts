import { defineStore } from 'pinia'
import {
  fetchIndicatorDetail,
  fetchIndicatorInfoRows,
  fetchIndicatorList,
  fetchIndicatorTrends,
  fetchLegacyFavoriteIndicators,
} from '../api/indicator.api'
import { fetchFavorites, updateFavorite } from '../api/favorites.api'
import { indicatorGroups, indicatorSourceLabels, indicatorSubgroupIndex } from './indicator.catalog'
import { favoriteIds, favoriteStubRow, parseFavoritesPayload } from './indicator.favorites'
import type { FavoriteIndicator } from './indicator.favorites'
import { normalizeIndicatorRows } from './indicator.adapter'
import { inferIndicatorSourceFromDetail, isKnownIndicatorSource } from './indicator.source'
import { compareSortValues, indicatorSortValue } from './indicator.values'
import { INDICATOR_PAGE_SIZE } from './indicator.table'
import type { IndicatorTableColumnKind } from './indicator.table'
import type {
  Indicator,
  IndicatorDetail,
  IndicatorSection,
  IndicatorSortDirection,
  IndicatorViewMode,
} from './indicator.types'

interface IndicatorState {
  activeSection: IndicatorSection
  viewMode: IndicatorViewMode
  activeGroupId: string
  activeSubgroupId: string
  searchQuery: string
  groupFilter: string
  timeFrameFilter: string
  sentimentFilter: string
  sortKey: string
  sortKind: IndicatorTableColumnKind | null
  sortDirection: IndicatorSortDirection
  page: number
  itemsBySource: Record<string, Indicator[]>
  loadingBySource: Record<string, boolean>
  loadedBySource: Record<string, boolean>
  trendLoadedByBatch: Record<string, boolean>
  trendLoadingByBatch: Record<string, boolean>
  detailsById: Record<string, IndicatorDetail>
  sourceHintById: Record<string, string>
  favoriteIndicators: FavoriteIndicator[]
  favoriteAccountItems: Indicator[]
  favoriteLegacyItems: Indicator[]
  favoriteSymbolRaw: string
  favoritesLoaded: boolean
  favoritesLoading: boolean
  favoriteListLoaded: boolean
  favoriteListLoading: boolean
  toasts: IndicatorToast[]
}

export interface IndicatorToast {
  id: number
  message: string
  tone: 'error' | 'info'
}

let nextToastId = 1

/**
 * Favorites writes are chained so that rapid toggles reach the server in the order the
 * user made them. Kept outside reactive state — a Promise in `state` would be tracked
 * for rendering and serialized into devtools.
 */
const favoriteWriteQueues = new WeakMap<object, Promise<void>>()
const favoriteLoadQueues = new WeakMap<object, Promise<void>>()
const favoriteListLoadQueues = new WeakMap<object, Promise<void>>()

function enqueueFavoriteWrite(store: object, write: () => Promise<void>): Promise<void> {
  const previous = favoriteWriteQueues.get(store) ?? Promise.resolve()
  const next = previous.then(write, write)
  favoriteWriteQueues.set(store, next)
  return next
}

const favoriteDetailSource = 'favorite_detail'

function accountFavoriteRow(indicator: Indicator): Indicator {
  return { ...indicator, favorite: true, favoriteSource: 'account', favoriteLocked: false }
}

function legacyFavoriteRow(indicator: Indicator): Indicator {
  return { ...indicator, favorite: true, favoriteSource: 'legacy', favoriteLocked: true }
}

function mergeFavoriteItems(accountItems: Indicator[], legacyItems: Indicator[]) {
  const seen = new Set<string>()
  const merged: Indicator[] = []

  for (const item of [...accountItems, ...legacyItems]) {
    const key = item.id.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }

  return merged
}

function indicatorById(items: Indicator[]) {
  return new Map(items.map((item) => [item.id.toLowerCase(), item]))
}

export const useIndicatorStore = defineStore('indicator', {
  state: (): IndicatorState => ({
    activeSection: 'indicators',
    viewMode: 'table',
    activeGroupId: 'stock',
    activeSubgroupId: 'stock',
    searchQuery: '',
    groupFilter: '',
    timeFrameFilter: '',
    sentimentFilter: '',
    sortKey: '',
    sortKind: null,
    sortDirection: 'asc',
    page: 1,
    itemsBySource: {},
    loadingBySource: {},
    loadedBySource: {},
    trendLoadedByBatch: {},
    trendLoadingByBatch: {},
    detailsById: {},
    sourceHintById: {},
    favoriteIndicators: [],
    favoriteAccountItems: [],
    favoriteLegacyItems: [],
    favoriteSymbolRaw: '[]',
    favoritesLoaded: false,
    favoritesLoading: false,
    favoriteListLoaded: false,
    favoriteListLoading: false,
    toasts: [],
  }),
  getters: {
    groups: () => indicatorGroups,
    activeGroup: (state) => indicatorGroups.find((group) => group.id === state.activeGroupId) ?? indicatorGroups[1],
    activeSubgroups(): ReturnType<typeof indicatorGroups[number]['subgroups']['slice']> {
      return this.activeGroup.subgroups
    },
    activeSubgroup(): (typeof indicatorGroups)[number]['subgroups'][number] {
      return this.activeSubgroups.find((subgroup) => subgroup.id === this.activeSubgroupId) ?? this.activeSubgroups[0]
    },
    activeSource(): string {
      if (this.activeSection === 'popular') return 'most_popular'
      if (this.activeSection === 'favorites') return favoriteDetailSource
      return this.activeSubgroup.source
    },
    /**
     * My Favorites is driven by the server list alone. It deliberately does not fall
     * back to filtering rows by their `favorite` flag: removing the last favorite would
     * otherwise leave the underlying row still flagged and the star would reappear.
     */
    favoriteItems(state): Indicator[] {
      if (state.favoriteListLoaded || state.favoriteAccountItems.length || state.favoriteLegacyItems.length) {
        return mergeFavoriteItems(state.favoriteAccountItems, state.favoriteLegacyItems)
      }

      const index = this.indicatorsById
      return state.favoriteIndicators.map((favorite) =>
        accountFavoriteRow(index.get(favorite.url.toLowerCase()) ?? favoriteStubRow(favorite)),
      )
    },
    legacyFavoriteCount(state): number {
      return state.favoriteLegacyItems.length
    },
    sourceItems(state): Indicator[] {
      if (state.activeSection === 'favorites') return this.favoriteItems

      return state.itemsBySource[this.activeSource] ?? []
    },
    filteredItems(state): Indicator[] {
      const query = state.searchQuery.trim().toLowerCase()
      return this.sourceItems.filter((item) => {
        const matchesQuery =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.group.toLowerCase().includes(query) ||
          item.subgroup.toLowerCase().includes(query)
        const matchesGroup = !state.groupFilter || item.group === state.groupFilter || item.subgroup === state.groupFilter
        const matchesTimeFrame = !state.timeFrameFilter || item.timeFrame === state.timeFrameFilter
        const matchesSentiment = !state.sentimentFilter || item.sentiment === state.sentimentFilter
        return matchesQuery && matchesGroup && matchesTimeFrame && matchesSentiment
      })
    },
    sortedItems(state): Indicator[] {
      if (!state.sortKey) return this.filteredItems

      return this.filteredItems
        .map((item, index) => ({ item, index }))
        .sort((left, right) => {
          const leftValue = indicatorSortValue(left.item, state.sortKey, state.sortKind ?? 'text')
          const rightValue = indicatorSortValue(right.item, state.sortKey, state.sortKind ?? 'text')
          const compared = compareSortValues(leftValue, rightValue, state.sortDirection)
          return compared || left.index - right.index
        })
        .map(({ item }) => item)
    },
    pageSize() {
      return INDICATOR_PAGE_SIZE
    },
    pagedItems(): Indicator[] {
      const start = (this.page - 1) * this.pageSize
      return this.sortedItems.slice(start, start + this.pageSize)
    },
    pageCount(): number {
      return Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize))
    },
    resultStart(): number {
      if (!this.filteredItems.length) return 0
      return (this.page - 1) * this.pageSize + 1
    },
    resultEnd(): number {
      return Math.min(this.page * this.pageSize, this.filteredItems.length)
    },
    totalIndicators(): number {
      return this.filteredItems.length
    },
    optimisticCount(): number {
      return this.filteredItems.filter((item) => item.sentiment === 'optimistic').length
    },
    pessimisticCount(): number {
      return this.filteredItems.filter((item) => item.sentiment === 'pessimistic').length
    },
    isCurrentSourceLoading(state): boolean {
      if (state.activeSection === 'favorites') return state.favoriteListLoading
      return Boolean(state.loadingBySource[this.activeSource])
    },
    /**
     * Identity of the list being browsed, so it can round-trip through the route and
     * survive a reload. Standalone sections use their own name, everything else the
     * subgroup id.
     */
    listKey(): string {
      if (this.activeSection === 'popular') return 'popular'
      if (this.activeSection === 'favorites') return 'favorites'
      return this.activeSubgroupId
    },
    listLabel(): string {
      if (this.activeSection === 'popular') return 'Most Popular'
      if (this.activeSection === 'favorites') return 'My Favorites'
      return this.activeSubgroup.fullName ?? this.activeSubgroup.label
    },
    isStandaloneList(): boolean {
      return this.activeSection !== 'indicators'
    },
    /** Every indicator loaded so far, keyed by lowercased id. First list loaded wins. */
    indicatorsById(state): Map<string, Indicator> {
      const index = new Map<string, Indicator>()
      for (const source of Object.keys(state.itemsBySource)) {
        for (const item of state.itemsBySource[source]) {
          const key = item.id.toLowerCase()
          if (!index.has(key)) index.set(key, item)
        }
      }
      for (const item of [...state.favoriteAccountItems, ...state.favoriteLegacyItems]) {
        const key = item.id.toLowerCase()
        if (!index.has(key)) index.set(key, item)
      }
      return index
    },
  },
  actions: {
    async ensureCurrentList() {
      if (this.activeSection === 'favorites') {
        await this.ensureFavoriteList()
        return
      }

      await this.ensureList(this.activeSource)
    },
    async ensureList(source: string) {
      if (this.loadedBySource[source] || this.loadingBySource[source]) return
      this.loadingBySource[source] = true
      try {
        this.itemsBySource[source] = await fetchIndicatorList(source)
        this.loadedBySource[source] = true
        // Favorites are fetched once on app mount, before any list has loaded, so the
        // overlay has to be re-applied to each list as it arrives.
        if (this.favoritesLoaded) this.applyFavoriteFlags()
      } finally {
        this.loadingBySource[source] = false
      }
    },
    async ensureDetail(id: string) {
      if (this.detailsById[id]) return this.detailsById[id]
      const detail = await fetchIndicatorDetail(id)
      this.detailsById[id] = detail
      return detail
    },
    async ensureTrendsForIndicators(indicators: Indicator[]) {
      const urls = Array.from(new Set(indicators.map((indicator) => indicator.id).filter(Boolean)))
      const batchKey = JSON.stringify(urls)
      if (!urls.length || this.trendLoadedByBatch[batchKey] || this.trendLoadingByBatch[batchKey]) return

      this.trendLoadingByBatch[batchKey] = true

      try {
        const trendsByUrl = await fetchIndicatorTrends(urls)
        urls.forEach((url) => {
          this.setIndicatorTrend(url, trendsByUrl[url] ?? [])
        })
        this.trendLoadedByBatch[batchKey] = true
      } finally {
        this.trendLoadingByBatch[batchKey] = false
      }
    },
    setSection(section: IndicatorSection) {
      if (section === 'favorites' && this.activeSection !== 'favorites') {
        this.favoriteListLoaded = false
        this.favoriteAccountItems = []
        this.favoriteLegacyItems = []
      }
      this.activeSection = section
      this.page = 1
    },
    setViewMode(mode: IndicatorViewMode) {
      this.viewMode = mode
      this.page = 1
    },
    setGroup(groupId: string) {
      const group = indicatorGroups.find((item) => item.id === groupId) ?? indicatorGroups[1]
      this.activeGroupId = group.id
      this.activeSubgroupId = group.subgroups[0].id
      this.page = 1
    },
    /**
     * Restore a list from a route key: a standalone section name, or a subgroup id.
     * Returns false for anything unrecognised so callers can fall back.
     */
    setListKey(key: string) {
      if (key === 'popular' || key === 'favorites') {
        this.setSection(key)
        return true
      }

      const entry = indicatorSubgroupIndex.get(key)
      if (!entry) return false

      this.activeSection = 'indicators'
      this.activeGroupId = entry.group.id
      this.activeSubgroupId = entry.subgroup.id
      this.page = 1
      return true
    },
    setActiveSource(source: string) {
      const sourceMeta = indicatorSourceLabels.get(source)
      if (!sourceMeta) return false

      this.activeSection = 'indicators'
      this.activeGroupId = sourceMeta.group.id
      this.activeSubgroupId = sourceMeta.subgroup.id
      this.page = 1
      return true
    },
    setSubgroup(subgroupId: string) {
      this.activeSubgroupId = subgroupId
      this.page = 1
    },
    rememberIndicatorSource(id: string, source: string) {
      if (!id || !isKnownIndicatorSource(source)) return
      this.sourceHintById[id.toLowerCase()] = source
    },
    sourceForDetail(id: string, detail: IndicatorDetail) {
      const hintedSource = this.sourceHintById[id.toLowerCase()]
      if (hintedSource && isKnownIndicatorSource(hintedSource)) return hintedSource
      return inferIndicatorSourceFromDetail(detail, id)
    },
    setSort(column: { key: string; kind?: IndicatorTableColumnKind }, direction?: IndicatorSortDirection) {
      if (this.sortKey === column.key && !direction) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortKey = column.key
        this.sortKind = column.kind ?? 'text'
        this.sortDirection = direction ?? 'asc'
      }
      this.page = 1
    },
    clearSort() {
      this.sortKey = ''
      this.sortKind = null
      this.sortDirection = 'asc'
      this.page = 1
    },
    resetFilters() {
      this.searchQuery = ''
      this.groupFilter = ''
      this.timeFrameFilter = ''
      this.sentimentFilter = ''
      // Sort counts as a filter here — Reset restores the default ordering too.
      this.sortKey = ''
      this.sortKind = null
      this.sortDirection = 'asc'
      this.page = 1
    },
    clampPage() {
      this.page = Math.max(1, Math.min(this.page, this.pageCount))
    },
    /** Load the server list, then overlay it onto the loaded rows' star flags. */
    async ensureFavorites(force = false) {
      if (this.favoritesLoaded && !force) return

      const existing = favoriteLoadQueues.get(this)
      if (existing) return existing

      this.favoritesLoading = true
      const load = (async () => {
        try {
          const payload = parseFavoritesPayload(await fetchFavorites())
          this.favoriteIndicators = payload.indicators
          this.favoriteSymbolRaw = payload.symbolsRaw
          this.favoritesLoaded = true
          this.favoriteListLoaded = false
          this.applyFavoriteFlags()
        } catch {
          // Leave the row-level flags alone so stars survive a failed request.
        } finally {
          this.favoritesLoading = false
          favoriteLoadQueues.delete(this)
        }
      })()

      favoriteLoadQueues.set(this, load)
      return load
    },
    async ensureFavoriteList() {
      if (this.favoriteListLoaded || this.favoriteListLoading) return favoriteListLoadQueues.get(this)

      this.favoriteListLoading = true
      const load = (async () => {
        try {
          await this.ensureFavorites(true)

          const detailRows = await fetchIndicatorInfoRows(this.favoriteIndicators.map((favorite) => favorite.url))
          const detailItems = indicatorById(normalizeIndicatorRows(detailRows, favoriteDetailSource))
          this.favoriteAccountItems = this.favoriteIndicators.map((favorite) =>
            accountFavoriteRow(detailItems.get(favorite.url.toLowerCase()) ?? favoriteStubRow(favorite)),
          )

          this.favoriteLegacyItems = (await fetchLegacyFavoriteIndicators()).map(legacyFavoriteRow)
          this.favoriteListLoaded = true
        } finally {
          this.favoriteListLoading = false
          favoriteListLoadQueues.delete(this)
        }
      })()

      favoriteListLoadQueues.set(this, load)
      return load
    },
    applyFavoriteFlags() {
      const ids = favoriteIds(this.favoriteIndicators)
      for (const source of Object.keys(this.itemsBySource)) {
        this.itemsBySource[source] = this.itemsBySource[source].map((item) =>
          item.favorite === ids.has(item.id.toLowerCase()) ? item : { ...item, favorite: ids.has(item.id.toLowerCase()) },
        )
      }
    },
    /**
     * Optimistically flips the star, then persists the whole list.
     *
     * On failure the rollback is scoped to this one indicator rather than restoring a
     * whole-list snapshot: writes are serialized, so a snapshot taken here could be
     * stale by the time an earlier queued write fails, and restoring it would silently
     * undo a toggle the user made in between.
     */
    async toggleFavorite(id: string) {
      if (!this.favoritesLoaded) {
        await this.ensureFavorites()
      }

      const key = String(id ?? '').toLowerCase()
      if (!key) return

      const isFavorite = favoriteIds(this.favoriteIndicators).has(key)
      const name = this.indicatorsById.get(key)?.name ?? key
      const shouldSyncLoadedFavoriteList =
        this.favoriteListLoaded || this.favoriteAccountItems.length > 0 || this.favoriteLegacyItems.length > 0

      this.favoriteIndicators = isFavorite
        ? this.favoriteIndicators.filter((favorite) => favorite.url.toLowerCase() !== key)
        : [...this.favoriteIndicators, { url: id, name }]
      if (shouldSyncLoadedFavoriteList) {
        this.favoriteAccountItems = isFavorite
          ? this.favoriteAccountItems.filter((item) => item.id.toLowerCase() !== key)
          : [
              ...this.favoriteAccountItems.filter((item) => item.id.toLowerCase() !== key),
              accountFavoriteRow(this.indicatorsById.get(key) ?? favoriteStubRow({ url: id, name })),
            ]
      }
      this.applyFavoriteFlags()

      const requested = this.favoriteIndicators
      const symbolsRaw = this.favoriteSymbolRaw

      await enqueueFavoriteWrite(this, async () => {
        try {
          await updateFavorite(requested, symbolsRaw)
        } catch {
          const present = favoriteIds(this.favoriteIndicators).has(key)
          if (isFavorite && !present) {
            this.favoriteIndicators = [...this.favoriteIndicators, { url: id, name }]
            if (shouldSyncLoadedFavoriteList) {
              this.favoriteAccountItems = [
                ...this.favoriteAccountItems.filter((item) => item.id.toLowerCase() !== key),
                accountFavoriteRow(this.indicatorsById.get(key) ?? favoriteStubRow({ url: id, name })),
              ]
            }
          } else if (!isFavorite && present) {
            this.favoriteIndicators = this.favoriteIndicators.filter(
              (favorite) => favorite.url.toLowerCase() !== key,
            )
            if (shouldSyncLoadedFavoriteList) {
              this.favoriteAccountItems = this.favoriteAccountItems.filter((item) => item.id.toLowerCase() !== key)
            }
          }
          this.applyFavoriteFlags()
          this.pushToast(
            isFavorite
              ? 'Could not remove favorite. Your change was reverted.'
              : 'Could not save favorite. Your change was reverted.',
          )
        }
      })
    },
    pushToast(message: string, tone: IndicatorToast['tone'] = 'error') {
      this.toasts = [...this.toasts, { id: nextToastId++, message, tone }]
    },
    dismissToast(id: number) {
      this.toasts = this.toasts.filter((toast) => toast.id !== id)
    },
    setIndicatorTrend(id: string, trendLines: number[][]) {
      const nextLines = trendLines.map((line) => [...line])
      const key = id.toLowerCase()
      const withTrend = (item: Indicator) =>
        item.id.toLowerCase() === key ? { ...item, trendLines: nextLines } : item

      for (const source of Object.keys(this.itemsBySource)) {
        this.itemsBySource[source] = this.itemsBySource[source].map(withTrend)
      }

      // My Favorites renders from its own lists once they have loaded, not from
      // `itemsBySource`, so trends have to be written there too or its sparkline stays
      // empty while every other list draws one.
      this.favoriteAccountItems = this.favoriteAccountItems.map(withTrend)
      this.favoriteLegacyItems = this.favoriteLegacyItems.map(withTrend)

      if (this.detailsById[id]) {
        this.detailsById[id] = { ...this.detailsById[id], trendLines: nextLines }
      }
    },
  },
})
