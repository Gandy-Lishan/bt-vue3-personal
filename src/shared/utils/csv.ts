/** Minimal RFC 4180 CSV writing and browser download. */

/** Quotes a cell only when it would otherwise be misread. */
export function escapeCsvValue(value: unknown): string {
  const text = value === undefined || value === null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Header row first, then one row per entry. CRLF line endings per the spec. */
export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
