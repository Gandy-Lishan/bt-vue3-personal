# 移动端适配实施文档

## 📋 项目概述

**目标**: 为 SentimenTrader Web 应用添加移动端响应式适配，主要目的是引流到独立 App

**策略**: 最小化网页端移动端维护成本，最大化 App 下载转化

---

## ✅ 已完成工作 (Phase 1)

### 1. 移动端引流组件

#### MobileAppBanner.vue
- **位置**: `src/shared/layout/MobileAppBanner.vue`
- **功能**: 固定底部下载横幅
- **特性**:
  - 仅移动端显示 (`md:hidden`)
  - 渐变背景设计
  - 功能亮点展示
  - 可关闭，localStorage 记忆
  - iOS/Android 深度链接支持

#### MobileAppModal.vue
- **位置**: `src/shared/layout/MobileAppModal.vue`
- **功能**: 首次访问弹窗
- **特性**:
  - 延迟 3 秒显示（用户体验友好）
  - 7 天重复间隔
  - 功能详细介绍
  - 动画过渡效果
  - 直接下载按钮

#### MobileHeader.vue
- **位置**: `src/shared/layout/MobileHeader.vue`
- **功能**: 移动端汉堡菜单导航
- **特性**:
  - 固定顶部定位
  - 汉堡菜单按钮
  - 侧滑抽屉导航
  - 搜索框展开
  - 通知/主题/首页按钮
  - 抽屉内 App 下载提示

### 2. 布局集成

#### AppShell.vue 更新
- 导入移动端组件
- 桌面端/移动端 Header 切换
- 底部安全区域适配 (`pb-20 md:pb-0`)
- 内容区顶部间距适配 (`mt-14 md:mt-0`)

### 3. 样式系统

#### mobile.css
- **位置**: `src/shared/styles/mobile.css`
- **已导入**: `src/shared/styles/index.css`
- **包含**:
  - 全局移动端调整
  - Header 移动端适配
  - 数据表格适配
  - 侧边栏适配
  - 图表适配
  - 过滤器适配
  - Footer 适配
  - App 下载 CTA 组件
  - 页面特定适配
  - 工具类

#### index.html 优化
- Viewport meta 增强
- PWA 支持 meta 标签
- 主题色适配

---

## 🔄 进行中工作 (Phase 2)

### 核心组件适配

#### 1. SentimentHeader.vue (桌面端)
- **状态**: 保留完整功能
- **移动端**: 由 MobileHeader.vue 替代

#### 2. 数据表格组件
需要适配的表格：
- `AppDataTable.vue`
- `IndicatorListTable.vue`
- `SmartScannerTable.vue`
- `StrategyTable.vue`
- `MarketPredictionTable.vue`

**适配策略**:
```vue
<!-- 方案 A: 隐藏次要列 -->
<td class="hidden md:table-cell">...</td>

<!-- 方案 B: 卡片视图切换 -->
<div class="md:hidden">卡片列表</div>
<div class="hidden md:block">表格</div>

<!-- 方案 C: 横向滚动 -->
<div class="overflow-x-auto">...</div>
```

#### 3. 侧边栏组件
需要适配的侧边栏：
- `DetailSearchSidebar.vue`
- Indicators 页面侧边栏
- Strategy 页面侧边栏
- Seasonality 页面侧边栏

**适配策略**:
- `< xl`: 转为抽屉式导航
- 使用 MobileHeader 的抽屉组件
- 共享导航项数据

#### 4. 图表组件
需要适配的图表：
- `IndicatorTrendChart.vue`
- `SeasonalityReturnChart.vue`
- `SmartScannerSignalChart.vue`
- `StrategySignalChart.vue`

**适配策略**:
```css
@media (max-width: 768px) {
  --indicator-chart-height: 350px;
}
```
- 减少图表高度
- 隐藏 Navigator
- 简化工具栏

---

## 📊 页面适配优先级

### P0 - 核心页面 (立即处理)
1. **Dashboard** (`/`)
   - 指标卡片已适配
   - 数据表格需适配

2. **Indicators** (`/indicators`)
   - 侧边栏 → 抽屉
   - 表格 → 卡片/滚动
   - 过滤器 → 折叠

3. **Strategies** (`/strategy`)
   - 侧边栏 → 抽屉
   - 网格布局适配

### P1 - 重要页面
4. **Backtests** (`/backtester`)
5. **Smart Scanner** (`/scannerai`)
6. **Market Prediction** (`/market/predict`)

### P2 - 其他页面
7. **Seasonality** (`/seasonality`)
8. **Correlation** (`/cpm`)
9. **My Stuff** (`/myindicator`)

---

## 🛠️ 技术实施细节

### 响应式断点策略

| 断点 | 尺寸 | 目标设备 | 策略 |
|------|------|----------|------|
| `sm` | 640px | 手机横屏 | 单列布局 |
| `md` | 768px | 平板竖屏 | 双列/抽屉 |
| `lg` | 1024px | 平板横屏 | 部分侧边栏 |
| `xl` | 1280px | 笔记本 | 完整布局 |

### Tailwind 响应式类

```css
/* 隐藏/显示 */
md:hidden          /* 移动端显示，桌面隐藏 */
hidden md:block    /* 桌面显示，移动端隐藏 */

/* 布局 */
grid-cols-1 md:grid-cols-2
flex-col md:flex-row

/* 间距 */
p-4 md:p-6
gap-3 md:gap-6

/* 字体 */
text-sm md:text-base
```

### CSS 变量适配

```css
@media (max-width: 768px) {
  :root {
    --page-gutter: 12px;
    --indicator-chart-height: 350px;
  }
}
```

---

## 📱 App 深度链接实现

### iOS
```typescript
const openIOSApp = () => {
  window.location.href = 'https://apps.apple.com/app/sentimentrader/idYOUR_APP_ID'
}
```

### Android
```typescript
const openAndroidApp = () => {
  // 尝试深度链接
  window.location.href = 'sentimentrader://open'
  // 1.5秒后跳转商店（如果 App 未安装）
  setTimeout(() => {
    window.location.href = 'https://play.google.com/store/apps/details?id=com.sentimentrader'
  }, 1500)
}
```

### 通用下载页
```typescript
const openDownloadPage = () => {
  window.location.href = 'https://sentimentrader.com/download'
}
```

---

## 🧪 测试计划

### 设备测试矩阵

| 设备 | 系统 | 浏览器 | 状态 |
|------|------|--------|------|
| iPhone 14 | iOS 17 | Safari | ⬜ |
| iPhone SE | iOS 16 | Safari | ⬜ |
| iPad Air | iPadOS 17 | Safari | ⬜ |
| Pixel 7 | Android 14 | Chrome | ⬜ |
| Samsung S23 | Android 14 | Chrome | ⬜ |

### 功能测试清单

- [ ] Header 汉堡菜单打开/关闭
- [ ] 抽屉导航滚动流畅
- [ ] 底部横幅显示/关闭
- [ ] 弹窗首次显示
- [ ] 弹窗 7 天重复逻辑
- [ ] 下载按钮深度链接
- [ ] 数据表格横向滚动
- [ ] 图表高度适配
- [ ] 主题切换正常
- [ ] 暗色模式适配

---

## 🚀 部署配置

### Vite 构建优化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 移动端资源优化
        manualChunks: (id) => {
          if (id.includes('mobile')) {
            return 'mobile'
          }
        }
      }
    }
  }
})
```

### PWA 支持 (可选)

```typescript
// vite.config.ts - 添加 PWA 插件
import { VitePWA } from 'vite-plugin-pwa'

plugins: [
  VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'SentimenTrader',
      short_name: 'ST',
      description: 'Market Analysis Platform',
      theme_color: '#006cff',
      icons: [...]
    }
  })
]
```

---

## 📈 后续工作 (Phase 3)

### st_mobile React Native 项目

#### 需要授权访问
```bash
/add-dir /Users/mac/work/st_mobile
```

#### 计划工作
1. 分析现有组件结构
2. 基于 Design System 重构
3. 功能对齐网页端
4. App Store 上架准备

### 设计系统集成

使用 `/design` skill:
1. 创建移动端 Design System
2. 定义组件规范
3. 设计令牌同步

---

## 🎯 关键指标

### 引流转化
- 横幅点击率 (CTR)
- 弹窗转化率
- App 下载量

### 用户体验
- 移动端页面加载时间
- 首屏渲染时间
- 用户停留时间

---

## 📝 变更记录

| 日期 | 变更 | 负责人 |
|------|------|--------|
| 2026-10-13 | Phase 1 完成：引流组件 | Claude Code |
| 2026-10-13 | 创建实施文档 | Claude Code |

---

## 🔗 相关链接

- **Vue3 项目**: `/Users/mac/work/backtestedge-ui-vue3`
- **React Native 项目**: `/Users/mac/work/st_mobile` (待授权)
- **App Store**: `https://apps.apple.com/app/sentimentrader/idYOUR_APP_ID`
- **Play Store**: `https://play.google.com/store/apps/details?id=com.sentimentrader`

---

## 💡 下一步行动

### 立即执行
1. 测试已创建的组件
2. 适配 P0 页面
3. 修复样式问题

### 等待授权
1. 访问 st_mobile 项目
2. 分析 React Native 组件
3. 制定同步策略

### 可选增强
1. 配置 `/design` skill
2. 设置 Figma 集成
3. 添加 PWA 支持
