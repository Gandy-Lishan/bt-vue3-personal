import { hasFormValue } from '@/shared/utils/form-value'

export type TechnicalIndicatorClass =
  | 'CCI_like'
  | 'MACD_like'
  | 'MovingAverage_like'
  | 'BollingerBands_like'
  | 'EFT_like'
  | 'Stochastics_like'
  | 'ADX_like'
  | 'ERI_like'
  | 'Aligator_like'
  | 'LRF_like'
  | 'Trailingstop_like'

export interface TechnicalIndicatorOption {
  value: string
  label: string
  description: string
  meta: string
  class: TechnicalIndicatorClass
}

export interface TechnicalConditionFields {
  technicalClass: TechnicalIndicatorClass | ''
  technicalMode: string
  technicalOperator: number
  technicalValue: string | number
  technicalLeft: string
  technicalRight: string
  technicalMaType: 'SMA' | 'EMA'
  technicalFastPeriod: string | number
  technicalSlowPeriod: string | number
}

export interface SerializedTechnicalCondition {
  analysis: 'Technical'
  indicator: string
  ids: string
  comparison: string
  condition: number
  value: string | number
  period?: number
  ma_type?: 'SMA' | 'EMA'
}

const group = (
  technicalClass: TechnicalIndicatorClass,
  entries: ReadonlyArray<readonly [label: string, value: string]>,
): TechnicalIndicatorOption[] => entries.map(([label, value]) => ({
  value,
  label,
  description: `Technical indicator · ${label}`,
  meta: technicalClass.replace('_like', '').replace('Aligator', 'Alligator'),
  class: technicalClass,
}))

export const technicalIndicatorOptions: TechnicalIndicatorOption[] = [
  ...group('CCI_like', [
    ['Commodity Channel Index', 'cci'], ['Relative Strength Index (RSI)', 'rsi'],
    ['On Balance Volume', 'On Bal Vol'], ['Accumulation/Distribution', 'W Acc Dist'],
    ['Accumulative Swing Index', 'Acc Swing'], ['Awesome Oscillator', 'Awesome'],
    ['Balance of Power', 'Bal Pwr'], ['Bollinger %b', 'Boll %b'],
    ['Bollinger Bandwidth', 'Boll BW'], ['Center of Gravity', 'Center of Gravity'],
    ['Chaikin Money Flow', 'Chaikin MF'], ['Chaikin Volatility', 'Chaikin Vol'],
    ['Chande Forecast Oscillator', 'Chande Fcst'], ['Chande Momentum Oscillator', 'Chande Mtm'],
    ['Coppock Curve', 'Coppock'], ['Detrended Price Oscillator', 'Detrended'],
    ['Disparity Index', 'Disparity'], ['Donchian Width', 'Donchian Width'],
    ['Ease of Movement', 'EOM'], ['Elder Force Index', 'Elder Force'],
    ['Fractal Chaos Oscillator', 'Fractal Chaos'], ['Historical Volatility', 'Hist Vol'],
    ['Intraday Momentum Index', 'Intraday Mtm'], ['Market Facilitation Index', 'W MFI'],
    ['Mass Index', 'Mass Idx'], ['Momentum Indicator', 'Momentum'],
    ['Money Flow Index', 'M Flow'], ['Moving Average Deviation', 'MA Dev'],
    ['High minus Low', 'High-Low'], ['Highest High Value', 'HHV'],
    ['Lowest Low Value', 'LLV'], ['Negative Volume Index', 'Neg Vol'],
    ['Positive Volume Index', 'Pos Vol'], ['Point Price Oscillator', 'Price Osc'],
    ['Percentage Price Oscillator', 'PPO'], ['Price Rate of Change', 'Price ROC'],
    ['Prime Number Oscillator', 'Prime Number'], ["Pring's Special K", 'Pring Sp-K'],
    ['Psychological Line', 'PSY'], ['QStick', 'QStick'], ['RAVI', 'RAVI'],
    ['Rainbow Oscillator', 'Rainbow Osc'], ['Relative Volatility', 'Rel Vol'],
    ['Schaff Trend Cycle', 'Schaff'], ['Standard Deviation', 'STD Dev'],
    ['Swing Index', 'Swing'], ['Trade Volume Index', 'Trade Vol'],
    ['True Range', 'True Range'], ['Twiggs Money Flow', 'Twiggs'],
    ['Ulcer Index', 'Ulcer'], ['Ultimate Oscillator', 'Ultimate'],
    ['Vertical Horizontal Filter', 'VT HZ Filter'], ['Volume Oscillator', 'Vol Osc'],
    ['Williams %R', 'Williams %R'], ['% of Opening Gap', '% of Opening Gap'],
    ['Day of Week', 'Day of Week'], ['Month of Year', 'Month of Year'],
    ['# of Consecutive Days Since an N-Bars High', '# of Consecutive Days Since an N-Bars High'],
    ['# of Consecutive Days Since an N-Bars Low', '# of Consecutive Days Since an N-Bars Low'],
    ['# of Consecutive Days Up', '# of Consecutive Days Up'],
    ['# of Consecutive Days Down', '# of Consecutive Days Down'],
    ['# of Consecutive Days Above a Moving Average', '# of Consecutive Days Above a Moving Average'],
    ['# of Consecutive Days Below a Moving Average', '# of Consecutive Days Below a Moving Average'],
    ['# of Consecutive Days With a Rising Moving Average', '# of Consecutive Days With a Rising Moving Average'],
    ['# of Consecutive Days With a Declining Moving Average', '# of Consecutive Days With a Declining Moving Average'],
    ['Deviation From Trend Between Two Moving Averages', 'Deviation From Trend Between Two Moving Averages'],
    ['Percentage Below N-Bars High', 'Percentage Below N-Bars High'],
    ['Percentage Above N-Bars Low', 'Percentage Above N-Bars Low'],
    ['N-Day Realized Volatility', 'N-Day Realized Volatility'],
    ['SQN Market Regime', 'SQN Market Regime'], ['Amplitude', 'Amplitude'],
  ]),
  ...group('MACD_like', [
    ['MACD', 'macd'], ['Klinger Volume Oscillator', 'Klinger'], ['Relative Vigor Index', 'Rel Vig'],
  ]),
  ...group('EFT_like', [
    ['Ehler Fisher Transform', 'Ehler Fisher'], ['Price Momentum Oscillator', 'PMO'],
    ["Pring's Know Sure Thing", 'Pring KST'], ['Trend Intensity Index', 'Trend Int'],
  ]),
  ...group('BollingerBands_like', [
    ['Bollinger Bands', 'Bollinger Bands'], ['Donchian Channel', 'Donchian Channel'],
    ['High Low Bands', 'High Low'], ['Keltner Channel', 'Keltner'],
    ['Moving Average Envelope', 'MA Env'], ['STARC Bands', 'STARC Bands'], ['ATR Bands', 'ATR Bands'],
  ]),
  ...group('Stochastics_like', [
    ['Stochastic Momentum Index', 'Stch Mtm'], ['Stochastics', 'Stochastics'],
  ]),
  ...group('ERI_like', [['Elder Ray Index', 'Elder Ray'], ['Gator Oscillator', 'Gator']]),
  ...group('ADX_like', [['ADX/DMS', 'ADX']]),
  ...group('MovingAverage_like', [['Moving Average', 'ma']]),
  ...group('Aligator_like', [['Alligator', 'Alligator']]),
  ...group('LRF_like', [
    ['Linear Reg Forecast', 'Lin Fcst'], ['Time Series Forecast', 'Time Fcst'],
    ['N-Bars High', 'N-Bars High'], ['N-Bars Low', 'N-Bars Low'],
  ]),
  ...group('Trailingstop_like', [['ATR Trailing Stops', 'ATR Trailing Stop'], ['Parabolic SAR', 'PSAR']]),
].sort((a, b) => a.label.localeCompare(b.label))

export const technicalOperatorOptions = [
  { value: 0, label: 'Above (>)', phrase: 'is above' },
  { value: 1, label: 'Equals (=)', phrase: 'equals' },
  { value: 2, label: 'Below (<)', phrase: 'is below' },
  { value: 3, label: 'Crosses above', phrase: 'crosses above' },
  { value: 4, label: 'Crosses below', phrase: 'crosses below' },
] as const

export function findTechnicalIndicator(value: string) {
  return technicalIndicatorOptions.find((item) => item.value === value)
}

export function resetTechnicalFields(target: TechnicalConditionFields, technicalClass: TechnicalIndicatorClass) {
  Object.assign(target, {
    technicalClass,
    technicalMode: technicalClass === 'MACD_like' ? 'value'
      : technicalClass === 'Stochastics_like' ? 'k-value'
        : technicalClass === 'ADX_like' ? 'positive'
          : technicalClass === 'ERI_like' ? 'hist1'
            : technicalClass === 'Aligator_like' ? 'price-line'
              : technicalClass === 'MovingAverage_like' ? 'price-ma'
                : technicalClass === 'EFT_like' ? 'value'
                  : 'default',
    technicalOperator: technicalClass === 'ERI_like' ? 0 : 3,
    technicalValue: technicalClass === 'CCI_like' ? '' : '0',
    technicalLeft: 'SC',
    technicalRight: technicalClass === 'BollingerBands_like' ? 'HB'
      : technicalClass === 'Aligator_like' ? 'JAW'
        : technicalClass === 'LRF_like' || technicalClass === 'Trailingstop_like' ? 'INDICATOR'
          : '',
    technicalMaType: 'SMA',
    technicalFastPeriod: '5',
    technicalSlowPeriod: '21',
  } satisfies TechnicalConditionFields)
}

export function technicalConditionComplete(condition: TechnicalConditionFields) {
  if (!condition.technicalClass) return false
  if (['CCI_like', 'ADX_like', 'ERI_like'].includes(condition.technicalClass)) return hasFormValue(condition.technicalValue)
  if (condition.technicalClass === 'MACD_like') return condition.technicalMode === 'signal' || hasFormValue(condition.technicalValue)
  if (condition.technicalClass === 'EFT_like') return condition.technicalMode === 'signal' || hasFormValue(condition.technicalValue)
  if (condition.technicalClass === 'Stochastics_like') return condition.technicalMode === 'k-d' || hasFormValue(condition.technicalValue)
  if (condition.technicalClass === 'MovingAverage_like') {
    return Number(condition.technicalFastPeriod) > 0 && (condition.technicalMode === 'price-ma' || Number(condition.technicalSlowPeriod) > 0)
  }
  return Boolean(condition.technicalLeft && condition.technicalRight && condition.technicalLeft !== condition.technicalRight)
}

export function technicalConditionSentence(indicator: string, condition: TechnicalConditionFields) {
  const name = findTechnicalIndicator(indicator)?.label ?? (indicator || 'Choose a technical indicator')
  const operator = technicalOperatorOptions.find((item) => item.value === condition.technicalOperator)?.phrase ?? 'compares with'
  const priceNames: Record<string, string> = { SC: 'symbol close', SH: 'symbol high', SO: 'symbol open', SL: 'symbol low' }
  const lineNames: Record<string, string> = { LB: 'low band', HB: 'high band', MB: 'middle band', JAW: 'Jaw', TEETH: 'Teeth', LIPS: 'Lips', INDICATOR: name }
  if (condition.technicalClass === 'MACD_like') {
    if (condition.technicalMode === 'signal') return `${name} ${operator} its signal line.`
    return `${name} ${condition.technicalMode === 'histogram' ? 'histogram ' : ''}${operator} ${condition.technicalValue || 'a value'}.`
  }
  if (condition.technicalClass === 'EFT_like' && condition.technicalMode === 'signal') return `${name} ${operator} its signal line.`
  if (condition.technicalClass === 'Stochastics_like') {
    if (condition.technicalMode === 'k-d') return `${name} %K ${operator} %D.`
    return `${name} ${condition.technicalMode === 'd-value' ? '%D' : '%K'} ${operator} ${condition.technicalValue || 'a value'}.`
  }
  if (condition.technicalClass === 'ADX_like') return `${name} ${condition.technicalMode === 'negative' ? '-DI' : '+DI'} ${operator} ${condition.technicalValue || 'a value'}.`
  if (condition.technicalClass === 'ERI_like') return `${name} ${condition.technicalMode} ${operator} ${condition.technicalValue || 'a value'}.`
  if (condition.technicalClass === 'MovingAverage_like') {
    const ma = `${condition.technicalMaType}(${condition.technicalFastPeriod || '—'})`
    if (condition.technicalMode === 'ma-ma') return `${ma} ${operator} ${condition.technicalMaType}(${condition.technicalSlowPeriod || '—'}).`
    if (condition.technicalMode === 'ratio') return `${name} ratio ${operator} ${condition.technicalValue || 'a value'}.`
    return `${priceNames[condition.technicalLeft] ?? condition.technicalLeft} ${operator} ${ma}.`
  }
  if (condition.technicalClass === 'CCI_like') return `${name} ${operator} ${condition.technicalValue || 'a value'}.`
  return `${priceNames[condition.technicalLeft] ?? lineNames[condition.technicalLeft] ?? condition.technicalLeft} ${operator} ${lineNames[condition.technicalRight] ?? condition.technicalRight}.`
}

export function serializeTechnicalCondition(indicator: string, condition: TechnicalConditionFields): SerializedTechnicalCondition {
  const base = { analysis: 'Technical' as const, indicator, condition: condition.technicalOperator }
  switch (condition.technicalClass) {
    case 'MACD_like': return { ...base, ids: 'MACD', comparison: condition.technicalMode === 'histogram' ? 'MACDH' : 'MACD', value: condition.technicalMode === 'signal' ? 'SL' : Number(condition.technicalValue) }
    case 'EFT_like': return { ...base, ids: 'EFT', comparison: 'EFT', value: condition.technicalMode === 'signal' ? 'SL' : Number(condition.technicalValue) }
    case 'Stochastics_like': return { ...base, ids: 'SMI', comparison: condition.technicalMode === 'd-value' ? 'D' : 'K', value: condition.technicalMode === 'k-d' ? 'D' : Number(condition.technicalValue) }
    case 'ADX_like': return { ...base, ids: 'ADX', comparison: condition.technicalMode === 'negative' ? 'NADX' : 'PADX', value: Number(condition.technicalValue) }
    case 'ERI_like': return { ...base, ids: 'ERI', comparison: condition.technicalMode === 'hist2' ? 'ERIH2' : 'ERIH1', value: Number(condition.technicalValue) }
    case 'MovingAverage_like': return { ...base, ids: condition.technicalMaType, comparison: condition.technicalMode === 'price-ma' ? condition.technicalLeft : 'MA', value: condition.technicalMode === 'ratio' ? Number(condition.technicalValue) : Number(condition.technicalSlowPeriod), period: Number(condition.technicalFastPeriod), ma_type: condition.technicalMaType }
    case 'BollingerBands_like': return { ...base, ids: 'BLB', comparison: condition.technicalLeft, value: condition.technicalRight }
    case 'Aligator_like': return { ...base, ids: 'ALLI', comparison: condition.technicalLeft, value: condition.technicalRight }
    case 'LRF_like': return { ...base, ids: 'LRF', comparison: condition.technicalLeft, value: 'LRF' }
    case 'Trailingstop_like': return { ...base, ids: indicator === 'PSAR' ? 'PSAR' : 'ATR', comparison: condition.technicalLeft, value: indicator }
    default: return { ...base, ids: 'CCI', comparison: 'CCI', value: Number(condition.technicalValue) }
  }
}
