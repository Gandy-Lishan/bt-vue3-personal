<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { X, Smartphone, Download } from '@lucide/vue'

const showModal = ref(false)

onMounted(() => {
  // 首次访问或每隔 7 天显示一次
  const lastShown = localStorage.getItem('mobile-app-modal-last-shown')
  const now = Date.now()
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  if (!lastShown || now - parseInt(lastShown) > sevenDays) {
    // 延迟 3 秒显示，让用户先浏览页面
    setTimeout(() => {
      showModal.value = true
      localStorage.setItem('mobile-app-modal-last-shown', now.toString())
    }, 3000)
  }
})

const closeModal = () => {
  showModal.value = false
}

const downloadApp = () => {
  const userAgent = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  const isAndroid = /Android/.test(userAgent)

  if (isIOS) {
    window.location.href = 'https://apps.apple.com/app/sentimentrader/idYOUR_APP_ID'
  } else if (isAndroid) {
    window.location.href = 'sentimentrader://open'
    setTimeout(() => {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.sentimentrader'
    }, 1500)
  } else {
    window.location.href = 'https://sentimentrader.com/download'
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showModal"
        class="md:hidden fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
        @click.self="closeModal"
      >
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <!-- Modal 内容 -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="translate-y-full sm:translate-y-10 sm:scale-95 opacity-0"
          enter-to-class="translate-y-0 sm:scale-100 opacity-100"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="translate-y-0 sm:scale-100 opacity-100"
          leave-to-class="translate-y-full sm:translate-y-10 sm:scale-95 opacity-0"
        >
          <div class="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            <!-- Close button -->
            <button
              @click="closeModal"
              class="absolute right-4 top-4 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Close modal"
            >
              <X :size="18" />
            </button>

            <!-- Header decoration -->
            <div class="bg-gradient-to-br from-blue-600 to-purple-600 px-6 pt-8 pb-12 text-white relative overflow-hidden">
              <!-- Decorative circles -->
              <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
              <div class="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />

              <div class="relative z-10 text-center">
                <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm">
                  <Smartphone :size="40" />
                </div>
                <h2 class="text-2xl font-bold">
                  Download SentimenTrader App
                </h2>
                <p class="mt-2 text-sm opacity-90">
                  A better investing experience on your phone
                </p>
              </div>
            </div>

            <!-- Feature list -->
            <div class="px-6 py-6 -mt-6 relative z-10">
              <div class="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                <div class="space-y-4">
                  <div class="flex items-start gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                      <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900 dark:text-white">Real-time Signal Push</h3>
                      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Get market signals instantly, never miss an opportunity
                      </p>
                    </div>
                  </div>

                  <div class="flex items-start gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                      <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900 dark:text-white">Interactive Chart Analysis</h3>
                      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Touch-friendly charts, zoom and swipe through historical data
                      </p>
                    </div>
                  </div>

                  <div class="flex items-start gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600">
                      <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                        <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900 dark:text-white">Strategy Management</h3>
                      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Manage your trading strategies anywhere, view backtest results
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Download button area -->
            <div class="px-6 pb-6 space-y-3">
              <button
                @click="downloadApp"
                class="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:from-blue-700 hover:to-purple-700 active:scale-[0.98]"
              >
                <Download :size="20" />
                Download App Now
              </button>

              <!-- App Store badge -->
              <div class="flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Available on App Store and Google Play</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
