# 请购单增强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对请购单进行业务字段扩展、自动编号、用户上下文、剩余量追踪和自动关闭

**Architecture:** Prisma Schema 加字段 → Zod 校验同步更新 → API 层加自动编号 → 前端表单/列表/详情页同步展示新字段。UserContext 提供当前用户，剩余量通过 OrderItem 关联聚合计算。

**Tech Stack:** Next.js 14+ App Router, Prisma (PostgreSQL), Zod, react-hook-form, Shadcn/ui

---

### Task 1: Prisma Schema 加字段 + 数据库迁移

**Files:**
- Modify: `prisma/schema.prisma` (PurchaseRequisition + RequisitionItem models)

- [ ] **Step 1: 更新 PurchaseRequisition 模型**

在 `status` 字段之后、`remark` 之前添加三个新字段：

```prisma
model PurchaseRequisition {
  id        String   @id @default(uuid())
  projectId String
  reqNo     String
  reqDate   DateTime @default(now())
  requester String   @default("")
  status    String   @default("草稿")
  procurementCategory String   @default("设备")
  demandType          String   @default("正常采购")
  expectedArrivalDate DateTime?
  remark    String   @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  items   RequisitionItem[]
  orders  ProcurementOrder[]

  @@index([projectId])
}
```

- [ ] **Step 2: 更新 RequisitionItem 模型**

在 `purpose` 之后、`status` 之前添加五个新字段：

```prisma
model RequisitionItem {
  id            String @id @default(uuid())
  requisitionId String
  materialName  String
  specification String @default("")
  materialCode  String @default("")
  material      String @default("")
  materialGrade String @default("")
  applicableStandard String @default("")
  quantity      Float  @default(0)
  unit          String @default("")
  purpose       String @default("")
  requiredDate  DateTime?
  status        String @default("待采购")

  requisition PurchaseRequisition @relation(fields: [requisitionId], references: [id], onDelete: Cascade)
  orderItems  OrderItem[]
}
```

- [ ] **Step 3: 执行数据库迁移**

```bash
npx prisma migrate dev --name add-requisition-fields
```

预期输出：迁移成功，生成新的迁移文件。

---

### Task 2: 创建自动编号工具函数

**Files:**
- Create: `src/lib/numbering.ts`

- [ ] **Step 1: 创建 numbering.ts**

```typescript
import { db } from '@/lib/db'

export async function generateRequisitionNo(): Promise<string> {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const prefix = `REQ-${y}${m}${d}`

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

---

### Task 3: 创建 UserContext

**Files:**
- Create: `src/lib/user-context.tsx`

- [ ] **Step 1: 创建 user-context.tsx**

```typescript
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

---

### Task 4: 在根布局中包裹 UserProvider

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 添加 UserProvider 包裹**

```typescript
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { UserProvider } from "@/lib/user-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "EPC 项目管理系统",
  description: "石油化工EPC项目管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <UserProvider>
          {children}
        </UserProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
```

---

### Task 5: 更新 Zod 校验 Schema

**Files:**
- Modify: `src/lib/validations.ts` (requisitionSchema + requisitionItemSchema)

- [ ] **Step 1: 更新 requisitionSchema**

```typescript
export const requisitionSchema = z.object({
  projectId: z.string(),
  reqNo: z.string().optional(),
  reqDate: z.coerce.date({ message: '请选择请购日期' }),
  requester: z.string().default(''),
  procurementCategory: z.string().default('设备'),
  demandType: z.string().default('正常采购'),
  expectedArrivalDate: z.coerce.date().nullable().optional(),
  status: z.string().default('草稿'),
  remark: z.string().default(''),
  items: z.array(requisitionItemSchema).min(1, '请至少添加一个采购明细'),
})
```

- [ ] **Step 2: 更新 requisitionItemSchema**

```typescript
export const requisitionItemSchema = z.object({
  materialCode: z.string().optional(),
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

### Task 6: 更新 API 路由 — 自动编号 + 新字段适配

**Files:**
- Modify: `src/app/api/requisitions/route.ts`

- [ ] **Step 1: 重写 POST 逻辑**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requisitionSchema } from '@/lib/validations'
import { generateRequisitionNo } from '@/lib/numbering'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = requisitionSchema.parse(body)
    const { items, ...reqData } = data

    const reqNo = await generateRequisitionNo()

    const requisition = await db.purchaseRequisition.create({
      data: {
        ...reqData,
        reqNo,
        requester: data.requester || '管理员',
        items: {
          create: items,
        },
      },
      include: { items: true },
    })

    return NextResponse.json(requisition, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
```

注：物料编码在创建时通过 Prisma 的 `@default` 不再可行，改为在 items.map 中分配。由于每条明细需要独立编码，采用在 API 中遍历 items 并调用 `generateMaterialCode()` 的方式。

---

### Task 7: 重构新建请购单表单

**Files:**
- Modify: `src/app/projects/[id]/procurement/requisitions/new/page.tsx`

- [ ] **Step 1: 替换为完整表单代码**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { requisitionSchema, type RequisitionFormValues } from '@/lib/validations'
import { useUser } from '@/lib/user-context'
import { Plus, Trash2 } from 'lucide-react'

const PROCUREMENT_CATEGORIES = ['设备', '材料', '服务', '其他']
const DEMAND_TYPES = ['正常采购', '紧急采购', '补单']

export default function NewRequisitionPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const { user } = useUser()
  const [reqNo, setReqNo] = useState('')

  useEffect(() => {
    fetch('/api/requisitions/generate-no')
      .then((r) => r.json())
      .then((data) => setReqNo(data.reqNo))
  }, [])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RequisitionFormValues>({
    resolver: zodResolver(requisitionSchema as any),
    defaultValues: {
      projectId,
      requester: user.name,
      procurementCategory: '设备',
      demandType: '正常采购',
      status: '草稿',
      remark: '',
      items: [{ materialName: '', specification: '', material: '', materialGrade: '', applicableStandard: '', quantity: 0, unit: '', purpose: '', status: '待采购' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const procurementCategory = watch('procurementCategory')
  const demandType = watch('demandType')

  async function onSubmit(data: RequisitionFormValues) {
    try {
      data.requester = user.name
      const res = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('请购单创建成功')
      router.push(`/projects/${projectId}/procurement/requisitions`)
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新建请购单</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2.5 rounded-lg">
              <span className="font-medium text-foreground">请购单号:</span>
              <span className="font-mono">{reqNo || '生成中...'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="reqDate">请购日期 *</Label>
                <Input id="reqDate" type="date" {...register('reqDate')} />
                {errors.reqDate && <p className="text-sm text-destructive mt-1">{errors.reqDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>需求类型</Label>
                <Select value={demandType} onValueChange={(v) => setValue('demandType', v as RequisitionFormValues['demandType'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择需求类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMAND_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>采购分类</Label>
                <Select value={procurementCategory} onValueChange={(v) => setValue('procurementCategory', v as RequisitionFormValues['procurementCategory'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择采购分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCUREMENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expectedArrivalDate">期望到货日期</Label>
              <Input id="expectedArrivalDate" type="date" {...register('expectedArrivalDate')} />
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-lg">
              <span className="font-medium text-foreground">申请人:</span>
              <span>{user.name}</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remark">备注</Label>
              <Textarea id="remark" placeholder="请输入备注信息" {...register('remark')} rows={2} />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">采购明细</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ materialName: '', specification: '', material: '', materialGrade: '', applicableStandard: '', quantity: 0, unit: '', purpose: '', status: '待采购' })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加明细
                </Button>
              </div>
              {errors.items?.root && (
                <p className="text-sm text-destructive mb-3">{errors.items.root.message}</p>
              )}
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg bg-muted/10">
                    <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">物料名称 *</Label>
                        <Input placeholder="输入物料名称" {...register(`items.${index}.materialName`)} />
                        {errors.items?.[index]?.materialName && (
                          <p className="text-xs text-destructive mt-0.5">{errors.items[index]?.materialName?.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">规格</Label>
                        <Input placeholder="规格型号" {...register(`items.${index}.specification`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">材质</Label>
                        <Input placeholder="如：碳钢" {...register(`items.${index}.material`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">牌号</Label>
                        <Input placeholder="如：Q235B" {...register(`items.${index}.materialGrade`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">标准规范</Label>
                        <Input placeholder="如：GB/T 8163" {...register(`items.${index}.applicableStandard`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">数量</Label>
                        <Input type="number" step="0.01" placeholder="0" {...register(`items.${index}.quantity`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">单位</Label>
                        <Input placeholder="个/只/套" {...register(`items.${index}.unit`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">需求日期</Label>
                        <Input type="date" {...register(`items.${index}.requiredDate`)} />
                      </div>
                    </div>
                    {fields.length > 1 && (
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          删除
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? '创建中...' : '创建请购单'}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: 新增获取请购单号的 API 路由**

创建 `src/app/api/requisitions/generate-no/route.ts`：

```typescript
import { NextResponse } from 'next/server'
import { generateRequisitionNo } from '@/lib/numbering'

export async function GET() {
  const reqNo = await generateRequisitionNo()
  return NextResponse.json({ reqNo })
}
```

---

### Task 8: 更新请购单详情页 — 展示新字段 + 剩余量

**Files:**
- Modify: `src/app/projects/[id]/procurement/requisitions/[reqId]/page.tsx`

- [ ] **Step 1: 重写详情页**

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, string> = {
  草稿: '草稿', 已提交: '已提交', 已审批: '已审批', 部分采购: '部分采购', 已关闭: '已关闭',
}

const ITEM_STATUS_MAP: Record<string, { label: string; variant: 'outline' | 'default' | 'secondary' }> = {
  待采购: { label: '待采购', variant: 'outline' },
  部分采购: { label: '部分采购', variant: 'default' },
  已采购: { label: '已采购', variant: 'secondary' },
}

function calcItemStatus(item: { quantity: number; orderItems: { quantity: number }[] }): string {
  const orderedQty = item.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)
  if (orderedQty === 0) return '待采购'
  if (orderedQty < item.quantity) return '部分采购'
  return '已采购'
}

function calcOrderedQty(item: { orderItems: { quantity: number }[] }): number {
  return item.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)
}

export default async function RequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string; reqId: string }>
}) {
  const { id, reqId } = await params
  const requisition = await db.purchaseRequisition.findUnique({
    where: { id: reqId },
    include: {
      items: {
        include: {
          orderItems: { select: { quantity: true } },
        },
      },
    },
  })

  if (!requisition) notFound()

  return (
    <div className="space-y-6">
      <Link href={`/projects/${id}/procurement/requisitions`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回列表
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>请购单 {requisition.reqNo}</CardTitle>
            <Badge>{STATUS_MAP[requisition.status] || requisition.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">请购日期</p>
              <p className="text-sm">{formatDate(requisition.reqDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">申请人</p>
              <p className="text-sm">{requisition.requester || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">采购分类</p>
              <p className="text-sm">{requisition.procurementCategory || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">需求类型</p>
              <p className="text-sm">{requisition.demandType || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">期望到货日期</p>
              <p className="text-sm">{requisition.expectedArrivalDate ? formatDate(requisition.expectedArrivalDate) : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">创建时间</p>
              <p className="text-sm">{formatDateTime(requisition.createdAt)}</p>
            </div>
          </div>
          {requisition.remark && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">备注</p>
              <p className="text-sm">{requisition.remark}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">采购明细</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>物料编码</TableHead>
                <TableHead>物料名称</TableHead>
                <TableHead>规格</TableHead>
                <TableHead>材质</TableHead>
                <TableHead>牌号</TableHead>
                <TableHead>标准规范</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>单位</TableHead>
                <TableHead className="text-right">已订购</TableHead>
                <TableHead className="text-right">剩余</TableHead>
                <TableHead>需求日期</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisition.items.map((item) => {
                const orderedQty = calcOrderedQty(item)
                const remaining = item.quantity - orderedQty
                const itemStatus = calcItemStatus(item)
                const statusInfo = ITEM_STATUS_MAP[itemStatus] || { label: itemStatus, variant: 'outline' as const }
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.materialCode || '-'}</TableCell>
                    <TableCell className="font-medium">{item.materialName}</TableCell>
                    <TableCell>{item.specification || '-'}</TableCell>
                    <TableCell>{item.material || '-'}</TableCell>
                    <TableCell>{item.materialGrade || '-'}</TableCell>
                    <TableCell>{item.applicableStandard || '-'}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    <TableCell className="text-right">{orderedQty}</TableCell>
                    <TableCell className="text-right">{remaining}</TableCell>
                    <TableCell>{item.requiredDate ? formatDate(item.requiredDate) : '-'}</TableCell>
                    <TableCell><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### Task 9: 更新请购单列表页

**Files:**
- Modify: `src/app/projects/[id]/procurement/requisitions/page.tsx`

- [ ] **Step 1: 重写列表页**

```typescript
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Plus, FileText, ShoppingCart } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  草稿: 'outline',
  已提交: 'default',
  已审批: 'default',
  部分采购: 'default',
  已关闭: 'secondary',
}

export default async function RequisitionListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const requisitions = await db.purchaseRequisition.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
    include: { items: { select: { id: true } }, orders: { select: { id: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">请购单管理</h1>
        <div className="flex gap-2">
          <Link href={`/projects/${id}/procurement/orders`}>
            <Button variant="outline">
              <ShoppingCart className="h-4 w-4 mr-1" />
              采购订单
            </Button>
          </Link>
          <Link href={`/projects/${id}/procurement/requisitions/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              新建请购单
            </Button>
          </Link>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          {requisitions.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无请购单</p>
          ) : (
            <div className="divide-y">
              {requisitions.map((r) => (
                <Link
                  key={r.id}
                  href={`/projects/${id}/procurement/requisitions/${r.id}`}
                  className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${r.status === '已关闭' ? 'opacity-60' : ''}`}
                >
                  <FileText className="h-5 w-5 text-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.reqNo}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.procurementCategory && <span className="mr-2">{r.procurementCategory}</span>}
                      {r.demandType && <span className="mr-2">| {r.demandType}</span>}
                      申请人: {r.requester || '-'} | 日期: {formatDate(r.reqDate)} | {r.items.length} 项明细
                    </p>
                  </div>
                  <Badge variant={STATUS_STYLES[r.status] as any || 'outline'}>{r.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### Task 10: 更新采购订单新建页 — 过滤已关闭请购单

**Files:**
- Modify: `src/app/projects/[id]/procurement/orders/new/page.tsx`

- [ ] **Step 1: 在请求请购单列表时过滤已关闭的**

修改 `useEffect` 中的请求地址：

```typescript
useEffect(() => {
  fetch(`/api/requisitions/list?projectId=${projectId}&excludeClosed=true`)
    .then((r) => r.json())
    .then(setReqList)
}, [projectId])
```

- [ ] **Step 2: 创建过滤用 API**

创建 `src/app/api/requisitions/list/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const excludeClosed = searchParams.get('excludeClosed') === 'true'

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const where: any = { projectId }
  if (excludeClosed) {
    where.status = { not: '已关闭' }
  }

  const list = await db.purchaseRequisition.findMany({
    where,
    select: { id: true, reqNo: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(list)
}
```

- [ ] **Step 3: 调整 item include 逻辑以携带剩余量**

在 orders/new/page.tsx 中，确认 `handleReqChange` 函数获取明细时包含剩余量信息，供前端做数量约束。无需额外修改 API，在 `/api/requisitions/[reqId]/items` 中已有基础数据，后续可根据需要补充 orderedQuantity 聚合。

---

### Task 11: TypeScript 编译验证

- [ ] **Step 1: 运行编译检查**

```bash
npx prisma generate && npx tsc --noEmit --pretty
```

预期：退出码 0，无错误输出。

- [ ] **Step 2: 如有错误则修复**

逐一排查 tsc 错误并修复，直到编译通过。
