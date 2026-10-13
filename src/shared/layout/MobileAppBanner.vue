<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { X, Download } from '@lucide/vue'

const isVisible = ref(false)
const isDismissed = ref(false)

onMounted(() => {
  // 检查用户是否已经关闭过横幅
  const dismissed = localStorage.getItem('mobile-app-banner-dismissed')
  if (!dismissed) {
    isVisible.value = true
  }
})

const dismiss = () => {
  isVisible.value = false
  localStorage.setItem('mobile-app-banner-dismissed', 'true')
}

const downloadApp = () => {
  const userAgent = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  const isAndroid = /Android/.test(userAgent)

  if (isIOS) {
    // 替换为你的 App Store 链接
    window.location.href = 'https://apps.apple.com/app/sentimentrader/idYOUR_APP_ID'
  } else if (isAndroid) {
    // 尝试深度链接，失败则跳转 Play Store
    window.location.href = 'sentimentrader://open'
    setTimeout(() => {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.sentimentrader'
    }, 1500)
  } else {
    // 桌面端显示二维码或通用下载页
    window.location.href = 'https://sentimentrader.com/download'
  }
}
</script>

<template>
  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="isVisible && !isDismissed"
      class="md:hidden fixed bottom-0 left-0 right-0 z-50 shadow-2xl"
    >
      <!-- 渐变背景 -->
      <div class="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white">
        <!-- 关闭按钮 -->
        <button
          @click="dismiss"
          class="absolute -top-8 right-2 p-1 text-white/80 hover:text-white"
          aria-label="关闭下载横幅"
        >
          <X :size="20" />
        </button>

        <!-- 主内容区 -->
        <div class="p-4">
          <div class="flex items-center gap-3">
            <!-- App 图标占位 -->
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Download :size="28" />
            </div>

            <!-- 文字说明 -->
            <div class="min-w-0 flex-1">
              <h3 class="text-base font-semibold leading-tight">
                在 App 中体验完整功能
              </h3>
              <p class="mt-1 text-sm opacity-90">
                实时信号 · 策略管理 · 图表分析
              </p>
            </div>

            <!-- 下载按钮 -->
            <button
              @click="downloadApp"
              class="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-blue-600 shadow-lg transition hover:bg-blue-50 active:scale-95"
            >
              立即下载
            </button>
          </div>

          <!-- 功能亮点 -->
          <div class="mt-3 flex items-center justify-around border-t border-white/20 pt-3 text-xs">
            <span class="flex items-center gap-1">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              </svg>
              实时推送
            </span>
            <span class="flex items-center gap-1">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              </svg>
              原生体验
            </span>
            <span class="flex items-center gap-1">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              </svg>
              离线访问
            </span>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
