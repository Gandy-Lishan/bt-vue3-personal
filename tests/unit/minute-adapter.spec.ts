import { describe, expect, it } from 'vitest'
import { formatMinuteDate, normalizeIntradayMinutes } from '@/entities/minute/model/minute.adapter'

describe('intraday minute adapter', () => {
  it('normalizes the legacy positional-array response', () => {
    const payload = JSON.stringify([
      [42, 'Market update', null, null, '<p>Minute body</p>', '2026-10-21T14:05:06Z', null, 'Jason Goepfert'],
    ])

    expect(normalizeIntradayMinutes(payload)).toEqual([{
      id: '42',
      title: 'Market update',
      contentHtml: '<p>Minute body</p>',
      publishedAt: '2026-10-21T14:05:06Z',
      author: 'Jason Goepfert',
    }])
  })

  it('normalizes object rows inside a data envelope', () => {
    const result = normalizeIntradayMinutes({
      data: [{ id: 7, title: 'Object minute', content: 'Body', date: '2026-10-21', author: 'ST' }],
    })
    expect(result[0]).toMatchObject({ id: '7', title: 'Object minute', author: 'ST' })
  })

  it('unwraps nested and repeatedly JSON-encoded legacy responses', () => {
    const rows = [[8, 'Nested minute', null, null, '<p>Visible body</p>', '2026-10-21', null, 'ST']]
    const payload = JSON.stringify(JSON.stringify({ data: JSON.stringify({ minutes: JSON.stringify(rows) }) }))

    expect(normalizeIntradayMinutes(payload)[0]).toMatchObject({
      id: '8',
      title: 'Nested minute',
      contentHtml: '<p>Visible body</p>',
    })
  })

  it('formats publication dates in UTC', () => {
    expect(formatMinuteDate('2026-10-21T14:05:06Z')).toMatch(/10\/21\/2026.*02:05:06 PM UTC/)
    expect(formatMinuteDate('1769674768000')).toBe('01/29/2026, 08:19:28 AM UTC')
  })
})

