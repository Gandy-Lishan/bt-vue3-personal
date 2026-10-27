<!--
  LoadingOverlay.vue — 表单加载遮罩层

  【Vue2→Vue3 兼容】照搬原版 src/components/common/progress/LoadingOverlay.vue。
  绑定 chartIQStore.isCreateLoading（旧版 states.isCreateLoading）：indicator
  加载结束前一直覆盖表单，阻止用户在加载完成前再次切换 source，避免旧版架构
  遗留的「A 还在加载就切 B，导致 A 被重复加载」竞态。
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    isLoading?: boolean // 是否显示遮罩
    showProgress?: boolean // 进度条（原版由 el-progress 渲染）
    percentage?: number // 进度条百分比
    progressText?: string // 进度文本
    backgroundColor?: string // 背景颜色
  }>(),
  {
    isLoading: false,
    showProgress: false,
    percentage: 0,
    progressText: '',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
)
</script>

<template>
  <div
    class="loading-overlay"
    :class="{ 'is-visible': isLoading }"
    :style="{ backgroundColor }"
    :aria-hidden="!isLoading"
  >
    <div v-if="showProgress" class="progress-bar">
      <span :style="{ width: `${percentage}%` }"></span>
    </div>
    <span class="progress-text">
      <span class="loading-icon"></span>
      <span v-if="progressText" class="progress-label">{{ progressText }}</span>
    </span>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: absolute;
  z-index: 9999;
  margin: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin: 0 auto;
  border-radius: 20px;

  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.3s;
}

.loading-overlay.is-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.progress-text {
  display: flex;
  align-items: center;
}

.progress-label {
  font-size: 16px;
  color: #409eff;
  margin-left: 10px;
}

.loading-icon {
  background-image: url('../../assets/loading-spin-white.svg');
  background-size: cover;

  display: inline-block;
  animation: spin 0.8s infinite linear;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 6px solid white;
  border-right-color: transparent;
  border-bottom-color: transparent;
  border-top-color: transparent;
}

.progress-bar {
  width: 80%;
  height: 26px;
  margin-bottom: 12px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.15);
  overflow: hidden;
}

.progress-bar span {
  display: block;
  height: 100%;
  background: #409eff;
  transition: width 0.3s;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
}
</style>
