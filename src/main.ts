import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/app/App.vue'
import router from '@/app/router'
import { ensureDevelopmentSessionCookie } from '@/shared/auth/permission'
import { initTheme } from '@/shared/theme/theme'
import '@/shared/styles/index.css'

initTheme()
ensureDevelopmentSessionCookie()

createApp(App).use(createPinia()).use(router).mount('#app')
