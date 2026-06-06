# 采购合同管理模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现采购合同管理模块，包括执行单位管理、合同CRUD、AI合同生成、审批流程、合同编号回填、导出Word/PDF

**Architecture:** 在采购管理下新增合同子模块，Prisma新增4个模型（ExecutingUnit/ProcurementContract/ContractOrderLink/ContractItem），ProcurementOrder新增2个字段。系统设置新增执行单位管理页面。合同内容采用实时渲染模式，AI生成结构化数据存储。

**Tech Stack:** Next.js 14 App Router, Prisma, PostgreSQL, TailwindCSS, @base-ui/react, OpenAI/Anthropic AI SDK

---

### 文件结构总览

**新文件：**
- `prisma/schema.prisma` — 修改，新增模型和字段
- `src/lib/contract-template.ts` — 合同模板（用户提供文案）
- `src/lib/status.ts` — 修改，新增合同流程状态
- `src/lib/validations.ts` — 修改，新增校验schema
- `src/lib/contract-utils.ts` — 合同编号生成、金额大写转换工具
- `src/app/api/executing-units/route.ts` — 执行单位列表+创建
- `src/app/api/executing-units/[id]/route.ts` — 执行单位单条CRUD
- `src/app/company/settings/basic-info/executing-units/page.tsx` — 执行单位管理页面
- `src/app/company/settings/basic-info/page.tsx` — 修改，新增卡片
- `src/app/api/contracts/route.ts` — 合同列表+创建
- `src/app/api/contracts/[id]/route.ts` — 合同单条CRUD+审批
- `src/app/api/contracts/generate-no/route.ts` — 合同编号生成
- `src/app/api/contracts/available-orders/route.ts` — 可用订单查询
- `src/app/api/contracts/generate-content/route.ts` — AI生成合同
- `src/app/projects/[id]/procurement/contracts/page.tsx` — 合同列表页
- `src/app/projects/[id]/procurement/contracts/new/page.tsx` — 新建合同页
- `src/app/projects/[id]/procurement/contracts/[contractId]/page.tsx` — 合同详情页
- `src/app/projects/[id]/procurement/contracts/[contractId]/edit/page.tsx` — 编辑合同页
- `src/lib/ai/types.ts` — 修改，新增合同生成接口
- `src/lib/ai/openai-client.ts` — 修改，实现合同生成
- `src/lib/ai/anthropic-client.ts` — 修改，实现合同生成
- `test/db/executing-unit-model.test.ts` — DB模型测试
- `test/db/contract-model.test.ts` — 合同模型测试
- `test/api/executing-units.test.ts` — API集成测试
- `test/api/contracts.test.ts` — 合同API集成测试

**修改文件：**
- `prisma/schema.prisma` — 新增4个模型 + ProcurementOrder加2字段
- `src/lib/status.ts` — 新增合同流程状态常量
- `src/lib/validations.ts` — 新增校验schema
- `src/app/company/settings/basic-info/page.tsx` — 新增卡片
- `src/lib/ai/types.ts` — 新增接口定义
- `src/lib/ai/openai-client.ts` — 实现合同生成
- `src/lib/ai/anthropic-client.ts` — 实现合同生成

---

### Task 1: Prisma Schema — 新增模型和字段

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 在 schema.prisma 末尾添加 ExecutingUnit 模型**

```prisma
// 执行单位（合同甲方）
model ExecutingUnit {
  id            String   @id @default(uuid())
  name          String   @unique
  address       String   @default("")
  contactPerson String   @default("")
  phone         String   @default("")
  bankName      String   @default("")
  bankAccount   String   @default("")
  taxId         String   @default("")
  status        String   @default("启用")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status])
}
```

- [ ] **Step 2: 添加 ProcurementContract 模型**

```prisma
model ProcurementContract {
  id              String   @id @default(uuid())
  projectId       String
  contractNo      String
  contractName    String   @default("")
  supplierId      String?
  supplier        String   @default("")
  supplierContact String   @default("")
  supplierPhone   String   @default("")
  executingUnitId String?
  executingUnitName String @default("")
  totalAmount     Float    @default(0)
  taxAmount       Float    @default(0)
  taxRate         String   @default("13%")
  deliveryTerm    Int      @default(30)
  deliveryAddress String   @default("")
  transportCost   String   @default("乙方承担")
  paymentTerms    String   @default("30:40:20:10")
  warrantyPeriod  Int      @default(12)
  arbitrationBody String   @default("")
  lateDeliveryPct Float    @default(0.1)
  latePaymentPct  Float    @default(0.1)
  status          String   @default("草稿")
  content         Json?
  remark          String   @default("")
  signDate        DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project    Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  orderLinks ContractOrderLink[]
  items      ContractItem[]

  @@index([projectId])
  @@index([contractNo])
  @@index([status])
}
```

- [ ] **Step 3: 添加 ContractOrderLink 模型**

```prisma
model ContractOrderLink {
  id         String @id @default(uuid())
  contractId String
  orderId    String

  contract ProcurementContract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  order    ProcurementOrder    @relation(fields: [orderId], references: [id])

  @@unique([contractId, orderId])
  @@index([orderId])
}
```

- [ ] **Step 4: 添加 ContractItem 模型**

```prisma
model ContractItem {
  id              String @id @default(uuid())
  contractId      String
  orderItemId     String
  materialName    String
  specification   String @default("")
  materialCode    String @default("")
  material        String @default("")
  materialGrade   String @default("")
  brand           String @default("")
  quantity        Float  @default(0)
  unit            String @default("")
  unitPrice       Float  @default(0)
  totalAmount     Float  @default(0)

  contract ProcurementContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@index([contractId])
}
```

- [ ] **Step 5: 在 ProcurementOrder 模型中新增两个字段**

找到 `ProcurementOrder` 模型，在 `supplierPhone` 字段后面添加：

```prisma
  executingUnitId   String?
  executingUnitName String   @default("")
```

- [ ] **Step 6: 验证 Schema 并同步数据库**

```bash
npx prisma validate
```

Expected: `Your schema is valid`.

```bash
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 7: 提交**

```bash
git add prisma/schema.prisma
git commit -m "feat: add contract and executing unit models"
```

---

### Task 2: 状态常量和工具函数

**Files:**
- Modify: `src/lib/status.ts`
- Create: `src/lib/contract-utils.ts`

- [ ] **Step 1: 在 src/lib/status.ts 末尾添加合同流程状态常量**

```typescript
// 合同流程状态
export const CONTRACT_FLOW_STATUSES = ['草稿', '审批中', '已批准', '已驳回'] as const
export type ContractFlowStatus = typeof CONTRACT_FLOW_STATUSES[number]
```

- [ ] **Step 2: 创建 src/lib/contract-utils.ts 工具函数**

```typescript
// 合同编号生成：PC-YYYYMMDD-NNN
export function generateContractNo(seq: number): string {
  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `PC-${y}${m}${d}-${String(seq).padStart(3, '0')}`
}

// 人民币大写金额转换
export function amountToChinese(amount: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿']
  const decimals = ['角', '分']

  if (amount === 0) return '零元整'

  let result = ''
  const amountStr = amount.toFixed(2)
  const [intPart, decPart] = amountStr.split('.')

  // 整数部分
  const intLen = intPart.length
  for (let i = 0; i < intLen; i++) {
    const digit = parseInt(intPart[i])
    const unit = units[intLen - 1 - i]
    if (digit === 0) {
      if (intLen - i === 5 || intLen - i === 9) result += unit // 万、亿位补单位
      else if (result.endsWith('零')) continue // 去重
      else if (i < intLen - 1) result += '零'
    } else {
      result += digits[digit] + unit
    }
  }
  result += '元'

  // 小数部分
  const jiao = parseInt(decPart[0])
  const fen = parseInt(decPart[1])
  if (jiao === 0 && fen === 0) {
    result += '整'
  } else {
    if (jiao > 0) result += digits[jiao] + '角'
    if (fen > 0) result += digits[fen] + '分'
  }

  return result
}

// 从合同变量字符串解析付款比例对象
export function parsePaymentTerms(terms: string): {
  prepay: number; delivery: number; accept: number; warranty: number
} {
  const parts = terms.split(':').map(Number)
  return {
    prepay: parts[0] || 0,
    delivery: parts[1] || 0,
    accept: parts[2] || 0,
    warranty: parts[3] || 0,
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/lib/status.ts src/lib/contract-utils.ts
git commit -m "feat: add contract status constants and utils"
```

---

### Task 3: TDD — 执行单位 DB 模型测试

**Files:**
- Create: `test/db/executing-unit-model.test.ts`

- [ ] **Step 1: 编写 DB 模型测试**

```typescript
import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('ExecutingUnit Model', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should create an executing unit with all fields', async () => {
    const unit = await prisma.executingUnit.create({
      data: {
        name: '测试执行单位',
        address: '北京市朝阳区XX路100号',
        contactPerson: '张三',
        phone: '13800138000',
        bankName: '中国工商银行北京分行',
        bankAccount: '1101234567890123456',
        taxId: '91110000MA12345678',
        status: '启用',
      },
    })

    expect(unit.name).toBe('测试执行单位')
    expect(unit.address).toBe('北京市朝阳区XX路100号')
    expect(unit.contactPerson).toBe('张三')
    expect(unit.phone).toBe('13800138000')
    expect(unit.bankName).toBe('中国工商银行北京分行')
    expect(unit.bankAccount).toBe('1101234567890123456')
    expect(unit.taxId).toBe('91110000MA12345678')
    expect(unit.status).toBe('启用')
    expect(unit.id).toBeDefined()

    // 清理
    await prisma.executingUnit.delete({ where: { id: unit.id } })
  })

  it('should enforce unique name', async () => {
    const unit = await prisma.executingUnit.create({
      data: { name: '唯一名称测试' },
    })

    await expect(
      prisma.executingUnit.create({
        data: { name: '唯一名称测试' },
      })
    ).rejects.toThrow()

    await prisma.executingUnit.delete({ where: { id: unit.id } })
  })

  it('should filter by status', async () => {
    const unit1 = await prisma.executingUnit.create({
      data: { name: '启用单位', status: '启用' },
    })
    const unit2 = await prisma.executingUnit.create({
      data: { name: '停用单位', status: '停用' },
    })

    const enabledUnits = await prisma.executingUnit.findMany({
      where: { status: '启用' },
    })

    expect(enabledUnits.some(u => u.id === unit1.id)).toBe(true)
    expect(enabledUnits.some(u => u.id === unit2.id)).toBe(false)

    await prisma.executingUnit.delete({ where: { id: unit1.id } })
    await prisma.executingUnit.delete({ where: { id: unit2.id } })
  })
})
```

- [ ] **Step 2: 运行测试确认通过**

```bash
npx vitest run test/db/executing-unit-model.test.ts -t 'ExecutingUnit Model'
```

Expected: All 3 tests pass.

- [ ] **Step 3: 提交**

```bash
git add test/db/executing-unit-model.test.ts
git commit -m "test: add executing unit db model tests"
```

---

### Task 4: TDD — 合同 DB 模型测试

**Files:**
- Create: `test/db/contract-model.test.ts`

- [ ] **Step 1: 编写合同模型测试**

```typescript
import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('ProcurementContract Model', () => {
  let projectId: string

  beforeAll(async () => {
    // 创建测试项目
    const project = await prisma.project.create({
      data: {
        name: '合同测试项目',
        code: 'CT-TEST-' + Date.now(),
        type: 'EPC',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    })
    projectId = project.id
  })

  afterAll(async () => {
    await prisma.project.delete({ where: { id: projectId } })
    await prisma.$disconnect()
  })

  it('should create a contract with basic fields', async () => {
    const contract = await prisma.procurementContract.create({
      data: {
        projectId,
        contractNo: 'PC-20260601-001',
        contractName: '测试合同',
        supplier: '测试供应商',
        totalAmount: 100000,
        taxAmount: 11504.42,
        taxRate: '13%',
        status: '草稿',
      },
    })

    expect(contract.contractNo).toBe('PC-20260601-001')
    expect(contract.status).toBe('草稿')
    expect(contract.totalAmount).toBe(100000)

    await prisma.procurementContract.delete({ where: { id: contract.id } })
  })

  it('should cascade delete contract items', async () => {
    const contract = await prisma.procurementContract.create({
      data: {
        projectId,
        contractNo: 'PC-20260601-002',
        contractName: '级联删除测试',
        supplier: '测试供应商',
        items: {
          create: [
            {
              orderItemId: 'test-1',
              materialName: '测试物资',
              specification: '规格A',
              quantity: 10,
              unit: '个',
              unitPrice: 100,
              totalAmount: 1000,
            },
          ],
        },
      },
      include: { items: true },
    })

    expect(contract.items).toHaveLength(1)

    await prisma.procurementContract.delete({ where: { id: contract.id } })

    const items = await prisma.contractItem.findMany({
      where: { contractId: contract.id },
    })
    expect(items).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行测试确认通过**

```bash
npx vitest run test/db/contract-model.test.ts -t 'ProcurementContract Model'
```

Expected: All 2 tests pass.

- [ ] **Step 3: 提交**

```bash
git add test/db/contract-model.test.ts
git commit -m "test: add contract db model tests"
```

---

### Task 5: 执行单位 API（TDD）

**Files:**
- Create: `src/app/api/executing-units/route.ts`
- Create: `src/app/api/executing-units/[id]/route.ts`
- Create: `test/api/executing-units.test.ts`
- Modify: `src/lib/validations.ts`

- [ ] **Step 1: 在 src/lib/validations.ts 末尾添加执行单位校验 schema**

```typescript
// 执行单位校验
export const executingUnitSchema = z.object({
  name: z.string().min(1, '请输入单位名称'),
  address: z.string().default(''),
  contactPerson: z.string().default(''),
  phone: z.string().default(''),
  bankName: z.string().default(''),
  bankAccount: z.string().default(''),
  taxId: z.string().default(''),
  status: z.string().default('启用'),
})
```

- [ ] **Step 2: 编写 API 集成测试（先写测试）**

```typescript
// test/api/executing-units.test.ts
import { describe, it, expect } from 'vitest'

const BASE = 'http://localhost:3000/api/executing-units'

describe('ExecutingUnits API', () => {
  let createdId: string

  it('POST /api/executing-units — should create a unit', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'API测试单位',
        address: '测试地址',
        contactPerson: '李四',
        phone: '13900139000',
        bankName: '建设银行',
        bankAccount: '6543210987654321',
        taxId: '91234567MA1234',
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('API测试单位')
    createdId = data.id
  })

  it('GET /api/executing-units — should list units', async () => {
    const res = await fetch(BASE)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.some((u: any) => u.id === createdId)).toBe(true)
  })

  it('PUT /api/executing-units/:id — should update a unit', async () => {
    const res = await fetch(`${BASE}/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '已更新单位', phone: '13700137000' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('已更新单位')
    expect(data.phone).toBe('13700137000')
  })

  it('DELETE /api/executing-units/:id — should delete a unit', async () => {
    const res = await fetch(`${BASE}/${createdId}`, { method: 'DELETE' })
    expect(res.status).toBe(200)

    const getRes = await fetch(`${BASE}/${createdId}`)
    expect(getRes.status).toBe(404)
  })
})
```

- [ ] **Step 3: 创建执行单位列表+创建 API**

```typescript
// src/app/api/executing-units/route.ts
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { executingUnitSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where = status ? { status } : {}
  const units = await db.executingUnit.findMany({
    where,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(units)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = executingUnitSchema.parse(body)
  const unit = await db.executingUnit.create({ data: parsed })
  return NextResponse.json(unit)
}
```

- [ ] **Step 4: 创建执行单位单条 CRUD API**

```typescript
// src/app/api/executing-units/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const unit = await db.executingUnit.findUnique({ where: { id: params.id } })
  if (!unit) return NextResponse.json({ error: '未找到' }, { status: 404 })
  return NextResponse.json(unit)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const unit = await db.executingUnit.update({
    where: { id: params.id },
    data: body,
  })
  return NextResponse.json(unit)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.executingUnit.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: 启动开发服务器并运行测试**

```bash
npm run dev &
```

等服务器启动后：

```bash
npx vitest run test/api/executing-units.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 6: 提交**

```bash
git add src/lib/validations.ts src/app/api/executing-units/ test/api/executing-units.test.ts
git commit -m "feat: add executing units CRUD API"
```

---

### Task 6: 执行单位管理页面

**Files:**
- Create: `src/app/company/settings/basic-info/executing-units/page.tsx`
- Modify: `src/app/company/settings/basic-info/page.tsx`

- [ ] **Step 1: 创建执行单位管理页面**

参考专业基础数据管理页面的行内编辑模式，创建 `src/app/company/settings/basic-info/executing-units/page.tsx`

页面功能：
- 表格展示所有执行单位（列：单位名称、地址、联系人、电话、开户行、银行账号、税号、状态、操作）
- 行内新增（点击"新建执行单位"在顶部插入空白行）
- 行内编辑（点击编辑按钮切换为输入框）
- 状态切换（点击Badge切换启用/停用）
- 删除（confirm确认后删除）

代码较长，实现时参考 `src/app/company/settings/disciplines/page.tsx` 的模板。

- [ ] **Step 2: 修改系统设置首页，新增执行单位卡片**

在 `src/app/company/settings/basic-info/page.tsx` 的卡片数组中新增：

```tsx
{
  title: '执行单位管理',
  description: '管理和维护执行单位信息，作为合同甲方的数据来源',
  icon: Building2,  // 从 lucide-react 导入
  color: 'text-blue-600',
  href: '/company/settings/basic-info/executing-units',
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/company/settings/
git commit -m "feat: add executing unit management page"
```

---

### Task 7: 采购订单增加采购单位字段

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/orders/[id]/route.ts`
- Modify: `src/app/projects/[id]/procurement/orders/new/page.tsx`
- Modify: `src/app/projects/[id]/procurement/orders/[orderId]/edit/page.tsx`
- Modify: `src/app/projects/[id]/procurement/orders/[orderId]/page.tsx`

- [ ] **Step 1: 在采购订单创建API中添加执行单位字段**

在 `src/app/api/orders/route.ts` 的 POST 处理中，确保 `executingUnitId` 和 `executingUnitName` 字段可以传递和存储。

- [ ] **Step 2: 在采购订单编辑API中支持执行单位字段**

在 `src/app/api/orders/[id]/route.ts` 的 PUT 处理中，确保执行单位字段可以更新。

- [ ] **Step 3: 修改采购订单新建页面**

在 `src/app/projects/[id]/procurement/orders/new/page.tsx` 的表单中，将"采购人"附近增加"采购单位"下拉选择框，选项来自 `GET /api/executing-units?status=启用`。

- [ ] **Step 4: 修改采购订单编辑页面**

同上，在编辑页面的表单中增加"采购单位"下拉选择框。

- [ ] **Step 5: 修改采购订单详情页**

在详情页的采购人附近显示采购单位名称。

- [ ] **Step 6: 提交**

```bash
git add src/app/api/orders/ src/app/projects/
git commit -m "feat: add executing unit field to purchase orders"
```

---

### Task 8: 合同 API — 编号生成 + 可用订单查询（TDD）

**Files:**
- Create: `src/app/api/contracts/generate-no/route.ts`
- Create: `src/app/api/contracts/available-orders/route.ts`
- Create: `test/api/contracts.test.ts`

- [ ] **Step 1: 创建合同编号生成 API**

```typescript
// src/app/api/contracts/generate-no/route.ts
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateContractNo } from '@/lib/contract-utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 })

  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const prefix = `PC-${y}${m}${d}-`

  // 查找当天最大序号
  const lastContract = await db.procurementContract.findFirst({
    where: {
      projectId,
      contractNo: { startsWith: prefix },
    },
    orderBy: { contractNo: 'desc' },
  })

  let seq = 1
  if (lastContract) {
    const lastSeq = parseInt(lastContract.contractNo.slice(-3), 10)
    seq = lastSeq + 1
  }

  return NextResponse.json({ contractNo: generateContractNo(seq) })
}
```

- [ ] **Step 2: 创建可用订单查询 API**

```typescript
// src/app/api/contracts/available-orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const supplierId = searchParams.get('supplierId')

  if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 })

  const where: any = {
    projectId,
    status: '已批准',
    contractNo: '',  // 无合同编号
  }
  if (supplierId) where.supplierId = supplierId

  const orders = await db.procurementOrder.findMany({
    where,
    select: {
      id: true,
      orderNo: true,
      supplier: true,
      supplierId: true,
      totalAmount: true,
      contractNo: true,
      items: {
        select: {
          id: true,
          materialName: true,
          specification: true,
          materialCode: true,
          material: true,
          materialGrade: true,
          brand: true,
          quantity: true,
          unit: true,
          unitPrice: true,
          totalAmount: true,
        },
      },
    },
    orderBy: { orderNo: 'asc' },
  })

  return NextResponse.json(orders)
}
```

- [ ] **Step 3: 编写 API 集成测试**

```typescript
// test/api/contracts.test.ts
import { describe, it, expect } from 'vitest'

const BASE = 'http://localhost:3000/api/contracts'

describe('Contracts API', () => {
  it('GET /api/contracts/generate-no — should generate contract number', async () => {
    const res = await fetch(`${BASE}/generate-no?projectId=test`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.contractNo).toMatch(/^PC-\d{8}-\d{3}$/)
  })

  it('GET /api/contracts/available-orders — should return empty for no orders', async () => {
    const res = await fetch(`${BASE}/available-orders?projectId=nonexistent`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })
})
```

- [ ] **Step 4: 运行测试**

```bash
npx vitest run test/api/contracts.test.ts
```

Expected: Both tests pass.

- [ ] **Step 5: 提交**

```bash
git add src/app/api/contracts/ test/api/contracts.test.ts
git commit -m "feat: add contract number generation and available orders API"
```

---

### Task 9: 合同 CRUD API（含审批+编号回填逻辑）

**Files:**
- Create: `src/app/api/contracts/route.ts`
- Create: `src/app/api/contracts/[id]/route.ts`

- [ ] **Step 1: 创建合同列表+创建 API**

```typescript
// src/app/api/contracts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')

  if (!projectId) return NextResponse.json({ error: '缺少 projectId' }, { status: 400 })

  const where: any = { projectId }
  if (status) where.status = status
  if (keyword) {
    where.OR = [
      { contractNo: { contains: keyword } },
      { contractName: { contains: keyword } },
      { supplier: { contains: keyword } },
    ]
  }

  const contracts = await db.procurementContract.findMany({
    where,
    include: {
      _count: { select: { orderLinks: true, items: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(contracts)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { orderIds, items, ...contractData } = body

  const contract = await db.procurementContract.create({
    data: {
      ...contractData,
      orderLinks: {
        create: orderIds.map((orderId: string) => ({ orderId })),
      },
      items: {
        create: items.map((item: any) => ({
          orderItemId: item.orderItemId,
          materialName: item.materialName,
          specification: item.specification || '',
          materialCode: item.materialCode || '',
          material: item.material || '',
          materialGrade: item.materialGrade || '',
          brand: item.brand || '',
          quantity: item.quantity,
          unit: item.unit || '',
          unitPrice: item.unitPrice || 0,
          totalAmount: item.totalAmount || 0,
        })),
      },
    },
    include: { orderLinks: true, items: true },
  })

  return NextResponse.json(contract)
}
```

- [ ] **Step 2: 创建合同详情/更新/删除 API（含审批+回填逻辑）**

```typescript
// src/app/api/contracts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contract = await db.procurementContract.findUnique({
    where: { id: params.id },
    include: {
      orderLinks: {
        include: {
          order: {
            select: { id: true, orderNo: true, totalAmount: true },
          },
        },
      },
      items: { orderBy: { materialName: 'asc' } },
    },
  })
  if (!contract) return NextResponse.json({ error: '未找到' }, { status: 404 })
  return NextResponse.json(contract)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const { _statusOnly, status, ...updateData } = body

  if (_statusOnly && status) {
    // 审批流状态更新
    const oldContract = await db.procurementContract.findUnique({
      where: { id: params.id },
    })
    if (!oldContract) return NextResponse.json({ error: '未找到' }, { status: 404 })

    const updatePayload: any = { status }

    // 审批通过 → 回填合同编号到关联采购订单
    if (status === '已批准' && oldContract.status === '审批中') {
      updatePayload.signDate = new Date()
      const links = await db.contractOrderLink.findMany({
        where: { contractId: params.id },
      })
      for (const link of links) {
        await db.procurementOrder.update({
          where: { id: link.orderId },
          data: { contractNo: oldContract.contractNo },
        })
      }
    }

    const updated = await db.procurementContract.update({
      where: { id: params.id },
      data: updatePayload,
    })
    return NextResponse.json(updated)
  }

  // 全量编辑
  const contract = await db.procurementContract.update({
    where: { id: params.id },
    data: updateData,
  })
  return NextResponse.json(contract)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contract = await db.procurementContract.findUnique({
    where: { id: params.id },
    include: { orderLinks: true },
  })
  if (!contract) return NextResponse.json({ error: '未找到' }, { status: 404 })
  if (contract.status !== '草稿') return NextResponse.json({ error: '仅草稿可删除' }, { status: 400 })

  // 清除关联订单的 contractNo
  for (const link of contract.orderLinks) {
    await db.procurementOrder.update({
      where: { id: link.orderId },
      data: { contractNo: '' },
    })
  }

  // 级联删除关联表和合同本身
  await db.procurementContract.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/api/contracts/
git commit -m "feat: add contracts CRUD API with approval and contractNo backfill"
```

---

### Task 10: 合同列表页

**Files:**
- Create: `src/app/projects/[id]/procurement/contracts/page.tsx`

- [ ] **Step 1: 创建合同列表页**

页面功能：
- 面包屑：项目 > 采购管理 > 合同管理
- 标题"合同管理" + "新建合同"按钮
- 状态过滤标签：[全部] [草稿] [审批中] [已批准] [已驳回]
- 搜索框
- 表格列：合同编号 | 合同名称 | 供应商 | 关联订单数 | 含税总价 | 税率 | 状态 | 操作
  - 操作：查看（所有状态）、编辑（草稿/已驳回）、删除（草稿）
- 空数据提示

参考 `src/app/projects/[id]/procurement/orders/page.tsx` 的实现模式。

- [ ] **Step 2: 提交**

```bash
git add src/app/projects/[id]/procurement/contracts/
git commit -m "feat: add contract list page"
```

---

### Task 11: 新建合同页（Step 1 — 选择订单）

**Files:**
- Modify: `src/app/projects/[id]/procurement/contracts/new/page.tsx`

- [ ] **Step 1: 创建新建合同页 — 选择订单步骤**

页面功能（Step 1）：
- 标题"新建采购合同 — 选择采购订单"
- 说明文字："请选择相同供应商的已批准采购订单"
- 调用 `GET /api/contracts/available-orders?projectId=xxx` 获取可用订单
- 卡片形式展示，每张卡片含复选框 + 订单编号 + 供应商 + 金额 + 状态
- 选中第一个订单后锁定供应商，只显示该供应商的其他可用订单
- 右侧已选摘要：已选N笔，合计金额
- "[下一步]"按钮（至少选1笔后亮起）
- 如果是从采购订单跳转过来（`?selectedOrderIds=xxx`），自动选中并锁定

- [ ] **Step 2: 提交**

```bash
git add src/app/projects/[id]/procurement/contracts/new/page.tsx
git commit -m "feat: add contract create step1 - select orders"
```

---

### Task 12: 新建合同页（Step 2 — 填写变量 + AI生成）

- [ ] **Step 1: 在新建合同页新增 Step 2 — 填写合同变量**

从 Step 1 获取已选订单后，进入 Step 2：
- 左侧表单：
  - 合同名称（输入框，自动生成建议名称）
  - 税率 [13% ▼]
  - 质保期 [12个月 ▼]
  - 付款比例 [30:40:20:10 ▼]（带tooltip说明）
  - 交货期限 [30天 ▼]
  - 运输费用承担 [乙方承担 ▼]
  - 逾期交货违约金 [0.1%/天 ▼]
  - 逾期付款违约金 [0.1%/天 ▼]
  - 仲裁委员会 [输入框 或 下拉选择]
- 右侧已选订单摘要
- 底部"[上一步]" "[生成合同内容]"（蓝色主按钮）

- [ ] **Step 2: 实现"生成合同内容"的调用逻辑**

点击"生成合同内容"时：
1. 组装甲乙双方信息（从已选订单的供应商ID获取Partner信息、从执行单位ID获取执行单位信息）
2. 组装物资明细（合并所有订单的items）
3. 调用 `POST /api/contracts/generate-content`
4. 跳转到预览步骤展示AI返回的合同内容

- [ ] **Step 3: 提交**

```bash
git add src/app/projects/[id]/procurement/contracts/new/page.tsx
git commit -m "feat: add contract create step2 - variables and AI generation"
```

---

### Task 13: AI 客户端扩展 + 合同生成 API

**Files:**
- Modify: `src/lib/ai/types.ts`
- Modify: `src/lib/ai/openai-client.ts`
- Modify: `src/lib/ai/anthropic-client.ts`
- Create: `src/app/api/contracts/generate-content/route.ts`

- [ ] **Step 1: 在 types.ts 中新增接口**

```typescript
// 合同生成参数
export interface ContractGenerationParams {
  contractName: string
  buyerName: string
  buyerAddress: string
  buyerContact: string
  buyerPhone: string
  buyerBank: string
  buyerAccount: string
  buyerTaxId: string
  supplierName: string
  supplierAddress: string
  supplierContact: string
  supplierPhone: string
  supplierBank: string
  supplierAccount: string
  supplierTaxId: string
  items: Array<{
    materialName: string
    specification: string
    material: string
    materialGrade: string
    brand: string
    quantity: number
    unit: string
    unitPrice: number
    totalAmount: number
  }>
  variables: {
    taxRate: string
    totalAmount: number
    taxAmount: number
    totalAmountCN: string
    paymentTerms: string
    deliveryTerm: number
    deliveryAddress: string
    transportCost: string
    warrantyPeriod: number
    arbitrationBody: string
    lateDeliveryPct: number
    latePaymentPct: number
    signDate: string
  }
}

export interface AIClient {
  // ... 已有方法
  generateContractContent(params: ContractGenerationParams): Promise<string>
}
```

- [ ] **Step 2: 在 openai-client.ts 中实现合同生成**

在 `OpenAIClient` 类中新增：

```typescript
async generateContractContent(params: ContractGenerationParams): Promise<string> {
  const prompt = buildContractPrompt(params)
  const response = await this.client.chat.completions.create({
    model: this.modelName,
    messages: [
      { role: 'system', content: '你是一个专业的采购合同生成助手。根据模板和填充数据生成完整的采购合同文本，输出 JSON 格式。' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })
  return response.choices[0]?.message?.content || ''
}
```

- [ ] **Step 3: 创建合同生成 API**

```typescript
// src/app/api/contracts/generate-content/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getActiveAIClient } from '@/lib/ai/client'
import { contractTemplate } from '@/lib/contract-template'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const ai = await getActiveAIClient()

  // 组装完整 Prompt
  const promptData = {
    ...body,
    template: contractTemplate,
  }

  const content = await ai.generateContractContent(promptData)
  return NextResponse.json({ content: JSON.parse(content) })
}
```

- [ ] **Step 4: 提交**

```bash
git add src/lib/ai/ src/app/api/contracts/generate-content/
git commit -m "feat: add AI contract generation"
```

---

### Task 14: 合同详情页

**Files:**
- Create: `src/app/projects/[id]/procurement/contracts/[contractId]/page.tsx`

- [ ] **Step 1: 创建合同详情页**

页面功能：
- 面包屑：项目 > 采购管理 > 合同管理 > 合同编号
- 标题区域：合同编号 + 合同名称 + 流程状态标签
- 操作按钮：[编辑]（草稿/已驳回）、[删除]（草稿）、[导出Word]、[导出PDF]
- StatusSelect 组件（用于审批操作：草稿→审批中→已批准→已驳回）
- 基本信息卡片（两列网格）：
  - 左列：供应商、含税总价、税率、税金、执行单位、签订日期
  - 右列：质保期、交货期限、付款比例、运输费用、仲裁委员会、交货地址
- 关联采购订单卡片：展示关联订单列表，可点击查看
- 物资明细表格：展示合并后的明细行
- 合同正文卡片：实时渲染AI生成的合同内容，按章节展示

- [ ] **Step 2: 提交**

```bash
git add src/app/projects/[id]/procurement/contracts/[contractId]/page.tsx
git commit -m "feat: add contract detail page"
```

---

### Task 15: 合同编辑页

**Files:**
- Create: `src/app/projects/[id]/procurement/contracts/[contractId]/edit/page.tsx`

- [ ] **Step 1: 创建编辑合同页**

页面功能：
- 加载现有合同的变量字段
- 表单与新建合同的 Step 2 一致（变量字段下拉选择）
- 底部"[保存]"按钮 → 调用 `PUT /api/contracts/[id]`
- 也可点击"重新生成合同内容" → 调用 AI 重新生成后更新

- [ ] **Step 2: 提交**

```bash
git add src/app/projects/[id]/procurement/contracts/[contractId]/edit/page.tsx
git commit -m "feat: add contract edit page"
```

---

### Task 16: 采购订单列表页联动

**Files:**
- Modify: `src/app/projects/[id]/procurement/orders/page.tsx`

- [ ] **Step 1: 在采购订单列表页增加"生成合同"按钮**

在订单列表操作列中，对满足条件（status === '已批准' && contractNo === ''）的订单显示"生成合同"按钮，点击跳转到 `/contracts/new?selectedOrderIds={id}`。

对已有 `contractNo` 的订单显示"合同已签: {contractNo}"。

- [ ] **Step 2: 提交**

```bash
git add src/app/projects/[id]/procurement/orders/page.tsx
git commit -m "feat: add contract link to purchase order list"
```

---

### Task 17: 合同模板文件

**Files:**
- Create: `src/lib/contract-template.ts`

- [ ] **Step 1: 创建合同模板文件**

**依赖用户输入：** 用户提供合同模板文案后，填入此文件。

```typescript
// src/lib/contract-template.ts
// 采购合同模板 — 用户提供具体文案后填充
export const contractTemplate = `
## 第一章 合同标的与物资明细

甲方（买受方）向乙方（供应商）采购以下物资，乙方应按本合同约定提供符合质量要求的货物：

{itemsTable}

含税总价款：人民币（大写）{totalAmountCN}元整（¥{totalAmount}），其中税金¥{taxAmount}，税率{taxRate}。

## 第二章 合同价款及支付

## 第三章 交货与验收

## 第四章 质量保证

## 第五章 违约责任

## 第六章 知识产权

## 第七章 保密条款

## 第八章 不可抗力

## 第九章 争议解决

## 第十章 其他
`
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/contract-template.ts
git commit -m "feat: add contract template"
```

---

### Task 18: 合同导出功能（Word + PDF）

**Files:**
- Create: `src/app/api/contracts/[id]/export-word/route.ts`
- Create: `src/app/api/contracts/[id]/export-pdf/route.ts`

- [ ] **Step 1: Word 导出 API**

使用 `docx` npm 包。在合同详情页点击"导出Word"按钮时调用。

```bash
npm install docx
```

```typescript
// src/app/api/contracts/[id]/export-word/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } from 'docx'
import db from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contract = await db.procurementContract.findUnique({
    where: { id: params.id },
    include: { items: true },
  })
  if (!contract) return NextResponse.json({ error: '未找到' }, { status: 404 })

  // 构建 Word 文档
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun({ text: `采购合同 - ${contract.contractNo}`, bold: true, size: 32 })] }),
        // ... 完整的合同内容构建
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${contract.contractNo}.docx"`,
    },
  })
}
```

- [ ] **Step 2: PDF 导出 API**

使用 `@react-pdf/renderer` 或 `puppeteer`。简单方案是使用 `html-pdf-node` 或 `puppeteer`。

```bash
npm install puppeteer
```

或者使用更轻量的 `@react-pdf/renderer`。

- [ ] **Step 3: 在合同详情页增加导出按钮**

两个按钮分别调用 `/api/contracts/{id}/export-word` 和 `/api/contracts/{id}/export-pdf`。

- [ ] **Step 4: 提交**

```bash
git add src/app/api/contracts/ package.json
git commit -m "feat: add contract export (Word + PDF)"
```

---

### Task 19: 路由完整性检查 + 回归验证

**Files:**
- Modify: `test/unit/route-integrity.test.ts`

- [ ] **Step 1: 更新路由完整性测试**

在 `test/unit/route-integrity.test.ts` 中新增采购合同相关路由。

```bash
npx vitest run test/unit/route-integrity.test.ts
```

- [ ] **Step 2: 运行回归验证**

```bash
bash scripts/verify.sh
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "chore: update route integrity tests and pass verification"
```

---

### 需要 TDD 的任务清单

| 任务 | 需要 TDD | 测试文件 |
|------|---------|---------|
| Task 3: 执行单位 DB 模型测试 | ✅ 先写测试 | `test/db/executing-unit-model.test.ts` |
| Task 4: 合同 DB 模型测试 | ✅ 先写测试 | `test/db/contract-model.test.ts` |
| Task 5: 执行单位 API | ✅ 先写测试 | `test/api/executing-units.test.ts` |
| Task 8: 合同编号生成 + 可用订单 API | ✅ 先写测试 | `test/api/contracts.test.ts` |
| Task 9: 合同 CRUD API | 测试在 Task 8 中已覆盖 | — |
| Task 19: 路由完整性检查 | — | `test/unit/route-integrity.test.ts` |
