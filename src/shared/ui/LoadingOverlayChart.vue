<!--
  LoadingOverlayChart.vue — 图表加载遮罩层

  【Vue2→Vue3 兼容】照搬原版 src/components/common/progress/LoadingOverlayChart.vue
  绑定 chartIQStore.chartLoadingSetting，由 CIQ.addCover()/CIQ.hideCover() 控制显隐。
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    isLoading?: boolean // 是否显示遮罩
    progressText?: string // 进度文本（原版保留但未渲染）
  }>(),
  {
    isLoading: false,
    progressText: '',
  },
)
</script>

<template>
  <div :class="{ 'progress-container': isLoading, 'dont-show-content': !isLoading }">
    <span class="progress-text"><div class="loading-icon"></div></span>
  </div>
</template>

<style scoped>
.progress-container {
  background: rgba(0, 0, 0, 0.8);
  height: 100%;
  min-height: 500px;

  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  flex-direction: column;

  position: absolute;
  z-index: 9999;
  margin: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transition: visibility 0.3s;
}

.progress-text {
  font-size: 16px;
  color: #409eff;
  margin-top: 10px;
}

.loading-icon {
  background-image: url('../../assets/loading-spin-white.svg');
  background-size: cover;

  animation: spin 0.8s infinite linear;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 6px solid white;
  border-right-color: transparent;
  border-bottom-color: transparent;
  border-top-color: transparent;
  margin-left: 30px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
}

.dont-show-content {
  visibility: hidden;
}
</style>
