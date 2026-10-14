/**
 * CSV export for the seasonality tables. Cells come from the same `cellText`
 * the table renders, so the export matches what is on screen.
 */

export interface SeasonalityCsvColumn<Key extends string> {
  key: Key
  label: string
}

export function seasonalityCsvTable<Row, Key extends string>(
  columns: Array<SeasonalityCsvColumn<Key>>,
  rows: Row[],
  cellText: (row: Row, key: Key) => string,
) {
  return {
    headers: columns.map((column) => column.label),
    rows: rows.map((row) => columns.map((column) => cellText(row, column.key))),
  }
}

export function seasonalityCsvFilename(label: string, isoDate: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'seasonality'}-${isoDate}.csv`
}
