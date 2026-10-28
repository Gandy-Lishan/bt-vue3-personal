export interface MySignalHeaderColumn {
  key: 'name' | 'symbol' | 'timeframe' | 'signal' | 'lastSignalDate' | 'barsSinceSignal' | 'currentReturn' | 'actions'
  label: string
  align: 'left' | 'right'
  pad: string
  sortable: boolean
  width?: string
  tooltip?: string
}

/** Shared by the My Signals list and the dashboard preview. */
export const mySignalHeaderColumns: MySignalHeaderColumn[] = [
  { key: 'name', label: 'Name', align: 'left', pad: 'px-4', sortable: true },
  { key: 'symbol', label: 'Symbol', align: 'left', pad: 'px-3', sortable: true },
  { key: 'timeframe', label: 'Timeframe', align: 'left', pad: 'px-3', sortable: true },
  { key: 'signal', label: 'Signal', align: 'left', pad: 'px-3', sortable: false },
  { key: 'lastSignalDate', label: 'Last signal', align: 'left', pad: 'px-3', sortable: true },
  { key: 'barsSinceSignal', label: 'Bars since signal', align: 'right', pad: 'px-3', sortable: true, tooltip: 'The number of bars (e.g., weeks for weekly signals) that have elapsed since the last signal occurred.' },
  { key: 'currentReturn', label: 'Return since signal', align: 'right', pad: 'px-3', sortable: true, tooltip: 'The cumulative return since the last signal up to the most recent day, expressed as a percentage (%).' },
  { key: 'actions', label: 'Actions', align: 'right', pad: 'px-4', sortable: false, width: 'w-[164px]' },
]
