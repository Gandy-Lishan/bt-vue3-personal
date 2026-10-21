/**
 * Service function stubs for ChartIQ extensions
 *
 * Original Vue2 project had @/service/service.js.
 * These are used by loadIndicator.js for searching indicators and fetching pair data.
 * Full implementations should be added when the corresponding Vue3 APIs are available.
 */

export async function searchIndicator(name: string): Promise<unknown> {
  console.warn('[ChartIQ stub] searchIndicator called with:', name)
  return { data: [] }
}

export async function getPairData(
  start: string,
  end: string,
  freq: string,
  url: string,
): Promise<unknown> {
  console.warn('[ChartIQ stub] getPairData called:', { start, end, freq, url })
  return { data: [] }
}

export async function symbolCsvFileDelete(url: string): Promise<unknown> {
  console.warn('[ChartIQ stub] symbolCsvFileDelete called:', url)
  return { status: 200 }
}

export async function fetchAISuplineData(
  vm: unknown,
  symbol: string,
  date: string,
  freq: string,
): Promise<unknown> {
  console.warn('[ChartIQ stub] fetchAISuplineData called:', { vm, symbol, date, freq })
  return { drawing_instructions: { trend_channel: [], horizontal_levels: [] } }
}

export function stopAllPolling(): void {
  console.warn('[ChartIQ stub] stopAllPolling called')
}
