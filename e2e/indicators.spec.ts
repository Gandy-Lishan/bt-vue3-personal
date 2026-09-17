import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { getSeededRawIndicators } from '../src/entities/indicator/model/indicator.fixtures'

function trendPayloadForRows(rows: ReturnType<typeof getSeededRawIndicators>) {
  return rows.map((row, rowIndex) => ({
    symbol: row.url,
    data: Array.from({ length: 35 }, (_, pointIndex) => ({
      Date: `2026-08-${String(pointIndex + 1).padStart(2, '0')}`,
      close: rowIndex % 4 === 3 ? 80 - pointIndex : pointIndex + rowIndex,
      change: pointIndex ? 1 : 0,
      percent_change: pointIndex ? 1 : 0,
    })),
  }))
}

function chartRowsForId(id: string) {
  return Array.from({ length: 80 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10)
    return {
      date,
      spx: 4200 + index * 4,
      [id]: 25 + Math.sin(index / 4) * 10 + index * 0.25,
      opt: 60,
      pess: 10,
    }
  })
}

function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function chartRowsAroundToday(id: string) {
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  startDate.setMonth(startDate.getMonth() - 4)

  return Array.from({ length: 125 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return {
      date: formatLocalDate(date),
      spx: 4200 + index * 4,
      [id]: 25 + Math.sin(index / 4) * 10 + index * 0.25,
      opt: 60,
      pess: 10,
    }
  })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })
  return { promise, resolve }
}

function seasonalityChartPayload() {
  return {
    day_of_year: Array.from({ length: 260 }, (_, index) => ({
      symbol: 'PLATINUM',
      day: index + 1,
      AvgReturn: Number((Math.sin(index / 18) * 1.1 + index / 55).toFixed(4)),
    })),
    current_day_of_year: Array.from({ length: 181 }, (_, index) => ({
      day: index + 1,
      balance: Number((0.4 + Math.sin(index / 22) * 0.8 + index / 85).toFixed(4)),
    })),
    month: Array.from({ length: 12 }, (_, index) => ({
      symbol: index + 1,
      AvgReturn: Number((Math.sin((index + 1) * 1.2) * 1.4).toFixed(4)),
    })),
  }
}

function detailPayloadForRow(row: ReturnType<typeof getSeededRawIndicators>[number]) {
  return {
    ...row,
    description: String.raw`Construction details for this indicator.\n<a href="{{url_for('user.legacy_chart')}}">Legacy Chart Link</a> &amp; signal notes.`,
    updated: 'Daily after close',
    source: 'SentimenTrader',
    show_returns: true,
    Above_Annualized: 8.2,
    Between_Annualized: 4.8,
    Below_Annualized: -2.1,
    percent_time_above: 12.5,
    percent_time_between: 70,
    percent_time_below: 17.5,
    return_segments: [
      { Location: 'Above Extreme', Return: 8.2, Time: 12.5 },
      { Location: 'Between Extremes', Return: 4.8, Time: 70 },
      { Location: 'Below Extreme', Return: -2.1, Time: 17.5 },
    ],
    blog_results: [
      {
        title: 'Research note for breadth',
        url: '/users/blog/research-note',
        date: '2026-09-01',
        summary: 'A short research summary.',
      },
    ],
    related: [{ chart_name: 'Related Breadth Chart', url: 'related_breadth_chart', type: 'Indicator' }],
    market_symbol: 'spx',
    pess: 10,
    opt: 60,
  }
}

test('shows indicator table and card toggle', async ({ page }) => {
  const rows = getSeededRawIndicators('stock_complete_list')
  const trendRequests: string[][] = []
  const requestCookies: string[] = []
  await page.addInitScript(() => {
    window.localStorage.setItem('backtestedge-theme', 'light')
  })
  await page.route('**/dev/st_data/stock_complete_list', async (route) => {
    requestCookies.push(route.request().headers().cookie ?? '')
    await route.fulfill({ json: rows })
  })
  await page.route('**/dev/st_data/stock_recent_data', async (route) => {
    const body = route.request().postDataJSON() as { indicator_list?: string[] }
    const requestedUrls = body.indicator_list ?? []
    trendRequests.push(requestedUrls)
    await route.fulfill({
      json: trendPayloadForRows(rows.filter((row) => requestedUrls.includes(String(row.url)))),
    })
  })

  await page.goto('/indicators')

  await expect(page.getByRole('heading', { name: 'Indicators', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Stock Market/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stock Market', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Stock Market' })).toBeVisible()
  await expect(page.getByText('20 Indicators', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Showing 1–12 of 20 indicators')).toBeVisible()
  await expect(page.getByRole('button', { name: /Table/ }).first()).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(page.getByRole('button', { name: '1', exact: true })).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(page.getByRole('option', { name: 'Short' })).toBeAttached()
  await expect(page.getByRole('option', { name: 'Long' })).toBeAttached()
  expect(requestCookies[0]).toContain('sentimen_session=')
  await expect.poll(() => trendRequests[0]?.length ?? 0).toBe(12)
  expect(trendRequests[0]).toEqual(rows.slice(0, 12).map((row) => row.url))

  const tableSparkline = page.getByTestId('indicator-sparkline').first()
  await expect(tableSparkline).toBeVisible()
  const tableSparklineStroke = await tableSparkline.locator('polyline').getAttribute('stroke')

  await page.getByRole('button', { name: /Card/ }).click()
  await page.waitForTimeout(250)
  await expect(page.getByRole('heading', { name: 'Stock Market' })).toBeVisible()
  await expect(page.getByText('Showing 1–12 of 20 indicators')).toBeVisible()
  await expect(page.getByRole('button', { name: /Card/ }).first()).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(page.getByTestId('indicator-sparkline').first()).toBeVisible()
  await expect(page.getByTestId('indicator-sparkline').first().locator('polyline')).toHaveAttribute(
    'stroke',
    tableSparklineStroke ?? '',
  )

  await page.getByRole('button', { name: 'Description & Legend' }).click()
  const descriptionDialog = page.getByRole('dialog')
  await expect(descriptionDialog.getByRole('heading', { name: 'Table Description and Optimism/Pessimism Legend' })).toBeVisible()
  await expect(descriptionDialog.getByText('The "TIME FRAME" column shows the applicable time frame')).toBeVisible()
  await expect(descriptionDialog.getByText('Extremely Pessimistic', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close description' }).click()
})

test('keeps indicator list stable when favoriting before favorites finish loading', async ({ page }) => {
  const rows = [
    {
      url: 'alpha',
      chart_name: 'Alpha Indicator',
      groups: 'Stock Market',
      sub_type: 'Stock Market',
      timeframe: 'Daily',
      last_value: 10,
      last_change: 1,
      last_update: '2026-09-08',
      sentiment: 4,
    },
    {
      url: 'bravo',
      chart_name: 'Bravo Indicator',
      groups: 'Stock Market',
      sub_type: 'Stock Market',
      timeframe: 'Daily',
      last_value: 20,
      last_change: 2,
      last_update: '2026-09-08',
      sentiment: 5,
    },
  ]
  const pendingFavorites = deferred<void>()
  const favoritePutBodies: string[] = []
  let listRequests = 0

  await page.addInitScript(() => {
    window.localStorage.setItem('backtestedge-theme', 'light')
  })
  await page.route('**/dev/dev/favorites/**', async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await pendingFavorites.promise
      await route.fulfill({
        json: {
          favorite_indicator: '[{"url":"alpha","name":"Alpha Indicator"}]',
          favorite_symbol: '["SPX"]',
        },
      })
      return
    }

    favoritePutBodies.push(route.request().postData() ?? '')
    await route.fulfill({ status: 204 })
  })
  await page.route('**/dev/st_data/stock_complete_list', async (route) => {
    listRequests += 1
    await route.fulfill({ json: rows })
  })
  await page.route('**/dev/st_data/stock_recent_data', async (route) => {
    await route.fulfill({ json: { data: {} } })
  })

  await page.goto('/indicators')
  const urlBeforeFavorite = page.url()

  await expect(page.getByRole('button', { name: 'Bravo Indicator' })).toBeVisible()
  await page.getByRole('row', { name: /Bravo Indicator/ }).getByRole('button', { name: 'Add favorite' }).click()

  expect(favoritePutBodies).toEqual([])
  pendingFavorites.resolve()

  await expect.poll(() => favoritePutBodies.length).toBe(1)

  const body = new URLSearchParams(favoritePutBodies[0])
  expect(JSON.parse(body.get('favorite_indicator') ?? '')).toEqual([
    { url: 'alpha', name: 'Alpha Indicator' },
    { url: 'bravo', name: 'Bravo Indicator' },
  ])
  expect(body.get('favorite_symbol')).toBe('["SPX"]')
  expect(listRequests).toBe(1)
  expect(page.url()).toBe(urlBeforeFavorite)
  await expect(page.getByRole('button', { name: 'Bravo Indicator' })).toBeVisible()
})

test('shows indicator detail layout and keeps detail features', async ({ page }) => {
  const rows = getSeededRawIndicators('stock_complete_list')
  const detailId = 'discretionary-sp1500-relative-trend-score-8'
  const detailRow = {
    ...rows[1],
    url: detailId,
    chart_name: '% of Discretionary Stocks in S&P 1500 with Relative Trend Score >= 8',
  }
  const chartRequestPaths: string[] = []
  const downloadRequestIndexes: string[] = []
  await page.addInitScript(() => {
    window.localStorage.setItem('backtestedge-theme', 'light')
  })
  await page.route('**/dev/st_data/stock_complete_list', async (route) => {
    await route.fulfill({ json: rows })
  })
  await page.route('**/dev/st_data/search_url_info**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const id = requestUrl.searchParams.get('url')
    const matchedRow = rows.find((row) => row.url === id)
    let row: ReturnType<typeof getSeededRawIndicators>[number]
    if (id === detailId) {
      row = detailRow
    } else if (matchedRow) {
      row = matchedRow
    } else {
      row = {
        ...rows[0],
        url: id ?? rows[0].url,
        chart_name: id === 'related_breadth_chart' ? 'Related Breadth Chart' : rows[0].chart_name,
      }
    }
    await route.fulfill({ json: detailPayloadForRow(row) })
  })
  await page.route('**/dev/st_data/download_csv**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const id = requestUrl.searchParams.get('index') ?? 'indicator'
    downloadRequestIndexes.push(id)
    await route.fulfill({ json: chartRowsForId(id) })
  })
  await page.route('**/dev/st_data/get_data?index=**', async (route) => {
    const requestUrl = new URL(route.request().url())
    chartRequestPaths.push(requestUrl.pathname)
    const id = requestUrl.searchParams.get('index') ?? 'indicator'
    await route.fulfill({ json: chartRowsForId(id) })
  })

  await page.goto(`/indicators/${detailId}`)
  await expect(page.getByRole('link', { name: 'Back to Indicators', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Discretionary Stocks/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Indicator Detail' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Most Popular' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'My Favorites' })).toHaveCount(0)
  await expect(page.getByText(/Time Frame:\s*Medium-Term/)).toBeVisible()
  await expect(page.getByText(/Update Schedule:\s*Daily/)).toBeVisible()
  await expect(page.getByText(/Source:\s*SentimenTrader/)).toBeVisible()
  await expect(page.getByText(/Last Updated:\s*September 8, 2026/)).toBeVisible()
  await expect(page.locator('.highcharts-container')).toBeVisible()
  expect(chartRequestPaths[0]).toBe('/dev/st_data/get_data')
  await expect(page.getByRole('heading', { name: 'Construction' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Legacy Chart Link' })).toHaveAttribute(
    'href',
    'https://users.sentimentrader.com/users/charts/legacy_chart',
  )
  await expect(page.getByRole('heading', { name: 'Threshold Return Analysis' })).toBeVisible()

  await page.getByRole('button', { name: 'Show Return Segments' }).click()
  await expect(page.getByText('Between Extremes').first()).toBeVisible()

  await page.getByPlaceholder('Search indicators...').fill('Energy')
  await expect(page.getByRole('link', { name: /Energy Stocks/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Communication Services/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Download' }).hover()
  const downloadTooltip = page.getByRole('tooltip')
  await expect(downloadTooltip).toContainText(
    'To prevent abuse of sentimentrader data, we only provide recent 3-6 months data of the indicator.',
  )
  await expect(downloadTooltip.getByRole('link', { name: 'admin@sentimentrader.com' })).toHaveAttribute(
    'href',
    'mailto:admin@sentimentrader.com',
  )

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/Discretionary.*\.csv/)
  expect(downloadRequestIndexes[0]).toBe(detailId)

  await page.getByRole('button', { name: 'Research & Blog Posts' }).click()
  await expect(page.getByRole('link', { name: /Research note for breadth/ })).toBeVisible()

  await page.getByRole('button', { name: 'Related Charts' }).click()
  await expect(page.getByRole('button', { name: /Related Breadth Chart/ })).toBeVisible()
  await page.getByRole('button', { name: /Related Breadth Chart/ }).click()
  await expect(page).toHaveURL(/related_breadth_chart/)
  await expect(page.getByRole('heading', { name: /Related Breadth Chart/ })).toBeVisible()
})

test('resolves the source table from direct indicator detail links', async ({ page }) => {
  const sp1500Row = {
    ...getSeededRawIndicators('stock_complete_list')[0],
    url: 'xlv_reltrend_above8_spx_ratio',
    chart_name: 'XLV Relative Trend Score',
    groups: 'Stock Market',
    sub_type: 'stock_sent',
  }
  let stockListRequests = 0
  let sp1500ListRequests = 0

  await page.addInitScript(() => {
    window.localStorage.setItem('backtestedge-theme', 'light')
  })
  await page.route('**/dev/st_data/stock_complete_list', async (route) => {
    stockListRequests += 1
    await route.fulfill({ json: [] })
  })
  await page.route('**/dev/st_data/sp_1500_complete_list', async (route) => {
    sp1500ListRequests += 1
    await route.fulfill({ json: [sp1500Row] })
  })
  await page.route('**/dev/st_data/search_url_info**', async (route) => {
    await route.fulfill({ json: detailPayloadForRow(sp1500Row) })
  })
  await page.route('**/dev/st_data/get_data?index=**', async (route) => {
    await route.fulfill({ json: chartRowsForId('xlv_reltrend_above8_spx_ratio') })
  })

  await page.goto('/indicators/xlv_reltrend_above8_spx_ratio')

  await expect(page.getByRole('heading', { name: 'XLV Relative Trend Score' })).toBeVisible()
  const detailBreadcrumb = page.locator('main nav').first()
  await expect(detailBreadcrumb).toContainText('S&P 1500')
  await expect(detailBreadcrumb).not.toContainText('Stock Market')
  await expect(detailBreadcrumb).toContainText('S&P 1500 Stock Sentiment')
  await expect(detailBreadcrumb).not.toContainText('stock_sent')
  await expect(page.getByText('S&P 1500 Stock Sentiment').first()).toBeVisible()
  await expect(page.getByLabel('Back to indicators list')).toHaveAttribute('href', '/indicators')
  await expect(page.getByRole('link', { name: 'XLV Relative Trend Score' })).toBeVisible()
  expect(sp1500ListRequests).toBe(1)
  expect(stockListRequests).toBe(0)
})

test('shows a not found message for unavailable legacy indicator links', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('backtestedge-theme', 'light')
  })

  await page.goto('/indicators/vol_vix_transform')

  await expect(page.getByText('Unable to find the corresponding indicator')).toBeVisible()
})

test('falls back to recent chart rows when indicator download API is unavailable', async ({ page }) => {
  const rows = getSeededRawIndicators('stock_complete_list')
  const id = 'discretionary-sp1500-relative-trend-score-8'
  const chartRows = chartRowsAroundToday(id)

  await page.addInitScript(() => {
    window.localStorage.setItem('backtestedge-theme', 'light')
  })
  await page.route('**/dev/st_data/stock_complete_list', async (route) => {
    await route.fulfill({ json: rows })
  })
  await page.route('**/dev/st_data/search_url_info**', async (route) => {
    const matchedRow = rows.find((row) => row.url === id) ?? rows[0]
    await route.fulfill({ json: detailPayloadForRow(matchedRow) })
  })
  await page.route('**/dev/st_data/download_csv**', async (route) => {
    await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: 'Forbidden' }) })
  })
  await page.route('**/dev/st_data/get_data?index=**', async (route) => {
    await route.fulfill({ json: chartRows })
  })

  await page.goto(`/indicators/${id}`)
  await expect(page.locator('.highcharts-container')).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  const downloadPath = await download.path()
  if (!downloadPath) throw new Error('Expected downloaded CSV path')

  const csv = await readFile(downloadPath, 'utf8')
  expect(csv).not.toContain(chartRows[0].date)
  expect(csv).toContain(chartRows[chartRows.length - 1].date)
})

test('renders seasonality detail chart from object payload', async ({ page }) => {
  const rows = getSeededRawIndicators('stock_complete_list')
  const seasonalityRow = {
    url: 'platinum-seasonality',
    chart_name: 'Platinum Seasonality',
    groups: 'Seasonality',
    sub_type: 'Commodity Market Seasonality',
    timeframe: 'Daily',
    last_value: 2.59,
    last_change: 0.3,
    last_update: '2026-09-08',
    sentiment: 4,
    type: 'commod_seasonality',
    source_list: 'commod_seasonality',
    market_symbol: 'PLATINUM',
  }

  await page.addInitScript(() => {
    window.localStorage.setItem('backtestedge-theme', 'light')
  })
  await page.route('**/dev/st_data/stock_complete_list', async (route) => {
    await route.fulfill({ json: [seasonalityRow, ...rows] })
  })
  await page.route('**/dev/st_data/commod_seasonality', async (route) => {
    await route.fulfill({ json: [seasonalityRow] })
  })
  await page.route('**/dev/st_data/search_url_info**', async (route) => {
    await route.fulfill({ json: detailPayloadForRow(seasonalityRow) })
  })
  await page.route('**/dev/st_data/get_data?index=**', async (route) => {
    await route.fulfill({ json: seasonalityChartPayload() })
  })

  await page.goto('/indicators/platinum-seasonality')

  await expect(page.getByRole('heading', { name: 'Platinum Seasonality' })).toBeVisible()
  await expect(page.locator('.seasonality-chart-stack .highcharts-container')).toHaveCount(2)
  await expect(page.getByText('Average of All Years')).toBeVisible()
  await expect(page.getByText('Trading Day Of The Year')).toBeVisible()
  await expect(page.getByText('Month Of The Year')).toBeVisible()
  await expect(page.getByText('No chart data')).toHaveCount(0)
})

test('sorts indicator table columns and formats group and percentage changes', async ({ page }) => {
  await page.route('**/dev/st_data/stock_recent_data', async (route) => {
    await route.fulfill({ json: { data: {} } })
  })
  await page.route('**/dev/st_data/stock_complete_list', async (route) => {
    await route.fulfill({
      json: [
        {
          url: 'middle',
          chart_name: 'Middle Indicator',
          groups: 'Stock Market',
          sub_type: 'Stock Market',
          timeframe: 'Daily',
          last_value: 10,
          last_change: 1.25,
          last_change_type: 'percent',
          last_update: '2026-09-08',
          sentiment: 4,
        },
        {
          url: 'low',
          chart_name: 'Low Indicator',
          groups: 'Stock Market',
          sub_type: 'market breadth',
          timeframe: 'Daily',
          last_value: 8,
          last_change: -2.5,
          last_change_type: 'percent',
          last_update: '2026-09-07',
          sentiment: 2,
        },
        {
          url: 'high',
          chart_name: 'High Indicator',
          groups: 'Stock Market',
          sub_type: 'macro model',
          timeframe: 'Daily',
          last_value: 12,
          last_change: 7,
          last_update: '2026-09-09',
          sentiment: 6,
        },
      ],
    })
  })

  await page.goto('/indicators')

  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toContainText('Middle Indicator')
  await expect(firstRow).toContainText('Stock Market')
  await expect(firstRow).toContainText('1.25%')

  await page.getByRole('button', { name: 'Sort by Change ascending' }).click()
  await expect(page.locator('tbody tr').first()).toContainText('Low Indicator')

  await page.getByRole('button', { name: 'Sort by Change descending' }).click()
  await expect(page.locator('tbody tr').first()).toContainText('High Indicator')
})
