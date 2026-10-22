import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchReportDetail, fetchReportFavorites, fetchReportLibrary } from '@/entities/report/api/report.api'

describe('report library API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests the blog list without query parameters and maps report fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      {
        author: '',
        image: 'https://cdn.example.com/report.png',
        is_favorite: false,
        meta_description: 'Report summary',
        post_content: '<p>Report</p>',
        post_date: '2026-10-19T18:32:05Z',
        title: 'Daily Report : Example',
        url: 'daily_report_10_19_2026',
        user_level: 'basic',
      },
    ]), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await fetchReportLibrary()

    expect(fetchMock).toHaveBeenCalledWith('/dev/st_data/blog_list', expect.objectContaining({ credentials: 'include' }))
    expect(response.items).toEqual([
      expect.objectContaining({
        title: 'Daily Report : Example',
        author: 'by Sentimentrader',
        imageUrl: 'https://cdn.example.com/report.png',
        isPublic: false,
        hasAccess: false,
        isFavorite: false,
        href: '/MR/blog/daily_report_10_19_2026',
      }),
    ])
  })

  it('uses blog_info as the source for article content, tags, and forecasts', async () => {
    const fetchMock = vi.fn().mockImplementation((path: string) => {
      if (path.startsWith('/dev/st_data/blog_info/')) {
        return Promise.resolve(new Response(JSON.stringify({
          author: 'by Sentimentrader',
          blog_tags: [{ tag: 'Breadth' }, { tag: 'Gold' }],
          forecasts: [
            { forecast: 'Up', market: 'Gold', timeframe: '1-2 weeks' },
            { forecast: 'None', market: 'Silver', timeframe: '' },
          ],
          post_content: '<p>Full article from blog_info</p>',
          post_date: '2026-10-20T18:32:05Z',
          title: 'Gold miners breadth collapse',
          url: 'gold-miners-breadth-collapse-points-to-a-short-bounce',
          user_level: 'sentimentedge',
        }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ results: [{
        is_favorite: true,
        post_content: '<p>Truncated list content</p>',
        title: 'Gold miners breadth collapse',
        url: 'gold-miners-breadth-collapse-points-to-a-short-bounce',
        user_level: 'sentimentedge',
      }] }), { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const detail = await fetchReportDetail('gold-miners-breadth-collapse-points-to-a-short-bounce')

    expect(fetchMock).toHaveBeenCalledWith(
      '/dev/st_data/blog_info/?url=gold-miners-breadth-collapse-points-to-a-short-bounce',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(detail.contentHtml).toBe('<p>Full article from blog_info</p>')
    expect(detail.topics).toEqual(['Breadth', 'Gold'])
    expect(detail.forecasts).toEqual([
      { forecast: 'Up', market: 'Gold', timeframe: '1-2 weeks' },
    ])
    expect(detail.isFavorite).toBe(true)
  })

  it('loads daily reports from the year-specific archive endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      count: 1,
      next: null,
      results: [{
        post_date: '2026-10-20T18:32:05Z',
        title: 'Daily Report : Example',
        url: 'daily_report_10_20_2026',
        user_level: 'basic',
      }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await fetchReportLibrary({ archiveYear: 2026, page: 1 })

    expect(fetchMock).toHaveBeenCalledWith(
      '/dev/st_data/archived_reports?year=2026&page=1',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(response.items[0]).toEqual(expect.objectContaining({ category: 'Daily Report' }))
  })

  it('filters Market Impact Analysis through the impactedge user level', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchReportLibrary({ userLevel: 'impactedge' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/dev/st_data/blog_list?user_level=impactedge',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('searches reports through the blog list endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchReportLibrary({ search: 'breadth collapse', page: 2 })

    expect(fetchMock).toHaveBeenCalledWith(
      '/dev/st_data/blog_list?page=2&search=breadth+collapse',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('uses the legacy daily-report endpoint for 2019 and earlier', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchReportLibrary({ archiveYear: 2019, page: 2 })

    expect(fetchMock).toHaveBeenCalledWith(
      '/dev/st_data/old_archived_reports?year=2019&page=2',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('loads favorite reports from the favorite list endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      {
        is_favorite: true,
        post_date: '2026-10-19T18:32:05Z',
        title: 'Gold miners breadth collapse',
        url: 'gold-miners-breadth-collapse-points-to-a-short-bounce',
        user_level: 'sentimentedge',
      },
    ]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await fetchReportFavorites()

    expect(fetchMock).toHaveBeenCalledWith(
      '/dev/st_data/blog_favortie_list',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(response.items[0]).toEqual(expect.objectContaining({ title: 'Gold miners breadth collapse', isFavorite: true }))
  })

  it('falls back to blog_info for favorite entries missing user_level', async () => {
    const fetchMock = vi.fn().mockImplementation((path: string) => {
      if (path.startsWith('/dev/st_data/blog_info/')) {
        return Promise.resolve(new Response(JSON.stringify({
          user_level: 'modeledge',
          title: 'ModelEdge : Breadth model update',
        }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify([
        {
          is_favorite: true,
          post_date: '2026-10-19T18:32:05Z',
          title: 'ModelEdge : Breadth model update',
          url: 'modeledge_breadth_model_update',
        },
      ]), { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await fetchReportFavorites()

    expect(fetchMock).toHaveBeenCalledWith(
      '/dev/st_data/blog_info/?url=modeledge_breadth_model_update',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(response.items[0]).toEqual(expect.objectContaining({
      title: 'ModelEdge : Breadth model update',
      category: 'ModelEdge report',
      userLevel: 'modeledge',
    }))
  })

  it('keeps a favorite entry when its blog_info request fails', async () => {
    const fetchMock = vi.fn().mockImplementation((path: string) => {
      if (path.startsWith('/dev/st_data/blog_info/')) {
        return Promise.resolve(new Response('', { status: 500 }))
      }
      return Promise.resolve(new Response(JSON.stringify([
        {
          is_favorite: true,
          post_date: '2026-10-19T18:32:05Z',
          title: 'Gold miners breadth collapse',
          url: 'gold-miners-breadth-collapse-points-to-a-short-bounce',
        },
      ]), { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await fetchReportFavorites()

    expect(response.items).toHaveLength(1)
    expect(response.items[0]).toEqual(expect.objectContaining({ title: 'Gold miners breadth collapse' }))
  })

  it('requests subsequent favorite pages with a page parameter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchReportFavorites(2)

    expect(fetchMock).toHaveBeenCalledWith(
      '/dev/st_data/blog_favortie_list?page=2',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

})
