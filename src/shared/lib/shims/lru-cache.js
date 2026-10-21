// 【Vue2→Vue3 兼容】lru-cache v11 ESM 导出 shim —— ChartIQ 内部文件依赖此模块
// 原版 Vue2 由 webpack 处理，Vite 需要显式 shim
import { LRUCache } from 'lru-cache-actual'
export default LRUCache
export { LRUCache }
