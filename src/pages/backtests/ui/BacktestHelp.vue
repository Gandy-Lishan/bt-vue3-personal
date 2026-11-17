<script setup lang="ts">
import { CircleHelp } from '@lucide/vue'
import { backtestHelp } from './backtestHelp'
defineProps<{ topic: keyof typeof backtestHelp }>()
</script>

<template>
  <span class="help" tabindex="0" :aria-label="backtestHelp[topic]">
    <CircleHelp :size="13" aria-hidden="true" />
    <span class="help-popup" role="tooltip">{{ backtestHelp[topic] }}</span>
  </span>
</template>

<style scoped>
.help{position:relative;display:inline-flex;align-items:center;margin-left:4px;vertical-align:middle;color:var(--app-text-muted);cursor:help}
.help-popup{position:absolute;bottom:calc(100% + 8px);left:50%;z-index:100;display:none;width:max-content;max-width:min(300px,80vw);padding:8px 10px;border-radius:5px;background:#273244;color:#fff;font-size:11px;font-weight:400;line-height:1.4;white-space:normal;box-shadow:0 5px 15px #0003;transform:translateX(-50%)}
.help:hover .help-popup,.help:focus .help-popup{display:block}
</style>
