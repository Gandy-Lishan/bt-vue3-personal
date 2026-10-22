export interface AppDataTableColumn {
  key: string
  label: string
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  format?: (value: unknown, row: Record<string, unknown>) => string
  cellClass?: (value: unknown, row: Record<string, unknown>) => string
  badgeClass?: (value: unknown, row: Record<string, unknown>) => string
}
