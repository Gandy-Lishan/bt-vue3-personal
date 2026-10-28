# SentimenTrader - Claude Code 项目指南

> 最后更新：2026-10-13

---

## 🎨 设计 Token（必须遵守）

### 颜色系统

**品牌主色**
- Primary: `#006cff` (Light) / `#61b4ff` (Dark)
- Primary Hover: `#2d8cff` (Light) / `#8dccff` (Dark)
- Primary Soft BG: `#eaf4ff` (Light) / `#102b46` (Dark)

**语义色**
- Positive/成功: `#047857` (Light) / `#34d399` (Dark)
- Negative/错误: `#be123c` (Light) / `#fb7185` (Dark)
- Favorite/收藏: `#eab308` (Light) / `#facc15` (Dark)
- Accent/辅助: `#7c3aed` (Light) / `#a78bfa` (Dark)

**背景色**
- Page BG: `#f6fbff` (Light) / `#07111f` (Dark)
- Surface/卡片: `#ffffff` (Light) / `#0f1b2b` (Dark)
- Surface Muted: `#f6faff` (Light) / `#142337` (Dark)

**边框色**
- Border: `#d5e3f7` (Light) / `#29445f` (Dark)
- Border Muted: `#e5eef9` (Light) / `#20354e` (Dark)
- Border Strong: `#c7d9f4` (Light) / `#3a5672` (Dark)

**文字色**
- Text: `#071b4f` (Light) / `#f0f7ff` (Dark)
- Text Secondary: `#173267` (Light) / `#d8e8ff` (Dark)
- Text Muted: `#6f7fa8` (Light) / `#9fb2cc` (Dark)

### 字体

- **字族**: `Inter, ui-sans-serif, system-ui, -apple-system, sans-serif`
- **基础字号**: `87.5%` (14px)
- **UI 元素字号**: `0.8125rem` (13px)

### 间距

- **基础单位**: 4px
- **Page Gutter**: `32px` (默认), `16px` (<640px), `48px` (≥1280px)
- **图表高度**: `680px` (桌面), `350px` (移动端 <768px)

### 完整设计令牌

详见 `DESIGN_TOKENS.md` - 生成任何 UI 组件时必须使用这些 Token，**不要硬编码颜色值**。

---

## 📁 项目结构

### Vue3 Web 端 (`/Users/mac/work/backtestedge-ui-vue3`)

```
src/
├── app/
│   └── router/          # 路由配置
├── pages/               # 页面组件
│   ├── dashboard/       # 仪表板
│   ├── indicators/      # 指标列表 + 详情
│   ├── strategy/        # 策略
│   ├── scanner/         # 智能扫描器
│   ├── seasonality/     # 季节性分析
│   └── market/          # 市场预测
├── shared/
│   ├── layout/          # 布局组件
│   │   ├── AppShell.vue
│   │   ├── SentimentHeader.vue
│   │   ├── SentimentFooter.vue
│   │   ├── MobileHeader.vue      # 移动端 Header
│   │   ├── MobileAppBanner.vue   # 移动端下载横幅
│   │   └── MobileAppModal.vue    # 移动端下载弹窗
│   ├── ui/              # 共享 UI 组件
│   ├── styles/
│   │   ├── index.css    # 主样式 + 设计 Token
│   │   └── mobile.css   # 移动端适配样式
│   └── theme/           # 主题管理
└── entities/            # 业务实体
```

### React Native App (`/Users/mac/work/st_mobile`)

```
src/
├── components/          # UI 组件
├── screens/             # 页面
├── navigation/          # 导航
├── utils/               # 工具函数
└── theme/               # 主题（待创建，需与 Web 端 Token 对齐）
```

---

## 🛠️ 技术栈

### Vue3 Web 端
- **框架**: Vue 3.5 + TypeScript
- **构建**: Vite 8.3
- **CSS**: Tailwind CSS v4 + 自定义 CSS 变量
- **路由**: Vue Router 4.6
- **状态**: Pinia
- **图表**: Highcharts 13
- **图标**: @lucide/vue
- **搜索**: Algoliasearch

### React Native App
- **框架**: React Native
- **测试**: Jest + Maestro E2E
- **语言**: TypeScript

---

## 📱 移动端适配策略

### 断点
- `sm`: 640px (手机横屏)
- `md`: 768px (平板竖屏)
- `lg`: 1024px (平板横屏)
- `xl`: 1280px (笔记本 - 完整布局)

### 适配规则
1. **Header**: `< md` 时显示汉堡菜单 + 抽屉导航
2. **侧边栏**: `< xl` 时转为抽屉组件
3. **过滤器**: `< xl` 时折叠为手风琴模式
4. **表格**: 横向滚动或自动切换卡片视图
5. **图表**: 高度降至 `350px`，简化导航器
6. **底部 Banner**: 固定显示 App 下载引导，`pb-20` 留白

### 引流组件
- **MobileAppBanner**: 固定底部下载横幅（可关闭）
- **MobileAppModal**: 首次访问弹窗（7 天重复）
- **MobileHeader**: 汉堡菜单导航

---

## 🚀 开发工作流

### 启动开发服务器
```bash
npm run dev
```

### 构建
```bash
npm run build
```

### 类型检查
```bash
npm run typecheck
```

### 测试
```bash
npm run test:unit     # 单元测试
npm run test:e2e      # E2E 测试
```

---

## 📋 Claude Code 生成代码规范

### 必须遵守
1. **使用 CSS 变量** - 永远不要硬编码颜色值，使用 `var(--app-*)` 或 `var(--chrome-*)`
2. **响应式优先** - 新组件必须包含 `md:` `lg:` `xl:` 断点适配
3. **Tailwind 类名** - 优先使用 Tailwind，复杂样式才用 scoped CSS
4. **TypeScript** - 所有组件必须有类型定义
5. **组件命名** - PascalCase，如 `MobileAppBanner.vue`

### 推荐做法
1. **暗色模式** - 自动跟随 `:root[data-theme='dark']`
2. **触摸目标** - 移动端按钮最小 `44x44px`
3. **加载状态** - 表格/图表要有 loading 状态
4. **空状态** - 数据为空时显示友好提示
5. **ChartIQ 表单加载状态** - 加载指标期间**禁用表单元素**（input/select/SearchSelect/button 加 `:disabled="chartIQStore.isCreateLoading"`），不使用全屏遮罩，用户可见表单但不可编辑

---

## 🔄 双端同步规范

### Web → App 功能对齐
- App 端功能应与 Web 端核心功能一致
- 数据通过相同 API 获取
- 品牌色、字体、间距完全对齐

### 共享概念
- 指标 (Indicator)
- 策略 (Strategy)
- 信号 (Signal)
- 扫描器 (Scanner)
- 季节性 (Seasonality)

---

## 📝 变更记录

| 日期 | 变更 |
|------|------|
| 2026-10-13 | 初始移动端适配框架完成 |
| 2026-10-13 | 创建 CLAUDE.md + DESIGN_TOKENS.md |
