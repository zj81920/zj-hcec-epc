'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { amountToChinese } from '@/lib/contract-utils'
import { ArrowLeft, Sparkles, Save, X } from 'lucide-react'
import type {
  ContractGenerationParams,
  ContractContent,
  ContractItemData,
} from '@/lib/ai/types'

// ─── 类型定义 ────────────────────────────────────────────

interface ExecutingUnit {
  id: string
  name: string
  address: string
  contactPerson: string
  phone: string
  bankName: string
  bankAccount: string
  taxId: string
}

interface ContractOrderLink {
  id: string
  orderId: string
  order: {
    id: string
    orderNo: string
    totalAmount: number
    status: string
  }
}

interface ContractItem {
  id: string
  orderItemId: string
  materialName: string
  specification: string
  materialCode: string
  material: string
  materialGrade: string
  brand: string
  quantity: number
  unit: string
  unitPrice: number
  totalAmount: number
}

interface ContractDetail {
  id: string
  projectId: string
  contractNo: string
  contractName: string
  supplier: string
  supplierId: string | null
  supplierContact: string
  supplierPhone: string
  executingUnitId: string | null
  executingUnitName: string
  totalAmount: number
  taxAmount: number
  taxRate: string
  deliveryTerm: number
  deliveryAddress: string
  transportCost: string
  paymentTerms: string
  warrantyPeriod: number
  arbitrationBody: string
  lateDeliveryPct: number
  latePaymentPct: number
  status: string
  content: ContractContent | null
  remark: string
  orderLinks: ContractOrderLink[]
  items: ContractItem[]
}

interface FormFields {
  contractName: string
  executingUnitId: string
  taxRate: string
  warrantyPeriod: number
  paymentTerms: string
  deliveryTerm: number
  transportCost: string
  lateDeliveryPct: string
  latePaymentPct: string
  arbitrationBody: string
  remark: string
}

// 将后端存储的小数（如 0.001）格式化回选项值（"1‰"）
function permilleToOption(v: number): string {
  const permille = Math.round(v * 1000)
  return `${permille}‰`
}

function parsePermille(v: string): number {
  return (parseFloat(v.replace('‰', '')) || 0) / 1000
}

export default function EditContractPage() {
  const router = useRouter()
  const params = useParams<{ id: string; contractId: string }>()
  const projectId = params.id
  const contractId = params.contractId

  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [executingUnits, setExecutingUnits] = useState<ExecutingUnit[]>([])
  const [form, setForm] = useState<FormFields | null>(null)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [opError, setOpError] = useState<string | null>(null)

  // 加载合同详情
  const loadContract = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/contracts/${contractId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '加载失败')
      }
      const data = (await res.json()) as ContractDetail
      setContract(data)
      setForm({
        contractName: data.contractName || '',
        executingUnitId: data.executingUnitId || '',
        taxRate: data.taxRate || '13%',
        warrantyPeriod: data.warrantyPeriod || 12,
        paymentTerms: data.paymentTerms || '30:40:20:10',
        deliveryTerm: data.deliveryTerm || 30,
        transportCost: data.transportCost || '乙方承担',
        lateDeliveryPct: permilleToOption(data.lateDeliveryPct ?? 0.001),
        latePaymentPct: permilleToOption(data.latePaymentPct ?? 0.001),
        arbitrationBody: data.arbitrationBody || '',
        remark: data.remark || '',
      })
    } catch (e: any) {
      setError(e.message || '加载失败')
      setContract(null)
      setForm(null)
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    loadContract()
    // 加载执行单位
    fetch('/api/executing-units?status=启用')
      .then((r) => r.json())
      .then((data: ExecutingUnit[]) => setExecutingUnits(data))
      .catch(() => setExecutingUnits([]))
  }, [loadContract])

  const updateForm = <K extends keyof FormFields>(key: K, value: FormFields[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  // 计算金额相关派生数据
  const computeAmounts = () => {
    if (!contract || !form) return null
    const totalAmount = contract.items.reduce((sum, i) => sum + i.totalAmount, 0)
    const taxRateNum = parseInt(form.taxRate) / 100
    const netAmount = totalAmount / (1 + taxRateNum)
    const taxAmount = totalAmount - netAmount
    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
    }
  }

  // 组装 PUT 请求 body（仅变量字段）
  const buildUpdatePayload = (extra?: { content?: ContractContent }) => {
    if (!contract || !form) return null
    const amounts = computeAmounts()!
    const unit = executingUnits.find((u) => u.id === form.executingUnitId)
    return {
      contractName: form.contractName,
      executingUnitId: form.executingUnitId || null,
      executingUnitName: unit?.name || contract.executingUnitName || '',
      taxRate: form.taxRate,
      totalAmount: amounts.totalAmount,
      taxAmount: amounts.taxAmount,
      paymentTerms: form.paymentTerms,
      deliveryTerm: form.deliveryTerm,
      transportCost: form.transportCost,
      warrantyPeriod: form.warrantyPeriod,
      arbitrationBody: form.arbitrationBody,
      lateDeliveryPct: parsePermille(form.lateDeliveryPct),
      latePaymentPct: parsePermille(form.latePaymentPct),
      remark: form.remark,
      ...(extra?.content ? { content: extra.content } : {}),
    }
  }

  // 保存
  const handleSave = async () => {
    if (!contract || !form || saving) return
    const payload = buildUpdatePayload()
    if (!payload) return
    setSaving(true)
    setOpError(null)
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '保存失败')
      }
      router.push(`/projects/${projectId}/procurement/contracts/${contractId}`)
    } catch (e: any) {
      setOpError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 重新生成合同内容
  const handleRegenerate = async () => {
    if (!contract || !form || regenerating) return
    if (
      !window.confirm(
        '重新生成将覆盖现有合同正文，并自动保存。确认继续？',
      )
    ) {
      return
    }
    setRegenerating(true)
    setOpError(null)
    try {
      // 1. 组装 ContractGenerationParams（参考新建页）
      const allItems: ContractItemData[] = contract.items.map((item) => ({
        materialName: item.materialName,
        specification: item.specification,
        material: item.material,
        materialGrade: item.materialGrade,
        brand: item.brand,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount,
      }))

      const totalAmount = allItems.reduce((sum, i) => sum + i.totalAmount, 0)
      const taxRateNum = parseInt(form.taxRate) / 100
      const netAmount = totalAmount / (1 + taxRateNum)
      const taxAmount = totalAmount - netAmount
      const totalAmountCN = amountToChinese(totalAmount)
      const buyer = executingUnits.find((u) => u.id === form.executingUnitId)
      const signDate = new Date().toISOString().split('T')[0]

      const genParams: ContractGenerationParams = {
        contractName: form.contractName,
        buyerName: buyer?.name || contract.executingUnitName || '',
        buyerAddress: buyer?.address || '',
        buyerContact: buyer?.contactPerson || '',
        buyerPhone: buyer?.phone || '',
        buyerBank: buyer?.bankName || '',
        buyerAccount: buyer?.bankAccount || '',
        buyerTaxId: buyer?.taxId || '',
        supplierName: contract.supplier,
        supplierAddress: '',
        supplierContact: contract.supplierContact,
        supplierPhone: contract.supplierPhone,
        supplierBank: '',
        supplierAccount: '',
        supplierTaxId: '',
        items: allItems,
        variables: {
          taxRate: form.taxRate,
          totalAmount: Math.round(totalAmount * 100) / 100,
          taxAmount: Math.round(taxAmount * 100) / 100,
          totalAmountCN,
          paymentTerms: form.paymentTerms,
          deliveryTerm: form.deliveryTerm,
          deliveryAddress: contract.deliveryAddress || '',
          transportCost: form.transportCost,
          warrantyPeriod: form.warrantyPeriod,
          arbitrationBody: form.arbitrationBody,
          lateDeliveryPct: parsePermille(form.lateDeliveryPct),
          latePaymentPct: parsePermille(form.latePaymentPct),
          signDate,
        },
      }

      // 2. 调用 AI 生成
      const genRes = await fetch('/api/contracts/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genParams),
      })
      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({}))
        throw new Error(err.error || 'AI 生成失败')
      }
      const { content } = (await genRes.json()) as { content: ContractContent }

      // 3. PUT 保存（带新的 content）
      const payload = buildUpdatePayload({ content })
      if (!payload) throw new Error('数据异常')
      const putRes = await fetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}))
        throw new Error(err.error || '保存失败')
      }
      router.push(`/projects/${projectId}/procurement/contracts/${contractId}`)
    } catch (e: any) {
      setOpError(e.message || '重新生成失败')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return <p className="text-center text-muted-foreground py-12">加载中...</p>
  }

  if (error || !contract || !form) {
    return (
      <div className="space-y-4">
        <Link href={`/projects/${projectId}/procurement/contracts`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回列表
          </Button>
        </Link>
        <p className="text-center text-red-600 py-12">{error || '合同不存在'}</p>
      </div>
    )
  }

  const editable = contract.status === '草稿' || contract.status === '已驳回'

  // 不可编辑：显示提示，禁止编辑
  if (!editable) {
    return (
      <div className="space-y-4">
        <nav className="text-sm text-muted-foreground">
          <Link href={`/projects/${projectId}`} className="hover:text-foreground">
            项目
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/projects/${projectId}/procurement/contracts`}
            className="hover:text-foreground"
          >
            合同管理
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">编辑</span>
        </nav>
        <Link
          href={`/projects/${projectId}/procurement/contracts/${contractId}`}
        >
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回详情
          </Button>
        </Link>
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <p className="text-base font-medium text-red-600">
              当前合同状态为「{contract.status}」，不可编辑
            </p>
            <p className="text-sm text-muted-foreground">
              仅「草稿」或「已驳回」状态的合同允许修改
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <nav className="text-sm text-muted-foreground">
        <Link href={`/projects/${projectId}`} className="hover:text-foreground">
          项目
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/projects/${projectId}/procurement`}
          className="hover:text-foreground"
        >
          采购管理
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/projects/${projectId}/procurement/contracts`}
          className="hover:text-foreground"
        >
          合同管理
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/projects/${projectId}/procurement/contracts/${contractId}`}
          className="hover:text-foreground"
        >
          {contract.contractNo}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">编辑</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">编辑合同</h1>
        <Badge variant="secondary">{contract.status}</Badge>
      </div>

      {opError && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm p-3">
          {opError}
        </div>
      )}

      {/* 提示：订单与明细不可重新选择 */}
      <div className="rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-xs p-3">
        编辑模式下仅允许修改合同变量字段；如需调整订单或明细，请先删除合同后重新创建。
      </div>

      {/* 合同变量字段 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">合同信息</h2>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* 合同名称 */}
            <div className="col-span-2 space-y-1.5">
              <Label>合同名称 *</Label>
              <Input
                value={form.contractName}
                onChange={(e) => updateForm('contractName', e.target.value)}
                placeholder="请输入合同名称"
              />
            </div>

            {/* 采购单位 */}
            <div className="space-y-1.5">
              <Label>采购单位（甲方）</Label>
              <select
                value={form.executingUnitId}
                onChange={(e) => updateForm('executingUnitId', e.target.value)}
                className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-background"
              >
                <option value="">请选择采购单位</option>
                {executingUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 税率 */}
            <div className="space-y-1.5">
              <Label>税率</Label>
              <select
                value={form.taxRate}
                onChange={(e) => updateForm('taxRate', e.target.value)}
                className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-background"
              >
                <option value="13%">13%</option>
                <option value="9%">9%</option>
                <option value="6%">6%</option>
                <option value="3%">3%</option>
              </select>
            </div>

            {/* 质保期 */}
            <div className="space-y-1.5">
              <Label>质保期</Label>
              <select
                value={form.warrantyPeriod}
                onChange={(e) => updateForm('warrantyPeriod', Number(e.target.value))}
                className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-background"
              >
                <option value={12}>12个月</option>
                <option value={18}>18个月</option>
                <option value={24}>24个月</option>
                <option value={36}>36个月</option>
              </select>
            </div>

            {/* 付款比例 */}
            <div className="space-y-1.5">
              <Label>付款比例</Label>
              <select
                value={form.paymentTerms}
                onChange={(e) => updateForm('paymentTerms', e.target.value)}
                className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-background"
              >
                <option value="30:40:20:10">30:40:20:10（推荐）</option>
                <option value="20:50:20:10">20:50:20:10</option>
                <option value="40:40:10:10">40:40:10:10</option>
                <option value="50:30:10:10">50:30:10:10</option>
              </select>
            </div>

            {/* 交货期限 */}
            <div className="space-y-1.5">
              <Label>交货期限</Label>
              <select
                value={form.deliveryTerm}
                onChange={(e) => updateForm('deliveryTerm', Number(e.target.value))}
                className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-background"
              >
                <option value={15}>15天</option>
                <option value={30}>30天</option>
                <option value={45}>45天</option>
                <option value={60}>60天</option>
              </select>
            </div>

            {/* 运输费用 */}
            <div className="space-y-1.5">
              <Label>运输费用</Label>
              <select
                value={form.transportCost}
                onChange={(e) => updateForm('transportCost', e.target.value)}
                className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-background"
              >
                <option value="乙方承担">乙方承担</option>
                <option value="甲方承担">甲方承担</option>
              </select>
            </div>

            {/* 逾期交货违约金 */}
            <div className="space-y-1.5">
              <Label>逾期交货违约金</Label>
              <select
                value={form.lateDeliveryPct}
                onChange={(e) => updateForm('lateDeliveryPct', e.target.value)}
                className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-background"
              >
                <option value="1‰">1‰/天</option>
                <option value="2‰">2‰/天</option>
                <option value="5‰">5‰/天</option>
              </select>
            </div>

            {/* 逾期付款违约金 */}
            <div className="space-y-1.5">
              <Label>逾期付款违约金</Label>
              <select
                value={form.latePaymentPct}
                onChange={(e) => updateForm('latePaymentPct', e.target.value)}
                className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-background"
              >
                <option value="1‰">1‰/天</option>
                <option value="2‰">2‰/天</option>
                <option value="5‰">5‰/天</option>
              </select>
            </div>

            {/* 仲裁委员会 */}
            <div className="space-y-1.5">
              <Label>仲裁委员会</Label>
              <Input
                value={form.arbitrationBody}
                onChange={(e) => updateForm('arbitrationBody', e.target.value)}
                placeholder="如: 北京仲裁委员会"
              />
            </div>

            {/* 备注 */}
            <div className="col-span-2 space-y-1.5">
              <Label>备注</Label>
              <Input
                value={form.remark}
                onChange={(e) => updateForm('remark', e.target.value)}
                placeholder="选填"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 只读：关联订单 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-3">
            关联采购订单（{contract.orderLinks.length}）
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              不可修改
            </span>
          </h2>
          {contract.orderLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无关联订单</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contract.orderLinks.map((link) => (
                <div
                  key={link.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/20 text-sm"
                >
                  <span className="font-mono">{link.order.orderNo}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(link.order.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 只读：物资明细 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-3">
            物资明细
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              不可修改
            </span>
          </h2>
          {contract.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无明细</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物资名称</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>材质</TableHead>
                    <TableHead>品牌</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead className="text-right">含税单价</TableHead>
                    <TableHead className="text-right">含税总价</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.materialName}
                      </TableCell>
                      <TableCell>{item.specification || '-'}</TableCell>
                      <TableCell>{item.material || '-'}</TableCell>
                      <TableCell>{item.brand || '-'}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right font-semibold text-lg pt-4">
                合计: {formatCurrency(
                  contract.items.reduce((s, i) => s + i.totalAmount, 0),
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 底部操作按钮 */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Link
          href={`/projects/${projectId}/procurement/contracts/${contractId}`}
        >
          <Button variant="outline" size="lg" disabled={saving || regenerating}>
            <X className="h-4 w-4 mr-1" />
            取消
          </Button>
        </Link>
        <Button
          variant="outline"
          size="lg"
          disabled={saving || regenerating}
          onClick={handleRegenerate}
        >
          <Sparkles className="h-4 w-4 mr-1" />
          {regenerating ? '重新生成中...' : '重新生成合同内容'}
        </Button>
        <Button size="lg" disabled={saving || regenerating} onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )
}
