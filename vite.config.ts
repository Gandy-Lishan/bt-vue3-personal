import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import type { ClientRequest } from 'node:http'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv, type PluginOption, type ProxyOptions } from 'vite'

const stApiTargets = {
  prod: 'https://bt2api.sentimentrader.com',
  dev: 'https://devbt2api.sentimentrader.com',
  local: 'http://localhost:5001',
} as const
const defaultDevSentimenSession = ''
/*
const defaultDevSentimenSession =
  'IJLN7EhBuOXvsdvgYt7rLyYvp4GSk2hXdln69TOIHHgCIpzJIACssjQOW7bWH20fpw0OiGw0poJIV2Nzvk3FatVlMwKuU6zTMuorJTgFps1U8Hf6ux9GVpeoQR1iivqwN2hd9ZIY8qo4NiJD0KNh11JZNTcxiPKBDRcdvrCIKT6n6fP4p8m0vZCRGExnFzlNyGOMAg6L0P8uxwaORgH6lTcesVlyOUjwVPoejA8q5vu9+2Ua1ZC0EPtbgoyLBrCWduhPJnynwcIMq74y1JTK49iuJXZZ1xi0lq9R6vfCbfwQ6yKaPTUk5SLPIURdC+tXAgClauHMEAJ19C5IihySD7gIQ6luZFfq6GdHssy0ebkiQoEoX8ymUzMdH4a8jX583j6RaCOWJ+L9xfq8bbQ7vFSysWWZ6nzD3EbCdqKT7Kfvx5pSii2XwuP42aqx/k1nf26ufCqzOnUj4olrtCt/Tg=='
*/

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function resolveStApiTarget(value?: string) {
  if (!value) return stApiTargets.prod
  if (value in stApiTargets) return stApiTargets[value as keyof typeof stApiTargets]
  return trimTrailingSlash(value)
}

function rewritePrefix(prefix: string) {
  return (path: string) => path.replace(new RegExp(`^${prefix}`), '')
}

function resolveDevSentimenSession(env: Record<string, string>) {
  return env.DEV_SENTIMEN_SESSION || env.VITE_DEV_SENTIMEN_SESSION || defaultDevSentimenSession
}

function devSentimenCookieHeader(sentimenSession: string) {
  return `sentimen_session=${encodeURIComponent(sentimenSession)}`
}

function configureDevelopmentCookieProxy(proxy: Parameters<NonNullable<ProxyOptions['configure']>>[0], sentimenSession: string) {
  proxy.on('proxyReq', (proxyRequest: ClientRequest) => {
    if (sentimenSession) {
      proxyRequest.setHeader('Cookie', devSentimenCookieHeader(sentimenSession))
    }
  })
}

function developmentAuthCookiePlugin(sentimenSession: string): PluginOption {
  return {
    name: 'backtestedge-development-auth-cookie',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const hasSessionCookie = request.headers.cookie?.includes('sentimen_session=')
        if (sentimenSession && !hasSessionCookie) {
          response.setHeader('Set-Cookie', `${devSentimenCookieHeader(sentimenSession)}; Path=/; SameSite=Lax`)
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const stApiTarget = resolveStApiTarget(env.VITE_ST_API_PROXY_TARGET)
  const localApiTarget = trimTrailingSlash(env.VITE_LOCAL_API_PROXY_TARGET || 'http://localhost:5001')
  const devSentimenSession = resolveDevSentimenSession(env)

  // 【Vue2→Vue3 兼容】原版 VUE_APP_START_DATE 硬编码为 -5364662400000（1800-01-01）
  if (!env.VUE_APP_START_DATE) {
    env.VUE_APP_START_DATE = '-5364662400000'
  }
  if (!env.VUE_APP_DEFAULT_SYMBOL) {
    env.VUE_APP_DEFAULT_SYMBOL = env.VITE_DEFAULT_SYMBOL || 'AAPL'
  }
  if (!env.VUE_APP_GREEN) {
    env.VUE_APP_GREEN = '#34d399'
  }
  if (!env.VUE_APP_RED) {
    env.VUE_APP_RED = '#fb7185'
  }

  const proxy: Record<string, ProxyOptions> = {
    '/dev': {
      target: stApiTarget,
      ws: true,
      changeOrigin: true,
      rewrite: rewritePrefix('/dev'),
      configure(proxy) {
        configureDevelopmentCookieProxy(proxy, devSentimenSession)
      },
    },
    '/bt': {
      target: stApiTarget,
      ws: true,
      changeOrigin: true,
      rewrite: rewritePrefix('/bt'),
    },
    '/api': {
      target: localApiTarget,
      changeOrigin: true,
    },
    '/ai': {
      target: trimTrailingSlash(env.VITE_AI_PROXY_TARGET || 'https://ai.sentdevsite.com'),
      ws: true,
      changeOrigin: true,
      rewrite: rewritePrefix('/ai'),
    },
    '/sn': {
      target: trimTrailingSlash(env.VITE_SN_PROXY_TARGET || 'http://192.168.2.101:5000'),
      ws: true,
      changeOrigin: true,
      rewrite: rewritePrefix('/sn'),
    },
    '/v1': {
      target: trimTrailingSlash(env.VITE_AGENT_PROXY_TARGET || 'http://localhost:8000'),
      ws: true,
      changeOrigin: true,
    },
  }

  return {
    plugins: [vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag: string) =>
            tag.startsWith('cq-') ||
            tag.startsWith('stx-') ||
            tag === 'template-placeholder',
        },
      },
    }), tailwindcss(), developmentAuthCookiePlugin(devSentimenSession)],
    resolve: {
      alias: {
        // 【Vue2→Vue3 兼容】Vite alias 映射 —— 让 ChartIQ 原版文件中的 @/utils/* 等导入路径在 Vite 中正确解析
        // 原版 utils/ 子目录已合并到 utils.ts 根，这里统一指向
        '@/utils/globalFunc': fileURLToPath(new URL('./src/shared/lib/chartiq/utils.ts', import.meta.url)),
        '@/utils/cryptoUtils/codeTool': fileURLToPath(new URL('./src/shared/lib/chartiq/utils.ts', import.meta.url)),
        '@/utils/formValidate': fileURLToPath(new URL('./src/shared/lib/chartiq/utils.ts', import.meta.url)),
        '@/utils': fileURLToPath(new URL('./src/shared/lib/chartiq/utils.ts', import.meta.url)),
        // 【Vue2→Vue3 兼容】原版 service-stub.ts 的导入路径映射
        '@/service/service': fileURLToPath(new URL('./src/shared/lib/chartiq/service-stub.ts', import.meta.url)),
        // 【Vue2→Vue3 兼容】ChartIQ 原版文件中的长绝对路径导入
        '@/components/common/chart/st-development/examples/feeds/STDataFeedAccessUrl': fileURLToPath(
          new URL('./src/shared/lib/chartiq/st-development/examples/feeds/STDataFeedAccessUrl.ts', import.meta.url),
        ),
        // 【Vue2→Vue3 兼容】STStockDataFeed.js 从 @/main 导入，需 shim
        '@/main': fileURLToPath(new URL('./src/shared/lib/shims/main-shim.js', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // 【Vue2→Vue3 兼容】ChartIQ 内部依赖 lru-cache，Vue2 中由 webpack 处理，Vite 需 shim
        'lru-cache': fileURLToPath(new URL('./src/shared/lib/shims/lru-cache.js', import.meta.url)),
        'lru-cache-actual': fileURLToPath(new URL('./node_modules/lru-cache/dist/esm/browser/index.min.js', import.meta.url)),
        'chartiq': fileURLToPath(new URL('./node_modules/chartiq', import.meta.url)),
      },
    },
    // 【Vue2→Vue3 兼容】ChartIQ 原版文件使用 process.env.VUE_APP_*
    define: {
      'process.env': JSON.stringify(env),
      // 【Vue2→Vue3 兼容】ChartIQ components.js 用 __TREE_SHAKE__ 做 import guard，必须设为 false
      __TREE_SHAKE__: false,
    },
    optimizeDeps: {
      include: ['chartiq/js/chartiq.js'],
      // 【Vue2→Vue3 兼容】lru-cache 走 shim，不预构建
      exclude: ['lru-cache'],
    },
    build: {
      commonjsOptions: {
        include: [/chartiq/, /node_modules/],
      },
    },
    assetsInclude: ['**/*.cur', '**/*.gif'],
    server: {
      proxy,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/unit/**/*.spec.ts'],
    },
  }
})
