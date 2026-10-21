/**
 * ChartIQ-compatible utility functions
 *
 * Adapted from Vue2 project:
 *   - encodeBase64 from @/utils/index.js
 *   - createStateFilter, getSymbolInfo from @/utils/globalFunc/index.js
 *
 * These functions are needed by ChartIQ webcomponents that we copied from the
 * original project. They are kept local to the chartiq module to avoid
 * polluting the main application.
 */

// @ts-expect-error CIQ from ChartIQ library
import { CIQ } from './st-development/js/components'

export { formatStandardTime, timestampToTime } from '../../utils/time'

/**
 * Debug helper preserved from the original Vue2 project.
 */
export function printConsole(...args: unknown[]): void {
  console.log('[ChartIQ]', ...args)
}

export function encodeBase64(str: string): string {
  return btoa(encodeURIComponent(str))
}

export function decodeBase64(str: string): string {
  return decodeURIComponent(atob(str))
}

/**
 * Safely retrieve a nested property from an object using a dot-path string.
 * If the path cannot be resolved, returns undefined.
 */
export function getPropertyByString(obj: any, path: string, subField?: string): any {
  if (!obj || !path) return undefined
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null) return undefined
    current = current[part]
  }
  if (current && subField) {
    current = current[subField]
  }
  return current
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Deduplicate an array of objects by their JSON-stringified values.
 */
export function uniqueObjectArray<T extends Record<string, unknown>>(arr: T[]): T[] {
  const seen = new Set<string>()
  return arr.filter((item) => {
    const key = JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getSymbolInfo(url: string): { name: string; url: string; type: string; symbol?: string } {
  const store = (CIQ as any).store
  const stockList = store?.stocksList ?? []
  const indexList = store?.indexsList ?? []

  const stockName = stockList.find((x: { stock: string }) => x.stock === url)
  const indexName = indexList.find((x: { symbol: string }) => x.symbol === url)

  if (stockName) {
    return { name: stockName.name, url, type: 'stock' }
  } else if (indexName) {
    return { name: indexName.name, url, type: 'index' }
  }

  // Custom symbol case
  try {
    const parts = url.split('||')
    return {
      name: decodeBase64(parts[0]),
      symbol: decodeBase64(parts[1]),
      url,
      type: 'custom',
    }
  } catch {
    return { name: '', url, type: 'other' }
  }
}

/**
 * Convert chartiq timeframe code to display label.
 */
/**
 * Recover the underlying indicator URL from an Optix-style URL.
 */
export function recoverSymbolOptixUrl(url: string): string {
  if (url && url.endsWith('@indicator')) {
    const i = url.indexOf('@indicator')
    return url.slice(0, i)
  }
  return url
}

/**
 * Limit the number of studies displayed on chart.
 * Returns true when the limit is reached.
 */
export function maxNumOfStudy(stx?: any): boolean {
  const chartEngine = stx || (typeof CIQ !== 'undefined' ? CIQ.stxx : null)
  if (!chartEngine?.layout?.studies) return false

  let countExistIndicator = 0
  const studies = chartEngine.layout.studies
  for (const studyInstanceName in studies) {
    const study = studies[studyInstanceName]
    if (CIQ.findBuiltinTechIndicator && CIQ.findBuiltinTechIndicator(null, study.type)) {
      countExistIndicator--
    }
    if (study.type === 'ST MA') {
      countExistIndicator--
    }
    countExistIndicator++
  }

  if (countExistIndicator >= 20) {
    if (CIQ.description) CIQ.description('Maximum 20 signals can be displayed on chart')
    if (CIQ.hideCover) CIQ.hideCover()
    if (CIQ.nprogress) CIQ.nprogress.done()
    return true
  }
  return false
}

export function timeframeTransform(val: string): string {
  switch (val) {
    case 'monthly':
      return 'Monthly'
    case 'weekly':
      return 'Weekly'
    case 'daily':
    default:
      return 'Daily'
  }
}

/**
 * Get the core symbol label for dual-symbol mode.
 * Used by tooltip addon.
 */
export function getCoresSymbolDual(isSymbol2: boolean): string {
  const store = (CIQ as any).store
  const symbolLabel = isSymbol2
    ? store?.comparisonSymbol?.url
    : CIQ.stxx?.chart?.symbol
  const { name, type } = getSymbolInfo(symbolLabel ?? '')
  if (type === 'custom') {
    return name || symbolLabel
  }
  return symbolLabel || ''
}

export function createStateFilter(queryString: string) {
  return (state: Record<string, unknown>): number => {
    const query = queryString.toLowerCase()
    const resultValue = (state.value || state.name || state.label || state.model_name) as string | undefined
    const resultUrl = (state.url || state.symbol) as string | undefined

    if (!resultValue || !resultUrl) return 0
    if (!queryString) return 2

    const standardizeString = (str: string) =>
      str.toLowerCase().replace(/[_\s-]+/g, ' ')

    const standardizedQuery = standardizeString(query)
    const standardizedValue = standardizeString(resultValue)
    const standardizedUrl = standardizeString(resultUrl)

    const escapeRegExp = (string: string) =>
      string.replace(/[.*+?^=${}()|[\]\\]/g, '\\$&')

    const fuzzyMatch = (text: string, queryStr: string) => {
      const escapedQuery = escapeRegExp(queryStr)
      let regexString = ''
      for (let i = 0; i < escapedQuery.length; i++) {
        const char = escapedQuery[i]
        regexString += char
        if (i < escapedQuery.length - 1 && /[a-zA-Z0-9]/.test(char)) {
          regexString += '.*?'
        }
      }
      const regex = new RegExp(regexString, 'g')
      return [...text.matchAll(regex)]
    }

    let score = 0

    if (
      standardizedValue === standardizedQuery ||
      standardizedUrl === standardizedQuery
    ) {
      score += 10
    } else if (
      standardizedValue.startsWith(standardizedQuery) ||
      standardizedUrl.startsWith(standardizedQuery)
    ) {
      score += 5
    }

    const valueMatches = fuzzyMatch(standardizedValue, standardizedQuery)
    const urlMatches = fuzzyMatch(standardizedUrl, standardizedQuery)
    const maxMatches = Math.max(valueMatches.length, urlMatches.length)
    score += maxMatches * 2

    return score
  }
}
