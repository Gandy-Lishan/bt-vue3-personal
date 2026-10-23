// @ts-nocheck
/**
 * Smart Scanner 回测 History 计算模块
 *
 * 【Vue2→Vue3 完全一致迁移】照搬原版
 * src/components/AIScanner/ScannerChart/components/ChartComponent.vue:381-1196
 *
 * 唯一差异：原版方法内部直接 commit 到 Vuex（form/STORE_BACKTESTRESULT、
 * form/STORE_BACKTEST_ZSCORE_RESULT），这里改为「返回结果」，由调用方
 * （SmartScannerChartIQ）通过 emit 交给页面组件本地状态保存。
 *
 * 方法名、执行顺序、eval 解析、early return、toFixed/isNaN 等行为均与
 * 原版保持一致，包括原有的边界行为（不做修正）。
 */
import { formatStandardTime } from '@/shared/utils/time'

/* Used to determine whether the data is JSON（原版 utils/index.js:isJson） */
function isJson(str) {
  if (typeof str == 'string') {
    try {
      var obj = JSON.parse(str)
      if (typeof obj == 'object' && obj) {
        return true
      } else {
        return false
      }
    } catch (e) {
      return false
    }
  }
}

export type BacktestPeriod = { period: number; timeframe: string }

export class BacktestHistoryCalculator {
  stxx: any
  result_quotes: any[] = []
  periods: Array<{ period: any }> = []
  rowFrequency = 'Daily'

  constructor(stxx: any) {
    this.stxx = stxx
  }

  /**
   * 前瞻收益表：每条 EntryTradeDate 在 ChartIQ dataSet 中定位入场 bar，
   * 计算 1-6 Months / 1 Year 后 Open 的收益率。
   * 原版返回后 commit form/STORE_BACKTESTRESULT（可能为空数组）。
   */
  calculateBacktestHistory(dataSet, periodArray, direction) {
    let chartDataset = this.stxx.chart.dataSet
    // eslint-disable-next-line no-eval
    dataSet = dataSet ? eval('(' + dataSet + ')') : []
    let backtestResult = []
    for (var data in dataSet) {
      var entryDate = formatStandardTime(dataSet[data])

      let res = chartDataset.findIndex((x) => {
        return entryDate.getTime() == x.DT.getTime()
      })

      if (res != -1) {
        let entryPrice = chartDataset[res].Open
        const transformData = this.transformData(periodArray)
        transformData.sort((a, b) => a.value - b.value)
        let obj = {}
        transformData.map((item) => {
          let exitBar = chartDataset[res + item.value]
            ? (
                ((direction == 'Short'
                  ? entryPrice - chartDataset[res + item.value].Open
                  : chartDataset[res + item.value].Open - entryPrice) /
                  entryPrice) *
                100
              ).toFixed(1)
            : ''
          obj[item.timeframe] = exitBar
        })
        backtestResult.push({ 'Entry Date': dataSet[data], ...obj })
      }
    }
    return backtestResult
  }

  /**
   * Z-score 统计表。
   * 原版在 EntryTradeDate 缺失 / 解析为空时直接 return（不 commit），
   * 这里返回 null 表示「不更新」，调用方据此保留上一次的结果。
   */
  calculateZScore(dataSet, periodArray, direction) {
    /*
    periodArray: [{period: 1, timeframe: 'Week'}}] => [{timefame: '1 Week [%]', period: '1', value: 5}]
    */
    // masterData 不包含 indicator value，防止污染 ohlcv 的情况
    let period_dict = this.transformZScoreData(periodArray)
    let quotes = this.stxx.chart.masterData
    let chartDataset = this.stxx.chart.dataSet
    for (var i in period_dict) {
      quotes = this.generate_period_data(
        period_dict[i].timeframe,
        quotes,
        period_dict[i].value,
        direction,
      )
    }

    const dateString = dataSet.EntryTradeDate
    if (!dateString) return null
    // 将单引号替换为双引号以构成有效的 JSON 字符串
    const validJsonString = dateString.replace(/'/g, '"')

    // 解析 JSON 字符串为数组
    const dateArray = isJson(validJsonString) ? JSON.parse(validJsonString) : []
    if (dateArray.length == 0) return null

    let used_quotes = quotes.map((x) => {
      // 创建一个日期对象
      const originalDate = new Date(x.DT)

      // 获取年、月、日信息（本地时区）
      const year = originalDate.getFullYear()
      const month = (originalDate.getMonth() + 1).toString().padStart(2, '0')
      const day = originalDate.getDate().toString().padStart(2, '0')

      const formattedDate = `${year}-${month}-${day}`
      if (dateArray.includes(formattedDate)) return x
    })

    // 过滤掉空值项
    used_quotes = used_quotes.filter((item) => item !== null && item !== undefined && item !== '')

    // 替换 NaN
    quotes = quotes.map((quote) => {
      const updatedQuote = {}
      for (const [key, value] of Object.entries(quote)) {
        updatedQuote[key] = isNaN(value) ? -100 : value
      }
      return updatedQuote
    })

    let MaxGainMinLossResult = []
    for (let date in dateArray) {
      let entryDate = formatStandardTime(dateArray[date]).getTime()
      let res = chartDataset.findIndex((x) => {
        return entryDate == x.DT.getTime()
      })
      if (res != -1) {
        let entryPrice = chartDataset[res]['Open']
        period_dict.sort((a, b) => a.value - b.value)
        period_dict.map((item) => {
          let _timArray = []
          for (let i = 1; i <= item.value; i++) {
            const element = chartDataset[res + i] || null
            _timArray.push(element)
          }
          const timArray = _timArray.filter((item) => {
            return item !== null && item !== undefined && item !== ''
          })
          const preTimArray = timArray.map((item) => item['Open'])

          const calculateReturn = (item, entryPrice) => {
            const value = item
            if (value !== undefined && value !== null) {
              const percentageReturn = (value / entryPrice - 1) * 100
              return parseFloat(percentageReturn)
            }
            return ''
          }

          const findExtremeItem = (arr, comparator) => {
            return arr.reduce(comparator, arr[0])
          }

          const maxItem = findExtremeItem(preTimArray, (max, current) =>
            current > max ? current : max,
          )

          const minItem = findExtremeItem(preTimArray, (min, current) =>
            current < min ? current : min,
          )

          const maxReturn =
            maxItem !== undefined && maxItem !== null && maxItem < entryPrice
              ? 0
              : calculateReturn(maxItem, entryPrice)
          const minReturn =
            minItem !== undefined && minItem !== null && minItem > entryPrice
              ? 0
              : calculateReturn(minItem, entryPrice)
          let finalMaxReturn = maxReturn
          let finalMinReturn = minReturn
          if (direction === 'Short' && minReturn && maxReturn) {
            finalMaxReturn = -minReturn
            finalMinReturn = -maxReturn
          }
          MaxGainMinLossResult.push({
            'Max Gain': finalMaxReturn,
            'Max Loss': finalMinReturn,
            value: item.value,
          })
        })
      }
    }

    let median_list = [],
      positive_list = [],
      z_score_list = [],
      temp_mean_list = [],
      new_max_loss_list = [],
      new_max_gain_list = []
    for (var i in period_dict) {
      const _tmp_max_loss = this.calculate_mean(
        MaxGainMinLossResult.filter((item) => item.value === period_dict[i].value).map(
          (item) => item['Max Loss'],
        ),
      )
      new_max_loss_list.push(_tmp_max_loss)
      const _tmp_max_gain = this.calculate_mean(
        MaxGainMinLossResult.filter((item) => item.value === period_dict[i].value).map(
          (item) => item['Max Gain'],
        ),
      )
      new_max_gain_list.push(_tmp_max_gain)
      let temp_median = this.calculate_median(
        used_quotes.map((obj) => obj[period_dict[i].timeframe]),
      )
      median_list.push(temp_median)
      positive_list.push(
        this.calculate_win_rate(used_quotes.map((obj) => obj[period_dict[i].timeframe])),
      )

      let temp_std = this.calculate_std(
        used_quotes.map((obj) => obj[period_dict[i].timeframe]),
      )
      let temp_mean = this.calculate_mean(
        used_quotes.map((obj) => obj[period_dict[i].timeframe]),
      )
      const _temp_mean = parseFloat(temp_mean.toFixed(1))
      temp_mean_list.push(_temp_mean)
      const sqrt_length = used_quotes
        .map((obj) => obj[period_dict[i].timeframe])
        .filter((e) => !isNaN(e)).length
      z_score_list.push(
        parseFloat(((temp_mean - temp_median) / (temp_std / Math.sqrt(sqrt_length))).toFixed(1)),
      )
    }
    const isNullValue = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(v)
    const res = period_dict.map((val, i) => {
      const Positive = isNaN(positive_list[i]) ? '' : Math.round(positive_list[i] * 100)
      const median = isNaN(median_list[i]) ? '' : median_list[i].toFixed(1)
      let AvgMaxLoss = isNullValue(new_max_loss_list[i]) ? new_max_loss_list[i].toFixed(1) : ''
      let AvgMaxGain = isNullValue(new_max_gain_list[i]) ? new_max_gain_list[i].toFixed(1) : ''
      // 如果为字符串类型，先转换为数字；注意要排除 NaN 的情况
      if (direction === 'Short' && !isNaN(AvgMaxLoss)) {
        AvgMaxLoss = -parseFloat(AvgMaxLoss)
      }
      if (direction === 'Short' && !isNaN(AvgMaxGain)) {
        AvgMaxGain = -parseFloat(AvgMaxGain)
      }
      return {
        Period: val['timeframe'],
        'Mean(%)': temp_mean_list[i],
        'Median(%)': median,
        '% Positive': Positive,
        'Avg Max Loss': AvgMaxLoss,
        'Avg Max Gain': AvgMaxGain,
        't-Statistic': z_score_list[i],
      }
    })
    this.result_quotes = res
    return this.generate_table_data()
  }

  generate_period_data(name, quotes, period, direction) {
    const field = 'Open'
    quotes = quotes.map((row, i) => {
      if (i < quotes.length - period) {
        const change = parseFloat(
          ((direction == 'Short'
            ? row[field] - quotes[i + period][field]
            : quotes[i + period][field] - row[field]) /
            row[field]) *
            100,
        )
        return {
          ...row,
          [field + period]: quotes[i + period][field],
          [name]: change == Infinity || change == -Infinity ? 0 : change,
        }
      } else {
        return {
          ...row,
          [field + period]: NaN,
          [name]: NaN,
        }
      }
    })
    const minCloseArr = this.get_period_parm(
      quotes.map((row) => row[field + period]),
      'min',
      period,
    )
    const maxCloseArr = this.get_period_parm(
      quotes.map((row) => row[field + period]),
      'max',
      period,
    )
    quotes = quotes.map((row, i) => {
      if (i >= period) {
        const change = parseFloat(100 * (minCloseArr[i] / row[field] - 1))
        return {
          ...row,
          ['MaxLoss' + period]: change == Infinity || change == -Infinity ? 0 : change,
        }
      } else {
        return {
          ...row,
          ['MaxLoss' + period]: NaN,
        }
      }
    })
    quotes = quotes.map((row, i) => {
      if (i >= period) {
        const change = parseFloat(100 * (maxCloseArr[i] / row[field] - 1))
        return {
          ...row,
          ['MaxGain' + period]: change == Infinity || change == -Infinity ? 0 : change,
        }
      } else {
        return {
          ...row,
          ['MaxGain' + period]: NaN,
        }
      }
    })

    return quotes
  }

  calculate_win_rate(arr) {
    arr = arr.filter(function (x) {
      return !isNaN(x) // 剔除 NaN 值
    })
    if (arr.length == 0) return NaN

    let return_series = arr.map((x) => (x > 0 ? 1 : 0))
    return parseFloat(this.calculate_mean(return_series))
  }

  calculate_mean(arr) {
    arr = arr.filter(function (x) {
      return !isNaN(x) // 剔除 NaN 值
    })
    if (arr.length == 0) return NaN
    return arr.reduce((a, b) => a + b) / arr.length
  }

  calculate_median(arr) {
    arr = arr.filter((n) => !isNaN(n))
    if (arr.length == 0) return NaN
    const mid = Math.floor(arr.length / 2)
    const nums = [...arr].sort((a, b) => a - b)
    return parseFloat(
      arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2,
    )
  }

  calculate_std(arr) {
    arr = arr.filter(function (x) {
      return !isNaN(x) // 剔除 NaN 值
    })
    if (arr.length == 0) return NaN

    const mean = arr.reduce(function (a, b) {
      return a + b
    }) / arr.length // 计算平均数
    const deviationArr = arr.map(function (x) {
      return Math.pow(x - mean, 2)
    })

    const variance =
      deviationArr.reduce(function (a, b) {
        return a + b
      }) /
      (deviationArr.length - 1) // 计算方差，使用自由度=1

    const std = Math.sqrt(variance) // 计算标准差
    return std
  }

  get_period_parm(dataSeries, paramType, period) {
    const typeDict = {
      max: Math.max,
      min: Math.min,
      mean: (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
      sum: (arr) => arr.reduce((a, b) => a + b, 0),
    }

    const dataArr = []

    // period <= 1 特殊处理
    if (period <= 1) {
      for (let i = 0; i < dataSeries.length; i++) {
        const val = dataSeries[i]
        dataArr.push(isNaN(val) ? NaN : Number(val.toFixed(3)))
      }
      return dataArr
    }

    // period > 1 走原逻辑
    for (let i = 0; i < dataSeries.length; i++) {
      if (i >= period) {
        const window = dataSeries.slice(i - period, i).filter((n) => !isNaN(n))

        if (window.length === 0) {
          dataArr.push(NaN)
          continue
        }

        const tmpData =
          paramType === 'mean' || paramType === 'sum'
            ? typeDict[paramType](window)
            : typeDict[paramType](...window)

        dataArr.push(Number(tmpData.toFixed(3)))
      } else {
        dataArr.push(NaN)
      }
    }

    return dataArr
  }

  transformZScoreData(data) {
    const rowFrequency = 'Daily'
    data = data.map((item) => {
      if (item.period % 252 === 0 && item.timeframe === 'Day') {
        return { period: item.period / 252, timeframe: 'Year' }
      }
      if (item.period % 21 === 0 && item.timeframe === 'Day') {
        return { period: item.period / 21, timeframe: 'Month' }
      }
      if (item.period % 52 === 0 && item.timeframe === 'Week') {
        return { period: item.period / 52, timeframe: 'Year' }
      }
      if (item.period % 12 === 0 && item.timeframe === 'Month') {
        return { period: item.period / 12, timeframe: 'Year' }
      }
      return { period: item.period, timeframe: item.timeframe }
    })
    data = data.map((item) => {
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
              // 不转
              period = period
              timeframe = 'Week'
            } else {
              let num = Math.trunc(period / 13)
              let end = (period % 13) / 4
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
    })
    return data.map((item) => {
      let timeframe =
        item.period > 1 ? `${item.period} ${item.timeframe}s` : `${item.period} ${item.timeframe}`
      let value
      const frequency = rowFrequency
      if (frequency == 'Daily') {
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
            break
        }
      } else if (frequency == 'Weekly') {
        switch (item.timeframe) {
          case 'Week':
            value = Number(item.period)
            break
          case 'Month': {
            const period = Number(item.period)
            let num_3 = null
            num_3 = Math.trunc(period / 3)
            let end_3 = period % 3
            value = num_3 * 13 + end_3 * 4
            break
          }
          case 'Year':
            value = Number(item.period) * 52
            break
          default:
            break
        }
      } else if (frequency == 'Monthly') {
        switch (item.timeframe) {
          case 'Month':
            value = Number(item.period)
            break
          case 'Year':
            value = Number(item.period) * 12
            break
          default:
            break
        }
      }

      return { timeframe, period: item.period, value }
    })
  }

  transformData(data) {
    data = data.map((item) => {
      if (item.period % 5 === 0 && item.timeframe === 'Day') {
        return { period: item.period / 5, timeframe: 'Week' }
      }
      if (item.period % 21 === 0 && item.timeframe === 'Day') {
        return { period: item.period / 21, timeframe: 'Month' }
      }
      return { period: item.period, timeframe: item.timeframe }
    })
    const uniqueData = []
    data.forEach((item) => {
      const isDuplicate = uniqueData.some(
        (uniqueItem) => uniqueItem.period == item.period && uniqueItem.timeframe == item.timeframe,
      )

      if (!isDuplicate) {
        uniqueData.push(item)
      }
    })
    return uniqueData.map((item) => {
      let timeframe =
        item.period > 1
          ? `${item.period} ${item.timeframe}s [%]`
          : `${item.period} ${item.timeframe} [%]`
      let value
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
          break
      }
      return { timeframe, period: item.period, value }
    })
  }

  /**
   * 原版 History 流程未调用此方法（死代码），为保持 1:1 迁移原样保留。
   */
  transformDate(arr) {
    var processeArray = []

    for (var i = 0; i < arr.length; i++) {
      var currentItem = arr[i]

      var parts = currentItem.split(' ')
      var value = parseInt(parts[0])
      var unit = parts[1]

      if (unit === 'Days') {
        if (value % 252 === 0) {
          value = value / 252
          unit = value == 1 ? 'Year' : 'Years'
        }
        if (value % 21 === 0) {
          value = value / 21
          unit = value == 1 ? 'Month' : 'Months'
        }
      }
      if (unit === 'Weeks') {
        if (value % 52 === 0) {
          value = value / 52
          unit = value == 1 ? 'Year' : 'Years'
        }
      }
      if (unit === 'Months') {
        if (value % 12 === 0) {
          value = value / 12
          unit = value == 1 ? 'Year' : 'Years'
        }
      }
      if (this.rowFrequency === 'Daily') {
        if (unit === 'Days') {
          if (value % 5 === 0) {
            value = value / 5
            unit = value == 1 ? 'Week' : 'Weeks'
          }
          if (value % 13 === 0 && unit.includes('Week')) {
            value = (value / 13) * 3
            unit = value == 1 ? 'Month' : 'Months'
          }
          if (value % 12 === 0 && unit.includes('Month')) {
            value = value / 12
            unit = value == 1 ? 'Year' : 'Years'
          }
        } else if (unit === 'Weeks') {
          if (value % 13 === 0) {
            value = (value / 13) * 3
            unit = value == 1 ? 'Month' : 'Months'
          }
          if (value % 12 === 0 && unit.includes('Month')) {
            value = value / 12
            unit = value == 1 ? 'Year' : 'Years'
          }
        } else if (unit === 'Months') {
          if (value % 12 === 0) {
            value = value / 12
            unit = value == 1 ? 'Year' : 'Years'
          }
        } else {
          value = value
          unit = value == 1 ? unit : `${unit}s`
        }
      } else if (this.rowFrequency === 'Weekly') {
        if (unit === 'Week') {
          if ((value % 13) % 4 === 0) {
            if (value % 13 === 12) {
              // 不转
              unit = value == 1 ? 'Week' : 'Weeks'
            } else {
              let num = Math.trunc(value / 13)
              let end = (value % 13) / 4
              value = num * 3 + end
              unit = value == 1 ? 'Month' : 'Months'
            }
          }
          if (value % 12 === 0 && unit.includes('Month')) {
            value = value / 12
            unit = value == 1 ? 'Year' : 'Years'
          }
        } else if (unit === 'Month') {
          if (value % 12 === 0) {
            value = value / 12
            unit = value == 1 ? 'Year' : 'Years'
          }
        }
      } else if (this.rowFrequency === 'Monthly') {
        if (unit === 'Month') {
          if (value % 12 === 0) {
            value = value / 12
          }
        }
      }

      var newItem = value + ' ' + unit

      let res
      switch (unit) {
        case 'Days':
          res = 1 * value
          break
        case 'Day':
          res = 1 * value
          break
        case 'Weeks':
          res = 5 * value
          break
        case 'Week':
          res = 5 * value
          break
        case 'Months':
          res = 21 * value
          break
        case 'Month':
          res = 21 * value
          break
        case 'Years':
          res = 252 * value
          break
        case 'Year':
          res = 252 * value
          break
        default:
          break
      }
      if (processeArray.map((x) => x.label).indexOf(newItem) == -1)
        processeArray.push({ label: newItem, value: res })
    }

    return processeArray
  }

  /**
   * 将 Period 维度结果 pivot 成「property × period」行，供无表头表格渲染。
   * 原版此处 commit form/STORE_BACKTEST_ZSCORE_RESULT。
   */
  generate_table_data() {
    this.generatePeriods()
    // 提取属性列
    let keys = Object.keys(this.result_quotes[0])
    keys.splice(keys.indexOf('Period'), 1)
    let result = []
    for (let i = 0; i < keys.length; i++) {
      result.push({
        property: keys[i],
      })
    }
    // 将 periods 信息插入到 data 中
    for (let i = 0; i < this.periods.length; i++) {
      for (let j = 0; j < result.length; j++) {
        this.result_quotes.forEach((obj) => {
          if (obj.Period === this.periods[i].period) {
            result[j][this.periods[i].period] = obj[result[j].property]
          }
        })
      }
    }
    result = result.map((item) => {
      // 将 key 值修改为 'key [%]'
      return {
        '1 Month [%]': item['1 Month'],
        '2 Months [%]': item['2 Months'],
        '3 Months [%]': item['3 Months'],
        '4 Months [%]': item['4 Months'],
        '5 Months [%]': item['5 Months'],
        '6 Months [%]': item['6 Months'],
        '1 Year [%]': item['1 Year'],
        property: item.property,
      }
    })
    this.result_quotes = result
    console.log('zscode结果', result)
    return this.result_quotes
  }

  generatePeriods() {
    let quotes = []
    quotes = this.result_quotes
    let set = new Set()
    for (let i = 0; i < quotes.length; i++) {
      set.add(quotes[i].Period)
    }
    let values = Array.from(set)
    let columns = []
    for (let i = 0; i < values.length; i++) {
      columns.push({
        period: values[i],
      })
    }
    this.periods = columns
    console.log('this.periods-', this.periods)
  }
}

export function createBacktestHistoryCalculator(stxx: any): BacktestHistoryCalculator {
  return new BacktestHistoryCalculator(stxx)
}
