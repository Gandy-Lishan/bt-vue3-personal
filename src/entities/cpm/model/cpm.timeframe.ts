/**
 * CPM 结果页 Multi-Timeframe / Max Gain and Loss 计算模块
 *
 * 【Vue2→Vue3 完全一致迁移】照搬原版：
 *   src/components/CPM/results/components/tim.vue          (Multi-Timeframe Results - Long Term)
 *   src/components/CPM/results/components/timShortTerm.vue (Multi-Timeframe Results - Short Term, Daily only)
 *   src/components/CPM/results/components/MaxMin.vue       (Max Gain and Loss)
 *
 * 唯一差异：原版方法内部直接读 `CIQ.stxx.chart.dataSet` / `CIQ.stxx.chart.masterData`，
 * 这里改为接收 `CpmPatternChartIQ` 上报的行情快照（同样取自 dataSet / masterData）。
 * 计算过程、排序、toFixed/isNaN/parseFloat 等行为均与原版一致，包括原有的边界行为。
 */
import { formatStandardTime } from '@/shared/utils/time'

/** CPM 图表 wrapper 上报的 bar 快照（只保留计算需要的字段） */
export interface CpmChartQuote {
  /** CIQ.stxx.chart.dataSet[i].DT.getTime() */
  DT: number
  /** CIQ.stxx.chart.dataSet[i].Close */
  Close: number
}

export interface CpmChartQuoteSnapshot {
  /** CIQ.stxx.chart.dataSet（当前已加载的显示区间） */
  dataSet: CpmChartQuote[]
  /** CIQ.stxx.chart.masterData（完整历史，用于 Z-score 统计） */
  masterData: CpmChartQuote[]
}

export interface CpmTimeframeReportOptions {
  rowFrequency: string
  direction: string
  /** 每笔交易的信号日期（Vue2 TradeDateArray，取自 result['End Date']） */
  tradeDates: string[]
  chartDataSet: CpmChartQuote[]
  chartMasterData: CpmChartQuote[]
}

export interface CpmTimeframeReport {
  /** 统计表：property × period（Vue2 result_quotes 转置后的表格） */
  statsRows: Array<Record<string, unknown>>
  /** 统计表周期列顺序 */
  periods: string[]
  /** 每条信号的前瞻收益（Entry Date + 各周期 Later [%]） */
  historyRows: Array<Record<string, unknown>>
  /** 历史表列顺序（含 Entry Date），与 Vue2 defaultTableLabels 一致 */
  historyLabels: string[]
}

export interface CpmMaxGainLossReport {
  /** 每笔信号 + Mean/Median/# of Times +/- 5%/# of Times +/- 10% 汇总行 */
  rows: Array<Record<string, unknown>>
  /** 列顺序：Dates of Signals、各周期、Max Gain、Max Loss */
  labels: string[]
}

interface PeriodSpec {
  period: number
  timeframe: string
}

interface PeriodBucket extends PeriodSpec {
  /** Vue2 transformData/transformZScoreData 生成的周期标签 */
  timeframeLabel: string
  /** 该周期对应的 bar 数 */
  value: number
}

/** Vue2 三个组件都写死 tradePrice = 'Close' */
const TRADE_PRICE = 'Close'
/** 原版 ElTable 里 property 列的固定表头 */
type PriceQuote = Record<string, number>

const MONTH_YEAR_PERIODS: PeriodSpec[] = [
  { period: 1, timeframe: 'Month' },
  { period: 2, timeframe: 'Month' },
  { period: 3, timeframe: 'Month' },
  { period: 4, timeframe: 'Month' },
  { period: 5, timeframe: 'Month' },
  { period: 6, timeframe: 'Month' },
  { period: 1, timeframe: 'Year' },
]

const MONTH_YEAR_LABELS = [
  '1 Month [%]',
  '2 Months [%]',
  '3 Months [%]',
  '4 Months [%]',
  '5 Months [%]',
  '6 Months [%]',
  '1 Year [%]',
]

const WEEKLY_LONG_LABELS = [
  '1 Week [%]',
  '2 Weeks [%]',
  '1 Month [%]',
  '2 Months [%]',
  '3 Months [%]',
  '6 Months [%]',
  '1 Year [%]',
]

const MONTHLY_LONG_LABELS = [
  '1 Month [%]',
  '3 Months [%]',
  '6 Months [%]',
  '9 Months [%]',
  '1 Year [%]',
  '2 Years [%]',
  '3 Years [%]',
]

/** tim.vue getAllDefaultTableLabels */
function longTermSpec(rowFrequency: string): { periodArray: PeriodSpec[]; labels: string[] } {
  switch (rowFrequency) {
    case 'Daily':
      return { periodArray: MONTH_YEAR_PERIODS, labels: MONTH_YEAR_LABELS }
    case 'Weekly':
      return {
        periodArray: [
          { period: 1, timeframe: 'Week' },
          { period: 2, timeframe: 'Week' },
          { period: 1, timeframe: 'Month' },
          { period: 2, timeframe: 'Month' },
          { period: 3, timeframe: 'Month' },
          { period: 6, timeframe: 'Month' },
          { period: 1, timeframe: 'Year' },
        ],
        labels: WEEKLY_LONG_LABELS,
      }
    case 'Monthly':
      return {
        periodArray: [
          { period: 1, timeframe: 'Month' },
          { period: 3, timeframe: 'Month' },
          { period: 6, timeframe: 'Month' },
          { period: 9, timeframe: 'Month' },
          { period: 1, timeframe: 'Year' },
          { period: 2, timeframe: 'Year' },
          { period: 3, timeframe: 'Year' },
        ],
        labels: MONTHLY_LONG_LABELS,
      }
    default:
      return { periodArray: MONTH_YEAR_PERIODS, labels: MONTH_YEAR_LABELS }
  }
}

/** timShortTerm.vue getAllDefaultTableLabels（Weekly/Monthly 与 Long Term 相同） */
function shortTermSpec(rowFrequency: string): { periodArray: PeriodSpec[]; labels: string[] } {
  if (rowFrequency === 'Daily') {
    return {
      periodArray: [
        { period: 1, timeframe: 'Day' },
        { period: 2, timeframe: 'Day' },
        { period: 3, timeframe: 'Day' },
        { period: 4, timeframe: 'Day' },
        { period: 1, timeframe: 'Week' },
        { period: 2, timeframe: 'Week' },
        { period: 3, timeframe: 'Week' },
      ],
      labels: ['1 Day [%]', '2 Days [%]', '3 Days [%]', '4 Days [%]', '1 Week [%]', '2 Weeks [%]', '3 Weeks [%]'],
    }
  }
  return longTermSpec(rowFrequency)
}

/** MaxMin.vue getAllDefaultTableLabels：三个频率都用 1-6 Month + 1 Year */
const MAX_GAIN_LOSS_LABELS = ['Dates of Signals', ...MONTH_YEAR_LABELS, 'Max Gain', 'Max Loss']

/** Vue2 formatStandardTime(...).getTime()，解析失败返回 NaN（原版会抛错，这里按不可匹配处理） */
function tradeTimestamps(tradeDates: string[]) {
  return tradeDates.map((date) => formatStandardTime(date)?.getTime() ?? NaN)
}

/**
 * tim.vue / timShortTerm.vue / MaxMin.vue transformData
 * 周期 → bar 数映射；shortTerm 为 true 时启用 timShortTerm 里 `period % 5 && Day → Week` 那一行。
 */
function transformHistoryPeriods(data: PeriodSpec[], rowFrequency: string, shortTerm: boolean): PeriodBucket[] {
  const normalized = data.map((item) => {
    if (item.period % 252 === 0 && item.timeframe === 'Day') return { period: item.period / 252, timeframe: 'Year' }
    if (item.period % 21 === 0 && item.timeframe === 'Day') return { period: item.period / 21, timeframe: 'Month' }
    if (shortTerm && item.period % 5 === 0 && item.timeframe === 'Day') return { period: item.period / 5, timeframe: 'Week' }
    if (item.period % 52 === 0 && item.timeframe === 'Week') return { period: item.period / 52, timeframe: 'Year' }
    if (item.period % 12 === 0 && item.timeframe === 'Month') return { period: item.period / 12, timeframe: 'Year' }
    return { period: item.period, timeframe: item.timeframe }
  })

  const corrected = normalized.map((item) => {
    let period = item.period
    let timeframe = item.timeframe
    if (rowFrequency === 'Daily') {
      if (timeframe === 'Day') {
        if (period % 5 === 0) {
          period = period / 5
          timeframe = 'Week'
        }
        if (period % 13 === 0 && timeframe.includes('Week')) {
          period = (period / 13) * 3
          timeframe = 'Month'
        }
        if (period % 12 === 0 && timeframe.includes('Month')) {
          period = period / 12
          timeframe = 'Year'
        }
      } else if (timeframe === 'Week') {
        if (period % 13 === 0) {
          period = (period / 13) * 3
          timeframe = 'Month'
        }
        if (period % 12 === 0 && timeframe.includes('Month')) {
          period = period / 12
          timeframe = 'Year'
        }
      } else if (timeframe === 'Month') {
        if (period % 12 === 0) {
          period = period / 12
          timeframe = 'Year'
        }
      }
      return { period, timeframe }
    }
    if (rowFrequency === 'Weekly') {
      if (timeframe === 'Week') {
        if ((period % 13) % 4 === 0) {
          if (period % 13 === 12) {
            // 不转
            timeframe = 'Week'
          } else {
            const num = Math.trunc(period / 13)
            const end = (period % 13) / 4
            period = num * 3 + end
            timeframe = 'Month'
          }
        }
        if (period % 12 === 0 && timeframe.includes('Month')) {
          period = period / 12
          timeframe = 'Year'
        }
      } else if (timeframe === 'Month') {
        if (period % 12 === 0) {
          period = period / 12
          timeframe = 'Year'
        }
      }
      return { period, timeframe }
    }
    if (rowFrequency === 'Monthly') {
      if (timeframe === 'Month') {
        if (period % 12 === 0) {
          period = period / 12
        }
      }
      return { period, timeframe }
    }
    return { period, timeframe }
  })

  const uniqueData: Array<{ period: number; timeframe: string }> = []
  corrected.forEach((item) => {
    const isDuplicate = uniqueData.some(
      (uniqueItem) => uniqueItem.period == item.period && uniqueItem.timeframe == item.timeframe,
    )
    if (!isDuplicate) uniqueData.push(item)
  })

  return uniqueData.map((item) => {
    const timeframeLabel =
      item.period > 1 ? `${item.period} ${item.timeframe}s [%]` : `${item.period} ${item.timeframe} [%]`
    let value: number
    if (rowFrequency == 'Daily') {
      switch (item.timeframe) {
        case 'Day':
          value = Number(item.period)
          break
        case 'Week':
          value = Number(item.period) * 5
          break
        case 'Month':
          value = Number(item.period) * 21
          break
        case 'Year':
          value = Number(item.period) * 252
          break
        default:
          value = NaN
      }
    } else if (rowFrequency == 'Weekly') {
      switch (item.timeframe) {
        case 'Week':
          value = Number(item.period)
          break
        case 'Month': {
          const period = Number(item.period)
          const num_3 = Math.trunc(period / 3) // 去除小数点取整数
          const end_3 = period % 3 // 余数
          value = num_3 * 13 + end_3 * 4
          break
        }
        case 'Year':
          value = Number(item.period) * 52
          break
        default:
          value = NaN
      }
    } else if (rowFrequency == 'Monthly') {
      switch (item.timeframe) {
        case 'Month':
          value = Number(item.period)
          break
        case 'Year':
          value = Number(item.period) * 12
          break
        default:
          value = NaN
      }
    } else {
      value = NaN
    }
    return { timeframe: item.timeframe, period: item.period, timeframeLabel, value }
  })
}

/**
 * tim.vue / timShortTerm.vue transformZScoreData
 * 与 transformHistoryPeriods 的差异：标签不带 ' [%]'。
 */
function transformZScorePeriods(data: PeriodSpec[], rowFrequency: string, shortTerm: boolean): PeriodBucket[] {
  const normalized = data.map((item) => {
    if (item.period % 252 === 0 && item.timeframe === 'Day') return { period: item.period / 252, timeframe: 'Year' }
    if (item.period % 21 === 0 && item.timeframe === 'Day') return { period: item.period / 21, timeframe: 'Month' }
    if (shortTerm && item.period % 5 === 0 && item.timeframe === 'Day') return { period: item.period / 5, timeframe: 'Week' }
    if (item.period % 52 === 0 && item.timeframe === 'Week') return { period: item.period / 52, timeframe: 'Year' }
    if (item.period % 12 === 0 && item.timeframe === 'Month') return { period: item.period / 12, timeframe: 'Year' }
    return { period: item.period, timeframe: item.timeframe }
  })

  const corrected = normalized.map((item) => {
    let period = item.period
    let timeframe = item.timeframe
    if (rowFrequency === 'Daily') {
      if (timeframe === 'Day') {
        if (period % 5 === 0) {
          period = period / 5
          timeframe = 'Week'
        }
        if (period % 13 === 0 && timeframe.includes('Week')) {
          period = (period / 13) * 3
          timeframe = 'Month'
        }
        if (period % 12 === 0 && timeframe.includes('Month')) {
          period = period / 12
          timeframe = 'Year'
        }
      } else if (timeframe === 'Week') {
        if (period % 13 === 0) {
          period = (period / 13) * 3
          timeframe = 'Month'
        }
        if (period % 12 === 0 && timeframe.includes('Month')) {
          period = period / 12
          timeframe = 'Year'
        }
      } else if (timeframe === 'Month') {
        if (period % 12 === 0) {
          period = period / 12
          timeframe = 'Year'
        }
      }
      return { period, timeframe }
    }
    if (rowFrequency === 'Weekly') {
      if (timeframe === 'Week') {
        if ((period % 13) % 4 === 0) {
          if (period % 13 === 12) {
            // 不转
            period = period
            timeframe = 'Week'
          } else {
            const num = Math.trunc(period / 13)
            const end = (period % 13) / 4
            period = num * 3 + end
            timeframe = 'Month'
          }
        }
        if (period % 12 === 0 && timeframe.includes('Month')) {
          period = period / 12
          timeframe = 'Year'
        }
      } else if (timeframe === 'Month') {
        if (period % 12 === 0) {
          period = period / 12
          timeframe = 'Year'
        }
      }
      return { period, timeframe }
    }
    if (rowFrequency === 'Monthly') {
      if (timeframe === 'Month') {
        if (period % 12 === 0) {
          period = period / 12
        }
      }
      return { period, timeframe }
    }
    return { period, timeframe }
  })

  return corrected.map((item) => {
    const timeframeLabel =
      item.period > 1 ? `${item.period} ${item.timeframe}s` : `${item.period} ${item.timeframe}`
    let value: number
    if (rowFrequency == 'Daily') {
      switch (item.timeframe) {
        case 'Day':
          value = Number(item.period)
          break
        case 'Week':
          value = Number(item.period) * 5
          break
        case 'Month':
          value = Number(item.period) * 21
          break
        case 'Year':
          value = Number(item.period) * 252
          break
        default:
          value = NaN
      }
    } else if (rowFrequency == 'Weekly') {
      switch (item.timeframe) {
        case 'Week':
          value = Number(item.period)
          break
        case 'Month': {
          const period = Number(item.period)
          const num_3 = Math.trunc(period / 3)
          const end_3 = period % 3
          value = num_3 * 13 + end_3 * 4
          break
        }
        case 'Year':
          value = Number(item.period) * 52
          break
        default:
          value = NaN
      }
    } else if (rowFrequency == 'Monthly') {
      switch (item.timeframe) {
        case 'Month':
          value = Number(item.period)
          break
        case 'Year':
          value = Number(item.period) * 12
          break
        default:
          value = NaN
      }
    } else {
      value = NaN
    }
    return { timeframe: item.timeframe, period: item.period, timeframeLabel, value }
  })
}

/** tim.vue generate_period_data */
function generatePeriodData(name: string, quotes: PriceQuote[], period: number, direction: string): PriceQuote[] {
  const field = TRADE_PRICE
  const withFuture = quotes.map((row, i) => {
    if (i < quotes.length - period) {
      const change = parseFloat(
        String(
          ((direction == 'Short'
            ? row[field] - quotes[i + period][field]
            : quotes[i + period][field] - row[field]) /
            row[field]) *
            100,
        ),
      )
      return {
        ...row,
        [field + period]: quotes[i + period][field],
        [name]: change == Infinity || change == -Infinity ? 0 : change,
      }
    }
    return {
      ...row,
      [field + period]: NaN,
      [name]: NaN,
    }
  })

  const minCloseArr = getPeriodParm(
    withFuture.map((row) => row[field + period]),
    'min',
    period,
  )
  const maxCloseArr = getPeriodParm(
    withFuture.map((row) => row[field + period]),
    'max',
    period,
  )
  const withMaxLoss = withFuture.map((row, i) => {
    if (i >= period) {
      const change = parseFloat(String(100 * (minCloseArr[i] / row[field] - 1)))
      return { ...row, ['MaxLoss' + period]: change == Infinity || change == -Infinity ? 0 : change }
    }
    return { ...row, ['MaxLoss' + period]: NaN }
  })
  return withMaxLoss.map((row, i) => {
    if (i >= period) {
      const change = parseFloat(String(100 * (maxCloseArr[i] / row[field] - 1)))
      return { ...row, ['MaxGain' + period]: change == Infinity || change == -Infinity ? 0 : change }
    }
    return { ...row, ['MaxGain' + period]: NaN }
  })
}

/** tim.vue get_period_parm */
function getPeriodParm(dataSeries: number[], paramType: 'max' | 'min' | 'mean' | 'sum', period: number) {
  const typeDict = {
    max: Math.max,
    min: Math.min,
    mean: (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length,
    sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
  }

  const dataArr: number[] = []
  if (period <= 1) {
    for (let i = 0; i < dataSeries.length; i++) {
      const val = dataSeries[i]
      dataArr.push(isNaN(val) ? NaN : Number(val.toFixed(3)))
    }
    return dataArr
  }

  for (let i = 0; i < dataSeries.length; i++) {
    if (i >= period) {
      const window = dataSeries.slice(i - period, i).filter((n) => !isNaN(n))
      if (window.length === 0) {
        dataArr.push(NaN)
        continue
      }
      const tmpData =
        paramType === 'mean' || paramType === 'sum' ? typeDict[paramType](window) : typeDict[paramType](...window)
      dataArr.push(Number(tmpData.toFixed(3)))
    } else {
      dataArr.push(NaN)
    }
  }
  return dataArr
}

/**
 * Vue2 里缺失的未来区间用 '' 表示；`isNaN('') === false`，所以它不会被
 * filter 掉，会按 0 参与求和/排序（原版行为，保持一致）。
 */
type CpmStatValue = number | string

function calculateWinRate(arr: ReadonlyArray<CpmStatValue>) {
  const filtered = arr.filter((x) => !isNaN(x as number)) as number[]
  if (filtered.length == 0) return NaN
  const returnSeries = filtered.map((x) => (x > 0 ? 1 : 0))
  return parseFloat(String(calculateMean(returnSeries)))
}

function calculateMean(arr: ReadonlyArray<CpmStatValue>) {
  const filtered = arr.filter((x) => !isNaN(x as number)) as number[]
  if (filtered.length == 0) return NaN
  return filtered.reduce((a, b) => a + b) / filtered.length
}

function calculateStd(arr: ReadonlyArray<CpmStatValue>) {
  const filtered = arr.filter((x) => !isNaN(x as number)) as number[]
  if (filtered.length == 0) return NaN
  const mean = filtered.reduce((a, b) => a + b) / filtered.length
  const deviationArr = filtered.map((x) => Math.pow(x - mean, 2))
  const variance = deviationArr.reduce((a, b) => a + b) / (deviationArr.length - 1)
  return Math.sqrt(variance)
}

function calculateMedian(arr: ReadonlyArray<CpmStatValue>) {
  const filtered = arr.filter((n) => !isNaN(n as number)) as number[]
  if (filtered.length == 0) return NaN
  const mid = Math.floor(filtered.length / 2)
  const nums = [...filtered].sort((a, b) => a - b)
  return parseFloat(String(filtered.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2))
}

/** tim.vue calculateBacktestHistory：每条信号的 Entry Date + 各周期 Later [%] */
function calculateBacktestHistory(
  chartDataset: CpmChartQuote[],
  tradeDates: string[],
  periodBuckets: PeriodBucket[],
  direction: string,
) {
  const field = TRADE_PRICE
  const backtestResult: Array<Record<string, unknown>> = []
  const sortedPeriods = [...periodBuckets].sort((a, b) => a.value - b.value)

  tradeDates.forEach((tradeDate) => {
    const entryTime = formatStandardTime(tradeDate)?.getTime() ?? NaN
    const res = chartDataset.findIndex((x) => entryTime == x.DT)
    if (res == -1) return

    const entryPrice = chartDataset[res][field]
    const obj: Record<string, unknown> = {}
    sortedPeriods.forEach((item) => {
      const exitBar = chartDataset[res + item.value]
        ? (
            ((direction == 'Short'
              ? entryPrice - chartDataset[res + item.value][field]
              : chartDataset[res + item.value][field] - entryPrice) /
              entryPrice) *
            100
          ).toFixed(1)
        : ''
      obj[item.timeframeLabel] = exitBar
    })
    backtestResult.push({ 'Entry Date': tradeDate, ...obj })
  })

  return backtestResult
}

/** tim.vue calculateZScore（含 generate_table_data / generatePeriods 的转置） */
function calculateZScore(
  chartDataset: CpmChartQuote[],
  chartMasterData: CpmChartQuote[],
  tradeDates: string[],
  periodArray: PeriodSpec[],
  rowFrequency: string,
  direction: string,
  shortTerm: boolean,
) {
  const periodDict = transformZScorePeriods(periodArray, rowFrequency, shortTerm)
  let quotes: PriceQuote[] = chartMasterData.map((quote) => ({ DT: quote.DT, Close: quote.Close }))
  for (const bucket of periodDict) {
    quotes = generatePeriodData(bucket.timeframeLabel, quotes, bucket.value, direction)
  }

  const dataTimeList = tradeTimestamps(tradeDates)
  const maxGainMinLossResult: Array<{ 'Max Gain': number | string; 'Max Loss': number | string; value: number }> = []
  const sortedDict = [...periodDict].sort((a, b) => a.value - b.value)

  dataTimeList.forEach((entryTime) => {
    const res = chartDataset.findIndex((x) => entryTime == x.DT)
    if (res == -1) return

    const entryPrice = chartDataset[res][TRADE_PRICE]
    sortedDict.forEach((item) => {
      const timArray: CpmChartQuote[] = []
      for (let i = 1; i <= item.value; i++) {
        const element = chartDataset[res + i] || null
        if (element !== null) timArray.push(element)
      }
      if (!timArray.length) {
        // tim.vue：未来区间为空时 findExtremeItem 返回 undefined，
        // calculateReturn(undefined) 返回字符串 ''（不是 NaN）。
        // '' 在 calculate_mean 里会按 0 参与求和（isNaN('') === false），用 NaN 会被过滤掉、平均值对不上。
        maxGainMinLossResult.push({ 'Max Gain': '', 'Max Loss': '', value: item.value })
        return
      }

      const preTimArray = timArray.map((bar) => bar[TRADE_PRICE])
      const maxItem = preTimArray.reduce((max, current) => (current > max ? current : max), preTimArray[0])
      const minItem = preTimArray.reduce((min, current) => (current < min ? current : min), preTimArray[0])

      const maxReturn = maxItem < entryPrice ? 0 : parseFloat(String((maxItem / entryPrice - 1) * 100))
      const minReturn = minItem > entryPrice ? 0 : parseFloat(String((minItem / entryPrice - 1) * 100))
      let finalMaxReturn: number | string = maxReturn
      let finalMinReturn: number | string = minReturn
      // 原版判断里 minReturn/maxReturn 为 '' 时是 falsy，Short 方向不会取负
      if (direction === 'Short' && minReturn && maxReturn) {
        finalMaxReturn = -minReturn
        finalMinReturn = -maxReturn
      }
      maxGainMinLossResult.push({
        'Max Gain': finalMaxReturn,
        'Max Loss': finalMinReturn,
        value: item.value,
      })
    })
  })

  const usedQuotes = quotes.filter((quote) => dataTimeList.indexOf(quote.DT) != -1)

  const medianList: number[] = []
  const positiveList: number[] = []
  const zScoreList: number[] = []
  const tempMeanList: number[] = []
  const newMaxLossList: number[] = []
  const newMaxGainList: number[] = []

  for (const bucket of periodDict) {
    newMaxLossList.push(
      calculateMean(
        maxGainMinLossResult.filter((item) => item.value === bucket.value).map((item) => item['Max Loss']),
      ),
    )
    newMaxGainList.push(
      calculateMean(
        maxGainMinLossResult.filter((item) => item.value === bucket.value).map((item) => item['Max Gain']),
      ),
    )
    const columnValues = usedQuotes.map((obj) => obj[bucket.timeframeLabel])
    const tempMedian = calculateMedian(columnValues)
    medianList.push(tempMedian)
    positiveList.push(calculateWinRate(columnValues))

    const tempStd = calculateStd(columnValues)
    const tempMean = calculateMean(columnValues)
    tempMeanList.push(parseFloat(tempMean.toFixed(1)))
    const sqrtLength = columnValues.filter((e) => !isNaN(e)).length
    zScoreList.push(parseFloat(((tempMean - tempMedian) / (tempStd / Math.sqrt(sqrtLength))).toFixed(1)))
  }

  // Vue2 tim.vue：'' 也视为空值（未来区间缺失），显示为空而不是 toFixed 报错
  const isNullValue = (v: number | string) => v !== null && v !== undefined && v !== '' && !Number.isNaN(v)
  const periodRows = periodDict.map((val, i) => ({
    Period: val.timeframeLabel,
    Mean: tempMeanList[i],
    Median: medianList[i],
    '% Positive': isNaN(positiveList[i]) ? '' : Math.round(positiveList[i] * 100) + '%',
    'Avg Max Loss': isNullValue(newMaxLossList[i]) ? newMaxLossList[i].toFixed(1) : '',
    'Avg Max Gain': isNullValue(newMaxGainList[i]) ? newMaxGainList[i].toFixed(1) : '',
    't-Statistic': zScoreList[i],
  }))

  // generate_table_data：Period 维度转置成 property 行
  const periods = Array.from(new Set(periodRows.map((row) => row.Period)))
  const propertyKeys = Object.keys(periodRows[0]).filter((key) => key !== 'Period')
  const statsRows = propertyKeys.map((property) => {
    const row: Record<string, unknown> = { property }
    for (const period of periods) {
      const match = periodRows.find((obj) => obj.Period === period)
      if (match) row[period] = match[property as keyof typeof match]
    }
    return row
  })

  return { statsRows, periods }
}

/** tim.vue calculateZScore 的 median_list 使用的是 median（不是 mean） */
function buildTimeframeReport(
  spec: { periodArray: PeriodSpec[]; labels: string[] },
  options: CpmTimeframeReportOptions,
  shortTerm: boolean,
): CpmTimeframeReport {
  const { rowFrequency, direction, tradeDates, chartDataSet, chartMasterData } = options
  const periodBuckets = transformHistoryPeriods(spec.periodArray, rowFrequency, shortTerm)
  const historyRows = calculateBacktestHistory(chartDataSet, tradeDates, periodBuckets, direction)
  const zScore = calculateZScore(
    chartDataSet,
    chartMasterData,
    tradeDates,
    spec.periodArray,
    rowFrequency,
    direction,
    shortTerm,
  )

  return {
    statsRows: zScore.statsRows,
    periods: zScore.periods,
    historyRows,
    historyLabels: ['Entry Date', ...spec.labels],
  }
}

/** Multi-Timeframe Results (Long Term) — Vue2 tim.vue */
export function buildCpmLongTermReport(options: CpmTimeframeReportOptions): CpmTimeframeReport {
  return buildTimeframeReport(longTermSpec(options.rowFrequency), options, false)
}

/** Multi-Timeframe Results (Short Term) — Vue2 timShortTerm.vue（Vue2 只在 Daily 下渲染） */
export function buildCpmShortTermReport(options: CpmTimeframeReportOptions): CpmTimeframeReport {
  return buildTimeframeReport(shortTermSpec(options.rowFrequency), options, true)
}

/** MaxMin.vue calculateBacktestHistory：每笔信号各周期内的最大收益/最大亏损 */
function calculateMaxMinHistory(
  chartDataset: CpmChartQuote[],
  tradeDates: string[],
  periodBuckets: PeriodBucket[],
  direction: string,
) {
  const field = TRADE_PRICE
  const returnResults: Array<Record<string, unknown>> = []
  const sortedPeriods = [...periodBuckets].sort((a, b) => a.value - b.value)

  tradeDates.forEach((tradeDate) => {
    const entryTime = formatStandardTime(tradeDate)?.getTime() ?? NaN
    const res = chartDataset.findIndex((x) => entryTime == x.DT)
    if (res == -1) return

    const entryPrice = chartDataset[res][field]
    sortedPeriods.forEach((item) => {
      const timArray: CpmChartQuote[] = []
      for (let i = 1; i <= item.value; i++) {
        const element = chartDataset[res + i] || null
        if (element !== null) timArray.push(element)
      }

      // Vue2 MaxMin.vue：未来区间为空时 findExtremeItem 返回 undefined，
      // maxReturn/minReturn 变成字符串 ''（不是 NaN）。Mean 会把 '' 按 0 求和、
      // Median 的数值排序也会把 '' 当 0，用 NaN 会让 Mean 变 NaN、Median 排序错乱。
      let maxReturn: number | string = ''
      let minReturn: number | string = ''
      if (timArray.length) {
        const preTimArray = timArray.map((bar) => bar[field])
        const maxItem = preTimArray.reduce((max, current) => (current > max ? current : max), preTimArray[0])
        const minItem = preTimArray.reduce((min, current) => (current < min ? current : min), preTimArray[0])
        maxReturn = maxItem < entryPrice ? 0 : parseFloat(String((maxItem / entryPrice - 1) * 100))
        minReturn = minItem > entryPrice ? 0 : parseFloat(String((minItem / entryPrice - 1) * 100))
      }

      // 原版无条件取负：-'' === -0，所以 Short 下的空区间是 -0（数字），保持一致
      const [finalMaxReturn, finalMinReturn] =
        direction === 'Short'
          ? [-(minReturn as number), -(maxReturn as number)]
          : [maxReturn, minReturn]

      returnResults.push({
        [`${item.timeframeLabel}`]: item.timeframeLabel,
        'Max Loss': finalMinReturn,
        'Max Gain': finalMaxReturn,
        'Dates of Signals': tradeDate,
      })
    })
  })

  // 按信号日期合并各周期结果
  const mergedData: Record<string, Record<string, unknown>> = {}
  returnResults.forEach((entry) => {
    const key = String(entry['Dates of Signals'])
    if (!mergedData[key]) mergedData[key] = { 'Dates of Signals': key }
    Object.keys(entry).forEach((prop) => {
      if (prop !== 'Dates of Signals') {
        mergedData[key][prop] = {
          'Max Loss': entry['Max Loss'],
          'Max Gain': entry['Max Gain'],
        }
      }
    })
  })

  return Object.values(mergedData)
}

/** Max Gain and Loss — Vue2 MaxMin.vue */
export function buildCpmMaxGainLossReport(options: CpmTimeframeReportOptions): CpmMaxGainLossReport {
  const { rowFrequency, direction, tradeDates, chartDataSet } = options
  const periodBuckets = transformHistoryPeriods(MONTH_YEAR_PERIODS, rowFrequency, false)
  const backtestHistoryList = calculateMaxMinHistory(chartDataSet, tradeDates, periodBuckets, direction)

  const periodLabels = MAX_GAIN_LOSS_LABELS.filter(
    (item) => item != 'Dates of Signals' && item != 'Max Gain' && item != 'Max Loss',
  )
  const summaryRows: Array<Record<string, unknown>> = [
    { 'Dates of Signals': 'Mean' },
    { 'Dates of Signals': 'Median' },
    { 'Dates of Signals': '# of Times +/- 5%' },
    { 'Dates of Signals': '# of Times +/- 10%' },
  ]

  periodLabels.forEach((label) => {
    summaryRows.forEach((row) => {
      const monthData = backtestHistoryList.map((entry) => entry[label] as { 'Max Gain': number; 'Max Loss': number })
      if (row['Dates of Signals'] === 'Median') {
        const maxGainValues = monthData.map((entry) => entry['Max Gain'])
        const maxLossValues = monthData.map((entry) => entry['Max Loss'])
        maxGainValues.sort((a, b) => a - b)
        maxLossValues.sort((a, b) => a - b)
        const medianMaxGain =
          maxGainValues.length % 2 === 0
            ? ((maxGainValues[maxGainValues.length / 2 - 1] + maxGainValues[maxGainValues.length / 2]) / 2).toFixed(1)
            : maxGainValues[Math.floor(maxGainValues.length / 2)]
        const medianMaxLoss =
          maxLossValues.length % 2 === 0
            ? ((maxLossValues[maxLossValues.length / 2 - 1] + maxLossValues[maxLossValues.length / 2]) / 2).toFixed(1)
            : maxLossValues[Math.floor(maxLossValues.length / 2)]
        row[label] = { 'Max Gain': medianMaxGain, 'Max Loss': medianMaxLoss }
      } else if (row['Dates of Signals'] === 'Mean') {
        const maxGainValues = monthData.map((entry) => entry['Max Gain'])
        const maxLossValues = monthData.map((entry) => entry['Max Loss'])
        const avgMaxGain = maxGainValues.reduce((sum, current) => sum + current, 0) / maxGainValues.length
        const avgMaxLoss = maxLossValues.reduce((sum, current) => sum + current, 0) / maxLossValues.length
        row[label] = { 'Max Gain': avgMaxGain.toFixed(1), 'Max Loss': avgMaxLoss.toFixed(1) }
      } else if (row['Dates of Signals'] === '# of Times +/- 5%') {
        const maxGainValues = monthData.map((entry) => entry['Max Gain'])
        const maxLossValues = monthData.map((entry) => entry['Max Loss'])
        row[label] = {
          'Max Gain': maxGainValues.filter((num) => num > 5).length,
          'Max Loss': maxLossValues.filter((num) => num < -5).length,
        }
      } else if (row['Dates of Signals'] === '# of Times +/- 10%') {
        const maxGainValues = monthData.map((entry) => entry['Max Gain'])
        const maxLossValues = monthData.map((entry) => entry['Max Loss'])
        row[label] = {
          'Max Gain': maxGainValues.filter((num) => parseFloat(String(num)) > 10).length,
          'Max Loss': maxLossValues.filter((num) => parseFloat(String(num)) < -10).length,
        }
      }
    })
  })

  return {
    rows: [...backtestHistoryList, ...summaryRows].map((row, index) => ({ id: index + 1, ...row })),
    labels: MAX_GAIN_LOSS_LABELS,
  }
}
