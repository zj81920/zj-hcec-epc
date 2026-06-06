# 石油化工EPC项目管理系统 — MVP设计文档

> 日期：2026-06-02
> 状态：设计完成，待审阅

---

## 1. 项目概述

### 1.1 目标

开发一套石油化工EPC项目管理系统MVP版本。以"最小可用、快速验证"为原则，覆盖EPC全链路（工程设计、采购、施工、HSE）的核心业务场景，后续逐步扩展为公司级管理平台。

### 1.2 技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| 框架 | Next.js 14 (App Router) | Server Components + Server Actions |
| 语言 | TypeScript 严格模式 | 全量类型覆盖 |
| 样式 | Tailwind CSS | 原子化CSS |
| 组件库 | shadcn/ui | 基于Radix UI，复制源码进项目 |
| ORM | Prisma | 类型安全的数据库操作 |
| 数据库 | PostgreSQL | 本地开发 + 生产 |
| 图标 | lucide-react | shadcn/ui默认图标库 |
| 表单 | react-hook-form + zod | 高性能表单 + 类型校验 |

### 1.3 MVP范围总览

| 模块 | 核心功能 | 路由页面数 |
|------|----------|------------|
| 项目管理 | 项目CRUD | 4 |
| 仪表盘 | 项目概览、进度聚合 | 1 |
| 设计管理 | 文件管理、联络单、会审记录 | 7 |
| 采购管理 | 请购单(主从表)、采购订单(主从表) | 7 |
| 施工管理 | 施工任务跟踪 | 3 |
| HSE管理 | 事故事件、安全检查、培训记录 | 9 |
| 施工资料 | 施工档案分类管理 | 1 |
| **合计** | | **32** |

### 1.4 暂不纳入MVP的内容

- 用户登录与权限管理（后续独立模块）
- 公司级组织架构（后续公司管理平台）
- 合同管理、成本控制、结算
- 供应商管理
- BI报表与数据分析

---

## 2. 架构设计

### 2.1 架构模式：领域驱动模块化单体

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 首页（重定向到 /projects）
│   └── projects/           # 所有业务路由均在此之下
│       ├── page.tsx        # 项目列表
│       ├── new/page.tsx
│       └── [id]/           # 具体项目上下文
│           ├── page.tsx    # 仪表盘
│           ├── edit/page.tsx
│           ├── design/     # 设计模块
│           ├── procurement/# 采购模块
│           ├── construction/# 施工模块
│           └── hse/        # HSE模块
├── components/             # 共享UI + 业务组件
├── lib/                    # 工具库/Prisma/校验
└── types/                  # TypeScript类型
```

### 2.2 组件渲染策略

| 页面类型 | 策略 | 原因 |
|----------|------|------|
| 列表页 | Server Component | Prisma直接查询，无需API |
| 详情页 | Server Component + Client交互区 | 主体服务端渲染 |
| 表单页 | Client Component | react-hook-form需客户端交互 |
| 仪表盘 | Server Component | 聚合数据服务端计算 |

### 2.3 Server Actions vs API Routes

- **优先使用 Server Actions**：表单提交、数据变更直接在Server Component中处理
- **API Routes仅用于**：CSR实时交互场景、外部对接接口

---

## 3. 数据模型

### 3.1 项目 (Project)

```
Project
├── id            (UUID, PK)
├── name          (项目名称)
├── code          (项目编号)
├── type          (项目类型：EPC/E+P+C/EPCM等)
├── location      (建设地点)
├── startDate     (开始日期)
├── endDate       (结束日期)
├── budget        (预算金额)
├── status        (状态：前期/设计/采购/施工/竣工)
├── description   (项目描述)
├── createdAt
└── updatedAt
```

### 3.2 设计模块

```
DesignDocument (设计文件)
├── id            (UUID, PK)
├── projectId     (FK → Project)
├── fileName
├── filePath      (存储路径)
├── fileSize
├── fileType      (pdf/dwg/docx等)
├── discipline    (专业：工艺/配管/结构/电气/仪表/其他)
├── category      (分类：设计图纸/技术规格书/计算书/其他)
├── version       (版本号，默认1)
├── uploadedBy
├── uploadedAt
└── project       (关联Project)

DesignLiaison (设计联络单)
├── id            (UUID, PK)
├── projectId     (FK → Project)
├── liaisonNo     (联络单号)
├── title
├── sender        (发出方)
├── receiver      (接收方)
├── content       (联络内容)
├── replyContent  (回复内容，可空)
├── status        (待回复/已回复/已关闭)
├── createdAt
├── repliedAt
└── project       (关联Project)
  + attachments   (关联DesignDocument，多对多)

DesignReview (设计会审记录)
├── id            (UUID, PK)
├── projectId     (FK → Project)
├── reviewNo      (会审编号)
├── title
├── reviewDate    (会审日期)
├── participants  (参会人员)
├── conclusions   (会审结论)
├── createdAt
└── project       (关联Project)
  + attachments   (关联DesignDocument，多对多)
```

### 3.3 采购模块

**采购流程：请购单 → 采购订单。价格仅在采购订单中体现。**

```
PurchaseRequisition (请购单主表)
├── id            (UUID, PK)
├── projectId     (FK → Project)
├── reqNo         (请购单号)
├── reqDate       (请购日期)
├── requester     (申请人)
├── status        (草稿/已提交/已审批/已生成订单)
├── remark        (备注)
├── createdAt
├── updatedAt
└── project       (关联Project)
  + items         (一对多 → RequisitionItem)

RequisitionItem (请购单明细 — 不含价格)
├── id            (UUID, PK)
├── requisitionId (FK → PurchaseRequisition)
├── materialName  (物料名称)
├── specification (规格型号)
├── quantity      (数量)
├── unit          (单位)
├── purpose       (用途)
├── status        (待采购/已采购)
└── requisition   (关联PurchaseRequisition)

ProcurementOrder (采购订单主表)
├── id            (UUID, PK)
├── projectId     (FK → Project)
├── orderNo       (订单号)
├── requisitionId (FK → PurchaseRequisition)
├── supplier      (供应商)
├── orderDate     (下单日期)
├── deliveryDate  (交货日期)
├── totalAmount   (总金额，orderItems求和)
├── status        (待确认/已下单/部分到货/全部到货)
├── remark        (备注)
├── createdAt
├── updatedAt
└── project       (关联Project)
  + items         (一对多 → OrderItem)

OrderItem (采购订单明细 — 含价格)
├── id            (UUID, PK)
├── orderId       (FK → ProcurementOrder)
├── requisitionItemId (FK → RequisitionItem，来源追溯)
├── materialName
├── specification
├── quantity
├── unit
├── unitPrice     (单价)
├── totalAmount   (小计 = quantity * unitPrice)
├── order         (关联ProcurementOrder)
└── requisitionItem (关联RequisitionItem)
```

### 3.4 施工模块

```
ConstructionTask (施工任务)
├── id            (UUID, PK)
├── projectId     (FK → Project)
├── taskName      (任务名称)
├── workArea      (施工区域/单元)
├── planStartDate
├── planEndDate
├── actualEndDate
├── progress      (完成百分比 0-100)
├── contractor    (承包商/施工队)
├── status        (待施工/施工中/已完成/已验收)
├── remark        (备注)
├── createdAt
├── updatedAt
└── project       (关联Project)
```

### 3.5 施工资料

```
ConstructionDoc (施工资料)
├── id            (UUID, PK)
├── projectId     (FK → Project)
├── docNo         (资料编号)
├── docName       (资料名称)
├── category      (分类：施工日志/检验批/材料报验/隐蔽工程/试验报告/竣工图/其他)
├── relatedTask   (关联施工任务，可选)
├── filePath      (存储路径)
├── fileSize
├── uploadedAt
├── uploadedBy
└── project       (关联Project)
```

### 3.6 HSE模块

```
HSEIncident (事故事件记录)
├── id            (UUID, PK)
├── projectId     (FK → Project)
├── incidentNo    (事故编号)
├── incidentDate
├── location      (事发地点)
├── type          (类型：人身伤害/火灾/泄漏/未遂/其他)
├── severity      (严重程度：轻微/一般/重大)
├── description   (事件经过)
├── cause         (原因分析)
├── correctiveAction (纠正措施)
├── status        (已关闭/处理中)
├── createdAt
├── updatedAt
└── project       (关联Project)
  + attachments   (关联设计文件/现场照片等)

HSEInspection (安全检查记录)
├── id            (UUID, PK)
├── projectId     (FK → Project)
├── inspectionDate
├── inspector     (检查人)
├── area          (检查区域)
├── findings      (发现问题)
├── rectification (整改要求)
├── deadline      (整改期限)
├── status        (待整改/已整改/已复查)
├── createdAt
├── updatedAt
└── project       (关联Project)
  + attachments   (关联检查照片等)

HSETraining (安全培训记录)
├── id            (UUID, PK)
├── projectId     (FK → Project)
├── trainingDate
├── topic         (培训主题)
├── trainer       (培训人/讲师)
├── location      (培训地点)
├── participantCount (参训人数)
├── participants  (参训人员名单)
├── content       (培训内容摘要)
├── createdAt
└── project       (关联Project)
  + attachments   (关联培训课件/签到表等)
```

### 3.7 通用实体

```
Milestone (进度里程碑)
├── id            (UUID, PK)
├── projectId     (FK → Project)
├── name          (里程碑名称)
├── plannedDate
├── actualDate    (可空)
├── weight        (权重百分比)
├── status        (未开始/已完成)
├── sortOrder
└── project       (关联Project)
```

---

## 4. 路由设计

### 4.1 完整路由表

```
/                                                    → 重定向 /projects
/projects                                            → 项目列表（首页）
/projects/new                                        → 新建项目
/projects/[id]                                       → 项目仪表盘
/projects/[id]/edit                                  → 编辑项目信息

/projects/[id]/design                                → 设计文件库
/projects/[id]/design/upload                         → 上传设计文件
/projects/[id]/design/liaisons                       → 设计联络单列表
/projects/[id]/design/liaisons/new                   → 新建联络单
/projects/[id]/design/liaisons/[liaId]               → 联络单详情
/projects/[id]/design/reviews                        → 设计会审记录列表
/projects/[id]/design/reviews/new                    → 新建会审记录
/projects/[id]/design/reviews/[revId]                → 会审记录详情

/projects/[id]/procurement                           → 采购管理入口
/projects/[id]/procurement/requisitions              → 请购单列表
/projects/[id]/procurement/requisitions/new          → 新建请购单（主表+明细表）
/projects/[id]/procurement/requisitions/[reqId]      → 请购单详情
/projects/[id]/procurement/orders                    → 采购订单列表
/projects/[id]/procurement/orders/new                → 新建采购订单（从请购明细生成）
/projects/[id]/procurement/orders/[orderId]          → 采购订单详情

/projects/[id]/construction                          → 施工任务列表
/projects/[id]/construction/new                      → 新增施工任务
/projects/[id]/construction/[taskId]                 → 施工任务详情
/projects/[id]/construction/docs                     → 施工资料列表
/projects/[id]/construction/docs/upload              → 上传施工资料

/projects/[id]/hse                                   → HSE概览
/projects/[id]/hse/incidents                         → 事故事件列表
/projects/[id]/hse/incidents/new                     → 记录事故事件
/projects/[id]/hse/incidents/[incId]                 → 事故事件详情
/projects/[id]/hse/inspections                       → 安全检查列表
/projects/[id]/hse/inspections/new                   → 新增检查记录
/projects/[id]/hse/inspections/[insId]               → 检查记录详情
/projects/[id]/hse/trainings                         → 培训记录列表
/projects/[id]/hse/trainings/new                     → 新增培训记录
/projects/[id]/hse/trainings/[traId]                 → 培训记录详情
```

### 4.2 导航布局

```
┌──────────────────────────────────────────────────┐
│  LOGO   项目列表  │  [当前项目名称 ▾]          │  ← 顶部导航
├──────────────────────────────────────────────────┤
│ ┌────────────┐                                   │
│ │ 📊 概览     │                                   │
│ │ 📐 设计     │      [页面内容区]                  │
│ │ 📦 采购     │                                   │
│ │ 🏗️ 施工    │                                   │
│ │ 🦺 HSE     │                                   │
│ └────────────┘                                   │
│                    ← 项目内左侧子导航              │
└──────────────────────────────────────────────────┘
```

---

## 5. 文件存储方案

### 5.1 存储抽象层设计

采用策略模式实现存储抽象，MVP阶段使用本地磁盘，后续可无缝切换至阿里云OSS/腾讯云COS等：

```typescript
// 存储抽象接口
interface StorageProvider {
  upload(file: File, path: string): Promise<{ url: string; path: string }>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
  getSignedUrl?(path: string, expiresIn: number): Promise<string>;
}

// 本地存储实现（MVP）
class LocalStorage implements StorageProvider { ... }

// OSS存储实现（后续切换）
class OSSStorage implements StorageProvider { ... }

// 按环境配置切换
export const storage: StorageProvider =
  process.env.STORAGE_PROVIDER === 'oss'
    ? new OSSStorage()
    : new LocalStorage();
```

### 5.2 本地文件组织

```
storage/
└── projects/
    └── {projectId}/
        ├── design/
        │   ├── drawings/       # 设计图纸
        │   │   ├── process/    # 工艺
        │   │   ├── piping/     # 配管
        │   │   ├── structure/  # 结构
        │   │   ├── electrical/ # 电气
        │   │   └── instrument/ # 仪表
        │   ├── specs/          # 技术规格书
        │   ├── calcs/          # 计算书
        │   └── others/         # 其他
        ├── construction/       # 施工资料
        └── hse/                # HSE附件
```

### 5.3 文件版本管理

同文件更新时，原文件保留为历史版本：`{uuid}_v{n-1}.{ext}`，新文件 `{uuid}.{ext}`，`DesignDocument.version` 自增。

---

## 6. 目录结构

```
zj-hcec-epc/
├── prisma/
│   └── schema.prisma              # 全部数据模型定义
├── src/
│   ├── app/
│   │   ├── layout.tsx             # 根布局
│   │   ├── page.tsx               # 首页（重定向）
│   │   ├── projects/
│   │   │   ├── page.tsx           # 项目列表
│   │   │   ├── new/page.tsx       # 新建项目
│   │   │   └── [id]/
│   │   │       ├── page.tsx               # 项目概览仪表盘
│   │   │       ├── edit/page.tsx          # 编辑项目
│   │   │       ├── design/
│   │   │       │   ├── page.tsx           # 设计文件库
│   │   │       │   ├── upload/page.tsx    # 上传设计文件
│   │   │       │   ├── liaisons/
│   │   │       │   │   ├── page.tsx       # 联络单列表
│   │   │       │   │   ├── new/page.tsx   # 新建联络单
│   │   │       │   │   └── [liaId]/page.tsx
│   │   │       │   └── reviews/
│   │   │       │       ├── page.tsx       # 会审记录列表
│   │   │       │       ├── new/page.tsx   # 新建会审记录
│   │   │       │       └── [revId]/page.tsx
│   │   │       ├── procurement/
│   │   │       │   ├── page.tsx           # 采购管理入口
│   │   │       │   ├── requisitions/
│   │   │       │   │   ├── page.tsx       # 请购单列表
│   │   │       │   │   ├── new/page.tsx   # 新建请购单
│   │   │       │   │   └── [reqId]/page.tsx
│   │   │       │   └── orders/
│   │   │       │       ├── page.tsx       # 订单列表
│   │   │       │       ├── new/page.tsx   # 新建采购订单
│   │   │       │       └── [orderId]/page.tsx
│   │   │       ├── construction/
│   │   │       │   ├── page.tsx           # 施工任务列表
│   │   │       │   ├── new/page.tsx       # 新增施工任务
│   │   │       │   ├── [taskId]/page.tsx  # 施工任务详情
│   │   │       │   └── docs/
│   │   │       │       ├── page.tsx       # 施工资料列表
│   │   │       │       └── upload/page.tsx# 上传施工资料
│   │   │       └── hse/
│   │   │           ├── page.tsx           # HSE概览
│   │   │           ├── incidents/
│   │   │           │   ├── page.tsx
│   │   │           │   ├── new/page.tsx
│   │   │           │   └── [incId]/page.tsx
│   │   │           ├── inspections/
│   │   │           │   ├── page.tsx
│   │   │           │   ├── new/page.tsx
│   │   │           │   └── [insId]/page.tsx
│   │   │           └── trainings/
│   │   │               ├── page.tsx
│   │   │               ├── new/page.tsx
│   │   │               └── [traId]/page.tsx
│   │   └── api/                     # API路由（仅必要时）
│   ├── components/
│   │   ├── ui/                      # shadcn/ui基础组件
│   │   ├── layout/                  # 布局组件
│   │   │   ├── sidebar.tsx          # 项目子导航
│   │   │   └── topbar.tsx           # 顶部导航
│   │   ├── projects/                # 项目业务组件
│   │   ├── design/                  # 设计业务组件
│   │   ├── procurement/             # 采购业务组件
│   │   │   ├── requisition-form.tsx        # 请购单表单
│   │   │   ├── requisition-items.tsx       # 明细行动态编辑器
│   │   │   ├── order-form.tsx              # 订单表单
│   │   │   └── order-items.tsx             # 订单明细编辑器
│   │   ├── construction/            # 施工业务组件
│   │   └── hse/                     # HSE业务组件
│   ├── lib/
│   │   ├── db.ts                    # Prisma客户端单例
│   │   ├── utils.ts                 # 通用工具函数
│   │   ├── validations.ts           # Zod校验schema
│   │   └── storage/                 # 文件存储抽象层
│   │       ├── types.ts             # 存储接口定义
│   │       ├── local.ts             # 本地存储实现
│   │       └── index.ts             # 统一导出
│   └── types/                       # 通用TypeScript类型
├── storage/                         # 本地文件存储目录（gitignore）
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── .env                             # 环境变量
```

---

## 7. 仪表盘设计

进入项目后的首页，聚合展示以下内容：

```
┌─────────────────────────────────────────────────────────┐
│  📊 XX石化项目 概览                  [编辑项目]          │
├──────────────────────────┬──────────────────────────────┤
│  基本信息卡片             │  整体进度环形图              │
│  - 项目编号/起止日期      │  设计/采购/施工完成率        │
│  - 预算金额               │                              │
├──────────────────────────┴──────────────────────────────┤
│  里程碑时间轴                                            │
├─────────────────────────────────────────────────────────┤
│  快捷入口卡片                                            │
│  [📐 设计文件库] [📦 请购单] [📋 采购订单]               │
│  [🏗️ 施工任务] [🦺 HSE管理]                              │
└─────────────────────────────────────────────────────────┘
```

仪表盘数据全部在Server Component中通过Prisma聚合查询后渲染。

---

## 8. 非功能需求

| 需求 | 方案 |
|------|------|
| 类型安全 | TypeScript严格模式 + Prisma自动类型生成 |
| 表单校验 | Zod schema，前端 + Server Action双重校验 |
| 文件上传 | Server Action接收，存储抽象层，MVP本地磁盘 |
| 错误处理 | error.tsx边界处理 + 统一toast提示 |
| 响应式 | Tailwind CSS响应式断点，优先桌面端 |
| 后续扩展 | 存储抽象层切换OSS；模块化结构扩展新功能 |
