# AI 模型配置 · 系统设置集成设计

## 概述

将当前位于独立路径 `/settings/ai-models` 的 AI 模型配置页面，整合到公司管理 → 系统设置（`/company/settings/`）下，作为系统设置的一个子功能模块。

## 背景

- AI 模型配置功能已完整实现（Prisma 数据模型、CRUD API、表单组件、配置管理页面）
- 配置页面当前位于 `/settings/ai-models`，从系统设置（`/company/settings/basic-info`）无法访问
- 需要在系统设置仪表板增加入口，并将页面移到系统设置路径下

## 设计方案

### 导航结构（不变）

顶栏「公司管理」→「系统设置」仍链接到 `/company/settings/basic-info`，不修改顶栏导航逻辑。

### 系统设置仪表板 — 增加入口卡片

文件：`src/app/company/settings/basic-info/page.tsx`

在现有的「专业字典」卡片旁增加「AI 模型配置」卡片：

| 卡片 | 图标 | 描述 | 链接 |
|------|------|------|------|
| 专业字典 | 📖 BookOpen | 管理和维护专业编码及名称数据 | `/company/settings/basic-info/disciplines` |
| AI 模型配置 | 🤖 Bot | 配置 AI 接口提供商、API Key、模型参数等 | `/company/settings/ai-models` |

### AI 模型配置子页面 — 路径迁移

新建页面文件：`src/app/company/settings/ai-models/page.tsx`

将现有 `src/app/settings/ai-models/page.tsx` 的内容迁移到新路径，调整：
- 页面标题文案统一
- Breadcrumb 路径为「公司管理 > 系统设置 > AI 模型配置」
- 引入 Topbar 组件保持一致布局

### 旧路径兼容

保留 `/settings/ai-models` 路径，将其改为重定向到 `/company/settings/ai-models`，避免已有书签失效。

### 布局规范

系统设置下的子页面统一使用：
- `Topbar` 顶栏导航
- `max-w-4xl mx-auto` 居中内容区
- Breadcrumb 面包屑导航

### 不变的部分

以下内容不做任何改动：
- Prisma 数据模型 `AiModelConfig`
- 所有 API 路由 `/api/settings/ai-models/*`
- AI 客户端层 `src/lib/ai/*`
- 表单组件 `src/components/ai-model-form.tsx`
- API Key 加解密 `src/lib/crypto.ts`

## 变更文件清单

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| 修改 | `src/app/company/settings/basic-info/page.tsx` | 新增「AI 模型配置」入口卡片 |
| 新建 | `src/app/company/settings/ai-models/page.tsx` | 配置管理页面 |
| 新建 | `src/app/company/settings/ai-models/layout.tsx` | (可选) 子页面布局 |
| 修改 | `src/app/settings/ai-models/page.tsx` | 改为重定向到新路径 |
| 删除 | `temp-ui-mockup.html` | 临时 mockup 文件 |

## 设计意图

- **最小改动**：只涉及前端页面位置调整和导航入口，不修改任何业务逻辑
- **路径统一**：所有系统设置功能都放在 `/company/settings/` 下，便于后续扩展
- **向后兼容**：旧路径保留重定向，不影响已保存的书签或直接访问
