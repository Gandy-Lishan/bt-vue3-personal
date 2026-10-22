import CryptoJS from 'crypto-js'
import { fetchSentimentIndicatorOptions } from './sentiment-indicator.api'

export interface UserIndicatorOption {
  value: string
  label: string
  description?: string
  meta?: string
  sourceRef: string
  timeframe: string
}

export interface MyIndicatorRow {
  id: string
  url: string
  name: string
  category: string
  timeframe: string
  included: MyIndicatorComponent[]
  relationship: string
  createdAt: string
  raw: Record<string, unknown>
}

export interface MyIndicatorComponent {
  name: string
  url: string
  kind: 'Indicator' | 'Symbol'
  transform: string
  weight?: string
}

function rowsFrom(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>
  if (!payload || typeof payload !== 'object') return []
  const record = payload as Record<string, unknown>
  for (const key of ['results', 'data', 'content', 'records']) {
    if (Array.isArray(record[key])) return record[key] as Array<Record<string, unknown>>
  }
  return []
}

function normalizeTimeframe(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase()
  return text ? `${text[0]?.toUpperCase()}${text.slice(1)}` : ''
}

function titleCase(value: unknown) {
  return String(value ?? '').trim().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function indicatorCategory(item: Record<string, unknown>) {
  const combineType = String(item.combine_type ?? '').toLowerCase()
  const calculation = String(item.calculate ?? '').toLowerCase()
  if (calculation === 'weight_combination') return 'Weighted Indicator Combination'
  if (combineType === 'ohlcv') return 'Symbol OHLCV'
  if (combineType === 'resample') return 'Indicator Resample'
  if (combineType === 'technical_indicator') return 'Technical Indicator'
  return [titleCase(combineType), titleCase(calculation)].filter(Boolean).join(' ') || 'Indicator'
}

function storedLabels(key: string) {
  if (typeof window === 'undefined') return new Map<string, string>()
  try {
    const rows = JSON.parse(window.localStorage.getItem(key) ?? '[]') as Array<Record<string, unknown>>
    return new Map(rows.flatMap((row) => {
      const url = String(row.url ?? '').toLowerCase()
      const label = String(row.label ?? row.name ?? row.url ?? '')
      return url ? [[url, label] as const] : []
    }))
  } catch { return new Map<string, string>() }
}

function sourceName(url: string, kind: MyIndicatorComponent['kind'], indicatorLabels: Map<string, string>, symbolLabels: Map<string, string>) {
  const labels = kind === 'Indicator' ? indicatorLabels : symbolLabels
  const key = url.trim().replace(/^['"]|['"]$/g, '').toLowerCase()
  return labels.get(key) || labels.get(key.replace(/@indicator$/, '')) || url || 'Unknown'
}

function parseTransforms(item: Record<string, unknown>) {
  const ma = String(item.ma ?? '').split('_')
  const process = String(item.next_process ?? '')
  const shift = process.split('|')[1]?.match(/sh(\d+)_/)?.[1]
  const fields = process.split('|').map((part) => part.match(/_([a-z]+)$/i)?.[1] ?? '')
  const priceField: Record<string, string> = { o: 'Open', h: 'High', l: 'Low', c: 'Close' }
  return [0, 1].map((index) => {
    const value = ma[index] ?? ''
    let transform = ''
    if (/^\d+e$/.test(value)) transform = `Exponential Moving Average ${value.slice(0, -1)}`
    else if (/^\d+roc$/.test(value)) transform = `Rate of Change ${value.slice(0, -3)}`
    else if (value === 'amplitude' || value === 'amplify') transform = 'Amplitude'
    else if (value === 'i') transform = 'Indicator Value'
    else if (value && !['0', '1'].includes(value)) transform = `Simple Moving Average ${value}`
    else if (fields[index] && String(item.combine_type).toLowerCase() === 'symbol') transform = priceField[fields[index]!] ?? fields[index]!.toUpperCase()
    if (index === 1 && shift && shift !== '0') transform = `${transform}${transform ? ' · ' : ''}Shift ${shift}`
    return transform
  })
}

function includedIndicators(item: Record<string, unknown>, indicatorLabels: Map<string, string>): MyIndicatorComponent[] {
  const symbolLabels = storedLabels('refactoredConcatList')
  if (String(item.calculate ?? '').toLowerCase() === 'weight_combination') {
    try {
      const value = typeof item.mul_indicator === 'string' ? JSON.parse(item.mul_indicator) : item.mul_indicator
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>
        const kinds = String(record.combine_type ?? '').split('_')
        const weights = String(item.indicator_weight ?? '').split('_')
        return Object.entries(record).filter(([key, entry]) => key.startsWith('indicator_') && Boolean(entry)).map(([, entry], index) => {
          const url = String(entry)
          const kind = kinds[index] === 'sy' ? 'Symbol' : 'Indicator'
          const number = Number(String(weights[index] ?? '0').replace(/^n/, '-')) * 100
          return { name: sourceName(url, kind, indicatorLabels, symbolLabels), url, kind, transform: '', weight: `${Number(number.toFixed(2))}%` }
        })
      }
    } catch { /* malformed legacy rows fall back to the standard fields */ }
  }
  const combineType = String(item.combine_type ?? '').toLowerCase()
  const kind: MyIndicatorComponent['kind'] = ['symbol', 'ohlcv', 'technical_indicator'].includes(combineType) ? 'Symbol' : 'Indicator'
  const transforms = parseTransforms(item)
  const urls = [item.indicator_1_url ?? item.indicator_1, item.indicator_2_url ?? item.indicator_2].map((value) => String(value ?? '').trim())
  if (combineType === 'ohlcv') transforms[0] = `${titleCase(item.calculate)}${transforms[0] ? ` · ${transforms[0]}` : ''}`
  if (combineType === 'resample') transforms[0] = `Resample to ${normalizeTimeframe(item.calculate)}`
  if (combineType === 'technical_indicator') transforms[0] = 'Technical Indicator'
  return urls.map((url, index) => ({ name: sourceName(url, kind, indicatorLabels, symbolLabels), url, kind, transform: transforms[index] ?? '' }))
    .filter((component) => component.url && component.url !== 'model_smart_money')
}

function relationshipLabel(item: Record<string, unknown>) {
  const calculation = String(item.calculate ?? '').toLowerCase()
  if (calculation === 'ratio') return '÷'
  if (calculation === 'spread') return '−'
  if (calculation === 'addition') return '+'
  if (calculation === 'weight_combination') return 'Weighted sum'
  return ''
}

export async function fetchMyIndicators(signal?: AbortSignal): Promise<MyIndicatorRow[]> {
  const [response, indicatorOptions] = await Promise.all([
    fetch('/dev/my_indicator/get_records/?ordering=-create_date&all=true', { signal }),
    fetchSentimentIndicatorOptions(signal),
  ])
  if (!response.ok) throw new Error(`My Indicator list failed to load: ${response.status}`)
  const indicatorLabels = new Map<string, string>()
  for (const option of indicatorOptions) {
    const key = option.url.toLowerCase()
    indicatorLabels.set(key, option.label)
    indicatorLabels.set(`${key}@indicator`, option.label)
  }
  return rowsFrom(await response.json()).map((item, index) => {
    const url = String(item.url ?? '').trim()
    return {
      id: url || String(item.id ?? index), url,
      name: String(item.name ?? 'Untitled indicator'),
      category: indicatorCategory(item),
      timeframe: normalizeTimeframe(item.timeframe ?? item.time_frame) || '-',
      included: includedIndicators(item, indicatorLabels),
      relationship: relationshipLabel(item),
      createdAt: String(item.create_date ?? item.created_at ?? ''),
      raw: item,
    }
  })
}

export interface CreateMyIndicatorPayload {
  name: string
  indicator_1: string
  indicator_2: string
  time_frame: string
  ma: string
  calculate: string
  extreme_optimism: string | number
  extreme_pessimism: string | number
  combine_type: string
  benchmark: string
  next_process: string
  mul_indicator?: string
  indicator_weight?: string
  tech_code?: string
}

export async function createMyIndicator(payload: CreateMyIndicatorPayload, signal?: AbortSignal) {
  const body = new FormData()
  Object.entries(payload).forEach(([key, value]) => body.append(key, String(value)))
  const response = await fetch('/dev/my_indicator/add_record', { method: 'POST', body, signal })
  const result = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok || Number(result.code ?? response.status) >= 400) {
    const existing = result.data && typeof result.data === 'object' ? String((result.data as Record<string, unknown>).name ?? '') : ''
    throw new Error(existing ? `The same indicator formula already exists as “${existing}”.` : String(result.message ?? result.error ?? 'Unable to save the indicator.'))
  }
  return result
}

export async function updateMyIndicator(url: string, payload: CreateMyIndicatorPayload, signal?: AbortSignal) {
  const body = new FormData()
  Object.entries(payload).forEach(([key, value]) => body.append(key, String(value)))
  const query = new URLSearchParams({ url })
  const response = await fetch(`/dev/my_indicator/update_record?${query.toString()}`, { method: 'PUT', body, signal })
  const result = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok || Number(result.code ?? response.status) >= 400) {
    throw new Error(String(result.message ?? result.error ?? 'Unable to update the indicator.'))
  }
  return result
}

export async function fetchRelatedMyIndicatorBacktestCount(url: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ url })
  const response = await fetch(`/dev/my_indicator/relate_backtests/?${query.toString()}`, { signal })
  if (!response.ok) throw new Error('Unable to check related backtests.')
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : payload
  if (Number.isFinite(Number(data.count))) return Number(data.count)
  return Array.isArray(data.results) ? data.results.length : 0
}

export async function deleteMyIndicator(url: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ url })
  const response = await fetch(`/dev/my_indicator/del_record/?${query.toString()}`, { method: 'DELETE', signal })
  const result = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok || Number(result.code ?? response.status) >= 400) {
    throw new Error(String(result.message ?? result.error ?? 'Unable to delete the indicator.'))
  }
  return result
}

export async function fetchMyIndicatorOptions(signal?: AbortSignal): Promise<UserIndicatorOption[]> {
  const response = await fetch('/dev/my_indicator/get_records/?ordering=-create_date&all=true', { signal })
  if (!response.ok) throw new Error(`My Indicator list failed to load: ${response.status}`)
  const unique = new Map<string, UserIndicatorOption>()
  for (const item of rowsFrom(await response.json())) {
    const name = String(item.name ?? item.file_name ?? '').trim()
    const url = String(item.url ?? '').trim()
    if (!name || !url || unique.has(name)) continue
    const timeframe = normalizeTimeframe(item.timeframe ?? item.updated)
    unique.set(name, {
      value: name,
      label: name,
      description: 'My Indicator',
      meta: timeframe || undefined,
      sourceRef: `${name}CREATE${url}`,
      timeframe,
    })
  }
  return [...unique.values()]
}

export async function validateUserIndicatorCsv(file: File) {
  if (!/\.csv$/i.test(file.name)) throw new Error('Choose a CSV file.')
  if (!file.size) throw new Error('The CSV file is empty.')
  if (file.size > 1024 * 1024) throw new Error('The CSV file must be 1 MB or smaller.')
  const baseName = file.name.replace(/\.csv$/i, '')
  if (!/^[A-Za-z][A-Za-z0-9_ ]*$/.test(baseName)) {
    throw new Error('The file name must start with a letter and use only letters, numbers, spaces, or underscores.')
  }
  const text = await file.text()
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  const headers = (lines[0] ?? '').split(',').map((value) => value.trim().replace(/^"|"$/g, '').toLowerCase())
  if (headers[0] !== 'date' || headers[1] !== 'close' || lines.length < 2) {
    throw new Error('CSV format must contain Date and Close columns with at least one data row.')
  }
  return { baseName, text }
}

export async function uploadUserIndicatorCsv(file: File, signal?: AbortSignal) {
  const { baseName, text } = await validateUserIndicatorCsv(file)
  const name = baseName.replace(/\s+/g, '')
  const hash = CryptoJS.MD5(text).toString()
  const formData = new FormData()
  formData.append('name', name)
  formData.append('hash', hash)
  formData.append('suffix', 'csv')
  formData.append('file', file)
  const response = await fetch('/dev/dev/uploadcsvfile/', { method: 'POST', body: formData, signal })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  const status = Number(payload.status ?? response.status)
  if (!response.ok || ![200, 201].includes(status)) {
    throw new Error(String(payload.message ?? payload.error ?? 'Unable to upload the CSV file.'))
  }
  return {
    name,
    hash,
    sourceRef: String(payload.file_id ?? `${name}HASH${hash}`),
  }
}

export async function uploadUserDefinedDatesCsv(file: File, symbol: string, timeframe: string, signal?: AbortSignal) {
  if (!/\.csv$/i.test(file.name)) throw new Error('Choose a CSV file.')
  if (!file.size) throw new Error('The CSV file is empty.')
  if (file.size > 1024 * 1024) throw new Error('The CSV file must be 1 MB or smaller.')
  if (timeframe.toLowerCase() !== 'daily') throw new Error('User Defined Dates can only be used with the Daily timeframe.')
  const baseName = file.name.replace(/\.csv$/i, '')
  if (!/^[A-Za-z][A-Za-z0-9_ ]*$/.test(baseName)) {
    throw new Error('The file name must start with a letter and use only letters, numbers, spaces, or underscores.')
  }
  const lines = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines[0] !== 'Date' || lines.length < 2 || lines.some((line, index) => index > 0 && line.includes(','))) {
    throw new Error('CSV must contain exactly one Date column with at least one date.')
  }
  const dates = lines.slice(1)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (dates.some((date) => !datePattern.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)))) {
    throw new Error('All dates must use the YYYY-MM-DD format.')
  }
  const sortedDates = [...new Set(dates)].sort()
  const query = new URLSearchParams({ symbol, start: sortedDates[0]!, end: sortedDates.at(-1)!, freq: 'daily' })
  const pairResponse = await fetch(`/dev/st_data/pair_data?${query.toString()}`, { signal })
  if (!pairResponse.ok) throw new Error('Unable to validate dates against symbol trading days.')
  const payload = await pairResponse.json() as unknown
  const tradingRows = rowsFrom(payload)
  const selectedDates = new Set(sortedDates)
  const tradingDates = tradingRows.map((row) => String(row.DT ?? row.Date ?? '').slice(0, 10)).filter(datePattern.test.bind(datePattern))
  if (!tradingDates.length) throw new Error('No trading dates were returned for this symbol and date range.')
  const content = ['Date,Close', ...tradingDates.map((date) => `${date},${selectedDates.has(date) ? 1 : 0}`)].join('\r\n')
  const indicatorName = `User Defined Dates: ${baseName}`
  const uploadFile = new File([content], `${indicatorName}.csv`, { type: 'text/csv' })
  const hash = CryptoJS.MD5(content).toString()
  const formData = new FormData()
  formData.append('name', indicatorName)
  formData.append('hash', hash)
  formData.append('suffix', 'csv')
  formData.append('file', uploadFile)
  const response = await fetch('/dev/dev/uploadcsvfile/', { method: 'POST', body: formData, signal })
  const result = await response.json().catch(() => ({})) as Record<string, unknown>
  const status = Number(result.status ?? response.status)
  if (!response.ok || ![200, 201].includes(status)) {
    throw new Error(String(result.message ?? result.error ?? 'Unable to upload User Defined Dates.'))
  }
  return { name: indicatorName, hash, sourceRef: String(result.file_id ?? `${indicatorName}HASH${hash}`) }
}
