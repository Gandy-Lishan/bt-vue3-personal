/**
 * 【Vue2→Vue3 兼容】@/main 的 shim —— ChartIQ 的 STStockDataFeed.js 从此处导入 popUpMsgBox
 *
 * 原版 Vue2 项目中 main.ts 导出了 Vue app 实例（带有 popUpMsgBox 方法）。
 * Vue3 不导出 app 实例，此 shim 提供兼容接口。
 */

/**
 * Show a popup message — adapted from Vue2's app.popUpMsgBox.
 * Falls back to alert if no Vue component context is available.
 */
function popUpMsgBox(message, duration) {
  // If there's a global notification system, use it
  if (typeof window !== 'undefined' && window.showNotification) {
    window.showNotification(message, { duration })
    return
  }
  // Fallback: use a simple toast
  console.log('[popUpMsgBox]', message)
  if (typeof document !== 'undefined') {
    const toast = document.createElement('div')
    toast.textContent = message
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.8)',
      color: '#fff',
      padding: '12px 24px',
      borderRadius: '8px',
      zIndex: '99999',
      fontSize: '14px',
      maxWidth: '80vw',
      textAlign: 'center',
    })
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), duration || 3000)
  }
}

export default {
  popUpMsgBox,
}
