import type {
  IndicatorConstituentRow,
  IndicatorRelatedChart,
  IndicatorResearchPost,
  IndicatorReturnSegment,
  IndicatorThresholdRow,
} from './indicator.types'

function safeJsonParse(value: unknown) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function textValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return String(value)
  }
  return ''
}

function normalizeUrl(value: unknown) {
  const url = String(value ?? '').trim()
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('mailto:')) return url
  if (url.startsWith('/users/')) return `https://users.sentimentrader.com${url}`
  if (url.startsWith('users/')) return `https://users.sentimentrader.com/${url}`
  if (url.startsWith('/')) return `https://users.sentimentrader.com${url}`
  return url
}

const researchPostBaseUrl = 'https://sentimentrader.com/blog/'

/**
 * Research posts link to the public blog, which is keyed by slug. The API may send a
 * bare slug or a path on the members site, so the slug is taken as the last path
 * segment and re-based onto the blog either way.
 */
export function normalizeResearchPostUrl(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return ''

  const slug = text.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() ?? ''
  return slug ? `${researchPostBaseUrl}${slug}` : ''
}

export function convertIndicatorDescriptionHtml(value: unknown) {
  if (value === undefined || value === null) return ''

  let text = String(value)
  text = text
    .replace(/\\r/g, '<br>')
    .replace(/\\n/g, '<br>')
    .replace(/\\t/g, '&emsp;')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&quot;/g, '"')

  text = text.replace(/<a href="{{url_for\('user\.([^']+)'\)}}">([^<]+)<\/a>/g, (_match, path, label) => {
    return `<a href="https://users.sentimentrader.com/users/charts/${path}" target="_blank" rel="noopener noreferrer">${label}</a>`
  })

  text = text.replace(/<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi, (_match, beforeHref, href, afterHref) => {
    const attributes = `${beforeHref}${normalizeUrl(href)}${afterHref}`
      .replace(/\s+target=["'][^"']*["']/gi, '')
      .replace(/\s+rel=["'][^"']*["']/gi, '')

    return `<a ${attributes} target="_blank" rel="noopener noreferrer">`
  })

  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\son\w+=["'][^"']*["']/gi, '')
}

function formatOneDecimal(value: unknown) {
  if (value === '' || value === undefined || value === null) return '0'
  const numeric = Number(String(value).replace('%', ''))
  if (!Number.isFinite(numeric)) return String(value)
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1)
}

function truthy(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const text = String(value ?? '').trim().toLowerCase()
  return ['true', '1', 'yes', 'y'].includes(text)
}

export function normalizeThresholdRows(raw: Record<string, unknown>): IndicatorThresholdRow[] {
  const hasReturnFields = [
    'Above_Annualized',
    'Between_Annualized',
    'Below_Annualized',
    'percent_time_above',
    'percent_time_between',
    'percent_time_below',
  ].some((key) => raw[key] !== undefined && raw[key] !== null && raw[key] !== '')

  if (!truthy(raw.show_returns) && !hasReturnFields) return []

  return [
    {
      location: 'Above Extreme',
      annualizedReturn: `${formatOneDecimal(raw.Above_Annualized)}%`,
      percentTime: `${formatOneDecimal(raw.percent_time_above)}%`,
    },
    {
      location: 'Between Extremes',
      annualizedReturn: `${formatOneDecimal(raw.Between_Annualized)}%`,
      percentTime: `${formatOneDecimal(raw.percent_time_between)}%`,
    },
    {
      location: 'Below Extreme',
      annualizedReturn: `${formatOneDecimal(raw.Below_Annualized)}%`,
      percentTime: `${formatOneDecimal(raw.percent_time_below)}%`,
    },
  ]
}

export function normalizeReturnSegments(value: unknown): IndicatorReturnSegment[] {
  const parsed = safeJsonParse(value)
  if (!Array.isArray(parsed)) return []

  return parsed.filter(isRecord).map((segment) => {
    return Object.fromEntries(
      Object.entries(segment).map(([key, rawValue]) => [
        key,
        typeof rawValue === 'number' || typeof rawValue === 'string' || rawValue === null ? rawValue : String(rawValue),
      ]),
    )
  })
}

export function normalizeResearchPosts(value: unknown): IndicatorResearchPost[] {
  const parsed = safeJsonParse(value)
  if (!Array.isArray(parsed)) return []

  return parsed
    .map((item): IndicatorResearchPost | null => {
      if (typeof item === 'string') {
        return { title: item, url: normalizeUrl(item) }
      }
      if (!isRecord(item)) return null

      const title =
        textValue(item, ['title', 'name', 'headline', 'blog_title', 'report_title']) ||
        textValue(item, ['url', 'blog_url', 'link'])
      if (!title) return null

      return {
        title,
        url: normalizeResearchPostUrl(textValue(item, ['url', 'blog_url', 'link', 'href'])),
        date: textValue(item, ['post_date', 'date', 'publish_date', 'created_at', 'updated_at']),
        summary: textValue(item, ['summary', 'description', 'excerpt']),
      }
    })
    .filter((post): post is IndicatorResearchPost => post !== null)
}

/**
 * `constituent_conditions` arrives as an array, but the API sometimes serializes it
 * into a JSON string, so the type is checked and parsed before the emptiness test.
 */
export function normalizeConstituentConditions(value: unknown): IndicatorConstituentRow[] {
  const parsed = safeJsonParse(value)
  if (!Array.isArray(parsed)) return []

  return parsed.filter(isRecord)
}

export function normalizeRelatedCharts(value: unknown): IndicatorRelatedChart[] {
  const parsed = safeJsonParse(value)
  if (!Array.isArray(parsed)) return []

  return parsed
    .map((item): IndicatorRelatedChart | null => {
      if (typeof item === 'string') {
        return { title: item, url: item }
      }
      if (!isRecord(item)) return null

      const url = textValue(item, ['url', 'chart_url', 'id', 'symbol'])
      const title = textValue(item, ['chart_name', 'title', 'name', 'label']) || url
      if (!url || !title) return null

      return {
        title,
        url,
        type: textValue(item, ['type', 'source_list', 'sub_type']),
      }
    })
    .filter((chart): chart is IndicatorRelatedChart => chart !== null)
}
