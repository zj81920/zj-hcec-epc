# 专业字典 + 请购单/订单关联专业 设计

## 概述

在系统中引入"专业"维度，满足工程采购按专业统计报表的需求。专业作为基础数据在公司管理下统一维护，请购单选择专业，采购订单从关联请购单自动继承专业。

---

## 一、数据模型

### 1.1 新增 `Discipline` 模型

```prisma
model Discipline {
  id        String   @id @default(uuid())
  name      String   @unique   // 专业名称：土建、设备、工艺...
  code      String   @unique   // 专业编码：CIVIL、EQUIP、PROCESS...
  sortOrder Int      @default(0)
  status    String   @default("启用")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 1.2 已有模型扩展

| 模型 | 新增字段 | 说明 |
|------|---------|------|
| `PurchaseRequisition` | `discipline String @default("")` | 请购时手动选择 |
| `ProcurementOrder` | `discipline String @default("")` | 从关联请购单自动继承 |

---

## 二、专业字典维护

### 2.1 导航位置

公司管理 → 系统设置 → 基础信息 → 专业

- `/company/settings/basic-info` — 基础信息首页，展示各可配置的基础数据模块入口
- `/company/settings/basic-info/disciplines` — 专业字典管理页

基础信息模块预留扩展位，后续可在此新增其他基础数据配置项。

### 2.2 专业字典管理页

- 路径：`/company/settings/basic-info/disciplines`
- 布局：Topbar + 面包屑 + 居中卡片、表格展示
- 功能：新建、编辑、删除专业
- 字段：
  - **专业名称** — 用户手动输入中文（如"土建"）
  - **专业编码** — 系统自动生成，无需用户输入
  - **排序号** — 手动输入，控制显示顺序
  - **状态** — 启用/停用
- 编码规则：根据中文名称自动生成拼音首字母缩写（如"土建"→"TJ"），使用 `pinyin` 库转换
- 编辑方式：行内编辑（点击编辑后行变为输入框，保存/取消）
- 新建方式：点击"新建专业"按钮添加空白行

### 2.3 初始化数据

首次部署时预置以下专业：
| 专业名称 | 编码 | 排序 |
|---------|------|------|
| 土建 | CIVIL | 1 |
| 设备 | EQUIP | 2 |
| 工艺 | PROCESS | 3 |
| 电气 | ELECTRICAL | 4 |
| 仪表 | INSTRUMENT | 5 |
| 管道 | PIPING | 6 |
| 暖通 | HVAC | 7 |
| 给排水 | PLUMBING | 8 |
| 总图运输 | GENERAL | 9 |
| 结构 | STRUCTURAL | 10 |
| 通信 | TELECOM | 11 |
| 消防 | FIRE | 12 |

---

## 三、请购单/订单关联

### 3.1 请购单新建/编辑页

- 在"采购分类"下方新增"专业"下拉选择
- 数据源：`GET /api/disciplines/list`（默认只返回启用状态的专业）
- 必填：否（允许不选）

### 3.2 采购订单新建页

- 不单独显示专业下拉
- 用户选择请购单后，从请购单数据中读取 `discipline`，自动填入订单
- 订单详情页显示专业字段（只读）

---

## 四、API

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | /api/disciplines | 专业列表（按 sortOrder 排序） |
| POST | /api/disciplines | 新建专业 |
| GET | /api/disciplines/[id] | 专业详情 |
| PUT | /api/disciplines/[id] | 编辑专业 |
| DELETE | /api/disciplines/[id] | 删除专业 |
| GET | /api/disciplines/list | 下拉选择用（仅 id+name+code） |

已有 API 扩展：`POST /api/requisitions`、`PUT /api/requisitions/[id]` 的 schema 已包含 `discipline`

---

## 五、涉及文件清单

- prisma/schema.prisma — 新增 Discipline 模型 + 扩展字段
- prisma/seed.ts — 初始化专业数据
- src/lib/validations.ts — 新增 disciplineSchema
- src/app/api/disciplines/route.ts — 列表+新建
- src/app/api/disciplines/[id]/route.ts — 详情+编辑+删除
- src/app/api/disciplines/list/route.ts — 下拉列表
- src/app/company/settings/basic-info/page.tsx — 基础信息首页
- src/app/company/settings/basic-info/disciplines/page.tsx — 专业字典管理页
- src/app/projects/[id]/procurement/requisitions/new/page.tsx — 新增专业下拉
- src/app/projects/[id]/procurement/requisitions/[reqId]/edit/page.tsx — 新增专业下拉
- src/app/projects/[id]/procurement/orders/new/page.tsx — 从请购单继承专业
- src/app/projects/[id]/procurement/orders/[orderId]/page.tsx — 显示专业

---

## 六、不涉及

- 其他模块（施工、HSE等）的专业关联——后续迭代
- 审批流程中的专业路由——后续迭代
- 专业维度的统计报表——后续迭代
