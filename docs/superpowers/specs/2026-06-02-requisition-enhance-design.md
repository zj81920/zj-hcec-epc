# 请购单增强设计

## 1. 概述

对现有请购单模块进行业务字段扩展和状态管理优化，补齐 EPC 采购场景的核心信息缺口，同时引入剩余量追踪和自动关闭机制。

### 涉及模块

- 采购管理 → 请购单（新建/列表/详情）
- 采购管理 → 采购订单（新建时过滤已关闭请购单）

---

## 2. 数据模型变更

### 2.1 PurchaseRequisition（请购单主表）

| 字段 | 类型 | 改动 | 说明 |
|------|------|------|------|
| reqNo | String | - | 请购单号（已有） |
| reqDate | DateTime | - | 请购日期（已有） |
| requester | String | - | 申请人（已有） |
| status | String | **状态值扩展** | 草稿/已提交/已审批/部分采购/已关闭 |
| remark | String | - | 备注（已有） |
| **procurementCategory** | String | **新增** | 采购分类：设备/材料/服务/其他 |
| **demandType** | String | **新增** | 需求类型：正常采购/紧急采购/补单 |
| **expectedArrivalDate** | DateTime? | **新增** | 期望到货日期（可空） |

### 2.2 RequisitionItem（请购明细表）

| 字段 | 类型 | 改动 | 说明 |
|------|------|------|------|
| materialName | String | - | 物料名称（已有） |
| specification | String | - | 规格型号（已有） |
| quantity | Float | - | 请购数量（已有） |
| unit | String | - | 单位（已有） |
| purpose | String | - | 用途（已有） |
| status | String | **改为自动计算** | 待采购/部分采购/已采购 |
| **materialCode** | String | **新增** | 物料编码 |
| **material** | String | **新增** | 材质（如：碳钢、不锈钢） |
| **materialGrade** | String | **新增** | 材料牌号（如：Q235B、304） |
| **applicableStandard** | String | **新增** | 适用标准规范（如：GB/T 8163） |
| **requiredDate** | DateTime? | **新增** | 明细级需求日期（可空） |

---

## 3. 状态管理与自动关闭

### 3.1 请购单状态流转

```
草稿 ──提交──→ 已提交 ──审批──→ 已审批 ──首次生成订单──→ 部分采购 ──→ 已关闭（自动）
```

- **草稿**：可自由编辑，未进入流程
- **已提交**：已提交但尚未审批，不可编辑
- **已审批**：审批通过，可以开始生成采购订单
- **部分采购**：至少有一条明细已关联采购订单
- **已关闭**：所有明细的剩余数量 = 0，系统自动关闭

### 3.2 自动关闭条件

```
对请购单中的所有明细：
  remainingQuantity = quantity - SUM(orderItems.quantity)
  
当 ∀items: remainingQuantity = 0 时，请购单状态自动 → "已关闭"
```

### 3.3 明细状态（自动计算）

明细的 `status` 字段不再由用户手动选择，改为系统根据订购进度自动判定：

| 明细状态 | 条件 | 说明 |
|---------|------|------|
| 待采购 | orderedQuantity = 0 | 尚未生成任何订单 |
| 部分采购 | 0 < orderedQuantity < quantity | 部分订购，还有剩余 |
| 已采购 | orderedQuantity = quantity | 已全部订购完成 |

### 3.4 剩余量显示

每条明细均显示：
- **请购数量** (quantity)
- **已订购量** (orderedQuantity) - 通过关联 OrderItem 求和
- **剩余量** (remainingQuantity = quantity - orderedQuantity)

---

## 4. 变更策略

| 阶段 | 可操作 |
|------|--------|
| 草稿 | 完全可编辑 |
| 已提交 | 锁定，不可修改 |
| 已审批 | 锁定，不可修改 |
| 部分采购 | 锁定，不可修改 |
| 已关闭 | 锁定，不可修改 |

如需增加采购量 → **新建补充请购单**，在备注中关联原请购单号。

---

## 5. 自动编号设计

### 5.1 请购单号生成规则

**格式：`REQ-YYYYMMDD-XXX`**

| 段 | 说明 | 示例 |
|---|------|------|
| REQ | 固定前缀 | REQ |
| YYYYMMDD | 创建日期 | 20260602 |
| XXX | 当日顺序号，从 001 开始递增 | 001 |

**生成逻辑**（在 API 层实现）：
1. 取当日零点后第一条记录，获取当日最大流水号
2. 流水号 +1，格式化为三位
3. 如无记录则从 001 开始

```
REQ-20260602-001
REQ-20260602-002
...
```

### 5.2 物料编码生成规则

**格式：`MAT-XXXXXX`**

| 段 | 说明 | 示例 |
|---|------|------|
| MAT | 固定前缀 | MAT |
| XXXXXX | 全局顺序号，从 000001 开始递增 | 000001 |

**生成逻辑**（在 API 层实现）：
1. 查询当前最大物料编码
2. 数字部分 +1，格式化为六位
3. 如无记录则从 000001 开始

```
MAT-000001
MAT-000002
...
```

## 6. 当前用户设计

### 6.1 背景

当前 MVP 阶段尚无用户认证模块（已规划为独立模块后续开发）。

### 6.2 简化方案：UserContext

新建 `UserContext`，提供一个全局的当前用户信息。初期硬编码默认用户，后续接入真实认证后替换为登录态。

```typescript
// src/lib/user-context.tsx
'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface UserInfo {
  name: string
}

const UserContext = createContext<{
  user: UserInfo
  setUser: (user: UserInfo) => void
} | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo>({ name: '管理员' })
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
```

在 `app/layout.tsx` 中包裹 `UserProvider`。

### 6.3 影响

- **新建请购单**：`requester` 字段从 UserContext 自动读取，用户不可编辑
- **列表页/详情页**：正常显示 `requester`
- **后续**：接入真实认证后，`UserInfo` 替换为登录用户身份

## 7. 受影响页面

### 7.1 新建请购单表单（new/page.tsx）

主表区域字段排列（请购单号和物料编码不展示输入框，由系统自动生成）：

```
┌────────────────────────────────────────────┐
│  请购单号: REQ-20260602-001  (自动生成只读)   │
├─────────────────────┬──────────┬────────────┤
│  请购日期 *          │ 需求类型  │  采购分类   │
│  [________]         │ [下拉__]  │ [下拉___]   │
├─────────────────────┴──────────┴────────────┤
│  期望到货日期                                 │
│  [________________________________________] │
├────────────────────────────────────────────-┤
│  申请人: 管理员 (当前登录用户，自动赋值)        │
├────────────────────────────────────────────-┤
│  备注                                        │
│  [________________________________________] │
├────────────────────────────────────────────-┤
│  采购明细                                     │
│ ┌──────┬──────┬────┬────┬────┬────┬────┬──┐ │
│ │物料名│规格  │材质│牌号│标准│数量│单位│...│ │
│ ├──────┼──────┼────┼────┼────┼────┼────┼──┤ │
│ │      │      │    │    │    │    │    │  │ │
│ └──────┴──────┴────┴────┴────┴────┴────┴──┘ │
└────────────────────────────────────────────-┘
```

- **请购单号**：页面加载时调用 API 生成并展示（只读字段）
- **申请人**：从 UserContext 自动赋值，页面展示为纯文本
- **物料编码**：提交时由 API 自动生成，不在表单中展示输入框

### 7.2 请购单详情页（[reqId]/page.tsx）

- 信息区域增加：采购分类、需求类型、期望到货日期
- 明细表增加列：物料编码、材质、材料牌号、标准规范、需求日期、已订购量、剩余量
- 明细状态自动计算显示

### 7.3 请购单列表页（page.tsx）

- 列表项增加：采购分类标签 / 需求类型标识
- 已关闭的请购单可视觉区分（灰色/标签）

### 7.4 新建采购订单页（orders/new/page.tsx）

- 请购单下拉选项 **过滤掉已关闭的请购单**
- 引入明细时，携带有请购明细的新增字段（物料编码等，只读展示）
- 明细剩余量可作为订购数量的最大值约束

---

## 8. API & 校验

### API 路由（/api/requisitions/route.ts）

POST 接口逻辑更新：

```typescript
// 1. 自动生成请购单号
const reqNo = await generateRequisitionNo()
// 2. 自动为每条明细生成物料编码
const itemsWithCode = data.items.map((item, i) => ({
  ...item,
  materialCode: `MAT-${String(i + 1).padStart(6, '0')}`, // 临时编码，后续可改为统一生成
}))
// 3. 入库
const requisition = await db.purchaseRequisition.create({
  data: {
    ...data,
    reqNo,
    requester: data.requester, // 由前端传入（来自 UserContext）
    items: { create: itemsWithCode },
  },
})
```

- 新增 `generateRequisitionNo()` 工具函数，按日期查询当日最大流水号
- 物料编码在 create 时为每条明细分配全局唯一编码
- 详情页/列表页的 `orderedQuantity` 通过 `include: { orders: { include: { items: true } } }` 聚合计算

### 新增工具函数

```typescript
// src/lib/numbering.ts
import { db } from '@/lib/db'

export async function generateRequisitionNo(): Promise<string> {
  const today = new Date()
  const prefix = `REQ-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  
  const last = await db.purchaseRequisition.findFirst({
    where: { reqNo: { startsWith: prefix } },
    orderBy: { reqNo: 'desc' },
    select: { reqNo: true },
  })
  
  let seq = 1
  if (last) {
    const lastSeq = parseInt(last.reqNo.slice(-3), 10)
    seq = lastSeq + 1
  }
  
  return `${prefix}-${String(seq).padStart(3, '0')}`
}

export async function generateMaterialCode(): Promise<string> {
  const last = await db.requisitionItem.findFirst({
    orderBy: { materialCode: 'desc' },
    select: { materialCode: true },
  })
  
  let seq = 1
  if (last && last.materialCode) {
    const lastSeq = parseInt(last.materialCode.replace('MAT-', ''), 10)
    seq = lastSeq + 1
  }
  
  return `MAT-${String(seq).padStart(6, '0')}`
}
```

### Zod 校验（lib/validations.ts）

> reqNo 和 materialCode 从前端移除，改为 API 自动生成，校验中标记为 optional。

```typescript
export const requisitionSchema = z.object({
  projectId: z.string(),
  reqNo: z.string().optional(), // 前端不传，API 自动生成
  reqDate: z.coerce.date({ message: '请选择请购日期' }),
  requester: z.string().default(''), // 前端从 UserContext 传入
  procurementCategory: z.string().default('设备'),
  demandType: z.string().default('正常采购'),
  expectedArrivalDate: z.coerce.date().nullable().optional(),
  status: z.string().default('草稿'),
  remark: z.string().default(''),
  items: z.array(requisitionItemSchema).min(1, '请至少添加一个采购明细'),
})

export const requisitionItemSchema = z.object({
  materialCode: z.string().optional(), // 前端不传，API 自动生成
  materialName: z.string().min(1, '请输入物料名称'),
  specification: z.string().default(''),
  material: z.string().default(''),
  materialGrade: z.string().default(''),
  applicableStandard: z.string().default(''),
  quantity: z.coerce.number().min(0.01, '数量必须大于0'),
  unit: z.string().default(''),
  purpose: z.string().default(''),
  requiredDate: z.coerce.date().nullable().optional(),
  status: z.string().default('待采购'),
})
```

---

## 9. 影响范围总结

| 文件 | 改动类型 |
|------|---------|
| prisma/schema.prisma | 主表 +3 字段，明细表 +5 字段 |
| lib/validations.ts | Schema 扩展，reqNo/materialCode 改为 optional |
| lib/numbering.ts | **新增**：自动编号工具函数 |
| lib/user-context.tsx | **新增**：当前用户上下文 |
| components/UserProvider | **新增**：在 app/layout.tsx 中包裹 |
| requisitions/new/page.tsx | 表单重构：移除 reqNo/materialCode 输入，改为自动生成只读；requester 自动填充 |
| requisitions/[reqId]/page.tsx | 详情展示新字段 + 已订购量/剩余量 |
| requisitions/page.tsx | 列表展示分类/需求类型 |
| orders/new/page.tsx | 过滤已关闭请购单 |
| api/requisitions/route.ts | 新增编号生成逻辑，适配新字段 |
