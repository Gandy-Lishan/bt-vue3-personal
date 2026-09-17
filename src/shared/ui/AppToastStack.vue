<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { AlertTriangle, Info, X } from '@lucide/vue'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'

const store = useIndicatorStore()
const toastLifetimeMs = 5000

const timers = new Map<number, ReturnType<typeof setTimeout>>()

function scheduleDismissal(ids: number[]) {
  for (const [id, timer] of timers) {
    if (!ids.includes(id)) {
      clearTimeout(timer)
      timers.delete(id)
    }
  }

  for (const id of ids) {
    if (timers.has(id)) continue
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id)
        store.dismissToast(id)
      }, toastLifetimeMs),
    )
  }
}

watch(
  () => store.toasts.map((toast) => toast.id),
  scheduleDismissal,
  { immediate: true },
)

onBeforeUnmount(() => {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="store.toasts.length"
      class="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-2.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm shadow-lg"
        role="alert"
      >
        <span
          class="mt-0.5 shrink-0"
          :class="toast.tone === 'error' ? 'text-[var(--app-negative)]' : 'text-[var(--app-primary)]'"
        >
          <AlertTriangle v-if="toast.tone === 'error'" :size="16" aria-hidden="true" />
          <Info v-else :size="16" aria-hidden="true" />
        </span>

        <p class="min-w-0 flex-1 leading-5 text-[var(--app-text-secondary)]">{{ toast.message }}</p>

        <button
          class="shrink-0 text-[var(--app-text-muted)] transition hover:text-[var(--app-text)]"
          type="button"
          aria-label="Dismiss notification"
          @click="store.dismissToast(toast.id)"
        >
          <X :size="15" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
