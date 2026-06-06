# 采购订单功能改进实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对采购订单和请购单模块进行 9 项功能改进

**Architecture:** 全栈 Next.js App Router 改动，涉及 Prisma schema 校验规则更新、编号生成函数新增、页面表单组件修改。Excel 导入使用 `xlsx` 库在客户端浏览器端解析。

**Tech Stack:** Next.js 14+, TypeScript, React Hook Form, Zod, xlsx (已安装)

---

### Task 1: 新增订单编号自动生成函数

**Files:**
- Modify: `src/lib/numbering.ts`

- [ ] **Step 1: 添加 `generateOrderNo()` 函数**

在 `src/lib/numbering.ts` 末尾（`generateMaterialCode()` 之后）新增：

```typescript
export async function generateOrderNo(): Promise<string> {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const prefix = `PO-${y}${m}${d}`

  const last = await db.procurementOrder.findFirst({
    where: { orderNo: { startsWith: prefix } },
    orderBy: { orderNo: 'desc' },
    select: { orderNo: true },
  })

  let seq = 1
  if (last) {
    const lastSeq = parseInt(last.orderNo.slice(-3), 10)
    seq = lastSeq + 1
  }

  return `${prefix}-${String(seq).padStart(3, '0')}`
}
```

- [ ] **Step 2: 确认编译通过**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add src/lib/numbering.ts
git commit -m "feat: add generateOrderNo() for auto order numbering"
```

---

### Task 2: 请购单明细单位改为必填

**Files:**
- Modify: `src/lib/validations.ts`

- [ ] **Step 1: 修改 `requisitionItemSchema.unit` 校验规则**

将第 63 行从：
```typescript
  unit: z.string().default(''),
```
改为：
```typescript
  unit: z.string().min(1, '请选择单位'),
```

- [ ] **Step 2: 确认编译通过**

Run: `npx tsc --noEmit`
Expected: 无类型错误（需确认已有代码不受影响）

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations.ts
git commit -m "feat: make unit field required in requisition items"
```

---

### Task 3: 订购单新建页面 — 编号自动生成 + 采购人只读 + 日期格式 + 数量可编辑 + 移除 AI 填充 + 隐藏物料编码

**Files:**
- Modify: `src/app/projects/[id]/procurement/orders/new/page.tsx`

这是一个大任务，拆为多步。

- [ ] **Step 1: 新增导入和状态变量**

在 `import` 区域，移除：
```typescript
import AiFillButton from '@/components/ai-fill-button'
```

在 `useState` 区域（`const [attachments, setAttachments]` 之后），新增：
```typescript
const [orderNo, setOrderNo] = useState('')
```

- [ ] **Step 2: 页面加载时自动生成订单编号**

在 `useEffect` 中（第 99-122 行），在 `fetch('/api/partners/list?type=supplier')` 后面新增：
```typescript
    fetch('/api/orders/generate-no')
      .then((r) => r.json())
      .then((data) => {
        setOrderNo(data.orderNo)
        setValue('orderNo', data.orderNo)
      })
```

- [ ] **Step 3: 替换订单编号和采购人区域**

将原来的订单编号输入框（第 266-280 行）：
```tsx
            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="orderNo">订单编号 *</Label>
                <Input id="orderNo" {...register('orderNo')} placeholder="请输入订单编号" />
                {errors.orderNo && <p className="text-sm text-destructive mt-1">{errors.orderNo.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchaser">采购人</Label>
                <Input id="purchaser" {...register('purchaser')} placeholder="请输入采购人" defaultValue={user.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orderDate">订单日期 *</Label>
                <Input id="orderDate" type="date" {...register('orderDate')} />
                {errors.orderDate && <p className="text-sm text-destructive mt-1">{errors.orderDate.message}</p>}
              </div>
            </div>
```

改为：
```tsx
            <div className="flex items-center gap-6 text-sm bg-muted/50 px-4 py-2.5 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">订单编号:</span>
                <span className="font-mono">{orderNo || '生成中...'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">采购人:</span>
                <span>{user.name}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="orderDate">订单日期 *</Label>
                <Input id="orderDate" type="date" {...register('orderDate')} />
                {errors.orderDate && <p className="text-sm text-destructive mt-1">{errors.orderDate.message}</p>}
              </div>
            </div>
```

同时将 `purchaser` 从每个表单提交中移除（onSubmit 中不需要了），并在 `defaultValues` 中移除 `purchaser` 的默认值（或在提交前自动设置）。

- [ ] **Step 4: 添加订单编号 API 路由**

新增文件 `src/app/api/orders/generate-no/route.ts`：

```typescript
import { NextResponse } from 'next/server'
import { generateOrderNo } from '@/lib/numbering'

export async function GET() {
  try {
    const orderNo = await generateOrderNo()
    return NextResponse.json({ orderNo })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '生成编号失败' }, { status: 500 })
  }
}
```

- [ ] **Step 5: 请购单明细列表隐藏物料编码列**

在请购单选择区域的表格中（第 372-386 行的 `<thead>`），移除"物料编码"列头：
```tsx
                                  <th className="py-2 px-2 text-left">物料编码</th>
```
改为：
```tsx
                                  {/* 物料编码列为内部数据，不显示 */}
```

在对应的 `<tbody>` 中（第 403 行），移除：
```tsx
                                      <td className="py-2 px-2 font-mono text-xs">{item.materialCode || '-'}</td>
```

- [ ] **Step 6: 订购单明细列表隐藏物料编码列**

在订购单明细表格的 `<thead>` 中（第 485 行），移除"物料编码"列头。

在对应的 `<tbody>` 中（第 504-505 行），移除物料编码的 Input 行。

- [ ] **Step 7: 需求日期格式改为中文（YYYY-MM-DD）**

在 `handleAddSelected` 中（第 195 行），将：
```typescript
        requiredDate: item.requiredDate ? new Date(item.requiredDate) : null,
```
改为传入格式化后的 `YYYY-MM-DD` 字符串（Zod 的 `orderItemSchema.requiredDate` 是 `z.coerce.date().nullable().optional()`，submit 时会被自动转成 Date）：

```typescript
        requiredDate: item.requiredDate
          ? (() => {
              const d = new Date(item.requiredDate)
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            })()
          : null,
```

- [ ] **Step 8: 订购单明细数量可编辑**

在订购单明细表格中，移除数量 Input 的 `readOnly`：
```tsx
                            <Input type="number" {...register(`items.${index}.quantity`)} readOnly className="bg-muted h-8 w-20 text-right" />
```
改为：
```tsx
                            <Input type="number" step="0.01" {...register(`items.${index}.quantity`)} className="bg-muted h-8 w-20 text-right" />
```

并在 onChange 中添加小计联动计算：
```tsx
                            <Input type="number" step="0.01" {...register(`items.${index}.quantity`)} className="bg-muted h-8 w-20 text-right" onChange={(e) => {
                              const qty = Number(e.target.value) || 0
                              const price = Number(
                                (document.querySelector(`input[name="items.${index}.unitPrice"]`) as HTMLInputElement)?.value
                              ) || 0
                              setValue(`items.${index}.totalAmount` as any, qty * price)
                            }} />
```

- [ ] **Step 9: 移除 AI 填充按钮**

移除整个 `AiFillButton` 组件区域（第 452-476 行）：
```tsx
                {fields.length > 0 && (
                  <AiFillButton
                    projectId={projectId}
                    items={fields.map((f: any) => ({
                      ...
                    }))}
                    onFill={(suggestions) => {
                      ...
                    }}
                  />
                )}
```

保留 "订单明细" 标题和按钮的 flex 布局，但不再需要右侧的 AI 按钮。

- [ ] **Step 10: 在 onSubmit 中设置 purchaser**

由于表单中不再有 purchaser 输入框，需要在提交前设置：
```typescript
      data.purchaser = user.name
```

- [ ] **Step 11: 确认编译通过**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 12: Commit**

```bash
git add src/app/projects/\[id\]/procurement/orders/new/page.tsx src/app/api/orders/generate-no/route.ts
git commit -m "feat: improve order form - auto numbering, purchaser, date format, editable qty, remove AI, hide material code"
```

---

### Task 4: 请购单新建页面 — 移除 AI + 新增 Excel 导入 + 单位必填 + 隐藏物料编码

**Files:**
- Modify: `src/app/projects/[id]/procurement/requisitions/new/page.tsx`

- [ ] **Step 1: 移除 AI 相关导入和状态**

移除 import 中的：
```typescript
import { Plus, Trash2, Loader2, Sparkles } from 'lucide-react'
import ExtractMaterialsDialog from '@/components/extract-materials-dialog'
```
改为：
```typescript
import { Plus, Trash2, Upload } from 'lucide-react'
```

移除状态变量：
```typescript
  const [quickText, setQuickText] = useState('')
  const [parsing, setParsing] = useState(false)
```

移除 `handleQuickParse` 函数（第 37-67 行）。

- [ ] **Step 2: 替换 AI 区域为 Excel 导入按钮**

将原有的 AI 快速建单区域（第 268-302 行）：
```tsx
              {/* AI 快速建单 & 设计文件提取 */}
              <div className="space-y-3 mb-4">
                ...
              </div>
```

替换为：
```tsx
              {/* Excel 导入物料明细 */}
              <div className="mb-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  id="excel-upload"
                  className="hidden"
                  onChange={handleExcelImport}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('excel-upload')?.click()}>
                  <Upload className="h-4 w-4 mr-1" />
                  导入 Excel 物料
                </Button>
                <span className="text-xs text-muted-foreground ml-2">支持 .xlsx / .xls 格式</span>
              </div>
```

- [ ] **Step 3: 添加 Excel 导入处理函数**

在 `handleUpload` 函数之前或之后添加：

```typescript
  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        toast.error('文件中无有效数据')
        return
      }
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)

      if (!jsonData || jsonData.length === 0) {
        toast.error('文件中无有效数据')
        return
      }

      const columnMap: Record<string, string> = {
        '物料名称': 'materialName',
        '规格': 'specification',
        '材质': 'material',
        '牌号': 'materialGrade',
        '标准规范': 'applicableStandard',
        '数量': 'quantity',
        '单位': 'unit',
        '用途': 'purpose',
        '需求日期': 'requiredDate',
      }

      const firstRowKeys = Object.keys(jsonData[0])
      const hasValidColumn = firstRowKeys.some((key) => columnMap[key])
      if (!hasValidColumn) {
        toast.error('请检查 Excel 列名格式，需要包含：物料名称、规格、数量、单位等列')
        return
      }

      let importedCount = 0
      jsonData.forEach((row) => {
        const mapped: Record<string, any> = {}
        for (const [excelCol, formField] of Object.entries(columnMap)) {
          if (row[excelCol] !== undefined && row[excelCol] !== '') {
            mapped[formField] = row[excelCol]
          }
        }

        if (mapped.materialName) {
          const quantity = parseFloat(mapped.quantity) || 0
          let requiredDate: Date | null = null
          if (mapped.requiredDate) {
            const parsed = new Date(mapped.requiredDate)
            if (!isNaN(parsed.getTime())) requiredDate = parsed
          }

          append({
            materialName: mapped.materialName,
            specification: mapped.specification || '',
            material: mapped.material || '',
            materialGrade: mapped.materialGrade || '',
            applicableStandard: mapped.applicableStandard || '',
            quantity,
            unit: mapped.unit || '',
            purpose: mapped.purpose || '',
            requiredDate,
            status: '待采购',
          })
          importedCount++
        }
      })

      if (importedCount > 0) {
        toast.success(`成功导入 ${importedCount} 条物料明细`)
      } else {
        toast.error('未能从文件中解析出有效物料数据')
      }
    } catch (err) {
      toast.error('Excel 解析失败，请检查文件格式')
    } finally {
      e.target.value = ''
    }
  }
```

- [ ] **Step 4: 添加 `xlsx` 导入**

在文件顶部 import 区域添加：
```typescript
import * as XLSX from 'xlsx'
```

- [ ] **Step 5: 单位字段加必填标记**

在单位 Input 的 Label 上添加 `*`：
```tsx
                        <Label className="text-xs text-muted-foreground">单位 *</Label>
```

- [ ] **Step 6: 隐藏物料编码（如果存在）**

检查请购单新建页面表格中是否有物料编码显示。当前代码（第 306-374 行）的明细表单中没有物料编码列，跳过此步。

- [ ] **Step 7: 确认编译通过**

Run: `npx tsc --noEmit`
Expected: 无类型错误（需安装 `@types/xlsx` 或 `xlsx` 已有类型）
If needed, run: `npm i --save-dev @types/xlsx` (但 `xlsx` 库自带类型声明)

- [ ] **Step 8: Commit**

```bash
git add src/app/projects/\[id\]/procurement/requisitions/new/page.tsx
git commit -m "feat: replace AI with Excel import in requisition form, make unit required"
```

---

### Task 5: 请购单编辑页面 — 单位必填标记

**Files:**
- Modify: `src/app/projects/[id]/procurement/requisitions/[reqId]/edit/page.tsx`

- [ ] **Step 1: 单位字段加必填标记**

将第 353 行的：
```tsx
                        <Label className="text-xs text-muted-foreground">单位</Label>
```
改为：
```tsx
                        <Label className="text-xs text-muted-foreground">单位 *</Label>
```

- [ ] **Step 2: 确认编译通过**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add src/app/projects/\[id\]/procurement/requisitions/\[reqId\]/edit/page.tsx
git commit -m "fix: add required mark on unit field in requisition edit form"
```

---

### Task 6: 请购单详情页面 — 隐藏物料编码列

**Files:**
- Modify: `src/app/projects/[id]/procurement/requisitions/[reqId]/page.tsx`

- [ ] **Step 1: 移除物料编码列头**

在表格 `<thead>` 中，移除此行：
```tsx
                <TableHead>物料编码</TableHead>
```

- [ ] **Step 2: 移除物料编码列数据**

在对应的 `<tbody>` 行的第一个 `<td>`（显示物料编码的），移除它。注意移除后保持列数对齐。

- [ ] **Step 3: 确认编译通过**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/\[id\]/procurement/requisitions/\[reqId\]/page.tsx
git commit -m "fix: hide material code column in requisition detail page"
```

---

### Task 7: 清理供应商测试数据

**Files:**
- Modify: `prisma/seed-dev.ts`（或直接清除数据）

- [ ] **Step 1: 在 seed-dev.ts 中清理供应商测试数据**

在 `main()` 函数开头添加：
```typescript
  // 清理测试供应商数据（name 字段存的是 UUID，需重新添加）
  await prisma.partner.deleteMany({ where: { name: { startsWith: '00000000-0000-' } } })
  // 或者更安全的：删除所有 type=supplier 的测试数据
  // await prisma.partner.deleteMany({ where: { type: 'supplier' } })
```

或者在 `prisma/seed-dev.ts` 末尾的 `main()` 中调用后，加一个注意事项说明。

由于这是数据清理，更好的方式是用一个 SQL 或 Prisma 脚本来清理。最简单的方式：

在 `prisma/seed-dev.ts` 的 `main()` 开头添加：

```typescript
  // 清理 UUID 名称的供应商测试数据
  await prisma.partner.deleteMany({
    where: {
      type: 'supplier',
      name: { contains: '-' },  // UUID 格式包含连字符
    },
  })
```

注意：这个清理逻辑需要在 seed 执行时运行。如果你只是想手动清理一次，也可以直接在数据库中执行 `DELETE FROM "Partner" WHERE type = 'supplier' AND name LIKE '%-%'`。

最终方案：在 `prisma/seed-dev.ts` 中添加清理代码，并在终端提示用户重新添加供应商。

- [ ] **Step 2: 运行测试数据清理**

Run: `npx tsx prisma/seed-dev.ts`
Expected: 控制台输出清理+创建完成的信息

- [ ] **Step 3: Commit**

```bash
git add prisma/seed-dev.ts
git commit -m "fix: clean up supplier test data with UUID names"
```

---

### Task 8: 全局回归验证

- [ ] **Step 1: 运行 TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 2: 提醒用户回归测试**

功能已完成并编译通过。提醒用户是否需要编写测试脚本或运行现有测试进行回归验证。
