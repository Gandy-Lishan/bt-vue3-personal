import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/app/App.vue'
import router from '@/app/router'
import { ensureDevelopmentSessionCookie } from '@/shared/auth/permission'
import { initTheme } from '@/shared/theme/theme'
import '@/shared/styles/index.css'
// @ts-ignore ChartIQ does not ship with TS declarations
import { CIQ } from '@/shared/lib/chartiq/st-development/js/components'
import chartiqAxios from '@/shared/lib/chartiq/chartiq-axios'

initTheme()
ensureDevelopmentSessionCookie()

// 【Vue2→Vue3 兼容】原版在 ChartIQEngine.vue created() 中挂载 CIQ.axios，Vue3 需在 main 提前挂载
CIQ.axios = chartiqAxios

createApp(App).use(createPinia()).use(router).mount('#app')
