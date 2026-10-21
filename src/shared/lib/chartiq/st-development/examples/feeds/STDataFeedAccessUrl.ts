/**
 * STDataFeedAccessUrl — ChartIQ 数据源 API 端点配置
 *
 * 【Vue2→Vue3 兼容】从原版 Vue2 项目迁移：
 *   src/components/common/chart/st-development/examples/feeds/STDataFeedAccessUrl.js
 *
 * pairDataUrl 指向外部 bt2api 端点（需要 basic auth）。
 * 其他端点使用 /dev 代理，Vite 会转发到 stApiTarget。
 */

export const config = {
  pairDataUrl: 'https://bt2api.sentimentrader.com/st_data/pair_data',
  indicatorsMetadata: '/dev/st_data/indicators_metadata',
  indicatorMetadata: '/dev/st_data/indicator_metadata',
  username: 'sentimentrader_backtest_api',
  password: 'TAZcbpTmQVAJW4GW3ZMQA1su0ynjqJJsYo6vfkapx',

  /**
   * Convert a timestamp (ms) to YYYY-MM-DD string.
   */
  timestampToTime(timestamp: number | string | Date): string {
    const date = new Date(timestamp)
    const Y = date.getFullYear()
    const M = String(date.getMonth() + 1).padStart(2, '0')
    const D = String(date.getDate()).padStart(2, '0')
    return `${Y}-${M}-${D}`
  },
}
