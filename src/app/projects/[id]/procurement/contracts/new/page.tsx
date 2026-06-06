'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { amountToChinese } from '@/lib/contract-utils'
import type {
  ContractGenerationParams,
  ContractContent,
  ContractItemData,
} from '@/lib/ai/types'

// ─── 类型定义 ────────────────────────────────────────────

interface AvailableOrder {
  id: string
  orderNo: string
  supplier: string
  supplierId: string
  supplierContact: string
  supplierPhone: string
  executingUnitId: string | null
  executingUnitName: string | null
  totalAmount: number
  deliveryAddress: string
  items: AvailableOrderItem[]
}

interface AvailableOrderItem {
  id: string
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
}

const defaultForm: FormFields = {
  contractName: '',
  executingUnitId: '',
  taxRate: '13%',
  warrantyPeriod: 12,
  paymentTerms: '30:40:20:10',
  deliveryTerm: 30,
  transportCost: '乙方承担',
  lateDeliveryPct: '1‰',
  latePaymentPct: '1‰',
  arbitrationBody: '',
}

// ─── 页面组件 ────────────────────────────────────────────

export default function NewContractPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const projectId = params.id

  // 步骤管理
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1 数据
  const [orders, setOrders] = useState<AvailableOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [lockedSupplier, setLockedSupplier] = useState<string | null>(null)

  // Step 2 数据
  const [executingUnits, setExecutingUnits] = useState<ExecutingUnit[]>([])
  const [projectName, setProjectName] = useState('')
  const [form, setForm] = useState<FormFields>(defaultForm)

  // Step 3 数据
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<ContractContent | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [generateError, setGenerateError] = useState('')

  // ─── 已选订单列表（衍生数据） ──────────────────────────

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedOrderIds.has(o.id)),
    [orders, selectedOrderIds],
  )

  const selectedTotalAmount = useMemo(
    () => selectedOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    [selectedOrders],
  )

  const selectedItemCount = useMemo(
    () => selectedOrders.reduce((sum, o) => sum + o.items.length, 0),
    [selectedOrders],
  )

  // ─── 初始加载 ──────────────────────────────────────────

  useEffect(() => {
    // 加载可用订单
    setOrdersLoading(true)
    fetch(`/api/contracts/available-orders?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data: AvailableOrder[]) => {
        setOrders(data)

        // 如果 URL 有 ?selectedOrderIds=xxx,yyy，自动选中
        const urlParams = new URLSearchParams(window.location.search)
        const preset = urlParams.get('selectedOrderIds')
        if (preset) {
          const ids = preset.split(',').filter(Boolean)
          const idsSet = new Set(ids.filter((id) => data.some((o) => o.id === id)))
          if (idsSet.size > 0) {
            setSelectedOrderIds(idsSet)
            const firstOrder = data.find((o) => idsSet.has(o.id))
            if (firstOrder) setLockedSupplier(firstOrder.supplier)
          }
        }
      })
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false))

    // 加载执行单位
    fetch('/api/executing-units?status=启用')
      .then((r) => r.json())
      .then((data: ExecutingUnit[]) => setExecutingUnits(data))
      .catch(() => setExecutingUnits([]))

    // 加载项目名称（用于自动生成合同名）
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => setProjectName(data.name || ''))
      .catch(() => {})
  }, [projectId])

  // ─── 合同名称自动生成 ──────────────────────────────────

  useEffect(() => {
    if (lockedSupplier && projectName && !form.contractName) {
      setForm((prev) => ({ ...prev, contractName: `${projectName} ${lockedSupplier} 物资合同` }))
    }
  }, [lockedSupplier, projectName])

  // ─── 选中订单时自动锁供应商 ────────────────────────────

  const toggleOrder = (order: AvailableOrder) => {
    if (lockedSupplier && order.supplier !== lockedSupplier) return // 灰化不可选

    setSelectedOrderIds((prev) => {
      const copy = new Set(prev)
      if (copy.has(order.id)) {
        copy.delete(order.id)
        // 清空后解锁
        if (copy.size === 0) setLockedSupplier(null)
      } else {
        copy.add(order.id)
        // 第一个选中时锁供应商
        if (copy.size === 1) {
          setLockedSupplier(order.supplier)
          // 自动填充执行单位
          if (order.executingUnitId) {
            setForm((prev) => ({
              ...prev,
              executingUnitId: order.executingUnitId!,
            }))
          }
        }
      }
      return copy
    })
  }

  // ─── 表单字段更新 ──────────────────────────────────────

  const updateForm = <K extends keyof FormFields>(key: K, value: FormFields[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ─── Step 2 → 3：生成合同内容 ──────────────────────────

  const handleGenerate = async () => {
    if (selectedOrders.length === 0) return
    setGenerating(true)
    setGenerateError('')
    setGeneratedContent(null)

    try {
      // 1. 汇总所有订单的 items
      const allItems: ContractItemData[] = selectedOrders.flatMap((o) =>
        o.items.map((item) => ({
          materialName: item.materialName,
          specification: item.specification,
          material: item.material,
          materialGrade: item.materialGrade,
          brand: item.brand,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalAmount: item.totalAmount,
        })),
      )

      // 2. 计算税金
      const totalAmount = allItems.reduce((sum, i) => sum + i.totalAmount, 0)
      const taxRateNum = parseInt(form.taxRate) / 100 // "13%" → 0.13
      const netAmount = totalAmount / (1 + taxRateNum)
      const taxAmount = totalAmount - netAmount

      // 3. 大写金额
      const totalAmountCN = amountToChinese(totalAmount)

      // 4. 获取甲乙方信息
      const firstOrder = selectedOrders[0]
      const buyer = executingUnits.find((u) => u.id === form.executingUnitId)

      // 5. 组装 variables
      const signDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD

      // 解析逾期百分比： "1‰" → 0.001
      const parsePermille = (v: string) => (parseFloat(v.replace('‰', '')) || 0) / 1000

      const variables = {
        taxRate: form.taxRate,
        totalAmount: Math.round(totalAmount * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmountCN,
        paymentTerms: form.paymentTerms,
        deliveryTerm: form.deliveryTerm,
        deliveryAddress: firstOrder.deliveryAddress || '',
        transportCost: form.transportCost,
        warrantyPeriod: form.warrantyPeriod,
        arbitrationBody: form.arbitrationBody,
        lateDeliveryPct: parsePermille(form.lateDeliveryPct),
        latePaymentPct: parsePermille(form.latePaymentPct),
        signDate,
      }

      // 6. 组装 ContractGenerationParams
      const params: ContractGenerationParams = {
        contractName: form.contractName,
        buyerName: buyer?.name || '',
        buyerAddress: buyer?.address || '',
        buyerContact: buyer?.contactPerson || '',
        buyerPhone: buyer?.phone || '',
        buyerBank: buyer?.bankName || '',
        buyerAccount: buyer?.bankAccount || '',
        buyerTaxId: buyer?.taxId || '',
        supplierName: firstOrder.supplier,
        supplierAddress: '',
        supplierContact: firstOrder.supplierContact,
        supplierPhone: firstOrder.supplierPhone,
        supplierBank: '',
        supplierAccount: '',
        supplierTaxId: '',
        items: allItems,
        variables,
      }

      // 7. 调用 AI 生成
      const res = await fetch('/api/contracts/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'AI 生成失败')
      }

      const data = await res.json()
      setGeneratedContent(data.content)
      setCurrentStep(3)
    } catch (e: any) {
      setGenerateError(e.message || '生成失败, 请重试')
    } finally {
      setGenerating(false)
    }
  }

  // ─── Step 3：提交合同 ─────────────────────────────────

  const handleSubmit = async () => {
    if (!generatedContent || submitting) return
    setSubmitting(true)

    try {
      // 1. 获取合同编号
      const noRes = await fetch(`/api/contracts/generate-no?projectId=${projectId}`)
      if (!noRes.ok) throw new Error('获取合同编号失败')
      const { contractNo } = await noRes.json()

      // 2. 组装提交数据
      const firstOrder = selectedOrders[0]
      const allItems = selectedOrders.flatMap((o) =>
        o.items.map((item) => ({
          orderItemId: item.id,
          materialName: item.materialName,
          specification: item.specification,
          materialCode: item.materialCode || '',
          material: item.material || '',
          materialGrade: item.materialGrade || '',
          brand: item.brand || '',
          quantity: item.quantity,
          unit: item.unit || '',
          unitPrice: item.unitPrice,
          totalAmount: item.totalAmount,
        })),
      )

      const totalAmount = allItems.reduce((sum, i) => sum + i.totalAmount, 0)
      const taxRateNum = parseInt(form.taxRate) / 100
      const taxAmount = Math.round((totalAmount - totalAmount / (1 + taxRateNum)) * 100) / 100
      const parsePermille = (v: string) => (parseFloat(v.replace('‰', '')) || 0) / 1000

      const body = {
        projectId,
        contractNo,
        contractName: form.contractName,
        supplierId: firstOrder.supplierId,
        supplier: firstOrder.supplier,
        supplierContact: firstOrder.supplierContact,
        supplierPhone: firstOrder.supplierPhone,
        executingUnitId: form.executingUnitId || null,
        executingUnitName: executingUnits.find((u) => u.id === form.executingUnitId)?.name || '',
        totalAmount: Math.round(totalAmount * 100) / 100,
        taxAmount,
        taxRate: form.taxRate,
        paymentTerms: form.paymentTerms,
        deliveryTerm: form.deliveryTerm,
        deliveryAddress: firstOrder.deliveryAddress || '',
        transportCost: form.transportCost,
        warrantyPeriod: form.warrantyPeriod,
        arbitrationBody: form.arbitrationBody,
        lateDeliveryPct: parsePermille(form.lateDeliveryPct),
        latePaymentPct: parsePermille(form.latePaymentPct),
        content: generatedContent,
        orderIds: selectedOrders.map((o) => o.id),
        items: allItems,
      }

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '创建失败')
      }

      const contract = await res.json()
      router.push(`/projects/${projectId}/procurement/contracts/${contract.id}`)
    } catch (e: any) {
      window.alert(e.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 供应商是否被锁定 ──────────────────────────────────

  const isSupplierLocked = (order: AvailableOrder) =>
    lockedSupplier !== null && order.supplier !== lockedSupplier

  // ─── 步骤指示器 ────────────────────────────────────────

  const steps = ['选择采购订单', '填写合同信息', 'AI 生成预览']

  // ─── 渲染 ──────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <nav className="text-sm text-muted-foreground">
        <a href={`/projects/${projectId}`} className="hover:text-foreground">
          项目
        </a>
        <span className="mx-2">/</span>
        <a
          href={`/projects/${projectId}/procurement`}
          className="hover:text-foreground"
        >
          采购管理
        </a>
        <span className="mx-2">/</span>
        <a
          href={`/projects/${projectId}/procurement/contracts`}
          className="hover:text-foreground"
        >
          合同管理
        </a>
        <span className="mx-2">/</span>
        <span className="text-foreground">新建合同</span>
      </nav>

      {/* 页面标题 + 步骤指示器 */}
      <div>
        <h1 className="text-2xl font-bold mb-4">新建合同</h1>
        <div className="flex items-center gap-0">
          {steps.map((label, idx) => {
            const stepNum = idx + 1
            const isActive = currentStep === stepNum
            const isDone = currentStep > stepNum
            return (
              <div key={idx} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isDone
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-primary-foreground text-primary'
                        : isDone
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}
                  >
                    {isDone ? '✓' : stepNum}
                  </span>
                  {label}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-8 h-px mx-1 ${
                      isDone ? 'bg-primary' : 'bg-muted-foreground/20'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-6">
        {/* 主内容区 */}
        <div className="flex-1 space-y-4">
          {/* ═══ Step 1: 选择采购订单 ═══ */}
          {currentStep === 1 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">选择采购订单</h2>

                {ordersLoading ? (
                  <p className="text-muted-foreground py-8 text-center">加载中...</p>
                ) : orders.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">
                    暂无可用订单（需已批准的订单且未关联合同）
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => {
                      const locked = isSupplierLocked(order)
                      const checked = selectedOrderIds.has(order.id)
                      return (
                        <div
                          key={order.id}
                          className={`border rounded-lg p-4 transition-colors ${
                            locked
                              ? 'opacity-40 cursor-not-allowed bg-muted/30'
                              : checked
                                ? 'border-primary bg-primary/5'
                                : 'hover:border-primary/50 cursor-pointer'
                          }`}
                          onClick={() => !locked && toggleOrder(order)}
                        >
                          <div className="flex items-start gap-3">
                            {/* 复选框 */}
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={locked}
                              onChange={() => toggleOrder(order)}
                              className="mt-1 rounded border-gray-300 size-4"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-mono font-medium">{order.orderNo}</span>
                                <Badge variant="secondary">{order.supplier}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-0.5">
                                <span>
                                  含税总价: <span className="font-medium text-foreground">{formatCurrency(order.totalAmount)}</span>
                                </span>
                                <span className="ml-4">
                                  关联明细: <span className="font-medium text-foreground">{order.items.length} 项</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 底部操作 */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    已选 <span className="font-semibold text-foreground">{selectedOrders.length}</span> 个订单，
                    共 <span className="font-semibold text-foreground">{selectedItemCount}</span> 项明细
                  </div>
                  <Button
                    size="lg"
                    disabled={selectedOrders.length === 0}
                    onClick={() => setCurrentStep(2)}
                  >
                    下一步
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Step 2: 填写合同信息 ═══ */}
          {currentStep === 2 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">填写合同信息</h2>

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
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <Button variant="outline" size="lg" onClick={() => setCurrentStep(1)}>
                    上一步
                  </Button>
                  <Button size="lg" onClick={handleGenerate} disabled={generating}>
                    {generating ? '生成中...' : '生成合同内容'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Step 3: AI 生成预览 ═══ */}
          {currentStep === 3 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">合同预览</h2>

                {/* 生成中 */}
                {generating && (
                  <div className="py-12 text-center">
                    <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-muted-foreground">AI 正在生成合同内容...</p>
                  </div>
                )}

                {/* 生成错误 */}
                {generateError && (
                  <div className="py-8 text-center">
                    <p className="text-destructive mb-3">{generateError}</p>
                    <Button onClick={handleGenerate}>重新生成</Button>
                  </div>
                )}

                {/* 合同章节展示 */}
                {!generating && !generateError && generatedContent && (
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {generatedContent.sections.map((section, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-base mb-2 text-primary">
                          {section.title}
                        </h3>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {section.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentStep(2)}
                    disabled={submitting}
                  >
                    上一步
                  </Button>
                  <Button
                    size="lg"
                    disabled={!generatedContent || submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? '提交中...' : '提交合同'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧区域：已选订单摘要 */}
        {(currentStep === 1 || currentStep === 2) && selectedOrders.length > 0 && (
          <div className="w-72 shrink-0">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">已选订单摘要</h3>
                <div className="space-y-2 mb-3">
                  {selectedOrders.map((order) => (
                    <div key={order.id} className="text-xs border-b pb-2 last:border-b-0">
                      <div className="font-mono font-medium">{order.orderNo}</div>
                      <div className="text-muted-foreground mt-0.5">
                        {order.supplier} · {order.items.length} 项 · {formatCurrency(order.totalAmount)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">已选订单</span>
                    <span className="font-medium">{selectedOrders.length} 个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">明细项数</span>
                    <span className="font-medium">{selectedItemCount} 项</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-1 border-t mt-1">
                    <span>合计金额</span>
                    <span>{formatCurrency(selectedTotalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}