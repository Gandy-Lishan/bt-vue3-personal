<script setup lang="ts">
import { socialIconPaths } from './socialIcons'
import type { SocialIconName } from './socialIcons'

withDefaults(defineProps<{ name: SocialIconName; size?: number }>(), { size: 18 })
</script>

<template>
  <!-- Filled brand marks, so they take the surrounding text colour via currentColor. -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="socialIconPaths[name]" />
  </svg>
</template>
