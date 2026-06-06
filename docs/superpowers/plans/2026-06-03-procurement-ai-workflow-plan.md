# 采购流程审批与 AI 集成 - 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通请购→审批→采购全链路，新增 AI 模型配置管理、设计文件物资提取、采购单智能填充功能。

**Architecture:** 后端 Next.js API Routes + Prisma ORM + PostgreSQL，前端 App Router + shadcn/ui。审批校验在 orders POST 中拦截，模拟审批通过独立 approve API 实现。AI 能力通过统一的客户端抽象层调用外部大模型 API，模型配置通过系统设置页面管理。

**Tech Stack:** Next.js 16 (App Router), TypeScript 5 strict, Prisma 7, PostgreSQL, shadcn/ui, Tailwind CSS 4, Vitest 4, OpenAI SDK / Anthropic SDK

---

## 文件变更总览

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `prisma/migrations/xxx_add_ai_model_config/` | Prisma 迁移：新增 AiModelConfig 表 |
| `src/app/api/requisitions/[id]/approve/route.ts` | 模拟审批 API |
| `src/app/api/settings/ai-models/route.ts` | AI 模型配置列表 + 新增 |
| `src/app/api/settings/ai-models/[id]/route.ts` | AI 模型配置编辑 + 删除 |
| `src/app/api/settings/ai-models/[id]/test/route.ts` | AI 模型连接测试 |
| `src/app/api/settings/ai-models/activate/route.ts` | 切换激活模型 |
| `src/app/api/ai/extract-materials/route.ts` | 从设计文件提取物资 |
| `src/app/api/ai/fill-order/route.ts` | 采购单智能填充 |
| `src/app/api/ai/parse-natural-lang/route.ts` | 自然语言解析建单 |
| `src/app/api/design-documents/list/route.ts` | 设计文件列表 API（供 AI 提取对话框使用） |
| `src/lib/ai/client.ts` | AI 客户端抽象接口 |
| `src/lib/ai/openai-client.ts` | OpenAI 兼容客户端实现 |
| `src/lib/ai/anthropic-client.ts` | Anthropic 客户端实现 |
| `src/lib/ai/types.ts` | AI 相关类型定义 |
| `src/lib/crypto.ts` | API Key 加密/解密工具 |
| `src/components/approve-requisition-button.tsx` | 审批通过按钮组件 |
| `src/components/extract-materials-dialog.tsx` | 从设计文件提取物资的对话框组件 |
| `src/components/ai-fill-button.tsx` | 采购单 AI 智能填充按钮组件 |
| `src/components/ai-model-form.tsx` | AI 模型配置编辑表单组件 |
| `src/app/settings/ai-models/page.tsx` | AI 模型配置设置页面 |
| `src/__tests__/api/approval-flow.test.ts` | 审批流程回归测试 |

### 修改文件

| 文件路径 | 改动内容 |
|---------|---------|
| `prisma/schema.prisma` | 新增 AiModelConfig 模型定义 |
| `src/app/api/orders/route.ts` | POST 方法新增请购单 status 校验 |
| `src/app/api/requisitions/list/route.ts` | GET 方法新增仅返回已审批的选项 |
| `src/app/projects/[id]/procurement/requisitions/[reqId]/page.tsx` | 新增审批通过按钮 |
| `src/app/projects/[id]/procurement/orders/new/page.tsx` | 请购单列表过滤为仅显示已审批 + AI 填充按钮 |
| `src/app/projects/[id]/procurement/requisitions/new/page.tsx` | 新增"从设计文件提取"入口 + AI 快速建单输入 |
| `src/lib/validations.ts` | 新增 AiModelConfig 校验 Schema |
| `src/lib/db.ts` | 无改动（单例模式已满足） |

---

## P0 阶段：审批流程 + 模型配置管理

### Task 1: Prisma Schema — 新增 AiModelConfig 模型

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `npx prisma migrate dev --name add_ai_model_config`

- [ ] **Step 1: 在 schema.prisma 末尾添加 AiModelConfig 模型**

添加到 `prisma/schema.prisma` 文件末尾（最后一个 model 之后）：

```prisma
model AiModelConfig {
  id           String   @id @default(uuid())
  provider     String   @default("openai")
  label        String
  apiEndpoint  String   @default("")
  apiKey       String   @default("")
  modelName    String   @default("")
  capabilities String   @default("extract,nlp,fill")
  isActive     Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- [ ] **Step 2: 生成迁移**

```bash
npx prisma migrate dev --name add_ai_model_config
```

预期输出：迁移成功，客户端已重新生成。

- [ ] **Step 3: 验证生成**

```bash
npx prisma generate
```

确认 `@prisma/client` 中包含了 `aiModelConfig` 属性。

---

### Task 2: Zod Schema — 新增 AiModelConfig 校验

**Files:**
- Modify: `src/lib/validations.ts`

- [ ] **Step 1: 在 validations.ts 末尾添加 schema**

```typescript
// ---------- AI 模型配置 ----------
export const aiModelConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'azure', 'custom']).default('openai'),
  label: z.string().min(1, '请输入显示名称'),
  apiEndpoint: z.string().default(''),
  apiKey: z.string().default(''),
  modelName: z.string().default(''),
  capabilities: z.string().default('extract,nlp,fill'),
  isActive: z.boolean().default(false),
})

export type AiModelConfigFormValues = z.infer<typeof aiModelConfigSchema>
```

---

### Task 3: API Key 加解密工具

**Files:**
- Create: `src/lib/crypto.ts`

- [ ] **Step 1: 创建加密工具**

```typescript
const ALGORITHM = 'aes-256-gcm'
const KEY_ENV = 'ENCRYPTION_KEY'

function getKey(): Buffer {
  const key = process.env[KEY_ENV]
  if (!key) {
    throw new Error(`缺少环境变量 ${KEY_ENV}，请设置 32 字节的 hex 密钥`)
  }
  return Buffer.from(key, 'hex')
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const key = getKey()
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

- [ ] **Step 2: 添加环境变量说明到 `.env.example`**

```
# API Key 加密密钥（32 字节 hex，可用 openssl rand -hex 32 生成）
ENCRYPTION_KEY=
```

---

### Task 4: AI 客户端抽象层 — 类型定义

**Files:**
- Create: `src/lib/ai/types.ts`

- [ ] **Step 1: 创建 AI 类型定义**

```typescript
import type { AiModelConfig } from '@prisma/client'

export interface MaterialItem {
  materialName: string
  specification: string
  material: string
  materialGrade: string
  applicableStandard: string
  quantity: number
  unit: string
  sourceFile?: string
}

export interface FillSuggestion {
  requisitionItemId: string
  supplier: string
  supplierId: string | null
  unitPrice: number
  brand: string
  totalAmount: number
  deliveryDate: string | null
  confidence: {
    supplier: 'high' | 'medium' | 'low'
    unitPrice: 'high' | 'medium' | 'low'
    brand: 'high' | 'medium' | 'low'
    deliveryDate: 'high' | 'medium' | 'low'
  }
}

export interface ProjectContext {
  projectId: string
  projectType?: string
}

export interface AIClient {
  parseMaterialsFromFile(fileBuffer: Buffer, fileName: string): Promise<MaterialItem[]>
  parseNaturalLanguage(text: string, context?: ProjectContext): Promise<MaterialItem[]>
  suggestOrderFill(items: { requisitionItemId: string; materialName: string; specification: string; quantity: number; unit: string }[], context?: ProjectContext): Promise<FillSuggestion[]>
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 3) + '****' + key.slice(-4)
}
```

---

### Task 5: AI 客户端抽象层 — 接口 + 读取配置

**Files:**
- Create: `src/lib/ai/client.ts`

- [ ] **Step 1: 创建客户端工厂**

```typescript
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import type { AiModelConfig } from '@prisma/client'
import type { AIClient } from './types'
import { OpenAIClient } from './openai-client'
import { AnthropicClient } from './anthropic-client'

export class AIClientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIClientError'
  }
}

function buildClient(config: AiModelConfig): AIClient {
  const apiKey = config.apiKey ? decrypt(config.apiKey) : ''
  const baseConfig = {
    apiKey,
    apiEndpoint: config.apiEndpoint,
    modelName: config.modelName,
  }

  switch (config.provider) {
    case 'anthropic':
      return new AnthropicClient(baseConfig)
    case 'azure':
    case 'openai':
    case 'custom':
    default:
      return new OpenAIClient(baseConfig)
  }
}

export async function getActiveAIClient(): Promise<AIClient> {
  const config = await db.aiModelConfig.findFirst({
    where: { isActive: true },
  })

  if (!config) {
    throw new AIClientError('未配置 AI 模型，请在系统设置中配置')
  }

  return buildClient(config)
}

export async function testAIConnection(config: Pick<AiModelConfig, 'provider' | 'apiEndpoint' | 'apiKey' | 'modelName'>): Promise<{ success: boolean; message: string }> {
  try {
    const apiKey = config.apiKey ? decrypt(config.apiKey) : ''
    // 简单测试：发送一个极简请求
    const baseConfig = { apiKey, apiEndpoint: config.apiEndpoint, modelName: config.modelName }
    const client = config.provider === 'anthropic'
      ? new AnthropicClient(baseConfig)
      : new OpenAIClient(baseConfig)
    await client.parseNaturalLanguage('Say OK')
    return { success: true, message: '连接成功' }
  } catch (e: any) {
    return { success: false, message: e.message || '连接失败' }
  }
}
```

- [ ] **Step 2: 创建 OpenAI 客户端**

`src/lib/ai/openai-client.ts`:

```typescript
import OpenAI from 'openai'
import type { AIClient, MaterialItem, FillSuggestion, ProjectContext } from './types'

interface ClientConfig {
  apiKey: string
  apiEndpoint: string
  modelName: string
}

export class OpenAIClient implements AIClient {
  private client: OpenAI
  private modelName: string

  constructor(config: ClientConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiEndpoint || undefined,
      timeout: 30000,
    })
    this.modelName = config.modelName || 'gpt-4o'
  }

  async parseMaterialsFromFile(fileBuffer: Buffer, fileName: string): Promise<MaterialItem[]> {
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    let fileContent: string | { type: string; data: string }

    if (isExcel) {
      // Excel: 先由代码解析为 JSON，AI 做语义映射
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
      fileContent = JSON.stringify(jsonData)
    } else {
      // PDF/其他: 发送 base64 给 AI 视觉理解
      const base64 = fileBuffer.toString('base64')
      const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png'
      fileContent = { type: 'base64', data: `data:${mimeType};base64,${base64}` }
    }

    const prompt = `你是一个工程采购助理。从以下数据中提取物资清单，返回 JSON 数组。
每个元素包含：materialName（物料名称）, specification（规格型号）, material（材质）, materialGrade（牌号）, applicableStandard（标准规范）, quantity（数量）, unit（单位）。
只返回合法的 JSON 数组，不要包含其他文字。`

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: typeof fileContent === 'string' ? fileContent : [
          { type: 'text', text: '从这张图片/文档中提取物资清单' },
          { type: 'image_url', image_url: { url: fileContent.data } },
        ]},
      ],
      response_format: { type: 'json_object' },
    })

    const text = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text)
    return Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : []
  }

  async parseNaturalLanguage(text: string, context?: ProjectContext): Promise<MaterialItem[]> {
    const prompt = `你是一个工程采购助理。将用户的自然语言描述解析为结构化的物资清单。
返回 JSON 对象，格式为 { "items": [...] }。
每个元素包含：materialName, specification, materialGrade, quantity, unit, requiredDate（可选）。
无法解析的部分放到 unresolvedText 字段。
只返回合法的 JSON 对象，不要包含其他文字。`

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: context ? `项目类型: ${context.projectType}\n\n${text}` : text },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{}')
    return result.items || []
  }

  async suggestOrderFill(
    items: { requisitionItemId: string; materialName: string; specification: string; quantity: number; unit: string }[],
    context?: ProjectContext,
  ): Promise<FillSuggestion[]> {
    // 先从数据库查询历史采购数据
    const { db } = await import('@/lib/db')
    const historyItems = await db.orderItem.findMany({
      where: {
        order: { projectId: context?.projectId },
      },
      include: { order: { select: { supplier: true, supplierId: true, supplierContact: true, supplierPhone: true } } },
      orderBy: { order: { orderDate: 'desc' } },
      take: 50,
    })

    const historyData = historyItems.map(h => ({
      materialName: h.materialName,
      specification: h.specification,
      supplier: h.order.supplier,
      supplierId: h.order.supplierId,
      unitPrice: h.unitPrice,
      brand: h.brand,
      quantity: h.quantity,
      unit: h.unit,
    }))

    const prompt = `你是一个采购助理。基于以下历史采购数据，为新材料推荐供应商、单价、品牌和交货日期。
历史数据: ${JSON.stringify(historyData)}
新采购项: ${JSON.stringify(items)}

返回 JSON 数组，每个元素包含：requisitionItemId, supplier, supplierId, unitPrice, brand, totalAmount(quantity*unitPrice), deliveryDate, confidence(对象含 supplier/unitPrice/brand/deliveryDate，值 high/medium/low)。
没有历史参考的字段填 null。只返回合法 JSON 数组。`

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: '请填充以上采购项' },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '[]')
    return Array.isArray(result) ? result : result.items || []
  }
}
```

- [ ] **Step 3: 创建 Anthropic 客户端**

`src/lib/ai/anthropic-client.ts`:

```typescript
// 简化版：调用 Anthropic API，结构与 OpenAI 客户端类似
// 使用 fetch 直接调用 Anthropic Messages API
import type { AIClient, MaterialItem, FillSuggestion, ProjectContext } from './types'

interface ClientConfig {
  apiKey: string
  apiEndpoint: string
  modelName: string
}

export class AnthropicClient implements AIClient {
  private config: ClientConfig

  constructor(config: ClientConfig) {
    this.config = {
      ...config,
      apiEndpoint: config.apiEndpoint || 'https://api.anthropic.com/v1',
      modelName: config.modelName || 'claude-sonnet-4-20250514',
    }
  }

  private async callAPI(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(`${this.config.apiEndpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.modelName,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API 错误: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.content[0]?.text || ''
  }

  async parseMaterialsFromFile(fileBuffer: Buffer, fileName: string): Promise<MaterialItem[]> {
    // Anthropic 不支持直接传文件 buffer，需要先 base64
    const base64 = fileBuffer.toString('base64')
    const response = await fetch(`${this.config.apiEndpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.modelName,
        max_tokens: 4096,
        system: '从以下文件中提取物资清单，返回 JSON 格式的数组。每个元素包含 materialName, specification, material, materialGrade, applicableStandard, quantity, unit。只返回 JSON。',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: '提取这份文件中的物资清单' },
            { type: 'document', source: { type: 'base64', media_type: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png', data: base64 } },
          ],
        }],
      }),
    })

    const data = await response.json()
    const text = data.content[0]?.text || '[]'
    try {
      const parsed = JSON.parse(text)
      return Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  async parseNaturalLanguage(text: string, context?: ProjectContext): Promise<MaterialItem[]> {
    const result = await this.callAPI(
      '将用户的自然语言描述解析为结构化物资清单。返回 JSON: { "items": [{ materialName, specification, materialGrade, quantity, unit, requiredDate }], "unresolvedText": "" }',
      context ? `项目类型: ${context.projectType}\n\n${text}` : text,
    )
    try {
      const parsed = JSON.parse(result)
      return parsed.items || []
    } catch {
      return []
    }
  }

  async suggestOrderFill(
    items: { requisitionItemId: string; materialName: string; specification: string; quantity: number; unit: string }[],
    context?: ProjectContext,
  ): Promise<FillSuggestion[]> {
    const { db } = await import('@/lib/db')
    const historyItems = await db.orderItem.findMany({
      where: { order: { projectId: context?.projectId } },
      include: { order: { select: { supplier: true, supplierId: true } } },
      orderBy: { order: { orderDate: 'desc' } },
      take: 50,
    })

    const result = await this.callAPI(
      `基于历史采购数据为新材料推荐填充信息。返回 JSON 数组。
历史数据: ${JSON.stringify(historyItems.map(h => ({ materialName: h.materialName, specification: h.specification, supplier: h.order.supplier, unitPrice: h.unitPrice, brand: h.brand })))}
每个元素含: requisitionItemId, supplier, supplierId, unitPrice, brand, totalAmount, deliveryDate, confidence{ supplier, unitPrice, brand, deliveryDate: 'high'|'medium'|'low' }`,
      JSON.stringify(items),
    )
    try {
      const parsed = JSON.parse(result)
      return Array.isArray(parsed) ? parsed : parsed.items || []
    } catch {
      return []
    }
  }
}
```

---

### Task 6: 采购单 API — 新增 status 校验

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Test: `src/__tests__/api/approval-flow.test.ts`

- [ ] **Step 1: 在 POST 方法中，创建采购单前添加校验**

在 `const { items, ...orderData } = data` 之后，`const totalAmount = ...` 之前插入：

```typescript
// 校验请购单是否存在且已审批
const requisition = await db.purchaseRequisition.findUnique({
  where: { id: orderData.requisitionId },
  select: { status: true },
})

if (!requisition) {
  return NextResponse.json({ error: '请购单不存在' }, { status: 404 })
}
if (requisition.status !== '已审批') {
  return NextResponse.json({
    error: '只有已审批的请购单才能创建采购订单',
    requisitionId: orderData.requisitionId,
    currentStatus: requisition.status,
  }, { status: 400 })
}
```

- [ ] **Step 2: 运行现有测试验证不会意外破坏**

```bash
npm test -- src/__tests__/api/orders.test.ts
```

预期：测试会失败，因为 orders 测试中请购单是"草稿"状态。这是预期的——后续在 Task 16 中更新测试。

---

### Task 7: 模拟审批 API

**Files:**
- Create: `src/app/api/requisitions/[id]/approve/route.ts`

- [ ] **Step 1: 创建审批 API**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 环境检查：生产环境且未显式启用模拟审批时拒绝
  if (process.env.MOCK_APPROVE_ENABLED !== 'true' && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '模拟审批仅在非生产环境可用' }, { status: 403 })
  }

  const { id } = await params

  const requisition = await db.purchaseRequisition.findUnique({
    where: { id },
    select: { id: true, status: true },
  })

  if (!requisition) {
    return NextResponse.json({ error: '请购单不存在' }, { status: 404 })
  }

  // 仅允许从 草稿/已提交 变更为 已审批
  if (requisition.status !== '草稿' && requisition.status !== '已提交') {
    return NextResponse.json({
      error: '当前状态不允许审批',
      currentStatus: requisition.status,
    }, { status: 400 })
  }

  await db.purchaseRequisition.update({
    where: { id },
    data: {
      status: '已审批',
      remark: `[系统] ${new Date().toLocaleString()} 模拟审批通过`,
    },
  })

  return NextResponse.json({
    id: requisition.id,
    status: '已审批',
    approved: true,
  })
}
```

- [ ] **Step 2: 添加环境变量到 `.env`**

```
MOCK_APPROVE_ENABLED=true
```

---

### Task 8: 前端 — 请购单详情页审批按钮

**Files:**
- Create: `src/components/approve-requisition-button.tsx`
- Modify: `src/app/projects/[id]/procurement/requisitions/[reqId]/page.tsx`

- [ ] **Step 1: 创建审批按钮组件**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'

interface ApproveButtonProps {
  requisitionId: string
  currentStatus: string
}

export default function ApproveRequisitionButton({ requisitionId, currentStatus }: ApproveButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const canApprove = currentStatus === '草稿' || currentStatus === '已提交'

  if (!canApprove) return null

  async function handleApprove() {
    setLoading(true)
    try {
      const res = await fetch(`/api/requisitions/${requisitionId}/approve`, { method: 'PUT' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '审批失败')
        return
      }

      toast.success('审批通过')
      router.refresh()
    } catch {
      toast.error('审批失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleApprove} disabled={loading}>
      <CheckCircle className="h-4 w-4 mr-1" />
      {loading ? '审批中...' : '审批通过'}
    </Button>
  )
}
```

- [ ] **Step 2: 在详情页添加审批按钮**

在 `src/app/projects/[id]/procurement/requisitions/[reqId]/page.tsx` 中，找到操作按钮区域（编辑按钮附近），添加：

```typescript
// 在文件顶部导入
import ApproveRequisitionButton from '@/components/approve-requisition-button'

// 在返回按钮和编辑按钮附近添加（取决于具体布局，找到按钮组区域）
<div className="flex items-center gap-2">
  {/* 可能已有编辑按钮 */}
  <ApproveRequisitionButton
    requisitionId={requisition.id}
    currentStatus={requisition.status}
  />
</div>
```

---

### Task 9: 前端 — 采购单新建页过滤请购单

**Files:**
- Modify: `src/app/projects/[id]/procurement/orders/new/page.tsx`

- [ ] **Step 1: 修改请购单列表的 fetch 请求**

将原有的 `excludeClosed=true` 改为只获取已审批的请购单：

在 `useEffect` 中，修改：

```typescript
// 原代码（约第 105 行）：
fetch(`/api/requisitions/list?projectId=${projectId}&excludeClosed=true`)

// 改为：
fetch(`/api/requisitions/list?projectId=${projectId}&status=已审批`)
```

但需要先修改后端 API 以支持按 status 过滤。如果保持当前 API 不变，也可以在前端过滤：

```typescript
// 更简洁的方式：在 fetch 后过滤
fetch(`/api/requisitions/list?projectId=${projectId}`)
  .then((r) => r.json())
  .then((data) => {
    const list = Array.isArray(data) ? data : []
    const approvedOnly = list.filter((r: any) => r.status === '已审批')
    setRequisitions(approvedOnly.map(/* ... */))
  })
```

推荐后端方案：修改 list API 支持 status 参数。

- [ ] **Step 2: 修改 list API 支持 status 过滤**

在 `src/app/api/requisitions/list/route.ts` 中，新增 status 查询参数支持：

```typescript
const status = searchParams.get('status')
// ...
if (status) {
  where.status = status
}
```

---

### Task 10: AI 模型配置 API — CRUD

**Files:**
- Create: `src/app/api/settings/ai-models/route.ts`
- Create: `src/app/api/settings/ai-models/[id]/route.ts`
- Create: `src/app/api/settings/ai-models/[id]/test/route.ts`
- Create: `src/app/api/settings/ai-models/activate/route.ts`

- [ ] **Step 1: 创建 GET（列表）+ POST（新增）**

`src/app/api/settings/ai-models/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiModelConfigSchema } from '@/lib/validations'
import { encrypt } from '@/lib/crypto'
import { maskApiKey } from '@/lib/ai/types'

export async function GET() {
  const configs = await db.aiModelConfig.findMany({
    orderBy: { createdAt: 'desc' },
  })
  // 返回时掩码 API Key
  const masked = configs.map(c => ({
    ...c,
    apiKey: c.apiKey ? maskApiKey(c.apiKey) : '',
  }))
  return NextResponse.json(masked)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = aiModelConfigSchema.parse(body)

    // 加密 API Key
    const encryptedKey = data.apiKey ? encrypt(data.apiKey) : ''

    // 如果设置为激活，先取消其他激活配置
    if (data.isActive) {
      await db.aiModelConfig.updateMany({ where: { isActive: true }, data: { isActive: false } })
    }

    const config = await db.aiModelConfig.create({
      data: {
        ...data,
        apiKey: encryptedKey,
      },
    })

    return NextResponse.json({ ...config, apiKey: maskApiKey(config.apiKey) }, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建单条编辑 + 删除 API**

`src/app/api/settings/ai-models/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiModelConfigSchema } from '@/lib/validations'
import { encrypt } from '@/lib/crypto'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const data = aiModelConfigSchema.partial().parse(body)

    const updateData: Record<string, unknown> = { ...data }
    if (data.apiKey) {
      updateData.apiKey = encrypt(data.apiKey)
    }

    // 如果设置为激活，先取消其他
    if (data.isActive) {
      await db.aiModelConfig.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      })
    }

    const config = await db.aiModelConfig.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(config)
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 })
    }
    return NextResponse.json({ error: e.message || '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  await db.aiModelConfig.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: 创建测试连接 API**

`src/app/api/settings/ai-models/[id]/test/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { testAIConnection } from '@/lib/ai/client'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const config = await db.aiModelConfig.findUnique({ where: { id } })

  if (!config) {
    return NextResponse.json({ error: '配置不存在' }, { status: 404 })
  }

  const result = await testAIConnection(config)
  return NextResponse.json(result)
}
```

- [ ] **Step 4: 创建切换激活 API**

`src/app/api/settings/ai-models/activate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { id } = await req.json()

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  // 取消所有激活
  await db.aiModelConfig.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  })

  // 激活指定配置
  await db.aiModelConfig.update({
    where: { id },
    data: { isActive: true },
  })

  return NextResponse.json({ success: true })
}
```

---

### Task 11: 前端 — AI 模型配置设置页面

**Files:**
- Create: `src/app/settings/ai-models/page.tsx`
- Create: `src/components/ai-model-form.tsx`

- [ ] **Step 1: 创建设置页面**

`src/app/settings/ai-models/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import AiModelForm from '@/components/ai-model-form'
import { Power, Trash2, Wifi, Plus } from 'lucide-react'

interface AiModelConfig {
  id: string
  label: string
  provider: string
  apiEndpoint: string
  modelName: string
  capabilities: string
  isActive: boolean
  apiKey: string
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  azure: 'Azure OpenAI',
  custom: '自定义',
}

const CAPABILITY_LABELS: Record<string, string> = {
  extract: '设计文件提取',
  nlp: '自然语言建单',
  fill: '采购单填充',
}

export default function AiModelSettingsPage() {
  const [configs, setConfigs] = useState<AiModelConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingConfig, setEditingConfig] = useState<AiModelConfig | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function loadConfigs() {
    setLoading(true)
    const res = await fetch('/api/settings/ai-models')
    const data = await res.json()
    setConfigs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadConfigs() }, [])

  async function handleTest(id: string) {
    const res = await fetch(`/api/settings/ai-models/${id}/test`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      toast.success('连接成功')
    } else {
      toast.error(data.message || '连接失败')
    }
  }

  async function handleActivate(id: string) {
    await fetch('/api/settings/ai-models/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    toast.success('已切换激活')
    loadConfigs()
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此配置？')) return
    await fetch(`/api/settings/ai-models/${id}`, { method: 'DELETE' })
    toast.success('已删除')
    loadConfigs()
  }

  async function handleSave() {
    setDialogOpen(false)
    setEditingConfig(null)
    loadConfigs()
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI 模型配置</h1>
          <p className="text-sm text-muted-foreground mt-1">管理 AI 模型连接配置</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingConfig(null)}>
              <Plus className="h-4 w-4 mr-1" />新增配置
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingConfig ? '编辑配置' : '新增配置'}</DialogTitle>
            </DialogHeader>
            <AiModelForm config={editingConfig} onSuccess={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">加载中...</p>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无 AI 模型配置，请新增
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {configs.map((cfg) => (
            <Card key={cfg.id} className={cfg.isActive ? 'ring-2 ring-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{cfg.label}</span>
                      {cfg.isActive && <Badge variant="default">已激活</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {PROVIDER_LABELS[cfg.provider] || cfg.provider} | 模型: {cfg.modelName}
                    </p>
                    <div className="flex gap-1.5 mt-1">
                      {cfg.capabilities.split(',').filter(Boolean).map((cap) => (
                        <Badge key={cap} variant="outline" className="text-xs">
                          {CAPABILITY_LABELS[cap] || cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleTest(cfg.id)}>
                      <Wifi className="h-4 w-4" />
                    </Button>
                    {!cfg.isActive && (
                      <Button variant="ghost" size="sm" onClick={() => handleActivate(cfg.id)}>
                        <Power className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingConfig(cfg); setDialogOpen(true) }}
                    >
                      编辑
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cfg.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 创建模型配置表单组件**

`src/components/ai-model-form.tsx`:

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { aiModelConfigSchema, type AiModelConfigFormValues } from '@/lib/validations'
import { useEffect } from 'react'

interface AiModelFormProps {
  config?: { id: string; label: string; provider: string; apiEndpoint: string; modelName: string; capabilities: string; isActive: boolean } | null
  onSuccess: () => void
}

export default function AiModelForm({ config, onSuccess }: AiModelFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<AiModelConfigFormValues>({
    resolver: zodResolver(aiModelConfigSchema),
    defaultValues: {
      provider: 'openai',
      label: '',
      apiEndpoint: '',
      apiKey: '',
      modelName: '',
      capabilities: 'extract,nlp,fill',
      isActive: false,
      ...(config ? { ...config, apiKey: '' } : {}),
    },
  })

  const provider = watch('provider')
  const capabilities = watch('capabilities')

  function toggleCapability(cap: string) {
    const current = (capabilities || '').split(',').filter(Boolean)
    const next = current.includes(cap) ? current.filter(c => c !== cap) : [...current, cap]
    setValue('capabilities', next.join(','))
  }

  async function onSubmit(data: AiModelConfigFormValues) {
    const url = config ? `/api/settings/ai-models/${config.id}` : '/api/settings/ai-models'
    const method = config ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error || '保存失败')
      return
    }

    toast.success(config ? '已更新' : '已创建')
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>显示名称 *</Label>
        <Input {...register('label')} placeholder="GPT-4o 主模型" />
        {errors.label && <p className="text-sm text-destructive mt-1">{errors.label.message}</p>}
      </div>

      <div>
        <Label>提供商</Label>
        <Select value={provider} onValueChange={(v) => setValue('provider', v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="azure">Azure OpenAI</SelectItem>
            <SelectItem value="custom">自定义</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>API 端点</Label>
        <Input {...register('apiEndpoint')} placeholder="https://api.openai.com/v1" />
      </div>

      <div>
        <Label>API 密钥</Label>
        <Input {...register('apiKey')} type="password" placeholder={config ? '留空则不修改' : 'sk-...'} />
      </div>

      <div>
        <Label>模型名称</Label>
        <Input {...register('modelName')} placeholder="gpt-4o / claude-sonnet-4" />
      </div>

      <div>
        <Label>能力</Label>
        <div className="flex gap-4 mt-1">
          {['extract', 'nlp', 'fill'].map((cap) => (
            <label key={cap} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={(capabilities || '').split(',').includes(cap)}
                onCheckedChange={() => toggleCapability(cap)}
              />
              {cap === 'extract' ? '设计文件提取' : cap === 'nlp' ? '自然语言建单' : '采购单填充'}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" {...register('isActive')} id="isActive" />
        <Label htmlFor="isActive">保存后立即激活</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : config ? '保存修改' : '保存并激活'}
        </Button>
      </div>
    </form>
  )
}
```

---

### Task 12: 测试 — 审批流程回归测试

**Files:**
- Create: `src/__tests__/api/approval-flow.test.ts`

- [ ] **Step 1: 创建审批流程测试**

```typescript
import { describe, it, expect } from 'vitest'
import { api, TEST_PROJECT_ID } from '../setup'

const PROJECT_ID = TEST_PROJECT_ID
let createdRequisitionId = ''
let itemId = ''
let createdOrderId = ''

describe('审批流程回归测试', () => {

  it('1. 创建草稿请购单', async () => {
    const { status, data } = await api('POST', '/api/requisitions', {
      projectId: PROJECT_ID,
      requester: '测试用户',
      procurementCategory: '材料',
      demandType: '正常采购',
      items: [
        {
          materialName: '测试钢管',
          specification: 'DN100',
          material: '碳钢',
          materialGrade: 'Q235B',
          quantity: 10,
          unit: '米',
          purpose: '审批流程测试',
        },
      ],
    })
    expect(status).toBe(201)
    expect(data.status).toBe('草稿')
    createdRequisitionId = data.id
    itemId = data.items[0].id
  })

  it('2. 草稿状态的请购单不能创建采购单', async () => {
    const { status, data } = await api('POST', '/api/orders', {
      projectId: PROJECT_ID,
      orderNo: 'TEST-APPROVAL-001',
      requisitionId: createdRequisitionId,
      purchaser: '测试',
      deliveryAddress: '测试地址',
      items: [
        {
          requisitionItemId: itemId,
          materialName: '测试钢管',
          specification: 'DN100',
          quantity: 10,
          unit: '米',
          unitPrice: 100,
          totalAmount: 1000,
        },
      ],
    })
    expect(status).toBe(400)
    expect(data.error).toContain('已审批')
    expect(data.currentStatus).toBe('草稿')
  })

  it('3. 模拟审批通过', async () => {
    const { status, data } = await api('PUT', `/api/requisitions/${createdRequisitionId}/approve`)
    expect(status).toBe(200)
    expect(data.status).toBe('已审批')
    expect(data.approved).toBe(true)
  })

  it('4. 已审批的请购单可以创建采购单', async () => {
    const { status, data } = await api('POST', '/api/orders', {
      projectId: PROJECT_ID,
      orderNo: 'TEST-APPROVAL-002',
      requisitionId: createdRequisitionId,
      purchaser: '测试',
      deliveryAddress: '测试地址',
      items: [
        {
          requisitionItemId: itemId,
          materialName: '测试钢管',
          specification: 'DN100',
          quantity: 10,
          unit: '米',
          unitPrice: 100,
          totalAmount: 1000,
        },
      ],
    })
    expect(status).toBe(201)
    createdOrderId = data.id
  })

  it('5. 重复审批应幂等', async () => {
    const { status, data } = await api('PUT', `/api/requisitions/${createdRequisitionId}/approve`)
    expect(status).toBe(200)
    expect(data.status).toBe('已审批')
  })

  it('6. 清理 - 删除采购单', async () => {
    const { status } = await api('DELETE', `/api/orders/${createdOrderId}`)
    expect(status).toBe(200)
  })

  it('7. 清理 - 删除请购单', async () => {
    const { status } = await api('DELETE', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
  })
})
```

- [ ] **Step 2: 运行测试验证**

```bash
npm test -- src/__tests__/api/approval-flow.test.ts
```

预期：7 个用例全部通过。

- [ ] **Step 3: 更新采购单测试**

修改 `src/__tests__/api/orders.test.ts`，在创建请购单后添加审批步骤，使其通过校验：

在第 2 个测试用例（创建请购单）之后、第 3 个测试用例（创建采购单）之前，添加：

```typescript
it('2.5 审批请购单', async () => {
  const { status, data } = await api('PUT', `/api/requisitions/${createdRequisitionId}/approve`)
  expect(status).toBe(200)
  expect(data.status).toBe('已审批')
})
```

同时后续用例的编号需要顺延（2→2.5→3→...）。

---

### Task 12.5: 测试 — AI 模型配置 CRUD 回归测试

**Files:**
- Create: `src/__tests__/api/ai-model-config.test.ts`

- [ ] **Step 1: 创建 AI 模型配置测试**

```typescript
import { describe, it, expect } from 'vitest'
import { api } from '../setup'

let createdConfigId = ''

describe('AI 模型配置 API 回归测试', () => {

  it('1. 新增模型配置', async () => {
    const { status, data } = await api('POST', '/api/settings/ai-models', {
      provider: 'openai',
      label: '测试模型配置',
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test-fake-key-for-testing',
      modelName: 'gpt-4o',
      capabilities: 'extract,nlp,fill',
      isActive: true,
    })
    expect(status).toBe(201)
    expect(data.label).toBe('测试模型配置')
    expect(data.isActive).toBe(true)
    // API Key 应被掩码
    expect(data.apiKey).not.toContain('sk-test-fake-key-for-testing')
    createdConfigId = data.id
  })

  it('2. 获取配置列表', async () => {
    const { status, data } = await api('GET', '/api/settings/ai-models')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThanOrEqual(1)
  })

  it('3. 编辑模型配置', async () => {
    const { status, data } = await api('PUT', `/api/settings/ai-models/${createdConfigId}`, {
      label: '测试模型配置-已修改',
      modelName: 'gpt-4o-mini',
    })
    expect(status).toBe(200)
  })

  it('4. 新增第二个配置并测试激活切换', async () => {
    const { status, data } = await api('POST', '/api/settings/ai-models', {
      provider: 'anthropic',
      label: '测试 Anthropic',
      apiEndpoint: 'https://api.anthropic.com/v1',
      apiKey: 'sk-ant-fake-key',
      modelName: 'claude-sonnet-4',
      capabilities: 'nlp',
      isActive: true,
    })
    expect(status).toBe(201)
    // 第二个配置激活后，第一个应自动取消激活
    const { data: list } = await api('GET', '/api/settings/ai-models')
    const activeCount = list.filter((c: any) => c.isActive).length
    expect(activeCount).toBe(1)
    // 清理
    await api('DELETE', `/api/settings/ai-models/${data.id}`)
  })

  it('5. 测试连接（使用假 key 应失败）', async () => {
    const { status, data } = await api('POST', `/api/settings/ai-models/${createdConfigId}/test`)
    expect(status).toBe(200)
    // 假 key 连不上，预期 success 为 false
    expect(data.success).toBe(false)
  })

  it('6. 删除模型配置', async () => {
    const { status } = await api('DELETE', `/api/settings/ai-models/${createdConfigId}`)
    expect(status).toBe(200)
  })

  it('7. 删除后查询应为空或不含已删记录', async () => {
    const { status, data } = await api('GET', '/api/settings/ai-models')
    expect(status).toBe(200)
    const found = (data as any[]).find((c: any) => c.id === createdConfigId)
    expect(found).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行测试验证**

```bash
npm test -- src/__tests__/api/ai-model-config.test.ts
```

预期：7 个用例全部通过（测试连接用例因假 key 返回 success=false，这是预期行为）。

---

## P1 阶段：AI 业务功能

### Task 13: AI 提取物资 API

**Files:**
- Create: `src/app/api/ai/extract-materials/route.ts`

- [ ] **Step 1: 创建提取物资 API**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActiveAIClient, AIClientError } from '@/lib/ai/client'
import { readFile } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const { fileIds } = await req.json()

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: '请选择至少一个文件' }, { status: 400 })
    }

    // 读取设计文件记录
    const files = await db.designDocument.findMany({
      where: { id: { in: fileIds } },
    })

    if (files.length === 0) {
      return NextResponse.json({ error: '未找到指定文件' }, { status: 404 })
    }

    const ai = await getActiveAIClient()
    const allItems: any[] = []
    const unparsedFiles: string[] = []

    for (const file of files) {
      try {
        // 构造文件物理路径（约 storage/projects/{projectId}/design/{uuid}.ext）
        const filePath = path.join(process.cwd(), file.filePath)
        const buffer = await readFile(filePath)

        const items = await ai.parseMaterialsFromFile(buffer, file.fileName)
        if (items.length === 0) {
          unparsedFiles.push(file.fileName)
        } else {
          allItems.push(...items.map(item => ({ ...item, sourceFile: file.fileName })))
        }
      } catch {
        unparsedFiles.push(file.fileName)
      }
    }

    return NextResponse.json({ items: allItems, unparsedFiles })
  } catch (e: any) {
    if (e instanceof AIClientError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '提取失败' }, { status: 500 })
  }
}
```

---

### Task 14: AI 采购单填充 API

**Files:**
- Create: `src/app/api/ai/fill-order/route.ts`

- [ ] **Step 1: 创建采购单填充 API**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getActiveAIClient, AIClientError } from '@/lib/ai/client'

export async function POST(req: NextRequest) {
  try {
    const { projectId, items } = await req.json()

    if (!projectId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const ai = await getActiveAIClient()
    const suggestions = await ai.suggestOrderFill(items, { projectId })

    return NextResponse.json({ items: suggestions })
  } catch (e: any) {
    if (e instanceof AIClientError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '填充失败' }, { status: 500 })
  }
}
```

---

### Task 15: 前端 — 设计文件提取对话框

**Files:**
- Create: `src/components/extract-materials-dialog.tsx`
- Modify: `src/app/projects/[id]/procurement/requisitions/new/page.tsx`

- [ ] **Step 1: 创建提取物资对话框组件**

`src/components/extract-materials-dialog.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { FileUp, Loader2 } from 'lucide-react'

interface DesignFile {
  id: string
  fileName: string
  discipline: string
  category: string
}

interface MaterialItem {
  materialName: string
  specification: string
  material: string
  materialGrade: string
  applicableStandard: string
  quantity: number
  unit: string
  sourceFile?: string
  _selected?: boolean
  _confident?: boolean
}

interface Props {
  projectId: string
  onConfirm: (items: MaterialItem[]) => void
}

export default function ExtractMaterialsDialog({ projectId, onConfirm }: Props) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<DesignFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [disciplineFilter, setDisciplineFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [extractedItems, setExtractedItems] = useState<MaterialItem[]>([])
  const [extracted, setExtracted] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch(`/api/design-documents/list?projectId=${projectId}`)
      .then(r => r.json())
      .then(data => setFiles(Array.isArray(data) ? data : []))
      .catch(() => toast.error('加载文件列表失败'))
  }, [open, projectId])

  async function handleExtract() {
    if (selectedFileIds.size === 0) {
      toast.error('请选择至少一个文件')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/extract-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: Array.from(selectedFileIds) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '提取失败')
        return
      }
      setExtractedItems((data.items || []).map((item: MaterialItem) => ({
        ...item,
        _selected: true,
        _confident: true,
      })))
      setExtracted(true)
      if (data.unparsedFiles?.length > 0) {
        toast.warn(`以下文件未解析成功: ${data.unparsedFiles.join(', ')}`)
      }
    } catch {
      toast.error('提取失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    const selected = extractedItems.filter(item => item._selected)
    if (selected.length === 0) {
      toast.error('请至少选择一项物资')
      return
    }
    onConfirm(selected)
    setOpen(false)
    setExtracted(false)
    setExtractedItems([])
  }

  const filteredFiles = files.filter(f =>
    !disciplineFilter || f.discipline === disciplineFilter
  )

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setExtracted(false); setExtractedItems([]) }}}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="h-4 w-4 mr-1" />从设计文件提取
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>从设计文件提取物资</DialogTitle>
        </DialogHeader>

        {!extracted ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="全部专业" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部专业</SelectItem>
                  <SelectItem value="工艺">工艺</SelectItem>
                  <SelectItem value="配管">配管</SelectItem>
                  <SelectItem value="设备">设备</SelectItem>
                  <SelectItem value="仪表">仪表</SelectItem>
                  <SelectItem value="电气">电气</SelectItem>
                  <SelectItem value="结构">结构</SelectItem>
                  <SelectItem value="建筑">建筑</SelectItem>
                  <SelectItem value="给排水">给排水</SelectItem>
                  <SelectItem value="暖通">暖通</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">共 {filteredFiles.length} 个文件</span>
            </div>

            <div className="border rounded-md max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredFiles.length > 0 && selectedFileIds.size === filteredFiles.length}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedFileIds(new Set(filteredFiles.map(f => f.id)))
                          else setSelectedFileIds(new Set())
                        }}
                      />
                    </TableHead>
                    <TableHead>文件名</TableHead>
                    <TableHead>专业</TableHead>
                    <TableHead>分类</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedFileIds.has(file.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedFileIds)
                            checked ? next.add(file.id) : next.delete(file.id)
                            setSelectedFileIds(next)
                          }}
                        />
                      </TableCell>
                      <TableCell>{file.fileName}</TableCell>
                      <TableCell>{file.discipline}</TableCell>
                      <TableCell>{file.category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleExtract} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />提取中...</> : '提取物资'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              已提取 {extractedItems.length} 条物资明细：
            </p>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={extractedItems.every(i => i._selected)}
                        onCheckedChange={(checked) => setExtractedItems(prev =>
                          prev.map(i => ({ ...i, _selected: !!checked }))
                        )}
                      />
                    </TableHead>
                    <TableHead>物料名称</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>材质</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>来源</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Checkbox
                          checked={item._selected}
                          onCheckedChange={(checked) => setExtractedItems(prev =>
                            prev.map((i, j) => j === idx ? { ...i, _selected: !!checked } : i)
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.materialName}
                          onChange={(e) => setExtractedItems(prev =>
                            prev.map((i, j) => j === idx ? { ...i, materialName: e.target.value } : i)
                          )}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.specification}
                          onChange={(e) => setExtractedItems(prev =>
                            prev.map((i, j) => j === idx ? { ...i, specification: e.target.value } : i)
                          )}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.material || ''}
                          onChange={(e) => setExtractedItems(prev =>
                            prev.map((i, j) => j === idx ? { ...i, material: e.target.value } : i)
                          )}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setExtractedItems(prev =>
                            prev.map((i, j) => j === idx ? { ...i, quantity: Number(e.target.value) } : i)
                          )}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.sourceFile}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setExtracted(false); setExtractedItems([]) }}>
                重新选择文件
              </Button>
              <Button onClick={handleConfirm}>
                确认填充到请购单
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 1.5: 创建设计文件列表 API（前端提取对话框依赖）**

`src/app/api/design-documents/list/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const documents = await db.designDocument.findMany({
    where: { projectId },
    select: { id: true, fileName: true, discipline: true, category: true },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json(documents)
}
```

- [ ] **Step 2: 在请购单新建页面添加入口**

在 `src/app/projects/[id]/procurement/requisitions/new/page.tsx` 中，在顶部操作区域添加提取按钮。

找到页面中的按钮组区域，添加：

```typescript
import ExtractMaterialsDialog from '@/components/extract-materials-dialog'

// 在 JSX 中适当位置（如在手动填写表单上方）：
<ExtractMaterialsDialog
  projectId={params.id as string}
  onConfirm={(items) => {
    // 将提取的物资填充到表单的 items 字段数组中
    items.forEach(item => {
      append({
        materialName: item.materialName,
        specification: item.specification,
        material: item.material || '',
        materialGrade: item.materialGrade || '',
        applicableStandard: item.applicableStandard || '',
        quantity: item.quantity,
        unit: item.unit,
        purpose: '',
        requiredDate: null,
        status: '待采购',
      })
    })
    toast.success(`已填充 ${items.length} 条物资明细`)
  }}
/>
```

- [ ] **Step 3: 在采购单新建页面集成 AI 填充按钮**

在 `src/app/projects/[id]/procurement/orders/new/page.tsx` 中，在已选物资列表区域上方添加 AI 填充按钮：

```typescript
// 文件顶部导入
import AiFillButton from '@/components/ai-fill-button'

// 在已选物资列表标题行附近（handleAddSelected 按钮旁边）添加：
<AiFillButton
  projectId={projectId}
  items={fields.map((f: any) => ({
    requisitionItemId: f.requisitionItemId || f.id,
    materialName: f.materialName,
    specification: f.specification,
    quantity: f.quantity,
    unit: f.unit,
  }))}
  onFill={(suggestions) => {
    suggestions.forEach((s, idx) => {
      if (idx < fields.length) {
        setValue(`items.${idx}.supplier`, s.supplier)
        setValue(`items.${idx}.supplierId`, s.supplierId)
        setValue(`items.${idx}.unitPrice`, s.unitPrice)
        setValue(`items.${idx}.brand`, s.brand)
        setValue(`items.${idx}.totalAmount`, s.totalAmount)
      }
    })
  }}
/>
```

---

## P2 阶段：AI 自然语言快速建单

### Task 17: AI 自然语言解析 API

**Files:**
- Create: `src/app/api/ai/parse-natural-lang/route.ts`

- [ ] **Step 1: 创建自然语言解析 API**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getActiveAIClient, AIClientError } from '@/lib/ai/client'

export async function POST(req: NextRequest) {
  try {
    const { text, projectId } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '请输入文本' }, { status: 400 })
    }

    const ai = await getActiveAIClient()
    const items = await ai.parseNaturalLanguage(text, projectId ? { projectId } : undefined)

    return NextResponse.json({ items })
  } catch (e: any) {
    if (e instanceof AIClientError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '解析失败' }, { status: 500 })
  }
}
```

### Task 18: 前端 — 自然语言快速建单输入框

**Files:**
- Modify: `src/app/projects/[id]/procurement/requisitions/new/page.tsx`

- [ ] **Step 1: 在新建请购单页面添加快速输入区域**

在 `src/app/projects/[id]/procurement/requisitions/new/page.tsx` 中，在表单顶部或明细表格上方添加快速输入区域：

```typescript
'use client'
// ... 已有导入基础上新增
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2 } from 'lucide-react'

// 在组件内新增 state
const [quickText, setQuickText] = useState('')
const [parsing, setParsing] = useState(false)

// 新增解析函数
async function handleQuickParse() {
  if (!quickText.trim()) {
    toast.error('请输入物资描述')
    return
  }
  setParsing(true)
  try {
    const res = await fetch('/api/ai/parse-natural-lang', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: quickText, projectId }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || '解析失败')
      return
    }
    const items = data.items || []
    items.forEach((item: any) => {
      append({
        materialName: item.materialName || '',
        specification: item.specification || '',
        material: '',
        materialGrade: item.materialGrade || '',
        applicableStandard: '',
        quantity: item.quantity || 0,
        unit: item.unit || '',
        purpose: '',
        requiredDate: item.requiredDate || null,
        status: '待采购',
      })
    })
    toast.success(`已解析 ${items.length} 条物资明细`)
    setQuickText('')
  } catch {
    toast.error('解析失败，请重试')
  } finally {
    setParsing(false)
  }
}

// 在 JSX 中表单上方添加：
<Card>
  <CardContent className="p-4 space-y-2">
    <Label>💬 一句话快速建单</Label>
    <div className="flex gap-2">
      <Textarea
        value={quickText}
        onChange={(e) => setQuickText(e.target.value)}
        placeholder="例如：买50米DN150钢管Q235B，30个法兰DN150，月底前交货"
        className="min-h-[60px]"
      />
      <Button onClick={handleQuickParse} disabled={parsing} className="shrink-0 self-end">
        {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        解析
      </Button>
    </div>
  </CardContent>
</Card>
```

---

### Task 16: 前端 — 采购单 AI 填充按钮

**Files:**
- Create: `src/components/ai-fill-button.tsx`
- Modify: `src/app/projects/[id]/procurement/orders/new/page.tsx`

- [ ] **Step 1: 创建 AI 填充按钮组件**

`src/components/ai-fill-button.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Sparkles, Loader2 } from 'lucide-react'

interface AiFillButtonProps {
  projectId: string
  items: Array<{
    requisitionItemId: string
    materialName: string
    specification: string
    quantity: number
    unit: string
  }>
  onFill: (suggestions: Array<{
    requisitionItemId: string
    supplier: string
    supplierId: string | null
    unitPrice: number
    brand: string
    totalAmount: number
    deliveryDate: string | null
    confidence: Record<string, string>
  }>) => void
}

export default function AiFillButton({ projectId, items, onFill }: AiFillButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleFill() {
    if (items.length === 0) {
      toast.error('请先选择需要采购的物资明细')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/ai/fill-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, items }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'AI 填充失败')
        return
      }

      onFill(data.items || [])
      toast.success('AI 智能填充完成')
    } catch {
      toast.error('AI 填充失败，请手动填写')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="secondary" onClick={handleFill} disabled={loading}>
      {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />填充中...</> : <><Sparkles className="h-4 w-4 mr-1" />AI 智能填充</>}
    </Button>
  )
}