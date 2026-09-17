import { describe, expect, it } from 'vitest'
import {
  convertIndicatorDescriptionHtml,
  normalizeRelatedCharts,
  normalizeResearchPosts,
  normalizeResearchPostUrl,
  normalizeReturnSegments,
  normalizeThresholdRows,
} from '@/entities/indicator/model/indicator.detail'

describe('indicator detail helpers', () => {
  it('converts legacy description html and chart links', () => {
    const html = convertIndicatorDescriptionHtml(
      String.raw`Line one\n<a href="{{url_for('user.spx_reltrend')}}">SPX Trend</a> &amp; <a href="/users/reports/1">Report</a><script>alert(1)</script>`,
    )

    expect(html).toContain('Line one<br>')
    expect(html).toContain('href="https://users.sentimentrader.com/users/charts/spx_reltrend"')
    expect(html).toContain('href="https://users.sentimentrader.com/users/reports/1"')
    expect(html).not.toContain('<script>')
  })

  it('normalizes threshold return rows by visible location', () => {
    expect(
      normalizeThresholdRows({
        Above_Annualized: 8.234,
        Between_Annualized: 4.8,
        Below_Annualized: -2,
        percent_time_above: 12.5,
        percent_time_between: 70,
        percent_time_below: 17.5,
      }),
    ).toEqual([
      { location: 'Above Extreme', annualizedReturn: '8.2%', percentTime: '12.5%' },
      { location: 'Between Extremes', annualizedReturn: '4.8%', percentTime: '70%' },
      { location: 'Below Extreme', annualizedReturn: '-2%', percentTime: '17.5%' },
    ])
  })

  it('parses return segments, research posts, and related charts', () => {
    expect(normalizeReturnSegments('[{"Location":"Above","Return":7.1,"Time":15}]')).toEqual([
      { Location: 'Above', Return: 7.1, Time: 15 },
    ])
    expect(normalizeResearchPosts([{ title: 'Research note', blog_url: '/users/blog/1' }])).toEqual([
      { title: 'Research note', url: 'https://sentimentrader.com/blog/1', date: '', summary: '' },
    ])
    expect(normalizeRelatedCharts([{ chart_name: 'Related', url: 'related_url', type: 'Indicator' }])).toEqual([
      { title: 'Related', url: 'related_url', type: 'Indicator' },
    ])
  })

  it('reads a research post date from post_date first', () => {
    expect(normalizeResearchPosts([{ title: 'Note', post_date: '2020-04-02' }])[0].date).toBe('2020-04-02')

    // post_date wins when the payload carries several date fields.
    expect(
      normalizeResearchPosts([{ title: 'Note', post_date: '2020-04-02', date: '2021-01-01', publish_date: '2022-02-02' }])[0]
        .date,
    ).toBe('2020-04-02')
  })

  it('falls back to the older date fields when post_date is absent', () => {
    expect(normalizeResearchPosts([{ title: 'Note', publish_date: '2021-01-01' }])[0].date).toBe('2021-01-01')
    expect(normalizeResearchPosts([{ title: 'Note', created_at: '2022-02-02' }])[0].date).toBe('2022-02-02')
  })

  it('rebases research post links onto the public blog', () => {
    const slug = 'short-and-long-term-prospects-for-treasury-bonds'
    const expected = `https://sentimentrader.com/blog/${slug}`

    // A bare slug, a members-site path, and an absolute members URL all resolve the same.
    expect(normalizeResearchPostUrl(slug)).toBe(expected)
    expect(normalizeResearchPostUrl(`/users/blog/${slug}`)).toBe(expected)
    expect(normalizeResearchPostUrl(`https://users.sentimentrader.com/users/blog/${slug}`)).toBe(expected)
    expect(normalizeResearchPostUrl(`/users/blog/${slug}/`)).toBe(expected)
    expect(normalizeResearchPostUrl(`/users/blog/${slug}?utm_source=email`)).toBe(expected)
  })

  it('leaves an empty research post url empty rather than a bare blog link', () => {
    expect(normalizeResearchPostUrl('')).toBe('')
    expect(normalizeResearchPostUrl(undefined)).toBe('')
  })

  it('does not rebase indicator description links onto the blog', () => {
    const html = convertIndicatorDescriptionHtml('<a href="/users/blog/some-slug">Read</a>')

    expect(html).toContain('https://users.sentimentrader.com/users/blog/some-slug')
    expect(html).not.toContain('sentimentrader.com/blog/')
  })
})
