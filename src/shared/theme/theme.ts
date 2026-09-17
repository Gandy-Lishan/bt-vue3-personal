import { computed, ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'backtestedge-theme'

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

function preferredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'

  const savedTheme = window.localStorage.getItem(STORAGE_KEY)
  if (isThemeMode(savedTheme)) return savedTheme

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const themeMode = ref<ThemeMode>(preferredTheme())
const isDarkTheme = computed(() => themeMode.value === 'dark')
const themeToggleLabel = computed(() => `Switch to ${isDarkTheme.value ? 'light' : 'dark'} theme`)

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return

  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = mode
}

export function setThemeMode(mode: ThemeMode) {
  themeMode.value = mode
}

export function toggleThemeMode() {
  setThemeMode(isDarkTheme.value ? 'light' : 'dark')
}

export function initTheme() {
  applyTheme(themeMode.value)

  watch(
    themeMode,
    (mode) => {
      applyTheme(mode)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, mode)
      }
    },
    { immediate: true },
  )
}

export function useTheme() {
  return {
    themeMode,
    isDarkTheme,
    themeToggleLabel,
    setThemeMode,
    toggleThemeMode,
  }
}
