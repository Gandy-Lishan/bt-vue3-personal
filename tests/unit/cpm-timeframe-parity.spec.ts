// @vitest-environment node
// 纯计算测试，不需要 DOM；jsdom 环境在本机安装的依赖下无法启动 worker
import { describe, expect, it } from 'vitest'
import {
  buildCpmLongTermReport,
  buildCpmMaxGainLossReport,
  buildCpmShortTermReport,
  type CpmChartQuote,
} from '@/entities/cpm/model/cpm.timeframe'
import { formatStandardTime } from '@/shared/utils/time'

/**
 * Vue2→Vue3 parity harness:
 * 左侧是从 Vue2 tim.vue / timShortTerm.vue / MaxMin.vue 逐行抄下来的实现（用普通数组代替 CIQ.stxx），
 * 右侧是 src/entities/cpm/model/cpm.timeframe.ts，两者输出必须完全一致。
 */

const FIELD = 'Close'

type Bar = Record<string, unknown> & { DT: Date; Close: number }
type Spec = { period: number; timeframe: string }

// ---------- Vue2 公共方法（逐行照抄） ----------

function calculateMean(arr: number[]) {
  arr = arr.filter((x) => !isNaN(x))
  if (arr.length == 0) return NaN
  return arr.reduce((a, b) => a + b) / arr.length
}

function calculateMedian(arr: number[]) {
  arr = arr.filter((n) => !isNaN(n))
  if (arr.length == 0) return NaN
  const mid = Math.floor(arr.length / 2)
  const nums = [...arr].sort((a, b) => a - b)
  return parseFloat(String(arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2))
}

function calculateStd(arr: number[]) {
  arr = arr.filter((x) => !isNaN(x))
  if (arr.length == 0) return NaN
  const mean = arr.reduce((a, b) => a + b) / arr.length
  const deviationArr = arr.map((x) => Math.pow(x - mean, 2))
  const variance = deviationArr.reduce((a, b) => a + b) / (deviationArr.length - 1)
  return Math.sqrt(variance)
}

function calculateWinRate(arr: number[]) {
  arr = arr.filter((x) => !isNaN(x))
  if (arr.length == 0) return NaN
  const return_series = arr.map((x) => (x > 0 ? 1 : 0))
  return parseFloat(String(calculateMean(return_series)))
}

function getPeriodParm(dataSeries: number[], paramType: 'max' | 'min' | 'mean' | 'sum', period: number) {
  const typeDict: Record<string, (...args: number[]) => number> = {
    max: Math.max,
    min: Math.min,
    mean: (arr: number) => arr.reduce((a, b) => a + b, 0) / arr.length,
    sum: (arr: number) => arr.reduce((a, b) => a + b, 0),
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

function generatePeriodDataVue2(name: string, quotes: any[], period: number, direction: string) {
  quotes = quotes.map((row, i) => {
    if (i < quotes.length - period) {
      const change = parseFloat(
        String(
          ((direction == 'Short'
            ? row[FIELD] - quotes[i + period][FIELD]
            : quotes[i + period][FIELD] - row[FIELD]) /
            row[FIELD]) *
            100,
        ),
      )
      return { ...row, [FIELD + period]: quotes[i + period][FIELD], [name]: change == Infinity || change == -Infinity ? 0 : change }
    }
    return { ...row, [FIELD + period]: NaN, [name]: NaN }
  })
  const minCloseArr = getPeriodParm(quotes.map((row: any) => row[FIELD + period]), 'min', period)
  const maxCloseArr = getPeriodParm(quotes.map((row: any) => row[FIELD + period]), 'max', period)
  quotes = quotes.map((row: any, i: number) => {
    if (i >= period) {
      const change = parseFloat(String(100 * (minCloseArr[i] / row[FIELD] - 1)))
      return { ...row, ['MaxLoss' + period]: change == Infinity || change == -Infinity ? 0 : change }
    }
    return { ...row, ['MaxLoss' + period]: NaN }
  })
  quotes = quotes.map((row: any, i: number) => {
    if (i >= period) {
      const change = parseFloat(String(100 * (maxCloseArr[i] / row[FIELD] - 1)))
      return { ...row, ['MaxGain' + period]: change == Infinity || change == -Infinity ? 0 : change }
    }
    return { ...row, ['MaxGain' + period]: NaN }
  })
  return quotes
}

function transformVue2(data: Spec[], rowFrequency: string, shortTerm: boolean, withPercent: boolean) {
  data = data.map((item: any) => {
    if (item.period % 252 === 0 && item.timeframe === 'Day') return { period: item.period / 252, timeframe: 'Year' }
    if (item.period % 21 === 0 && item.timeframe === 'Day') return { period: item.period / 21, timeframe: 'Month' }
    if (shortTerm && item.period % 5 === 0 && item.timeframe === 'Day')
      return { period: item.period / 5, timeframe: 'Week' }
    if (item.period % 52 === 0 && item.timeframe === 'Week') return { period: item.period / 52, timeframe: 'Year' }
    if (item.period % 12 === 0 && item.timeframe === 'Month') return { period: item.period / 12, timeframe: 'Year' }
    return withPercent ? item : { period: item.period, timeframe: item.timeframe }
  })
  data = data.map((item: any) => {
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
    } else if (rowFrequency === 'Weekly') {
      if (timeframe === 'Week') {
        if ((period % 13) % 4 === 0) {
          if (period % 13 === 12) {
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
    } else if (rowFrequency === 'Monthly') {
      if (timeframe === 'Month') {
        if (period % 12 === 0) {
          period = period / 12
        }
      }
      return { period, timeframe }
    }
    return { period, timeframe }
  })
  const uniqueData: any[] = []
  data.forEach((item: any) => {
    const isDuplicate = uniqueData.some((u) => u.period == item.period && u.timeframe == item.timeframe)
    if (!isDuplicate) uniqueData.push(item)
  })
  return uniqueData.map((item) => {
    const timeframe = withPercent
      ? item.period > 1
        ? `${item.period} ${item.timeframe}s [%]`
        : `${item.period} ${item.timeframe} [%]`
      : item.period > 1
        ? `${item.period} ${item.timeframe}s`
        : `${item.period} ${item.timeframe}`
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
    } else {
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
    }
    return { timeframe, period: item.period, value }
  })
}

function calculateBacktestHistoryVue2(
  chartDataset: Bar[],
  tradesData: Array<{ Date: string }>,
  periodArray: Spec[],
  rowFrequency: string,
  direction: string,
) {
  const backtestResult: Array<Record<string, unknown>> = []
  for (const trade of tradesData) {
    const entryDate = formatStandardTime(trade.Date)!
    const res = chartDataset.findIndex((x) => entryDate.getTime() == x.DT.getTime())
    if (res != -1) {
      const entryPrice = chartDataset[res][FIELD]
      const transformData = transformVue2(periodArray, rowFrequency, false, true)
      transformData.sort((a, b) => a.value - b.value)
      const obj: Record<string, unknown> = {}
      transformData.forEach((item: any) => {
        const exitBar = chartDataset[res + item.value]
          ? (
              ((direction == 'Short'
                ? entryPrice - (chartDataset[res + item.value][FIELD] as number)
                : (chartDataset[res + item.value][FIELD] as number) - (entryPrice as number)) /
                (entryPrice as number)) *
              100
            ).toFixed(1)
          : ''
        obj[item.timeframe] = exitBar
      })
      backtestResult.push({ 'Entry Date': trade.Date, ...obj })
    }
  }
  return backtestResult
}

function calculateZScoreVue2(
  chartDataset: Bar[],
  masterData: Bar[],
  tradesData: Array<{ Date: string }>,
  periodArray: Spec[],
  rowFrequency: string,
  direction: string,
  shortTerm: boolean,
) {
  const period_dict = transformVue2(periodArray, rowFrequency, shortTerm, false)
  let quotes: any[] = masterData.map((q) => ({ ...q }))
  for (const item of period_dict) {
    quotes = generatePeriodDataVue2(item.timeframe, quotes, item.value, direction)
  }

  const dataTimeList: number[] = []
  const MaxGainMinLossResult: any[] = []
  for (const trade of tradesData) {
    const entryDate = formatStandardTime(trade.Date)!.getTime()
    dataTimeList.push(entryDate)
    const res = chartDataset.findIndex((x) => entryDate == x.DT.getTime())
    if (res != -1) {
      const entryPrice = chartDataset[res][FIELD]
      period_dict.sort((a, b) => a.value - b.value)
      period_dict.forEach((item: any) => {
        const _timArray: any[] = []
        for (let i = 1; i <= item.value; i++) {
          const element = chartDataset[res + i] || null
          _timArray.push(element)
        }
        const timArray = _timArray.filter((it) => it !== null && it !== undefined && it !== '')
        const preTimArray = timArray.map((it) => it[FIELD])
        const calculateReturn = (value: any, entry: number) => {
          if (value !== undefined && value !== null) return parseFloat(String((value / entry - 1) * 100))
          return ''
        }
        const findExtremeItem = (arr: any[], comparator: (a: number, b: number) => number) => arr.reduce(comparator, arr[0])
        const maxItem = findExtremeItem(preTimArray, (max: number, current: number) => (current > max ? current : max))
        const minItem = findExtremeItem(preTimArray, (min: number, current: number) => (current < min ? current : min))
        const maxReturn = maxItem !== undefined && maxItem !== null && maxItem < entryPrice ? 0 : calculateReturn(maxItem, entryPrice)
        const minReturn = minItem !== undefined && minItem !== null && minItem > entryPrice ? 0 : calculateReturn(minItem, entryPrice)
        let finalMaxReturn = maxReturn
        let finalMinReturn = minReturn
        if (direction === 'Short' && minReturn && maxReturn) {
          finalMaxReturn = -(minReturn as number)
          finalMinReturn = -(maxReturn as number)
        }
        MaxGainMinLossResult.push({ 'Max Gain': finalMaxReturn, 'Max Loss': finalMinReturn, value: item.value })
      })
    }
  }

  const used_quotes = quotes.filter((x) => dataTimeList.indexOf(x.DT.getTime()) != -1)

  const median_list: number[] = []
  const positive_list: number[] = []
  const z_score_list: number[] = []
  const temp_mean_list: number[] = []
  const new_max_loss_list: number[] = []
  const new_max_gain_list: number[] = []
  for (const bucket of period_dict) {
    const _tmp_max_loss = calculateMean(
      MaxGainMinLossResult.filter((item) => item.value === bucket.value).map((item) => item['Max Loss']),
    )
    new_max_loss_list.push(_tmp_max_loss)
    const _tmp_max_gain = calculateMean(
      MaxGainMinLossResult.filter((item) => item.value === bucket.value).map((item) => item['Max Gain']),
    )
    new_max_gain_list.push(_tmp_max_gain)
    const temp_median = calculateMedian(used_quotes.map((obj) => obj[bucket.timeframe]))
    median_list.push(temp_median)
    positive_list.push(calculateWinRate(used_quotes.map((obj) => obj[bucket.timeframe])))
    const temp_std = calculateStd(used_quotes.map((obj) => obj[bucket.timeframe]))
    const temp_mean = calculateMean(used_quotes.map((obj) => obj[bucket.timeframe]))
    temp_mean_list.push(parseFloat(temp_mean.toFixed(1)))
    const sqrt_length = used_quotes.map((obj) => obj[bucket.timeframe]).filter((e) => !isNaN(e)).length
    z_score_list.push(parseFloat(((temp_mean - temp_median) / (temp_std / Math.sqrt(sqrt_length))).toFixed(1)))
  }
  const isNullValue = (v: any) => v !== null && v !== undefined && v !== '' && !Number.isNaN(v)
  const result_quotes = period_dict.map((val: any, i: number) => ({
    Period: val.timeframe,
    Mean: temp_mean_list[i],
    Median: median_list[i],
    '% Positive': isNaN(positive_list[i]) ? '' : Math.round(positive_list[i] * 100) + '%',
    'Avg Max Loss': isNullValue(new_max_loss_list[i]) ? new_max_loss_list[i].toFixed(1) : '',
    'Avg Max Gain': isNullValue(new_max_gain_list[i]) ? new_max_gain_list[i].toFixed(1) : '',
    't-Statistic': z_score_list[i],
  }))

  // generate_table_data + generatePeriods
  const periods = Array.from(new Set(result_quotes.map((obj: any) => obj.Period))).map((period) => ({ period }))
  const keys = Object.keys(result_quotes[0])
  keys.splice(keys.indexOf('Period'), 1)
  const rows: any[] = keys.map((key) => ({ property: key }))
  for (const column of periods) {
    for (const row of rows) {
      result_quotes.forEach((obj: any) => {
        if (obj.Period === column.period) row[column.period] = obj[row.property]
      })
    }
  }
  return { statsRows: rows, periods: periods.map((c) => c.period) }
}

function calculateMaxMinVue2(
  chartDataset: Bar[],
  tradesData: Array<{ Date: string }>,
  periodArray: Spec[],
  rowFrequency: string,
  direction: string,
) {
  const transformData = transformVue2(periodArray, rowFrequency, false, true)
  const returnResults: any[] = []
  for (const trade of tradesData) {
    const entryDate = formatStandardTime(trade.Date)!
    const res = chartDataset.findIndex((x) => entryDate.getTime() == x.DT.getTime())
    if (res != -1) {
      const entryPrice = chartDataset[res][FIELD]
      transformData.sort((a, b) => a.value - b.value)
      transformData.forEach((item: any) => {
        const _timArray: any[] = []
        for (let i = 1; i <= item.value; i++) {
          _timArray.push(chartDataset[res + i] || null)
        }
        const timArray = _timArray.filter((it) => it !== null && it !== undefined && it !== '')
        const preTimArray = timArray.map((it) => it[FIELD])
        const calculateReturn = (value: any, entry: number) => {
          if (value !== undefined && value !== null) return parseFloat(String((value / entry - 1) * 100))
          return ''
        }
        const findExtremeItem = (arr: any[], comparator: (a: number, b: number) => number) => arr.reduce(comparator, arr[0])
        const maxItem = findExtremeItem(preTimArray, (max: number, current: number) => (current > max ? current : max))
        const minItem = findExtremeItem(preTimArray, (min: number, current: number) => (current < min ? current : min))
        // MaxMin.vue 原版没有额外判 undefined/null，undefined < entryPrice 为 false → calculateReturn 返回 ''
        const maxReturn = maxItem < entryPrice ? 0 : calculateReturn(maxItem, entryPrice)
        const minReturn = minItem > entryPrice ? 0 : calculateReturn(minItem, entryPrice)
        // 无条件取负：-'' === -0
        const [finalMaxReturn, finalMinReturn] =
          direction === 'Short' ? [-(minReturn as number), -(maxReturn as number)] : [maxReturn, minReturn]
        returnResults.push({
          [item.timeframe]: item.timeframe,
          'Max Loss': finalMinReturn,
          'Max Gain': finalMaxReturn,
          'Dates of Signals': trade.Date,
        })
      })
    }
  }
  const mergedData: Record<string, any> = {}
  returnResults.forEach((entry) => {
    const key = entry['Dates of Signals']
    if (!mergedData[key]) mergedData[key] = { 'Dates of Signals': key }
    Object.keys(entry).forEach((prop) => {
      if (prop !== 'Dates of Signals') {
        if (!mergedData[key][prop]) mergedData[key][prop] = {}
        mergedData[key][prop] = { 'Max Loss': entry['Max Loss'], 'Max Gain': entry['Max Gain'] }
      }
    })
  })
  const backtestHistoryList = Object.values(mergedData)

  const defaultTableLabels = ['1 Month [%]', '2 Months [%]', '3 Months [%]', '4 Months [%]', '5 Months [%]', '6 Months [%]', '1 Year [%]']
  const medianMaxGainArray: any[] = [
    { 'Dates of Signals': 'Mean' },
    { 'Dates of Signals': 'Median' },
    { 'Dates of Signals': '# of Times +/- 5%' },
    { 'Dates of Signals': '# of Times +/- 10%' },
  ]
  defaultTableLabels.forEach((label) => {
    medianMaxGainArray.forEach((ele) => {
      if (ele['Dates of Signals'] === 'Median') {
        const monthData = backtestHistoryList.map((entry: any) => entry[label])
        const maxGainValues = monthData.map((entry: any) => entry['Max Gain'])
        const maxLossValues = monthData.map((entry: any) => entry['Max Loss'])
        maxGainValues.sort((a: number, b: number) => a - b)
        maxLossValues.sort((a: number, b: number) => a - b)
        const medianMaxGain =
          maxGainValues.length % 2 === 0
            ? ((maxGainValues[maxGainValues.length / 2 - 1] + maxGainValues[maxGainValues.length / 2]) / 2).toFixed(1)
            : maxGainValues[Math.floor(maxGainValues.length / 2)]
        const medianMaxLoss =
          maxLossValues.length % 2 === 0
            ? ((maxLossValues[maxLossValues.length / 2 - 1] + maxLossValues[maxLossValues.length / 2]) / 2).toFixed(1)
            : maxLossValues[Math.floor(maxLossValues.length / 2)]
        ele[label] = { 'Max Gain': medianMaxGain, 'Max Loss': medianMaxLoss }
      } else if (ele['Dates of Signals'] === 'Mean') {
        const monthData = backtestHistoryList.map((entry: any) => entry[label])
        const maxGainValues = monthData.map((entry: any) => entry['Max Gain'])
        const maxLossValues = monthData.map((entry: any) => entry['Max Loss'])
        const avgMaxGain = maxGainValues.reduce((sum: number, current: number) => sum + current, 0) / maxGainValues.length
        const avgMaxLoss = maxLossValues.reduce((sum: number, current: number) => sum + current, 0) / maxLossValues.length
        ele[label] = { 'Max Gain': avgMaxGain.toFixed(1), 'Max Loss': avgMaxLoss.toFixed(1) }
      } else if (ele['Dates of Signals'] === '# of Times +/- 5%') {
        const monthData = backtestHistoryList.map((entry: any) => entry[label])
        const maxGainValues = monthData.map((entry: any) => entry['Max Gain'])
        const maxLossValues = monthData.map((entry: any) => entry['Max Loss'])
        ele[label] = {
          'Max Gain': maxGainValues.filter((num: number) => num > 5).length,
          'Max Loss': maxLossValues.filter((num: number) => num < -5).length,
        }
      } else if (ele['Dates of Signals'] === '# of Times +/- 10%') {
        const monthData = backtestHistoryList.map((entry: any) => entry[label])
        const maxGainValues = monthData.map((entry: any) => entry['Max Gain'])
        const maxLossValues = monthData.map((entry: any) => entry['Max Loss'])
        ele[label] = {
          'Max Gain': maxGainValues.filter((num: number) => parseFloat(String(num)) > 10).length,
          'Max Loss': maxLossValues.filter((num: number) => parseFloat(String(num)) < -10).length,
        }
      }
    })
  })
  return [...backtestHistoryList, ...medianMaxGainArray]
}

// ---------- 数据集 ----------

function buildBars(count: number): Bar[] {
  const bars: Bar[] = []
  const cursor = new Date(2020, 0, 1)
  let index = 0
  while (bars.length < count) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) {
      const close = 100 + Math.sin(index / 7) * 12 + Math.cos(index / 13) * 5 + index * 0.03
      bars.push({ DT: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()), Close: Number(close.toFixed(4)) })
      index += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return bars
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const bars = buildBars(500)
const trades = [
  ...Array.from({ length: 10 }, (_, i) => ({ Date: isoDate(bars[i * 45].DT) })),
  // 最后一根 bar 上的信号：所有未来区间都为空，用来覆盖 Vue2 的 '' / -'' 分支
  { Date: isoDate(bars[bars.length - 1].DT) },
]
const quotes: CpmChartQuote[] = bars.map((bar) => ({ DT: bar.DT.getTime(), Close: bar.Close }))

const LONG_DAILY = [
  { period: 1, timeframe: 'Month' },
  { period: 2, timeframe: 'Month' },
  { period: 3, timeframe: 'Month' },
  { period: 4, timeframe: 'Month' },
  { period: 5, timeframe: 'Month' },
  { period: 6, timeframe: 'Month' },
  { period: 1, timeframe: 'Year' },
]
const LONG_WEEKLY = [
  { period: 1, timeframe: 'Week' },
  { period: 2, timeframe: 'Week' },
  { period: 1, timeframe: 'Month' },
  { period: 2, timeframe: 'Month' },
  { period: 3, timeframe: 'Month' },
  { period: 6, timeframe: 'Month' },
  { period: 1, timeframe: 'Year' },
]
const LONG_MONTHLY = [
  { period: 1, timeframe: 'Month' },
  { period: 3, timeframe: 'Month' },
  { period: 6, timeframe: 'Month' },
  { period: 9, timeframe: 'Month' },
  { period: 1, timeframe: 'Year' },
  { period: 2, timeframe: 'Year' },
  { period: 3, timeframe: 'Year' },
]
const SHORT_DAILY = [
  { period: 1, timeframe: 'Day' },
  { period: 2, timeframe: 'Day' },
  { period: 3, timeframe: 'Day' },
  { period: 4, timeframe: 'Day' },
  { period: 1, timeframe: 'Week' },
  { period: 2, timeframe: 'Week' },
  { period: 3, timeframe: 'Week' },
]

const LONG_LABELS: Record<string, string[]> = {
  Daily: ['Entry Date', '1 Month [%]', '2 Months [%]', '3 Months [%]', '4 Months [%]', '5 Months [%]', '6 Months [%]', '1 Year [%]'],
  Weekly: ['Entry Date', '1 Week [%]', '2 Weeks [%]', '1 Month [%]', '2 Months [%]', '3 Months [%]', '6 Months [%]', '1 Year [%]'],
  Monthly: ['Entry Date', '1 Month [%]', '3 Months [%]', '6 Months [%]', '9 Months [%]', '1 Year [%]', '2 Years [%]', '3 Years [%]'],
}
const SHORT_LABELS = ['Entry Date', '1 Day [%]', '2 Days [%]', '3 Days [%]', '4 Days [%]', '1 Week [%]', '2 Weeks [%]', '3 Weeks [%]']

// 对每条历史行，按 defaultTableLabels 取键做比较（Vue2 表格只渲染这些列）
function pickHistory(rows: Array<Record<string, unknown>>, labels: string[]) {
  return rows.map((row) => Object.fromEntries(labels.map((label) => [label, row[label]])))
}

describe.each([
  ['Daily', LONG_DAILY, LONG_LABELS.Daily],
  ['Weekly', LONG_WEEKLY, LONG_LABELS.Weekly],
  ['Monthly', LONG_MONTHLY, LONG_LABELS.Monthly],
])('CPM multi-timeframe parity (%s)', (rowFrequency, periodArray, labels) => {
  for (const direction of ['Long', 'Short']) {
    it(`matches Vue2 tim.vue (${direction})`, () => {
      const vue2History = calculateBacktestHistoryVue2(bars, trades, periodArray, rowFrequency, direction)
      const vue2Stats = calculateZScoreVue2(bars, bars, trades, periodArray, rowFrequency, direction, false)

      const report = buildCpmLongTermReport({
        rowFrequency,
        direction,
        tradeDates: trades.map((t) => t.Date),
        chartDataSet: quotes,
        chartMasterData: quotes,
      })

      expect(report.periods).toEqual(vue2Stats.periods)
      expect(report.statsRows).toEqual(vue2Stats.statsRows)
      expect(report.historyLabels).toEqual(labels)
      expect(pickHistory(report.historyRows, labels)).toEqual(
        pickHistory(vue2History, labels),
      )
    })
  }
})

describe('CPM short term parity (Daily)', () => {
  for (const direction of ['Long', 'Short']) {
    it(`matches Vue2 timShortTerm.vue (${direction})`, () => {
      const vue2History = calculateBacktestHistoryVue2(
        bars,
        trades,
        SHORT_DAILY,
        'Daily',
        direction,
      )
      const vue2Stats = calculateZScoreVue2(bars, bars, trades, SHORT_DAILY, 'Daily', direction, true)

      const report = buildCpmShortTermReport({
        rowFrequency: 'Daily',
        direction,
        tradeDates: trades.map((t) => t.Date),
        chartDataSet: quotes,
        chartMasterData: quotes,
      })

      expect(report.periods).toEqual(vue2Stats.periods)
      expect(report.statsRows).toEqual(vue2Stats.statsRows)
      expect(report.historyLabels).toEqual(SHORT_LABELS)
      expect(pickHistory(report.historyRows, SHORT_LABELS)).toEqual(
        pickHistory(vue2History, SHORT_LABELS),
      )
    })
  }
})

describe.each(['Daily', 'Weekly', 'Monthly'])('CPM max gain/loss parity (%s)', (rowFrequency) => {
  for (const direction of ['Long', 'Short']) {
    it(`matches Vue2 MaxMin.vue (${direction})`, () => {
      const expected = calculateMaxMinVue2(bars, trades, LONG_DAILY, rowFrequency, direction)
      const report = buildCpmMaxGainLossReport({
        rowFrequency,
        direction,
        tradeDates: trades.map((t) => t.Date),
        chartDataSet: quotes,
        chartMasterData: quotes,
      })

      expect(report.labels).toEqual([
        'Dates of Signals',
        '1 Month [%]',
        '2 Months [%]',
        '3 Months [%]',
        '4 Months [%]',
        '5 Months [%]',
        '6 Months [%]',
        '1 Year [%]',
        'Max Gain',
        'Max Loss',
      ])

      expect(report.rows.map((row) => row.id)).toEqual(report.rows.map((_, index) => index + 1))
      const rowsWithoutId = report.rows.map(({ id: _id, ...rest }) => rest)
      expect(rowsWithoutId).toEqual(expected)
    })
  }
})
