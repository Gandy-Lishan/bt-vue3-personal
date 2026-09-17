import type { Indicator, IndicatorResearchPost } from './indicator.types'

/**
 * Research posts are rendered by the shared indicator table so they get the same
 * sorting and pagination. That table speaks `Indicator` rows, so a post is mapped
 * onto the smallest row that satisfies the display and sort helpers: only the
 * `date` and `title` columns are configured, and both read straight out of `raw`.
 */
export function researchPostRow(post: IndicatorResearchPost): Indicator {
  const title = post.title || post.url || ''

  return {
    id: post.url || title,
    name: title,
    group: '',
    groupId: '',
    subgroup: '',
    sourceList: '',
    timeFrame: '',
    // Not rendered by the research columns; left blank rather than fabricated.
    currentValue: Number.NaN,
    change: Number.NaN,
    updatedAt: post.date ?? '',
    sentiment: 'neutral',
    sentimentScore: 4,
    trend: [],
    favorite: false,
    type: 'Research',
    raw: { title, date: post.date, url: post.url, summary: post.summary },
  }
}

export function researchPostRows(posts: IndicatorResearchPost[]): Indicator[] {
  return posts.map(researchPostRow)
}
