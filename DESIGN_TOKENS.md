# SentimenTrader Design Tokens

> 设计令牌系统 - Vue3 Web 端和 React Native App 端共享的品牌规范

---

## 🎨 颜色系统

### 品牌主色

| Token | Light Mode | Dark Mode | 用途 |
|-------|-----------|-----------|------|
| `--app-primary` | `#006cff` | `#61b4ff` | 品牌主色、按钮、链接 |
| `--app-primary-hover` | `#2d8cff` | `#8dccff` | 悬停状态 |
| `--app-primary-soft` | `#eaf4ff` | `#102b46` | 软背景（选中） |
| `--app-primary-soft-alt` | `#eef4ff` | `#132f4d` | 软背景（备选） |
| `--app-primary-shadow` | `rgba(45,140,255,0.28)` | `rgba(97,180,255,0.22)` | 阴影 |

### 语义色

| Token | Light Mode | Dark Mode | 用途 |
|-------|-----------|-----------|------|
| `--app-positive` | `#047857` | `#34d399` | 成功、积极 |
| `--app-negative` | `#be123c` | `#fb7185` | 错误、警告 |
| `--app-favorite` | `#eab308` | `#facc15` | 收藏（黄色星） |
| `--app-accent` | `#7c3aed` | `#a78bfa` | 辅助色（紫色） |

### 背景色

| Token | Light Mode | Dark Mode | 用途 |
|-------|-----------|-----------|------|
| `--app-bg` | `#f6fbff` | `#07111f` | 页面主背景 |
| `--app-bg-muted` | `#f4f7fb` | `#0b1422` | 页面次背景 |
| `--app-surface` | `#ffffff` | `#0f1b2b` | 卡片、容器表面 |
| `--app-surface-muted` | `#f6faff` | `#142337` | 次表面 |
| `--app-surface-soft` | `#f8fbff` | `#0c1727` | 软表面 |
| `--app-surface-hover` | `#edf5ff` | `#172b44` | 悬停表面 |
| `--app-row-even` | `#f4f7fb` | `#0b1626` | 表格偶数行 |

### 边框色

| Token | Light Mode | Dark Mode | 用途 |
|-------|-----------|-----------|------|
| `--app-border` | `#d5e3f7` | `#29445f` | 主边框 |
| `--app-border-muted` | `#e5eef9` | `#20354e` | 次边框 |
| `--app-border-strong` | `#c7d9f4` | `#3a5672` | 强调边框 |

### 文字色

| Token | Light Mode | Dark Mode | 用途 |
|-------|-----------|-----------|------|
| `--app-text` | `#071b4f` | `#f0f7ff` | 主文字 |
| `--app-text-secondary` | `#173267` | `#d8e8ff` | 次文字 |
| `--app-text-muted` | `#6f7fa8` | `#9fb2cc` | 弱化文字 |
| `--app-text-subtle` | `#506184` | `#b5c4d9` | 微妙文字 |
| `--app-text-faint` | `#8aa0c4` | `#7890ad` | 淡文字 |

### Chrome（Header/Footer）

| Token | Light Mode | Dark Mode | 用途 |
|-------|-----------|-----------|------|
| `--chrome-bg` | `#ffffff` | `#030915` | 导航栏背景 |
| `--chrome-border` | `#dbe5f2` | `#172b44` | 导航栏边框 |
| `--chrome-accent` | `#006cff` | `#61b4ff` | 导航栏强调色 |
| `--chrome-text` | `#071b4f` | `#ffffff` | 导航栏文字 |
| `--chrome-hover` | `rgba(0,108,255,0.08)` | `rgba(255,255,255,0.1)` | 导航栏悬停 |

### 图表色

| Token | Light Mode | Dark Mode | 用途 |
|-------|-----------|-----------|------|
| `--chart-grid` | `#dbe5f2` | `#263b55` | 图表网格 |
| `--chart-primary` | `#111827` | `#f0f7ff` | 图表主色 |
| `--chart-flag-true` | `#ff0000` | `#ff4d4d` | 图表标记（真） |
| `--chart-flag-false` | `#000000` | `#ffffff` | 图表标记（假） |

---

## 📐 间距系统

### 基础单位：4px

| Tailwind | 值 | 用途 |
|----------|-----|------|
| `1` | 4px | 微小间距 |
| `2` | 8px | 小组件间距 |
| `3` | 12px | 组件内间距 |
| `4` | 16px | 标准间距 |
| `5` | 20px | 中等间距 |
| `6` | 24px | 大间距 |
| `8` | 32px | 区块间距 |

### Page Gutter（响应式）

| 断点 | Gutter | 说明 |
|------|--------|------|
| `< 640px` | `16px` | 手机 |
| 默认 | `32px` | 笔记本 |
| `≥ 1280px` | `48px` | 桌面 |
| `≥ 1536px` | `64px` | 大桌面 |
| `≥ 1920px` | `72px` | 超大屏 |

---

## 🔤 字体系统

### 字体族

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### 字号基准

| 场景 | 值 | 说明 |
|------|-----|------|
| 基础字号 | `87.5%` (14px) | 适合笔记本屏幕 |
| `≥ 1920px` | `100%` (16px) | 大屏放大 |
| `≥ 2560px` | `137.5%` | 超大屏放大 |
| `≥ 3000px` | `200%` | 4K 屏放大 |

### 字号层级

| 用途 | 大小 | 字重 | 示例 |
|------|------|------|------|
| 标题 | `1.05rem` (~15px) | `400` | Footer 标题 |
| 小标题 | `0.86rem` (~12px) | `600` | Footer 小标题 |
| 正文 | `0.82rem` (~11.5px) | `400` | 正文 |
| 小字 | `0.78rem` (~11px) | `400` | 版权信息等 |
| UI 元素 | `0.8125rem` (13px) | `700` | 按钮、标签 |
| 微小字 | `0.75rem` (12px) | `700` | 辅助说明 |

---

## 📱 移动端适配规范

### 断点

| 断点 | 尺寸 | 目标 |
|------|------|------|
| `sm` | 640px | 手机横屏 |
| `md` | 768px | 平板竖屏 |
| `lg` | 1024px | 平板横屏 |
| `xl` | 1280px | 笔记本（完整布局） |

### 移动端规则

1. **图表高度**: `< 768px` 时设为 `350px`（桌面 `680px`）
2. **侧边栏**: `< xl` 时转为抽屉
3. **过滤器**: `< xl` 时折叠为手风琴
4. **表格**: 横向滚动或卡片视图
5. **底部 Banner**: 固定底部，`pb-20` 留空间

---

## 🎯 组件规范

### 按钮

| 状态 | 背景 | 文字 | 边框 |
|------|------|------|------|
| 默认 | `--app-primary` | `white` | 无 |
| 悬停 | `--app-primary-hover` | `white` | 无 |
| 软按钮 | `--app-primary-soft` | `--app-primary` | `--app-border-strong` |
| 幽灵 | 透明 | `--app-text-secondary` | `--app-border` |

### 卡片

| 属性 | Light | Dark |
|------|-------|------|
| 背景 | `--app-surface` | `--app-surface` |
| 边框 | `--app-border` | `--app-border` |
| 圆角 | `8px` | `8px` |
| 阴影 | `0 1px 3px rgba(0,0,0,0.1)` | `0 1px 3px rgba(0,0,0,0.3)` |

### 输入框

| 属性 | 值 |
|------|-----|
| 背景 | `--chrome-field-bg` |
| 边框 | `--chrome-field-border` |
| 文字 | `--app-text` |
| 占位符 | `--app-text-muted` |
| 高度 | `36px` (标准), `40px` (移动端) |

---

## 📲 React Native App 映射

### 颜色映射

```typescript
// st_mobile/src/theme/colors.ts
export const colors = {
  light: {
    primary: '#006cff',
    primaryHover: '#2d8cff',
    primarySoft: '#eaf4ff',
    background: '#f6fbff',
    surface: '#ffffff',
    text: '#071b4f',
    textSecondary: '#173267',
    textMuted: '#6f7fa8',
    border: '#d5e3f7',
    positive: '#047857',
    negative: '#be123c',
    favorite: '#eab308',
    accent: '#7c3aed',
  },
  dark: {
    primary: '#61b4ff',
    primaryHover: '#8dccff',
    primarySoft: '#102b46',
    background: '#07111f',
    surface: '#0f1b2b',
    text: '#f0f7ff',
    textSecondary: '#d8e8ff',
    textMuted: '#9fb2cc',
    border: '#29445f',
    positive: '#34d399',
    negative: '#fb7185',
    favorite: '#facc15',
    accent: '#a78bfa',
  }
}
```

### 间距映射

```typescript
// st_mobile/src/theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
}
```

### 字体映射

```typescript
// st_mobile/src/theme/typography.ts
export const typography = {
  fontFamily: 'Inter',
  sizes: {
    xs: 11,
    sm: 12,
    md: 13,
    base: 14,
    lg: 15,
    xl: 16,
    '2xl': 18,
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
}
```

---

## 🔄 更新记录

| 日期 | 变更 | 负责人 |
|------|------|--------|
| 2026-10-13 | 初始设计令牌提取 | Claude Code |

---

## 📁 相关文件

- **Vue3 CSS**: `src/shared/styles/index.css`
- **移动端 CSS**: `src/shared/styles/mobile.css`
- **React Native 主题**: `st_mobile/src/theme/` (待创建)
- **CLAUDE.md**: 项目根目录
