/**
 * STStockDataFeed — Vue3 adapted version
 *
 * Original: STStockDataFeed.js from Vue2 project
 * Adaptations:
 *   - CIQ.axios → native fetch
 *   - process.env.VUE_APP_* → import.meta.env.VITE_*
 *   - CIQ.store.* → Pinia store accessed via (CIQ as any).store
 *   - _this.popUpMsgBox → callback pattern
 *   - LRUCache → Map-based cache
 *   - @/utils, @/service/* → removed or adapted
 */

// @ts-expect-error CIQ from ChartIQ library
import { CIQ } from '../../../st-development/js/components'
import { formatStandardTime } from '@/shared/utils/time'

const VITE_DEFAULT_SYMBOL = import.meta.env.VITE_DEFAULT_SYMBOL || 'AAPL'
const VITE_START_DATE = parseInt(import.meta.env.VITE_START_DATE || '0', 10)

const PAIR_DATA_URL = '/dev/st_data/pair_data'
const INDICATORS_METADATA_URL = '/dev/st_data/indicators_metadata'
const CSV_FILE_READ_URL = '/dev/dev/csvfileread/'
const MY_INDICATOR_DATA_URL = '/dev/my_indicator/get_data/'
const ANALYST_MY_INDICATOR_DATA_URL = '/dev/my_indicator/analyst_get_data/'

// Simple Map-based LRU cache
const pairDataCache = new Map<string, { timestamp: number; response: unknown }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getFromCache(url: string): unknown | null {
  const entry = pairDataCache.get(url)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.response
  }
  pairDataCache.delete(url)
  return null
}

function setCache(url: string, response: unknown) {
  pairDataCache.set(url, { timestamp: Date.now(), response })
}

async function sendAjax(url: string): Promise<{ status: number; data: unknown }> {
  try {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) return { status: response.status, data: null }
    return { status: 200, data: await response.json() }
  } catch {
    return { status: 500, data: null }
  }
}

function sendAjaxCached(url: string): Promise<{ status: number; data: unknown }> {
  const cached = getFromCache(url)
  if (cached) return Promise.resolve({ status: 200, data: cached })
  return sendAjax(url).then((result) => {
    if (result.status === 200) setCache(url, result.data)
    return result
  })
}

function timestampToTime(timestamp: number): string {
  const date = new Date(timestamp)
  const Y = date.getFullYear()
  const M = String(date.getMonth() + 1).padStart(2, '0')
  const D = String(date.getDate()).padStart(2, '0')
  return `${Y}-${M}-${D}`
}

function getSymbolInfo(symbol: string): { type: string; name: string } {
  // Simplified symbol info — extend as needed
  if (symbol && !symbol.includes('||') && symbol.length <= 5) {
    return { type: 'stock', name: symbol }
  }
  if (symbol && /^[A-Z]+$/.test(symbol) && symbol.length <= 4) {
    return { type: 'index', name: symbol }
  }
  return { type: 'custom', name: symbol }
}

function getChartType(): string {
  const store = (CIQ as any).store
  return store?.getChartType ?? 'line'
}

function getFreqency(): string {
  const store = (CIQ as any).store
  return store?.form?.pairDataFreq ?? 'daily'
}

function setFreqency(value: string) {
  const store = (CIQ as any).store
  store?.setFreqency?.(value)
}

function getChartTypeGetter(): string {
  const store = (CIQ as any).store
  return store?.getChartType ?? 'line'
}

// Event emitter for popup messages (replaces _this.popUpMsgBox)
const eventBus = new EventTarget()
export function onChartIQPopupMessage(handler: (msg: string, duration?: number) => void) {
  eventBus.addEventListener('popup-message', (e) => {
    const detail = (e as CustomEvent).detail
    handler(detail.msg, detail.duration)
  })
}

function popUpMsgBox(msg: string, duration?: number) {
  eventBus.dispatchEvent(new CustomEvent('popup-message', { detail: { msg, duration } }))
}

const quoteFeedSimulator: {
  url: string
  initEndDate?: Date
  sendAjax(url: string, cb: (status: number, data: unknown) => void): void
  sendReq(start: string, end: string, new_str: string, freq: string, cb: Function): Promise<void>
  fetchInitialData(symbol: string, startDate: Date, endDate: Date, params: Record<string, unknown>, cb: Function): void
  fetchUpdateData(symbol: string, startDate: Date, params: Record<string, unknown>, cb: Function): void
  fetchPaginationData(symbol: string, suggestedStartDate: Date, endDate: Date, params: Record<string, unknown>, cb: Function): void
  filterMarkerDate(start_date: Date, end_date: Date, markerSet: Record<string, unknown>): unknown[]
  formatChartData(response: unknown): Promise<unknown[]>
} = {
  url: PAIR_DATA_URL,

  sendAjax(url, cb) {
    sendAjaxCached(url)
      .then((res) => cb(res.status, res.data))
      .catch(() => cb(500))
  },

  async sendReq(start, end, new_str, freq, cb) {
    let symbol = (CIQ as any).symbol ?? 'AAPL'
    const { type } = getSymbolInfo(symbol)
    if (!['stock', 'index'].includes(type)) {
      symbol = VITE_DEFAULT_SYMBOL
    }
    const queryUrl = `${this.url}?symbol=${symbol}${new_str}&start=${start}&end=${end}&freq=${freq}`

    this.sendAjax(queryUrl, async (status, response) => {
      const chartSymbol = CIQ.stxx?.chart?.symbol ?? symbol
      const { name } = getSymbolInfo(chartSymbol)
      if (CIQ.stxx) CIQ.stxx.chart.symbolDisplay = name

      const initialStart = (CIQ as any).initialDate?.start ?? VITE_START_DATE
      const isWholeData = initialStart === VITE_START_DATE
      const aiFlag = (CIQ as any).store?.getScannerAIFlagState ?? false
      const moreAvailable = aiFlag ? false : isWholeData ? false : true

      if (status === 200) {
        const newQuotes = await this.formatChartData(response)
        cb({
          moreAvailable,
          quotes: newQuotes,
          upToDate: true,
        })
      } else {
        cb({ error: response ? response : status })
      }
    })
  },

  fetchInitialData(symbol, startDate, endDate, params, cb) {
    const startDateParse = (params.symbolObject as any)?.startDate ?? startDate
    const endDateParse = (params.symbolObject as any)?.endDate ?? endDate
    const startDateTimeStamp = typeof startDateParse === 'string' ? new Date(startDateParse).getTime() : startDateParse.getTime()
    const endDateTimeStamp = typeof endDateParse === 'string' ? new Date(endDateParse).getTime() : endDateParse.getTime()
    const start = timestampToTime(startDateTimeStamp)
    const end = timestampToTime(endDateTimeStamp)

    ;(CIQ as any).initialDate = { start: startDateTimeStamp, end: endDateTimeStamp }
    ;(CIQ as any).symbol = symbol

    if ((params.symbolObject as any)?.indicator !== undefined) {
      ;(CIQ as any).objIndicator = (params.symbolObject as any).indicator
    }

    let new_str = ''
    let orignalFreq = 'daily'

    const objIndicator = (CIQ as any).objIndicator ?? []
    const list: string[] = []
    for (const key in objIndicator) {
      const ind = objIndicator[key]
      if (!(CIQ.findBuiltinTechIndicator?.(null, ind) || CIQ.findSymbolIndicator?.(ind, null))) {
        list.push(ind)
      }
    }

    if ((params.symbolObject as any)?.indicator === undefined) {
      new_str += '&indicator='
    } else if (list.length === 0) {
      new_str += '&indicator='
    } else {
      try {
        const freqList: string[] = []
        let valid = 0
        for (let i = 0; i < objIndicator.length; i++) {
          const sentiIndicatorRes = CIQ.findSentiIndicator?.(null, objIndicator[i])
          if (sentiIndicatorRes) {
            freqList.push(sentiIndicatorRes.updated)
            new_str += `${valid === 0 ? '&indicator=' : `&indicator_${valid + 1}=`}${objIndicator[i]}`
            valid++
            continue
          }

          if (CIQ.isUserIndicator?.(objIndicator[i]) || CIQ.isOwnIndicator?.(objIndicator[i]) || CIQ.findSymbolIndicator?.(objIndicator[i], null)) {
            if (CIQ.isOwnIndicator?.(objIndicator[i])) {
              const timeframeCode = objIndicator[i].split('-sh')[0].slice(-1)
              freqList.push(timeframeCode === '0' ? 'Daily' : timeframeCode === '1' ? 'Weekly' : 'Monthly')
            }
            valid++
            continue
          }
        }

        if (freqList.includes('Weekly')) orignalFreq = 'weekly'
        if (freqList.includes('Monthly')) orignalFreq = 'monthly'
      } catch (err) {
        console.error(err)
      }
    }

    let selectedFreq = orignalFreq
    const store = (CIQ as any).store
    const exitFrequency = store?.form?.exitFrequency
    switch (exitFrequency) {
      case 'Monthly':
        selectedFreq = 'monthly'
        break
      case 'Weekly':
        if (orignalFreq !== 'monthly') selectedFreq = 'weekly'
        break
      case 'Daily':
        if (orignalFreq !== 'monthly' && orignalFreq !== 'weekly') selectedFreq = 'daily'
        break
    }

    const restoreFreq = store?.form?.restoreFreq ?? ''
    if (restoreFreq) selectedFreq = restoreFreq

    setFreqency(selectedFreq)

    try {
      switch (selectedFreq) {
        case 'monthly':
          CIQ.periodicity.timeUnit = 'month'
          break
        case 'weekly':
          CIQ.periodicity.timeUnit = 'week'
          break
        case 'daily':
          CIQ.periodicity.timeUnit = 'day'
          break
      }
    } catch {
      // ignore
    }

    // Disable/enable periodicity options based on orignalFreq
    // (DOM manipulation kept as-is, runs after chart init)
    requestAnimationFrame(() => {
      const daily: HTMLElement[] = []
      const weekly: HTMLElement[] = []
      const nodes = document.getElementsByTagName('li')
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].classList.contains('timeframeResample')) continue
        const text = nodes[i].firstChild?.textContent
        if (text === 'Daily') daily.push(nodes[i])
        if (text === 'Weekly') weekly.push(nodes[i])
      }

      const node = document.querySelector("cq-menu-container[cq-name = 'menuPeriodicity']")
      if (!node) return
      for (let i = 0; i < node.children.length; i++) {
        node.children[i].style.display = 'inherit'
      }

      if (orignalFreq === 'monthly') {
        for (let i = 0; i < node.children.length; i++) {
          if (node.children[i].firstChild?.nodeValue === '1 D') node.children[i].setAttribute('tf', 'disabled')
          if (node.children[i].firstChild?.nodeValue === '1 W') node.children[i].setAttribute('tf', 'disabled')
        }
        daily.forEach((el) => el.setAttribute('tf', 'disabled'))
        weekly.forEach((el) => el.setAttribute('tf', 'disabled'))
      } else if (orignalFreq === 'weekly') {
        for (let i = 0; i < node.children.length; i++) {
          if (node.children[i].firstChild?.nodeValue === '1 D') node.children[i].setAttribute('tf', 'disabled')
          if (node.children[i].firstChild?.nodeValue === '1 W') node.children[i].setAttribute('tf', 'enabled')
        }
        daily.forEach((el) => el.setAttribute('tf', 'disabled'))
        weekly.forEach((el) => el.setAttribute('tf', 'enabled'))
      } else {
        for (let i = 0; i < node.children.length; i++) {
          if (node.children[i].firstChild?.nodeValue === '1 D') node.children[i].setAttribute('tf', 'enabled')
          if (node.children[i].firstChild?.nodeValue === '1 W') node.children[i].setAttribute('tf', 'enabled')
        }
        daily.forEach((el) => el.setAttribute('tf', 'enabled'))
        weekly.forEach((el) => el.setAttribute('tf', 'enabled'))
      }
    })

    this.sendReq(start, end, new_str, selectedFreq, cb)
  },

  fetchUpdateData(symbol, startDate, params, cb) {
    const start = timestampToTime(Date.parse(String(this.initEndDate ?? new Date())))
    let new_str = ''
    let freq = 'daily'
    const objIndicator = (CIQ as any).objIndicator ?? []

    const list: string[] = []
    for (const key in objIndicator) {
      if (!CIQ.findBuiltinTechIndicator?.(null, objIndicator[key])) list.push(objIndicator[key])
    }

    if ((params as any).symbolObject?.indicator === undefined) {
      new_str += '&indicator='
    } else if (list.length === 0) {
      new_str += '&indicator='
    } else {
      try {
        const freqList: string[] = []
        let valid = 0
        for (let i = 0; i < objIndicator.length; i++) {
          const sentiRes = CIQ.findSentiIndicator?.(null, objIndicator[i])
          if (sentiRes) {
            freqList.push(sentiRes.updated)
            new_str += `${valid === 0 ? '&indicator=' : `&indicator_${valid + 1}=`}${objIndicator[i]}`
            valid++
            continue
          }
          if (CIQ.isUserIndicator?.(objIndicator[i]) || CIQ.findSymbolIndicator?.(objIndicator[i], null)) {
            new_str += `${valid === 0 ? '&indicator=' : `&indicator_${valid + 1}=`}${objIndicator[i]}`
            valid++
          }
        }
        if (freqList.includes('Weekly')) freq = 'weekly'
        if (freqList.includes('Monthly')) freq = 'monthly'
      } catch {
        // ignore
      }
    }

    const exitFrequency = (CIQ as any).store?.form?.exitFrequency
    switch (exitFrequency) {
      case 'Monthly':
        freq = 'monthly'
        break
      case 'Weekly':
        freq = 'weekly'
        break
      case 'Daily':
        freq = 'daily'
        break
    }

    const { type } = getSymbolInfo(symbol)
    if (!['stock', 'index'].includes(type)) symbol = VITE_DEFAULT_SYMBOL
    const queryUrl = `${this.url}?symbol=${symbol}${new_str}&start=${start}&freq=${freq}`

    this.sendAjax(queryUrl, async (status, response) => {
      if (status === 200) {
        const newQuotes = await this.formatChartData(response)
        cb({ quotes: newQuotes })
      } else {
        cb({ error: response ? response : status })
      }
    })
  },

  fetchPaginationData(symbol, suggestedStartDate, endDate, params, cb) {
    const start = timestampToTime(Date.parse(String(suggestedStartDate)))
    const end = timestampToTime(Date.parse(String(endDate)))
    let new_str = ''
    let freq = 'daily'
    const objIndicator = (CIQ as any).objIndicator ?? []

    const list: string[] = []
    for (const key in objIndicator) {
      if (!CIQ.findBuiltinTechIndicator?.(null, objIndicator[key])) list.push(objIndicator[key])
    }

    if ((params as any).symbolObject?.indicator === undefined) {
      new_str += '&indicator='
    } else if (list.length === 0) {
      new_str += '&indicator='
    } else {
      try {
        const freqList: string[] = []
        let valid = 0
        for (let i = 0; i < objIndicator.length; i++) {
          const sentiRes = CIQ.findSentiIndicator?.(null, objIndicator[i])
          if (sentiRes) {
            freqList.push(sentiRes.updated)
            new_str += `${valid === 0 ? '&indicator=' : `&indicator_${valid + 1}=`}${objIndicator[i]}`
            valid++
            continue
          }
          if (CIQ.isUserIndicator?.(objIndicator[i]) || CIQ.isOwnIndicator?.(objIndicator[i]) || CIQ.findSymbolIndicator?.(objIndicator[i], null)) {
            new_str += `${valid === 0 ? '&indicator=' : `&indicator_${valid + 1}=`}${objIndicator[i]}`
            valid++
          }
        }
        if (freqList.includes('Weekly')) freq = 'weekly'
        if (freqList.includes('Monthly')) freq = 'monthly'
      } catch {
        // ignore
      }
    }

    const exitFrequency = (CIQ as any).store?.form?.exitFrequency
    switch (exitFrequency) {
      case 'Monthly':
        freq = 'monthly'
        break
      case 'Weekly':
        freq = 'weekly'
        break
      case 'Daily':
        freq = 'daily'
        break
    }

    const { type } = getSymbolInfo(symbol)
    if (!['stock', 'index'].includes(type)) symbol = VITE_DEFAULT_SYMBOL
    const queryUrl = `${this.url}?symbol=${symbol}${new_str}&start=${start}&end=${end}&freq=${freq}`

    this.sendAjax(queryUrl, async (status, response) => {
      if (status === 200) {
        const newQuotes = await this.formatChartData(response)
        cb({
          moreAvailable: (Array.isArray(response) && response.length > 1) && suggestedStartDate.getTime() > VITE_START_DATE,
          quotes: newQuotes,
          upToDate: endDate.getTime() >= Date.now(),
        })
      } else {
        cb({ error: response ? response : status })
      }
    })
  },

  filterMarkerDate(start_date, end_date, markerSet) {
    const startStr = start_date.toISOString().slice(0, 10).replace(/-/g, '')
    const endStr = end_date.toISOString().slice(0, 10).replace(/-/g, '')
    const result: unknown[] = []
    for (const date in markerSet) {
      const markerDate = markerSet[date].DT?.slice(0, 10).replace(/-/g, '') ?? ''
      if (markerDate > startStr && markerDate <= endStr) {
        result.push(markerSet[date])
      }
    }
    return result
  },

  async formatChartData(response) {
    let data = response as Array<Record<string, unknown>> | null
    if (data == null) data = []

    const newQuotes: Array<Record<string, unknown>> = []
    const objIndicator = (CIQ as any).objIndicator ?? []

    const objIndicatorFirstDate: Record<string, string | null> = {}
    if (objIndicator && typeof objIndicator !== 'string') {
      objIndicator.forEach((item: string) => {
        if (CIQ.findSentiIndicator?.(null, item)) objIndicatorFirstDate[item] = null
      })
    }

    const indicatorCutoffIndices: Record<string, number> = {}
    if (!(objIndicator && typeof objIndicator === 'string')) {
      for (let j = 0; j < objIndicator.length; j++) {
        const indicatorKey = objIndicator[j]
        const str = j === 0 ? 'indicator_Close' : `indicator${j + 1}_Close`
        indicatorCutoffIndices[indicatorKey] = data.map((i) => i[str]).findLastIndex((el) => el !== null)
      }
    }

    try {
      const symbol = (CIQ as any).symbol ?? 'AAPL'
      const { type } = getSymbolInfo(symbol)

      if (type === 'custom') {
        // Custom CSV symbol handling — simplified, fetch via API
        // ... (can be extended later)
      } else {
        const sentiList: string[] = []
        for (let j = 0; j < objIndicator.length; j++) {
          const indicator = CIQ.findSentiIndicator?.(null, objIndicator[j])
          if (indicator) sentiList.push(indicator.url)
        }

        if ('High' in data[0]) {
          for (let i = 0; i < data.length; i++) {
            newQuotes[i] = {}
            newQuotes[i].DT = formatStandardTime(data[i].DT as string)
            newQuotes[i].Open = data[i].Open
            newQuotes[i].High = data[i].High
            newQuotes[i].Low = data[i].Low
            newQuotes[i].Close = data[i].Close
            newQuotes[i].Volume = data[i].Volume

            if (objIndicator && typeof objIndicator === 'string') continue
            let sentiIndex = 0
            for (let j = 0; j < objIndicator.length; j++) {
              const indicatorKey = objIndicator[j]
              if (!sentiList.includes(indicatorKey)) {
                newQuotes[i][indicatorKey] = null
                sentiIndex++
                continue
              }
              const str = sentiIndex === 0 ? 'indicator_Close' : `indicator${sentiIndex + 1}_Close`
              sentiIndex++
              if (i > indicatorCutoffIndices[indicatorKey]) {
                newQuotes[i][indicatorKey] = null
                continue
              }
              if (data[i][str] != null) {
                if (objIndicatorFirstDate[indicatorKey] == null) objIndicatorFirstDate[indicatorKey] = newQuotes[i].DT as string
                newQuotes[i][indicatorKey] = data[i][str]
              } else {
                newQuotes[i][indicatorKey] = i === 0 ? null : newQuotes[i - 1]?.[indicatorKey] ?? null
              }
            }
          }

          // Set chart type based on route/data
          if (!(CIQ as any).isRestoreLayout) {
            const path = window.location.pathname
            const chartType = path.includes('/scannerai') ? 'candle' : 'line'
            const store = (CIQ as any).store
            store?.set_chart_type?.(chartType)
          }
          ;(CIQ as any).isRestoreLayout = false

          // Show/hide chart style menu items
          requestAnimationFrame(() => {
            const node = document.querySelector("cq-menu-container[cq-name = 'menuChartStyle']")
            if (!node) return
            for (let i = 0; i < node.children.length; i++) {
              node.children[i].style.display = 'inherit'
            }
          })
        } else {
          // Value Close only (line chart)
          for (let i = 0; i < data.length; i++) {
            newQuotes[i] = {}
            newQuotes[i].DT = formatStandardTime(data[i].DT as string)
            newQuotes[i].Open = data[i].Close
            newQuotes[i].High = data[i].Close
            newQuotes[i].Low = data[i].Close
            newQuotes[i].Close = data[i].Close
            if (data[i].Volume) newQuotes[i].Volume = data[i].Volume

            if (objIndicator && typeof objIndicator === 'string') continue
            let sentiIndex = 0
            for (let j = 0; j < objIndicator.length; j++) {
              const indicatorKey = objIndicator[j]
              if (!sentiList.includes(indicatorKey)) {
                newQuotes[i][indicatorKey] = null
                sentiIndex++
                continue
              }
              const str = sentiIndex === 0 ? 'indicator_Close' : `indicator${sentiIndex + 1}_Close`
              sentiIndex++
              if (i > indicatorCutoffIndices[indicatorKey]) {
                newQuotes[i][indicatorKey] = null
                continue
              }
              if (data[i][str] != null) {
                if (objIndicatorFirstDate[indicatorKey] == null) objIndicatorFirstDate[indicatorKey] = newQuotes[i].DT as string
                newQuotes[i][indicatorKey] = data[i][str]
              } else {
                newQuotes[i][indicatorKey] = i === 0 ? null : newQuotes[i - 1]?.[indicatorKey] ?? null
              }
            }
          }

          const store = (CIQ as any).store
          store?.set_chart_type?.('line')

          requestAnimationFrame(() => {
            const node = document.querySelector("cq-menu-container[cq-name = 'menuChartStyle']")
            if (!node) return
            for (let i = 0; i < node.children.length; i++) {
              node.children[i].style.display = 'inherit'
              if (node.children[i].firstChild?.nodeValue !== 'Line') {
                node.children[i].style.display = 'none'
              }
            }
          })
        }
      }
    } catch (err) {
      console.log('error', err)
    }

    // Set chart type from store
    if (CIQ.stxx) {
      CIQ.stxx.setChartType(getChartTypeGetter())
    }

    return newQuotes
  },
}

export default quoteFeedSimulator
