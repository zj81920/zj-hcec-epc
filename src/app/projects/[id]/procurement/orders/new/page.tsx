'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { orderSchema, type OrderFormValues } from '@/lib/validations'
import { useUser } from '@/lib/user-context'
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useAiReferencePrice, confidenceTag } from '@/components/ai-reference-price'

interface SupplierOption {
  id: string
  name: string
  contactPerson: string
  phone: string
}

interface ExecutingUnitOption {
  id: string
  name: string
}

interface RequisitionItemRaw {
  id: string
  materialName: string
  specification: string
  materialCode: string
  material: string
  materialGrade: string
  applicableStandard: string
  quantity: number
  unit: string
  purpose: string
  requiredDate: string | null
  orderItems: Array<{ quantity: number }>
}

interface RequisitionCard {
  id: string
  reqNo: string
  requester: string
  reqDate: string
  status: string
  discipline: string
  items: RequisitionItemRaw[]
  expanded: boolean
  loaded: boolean
}

export default function NewOrderPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const { user } = useUser()

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [executingUnits, setExecutingUnits] = useState<ExecutingUnitOption[]>([])
  const [requisitions, setRequisitions] = useState<RequisitionCard[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [attachments, setAttachments] = useState<Array<{ fileName: string; filePath: string; fileSize: number; fileType: string }>>([])
  const [orderNo, setOrderNo] = useState('')
  const [uploading, setUploading] = useState(false)
  const [procurementMethod, setProcurementMethod] = useState<'direct' | 'inquiry'>('direct')

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema as any),
    defaultValues: {
      projectId,
      orderNo: '',
      requisitionId: '',
      purchaser: '',
      deliveryAddress: '',
      attachments: [],
      supplierId: null,
      supplier: '',
      supplierContact: '',
      supplierPhone: '',
      status: '草稿',
      remark: '',
      executingUnitId: null,
      executingUnitName: '',
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const [totalAmount, setTotalAmount] = useState(0)

  // AI 参考价
  const aiItems = fields.map(f => ({
    requisitionItemId: (f as any).requisitionItemId || f.id,
    materialName: (f as any).materialName || '',
    specification: (f as any).specification || '',
    material: (f as any).material || '',
    materialGrade: (f as any).materialGrade || '',
  }))
  const { getRef: getAiRef, loading: aiLoading } = useAiReferencePrice(projectId, aiItems)

  // 监听所有明细的数量和单价变化，重新计算合计
  useEffect(() => {
    const subscription = watch((formValues) => {
      const items = formValues.items || []
      const total = items.reduce((sum: number, item: any) => {
        return sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0)
      }, 0)
      setTotalAmount(total)
    })
    return () => subscription.unsubscribe()
  }, [watch])

  useEffect(() => {
    fetch(`/api/partners/list?type=supplier`)
      .then((r) => r.json())
      .then((data) => {
        setSuppliers(Array.isArray(data) ? data : [])
      })

    fetch(`/api/executing-units?status=启用`)
      .then((r) => r.json())
      .then((data) => {
        setExecutingUnits(Array.isArray(data) ? data : [])
      })

    fetch('/api/orders/generate-no')
      .then((r) => r.json())
      .then((data) => {
        setOrderNo(data.orderNo)
        setValue('orderNo', data.orderNo)
      })

    fetch(`/api/requisitions/list?projectId=${projectId}&status=已批准&businessStatus=正常,部分采购`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setRequisitions(list.map((r: any) => ({
          id: r.id,
          reqNo: r.reqNo,
          requester: r.requester || '',
          reqDate: r.reqDate || '',
          status: r.status || '',
          discipline: r.discipline || '',
          items: [],
          expanded: false,
          loaded: false,
        })))
      })
  }, [projectId])

  async function toggleRequisition(index: number) {
    setRequisitions((prev) => {
      const copy = [...prev]
      const req = { ...copy[index] }

      if (!req.loaded) {
        fetch(`/api/requisitions/${req.id}/items`)
          .then((r) => r.json())
          .then((items: RequisitionItemRaw[]) => {
            setRequisitions((prev2) => {
              const copy2 = [...prev2]
              copy2[index] = { ...copy2[index], items, loaded: true, expanded: true }
              return copy2
            })
          })
        return copy
      }

      req.expanded = !req.expanded
      copy[index] = req
      return copy
    })
  }

  function getRemainingQty(item: RequisitionItemRaw): number {
    const orderedQty = item.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)
    return Math.max(0, item.quantity - orderedQty)
  }

  function toggleItem(itemId: string) {
    setSelectedItemIds((prev) => {
      const copy = new Set(prev)
      if (copy.has(itemId)) {
        copy.delete(itemId)
      } else {
        copy.add(itemId)
      }
      return copy
    })
  }

  const handleAddSelected = useCallback(() => {
    const allItems = requisitions.flatMap((r) => r.items)
    const selectedItems = allItems.filter((item) => selectedItemIds.has(item.id))

    if (selectedItems.length === 0) {
      toast.error('请至少选择一项物资')
      return
    }

    // 过滤已添加到订购单明细中的请购单项，防止重复采购
    const existingIds = new Set(fields.map((f: any) => f.requisitionItemId))
    const newItems = selectedItems.filter((item) => !existingIds.has(item.id))
    if (newItems.length === 0) {
      toast.error('所选物资已在订单明细中，不可重复添加')
      setSelectedItemIds(new Set())
      return
    }
    if (newItems.length < selectedItems.length) {
      toast.info(`已跳过 ${selectedItems.length - newItems.length} 项已添加的物资`)
    }

    const matchedReq = requisitions.find((r) => r.items.some((item) => selectedItemIds.has(item.id)))
    if (matchedReq) {
      setValue('requisitionId', matchedReq.id)
      setValue('discipline', matchedReq.discipline || '')
    }

    newItems.forEach((item) => {
      append({
        requisitionItemId: item.id,
        materialName: item.materialName,
        specification: item.specification,
        materialCode: item.materialCode || '',
        material: item.material || '',
        materialGrade: item.materialGrade || '',
        applicableStandard: item.applicableStandard || '',
        brand: '',
        purpose: item.purpose || '',
        quantity: getRemainingQty(item),
        unit: item.unit,
        unitPrice: 0,
        totalAmount: 0,
        requiredDate: (item.requiredDate
          ? `${new Date(item.requiredDate).getFullYear()}-${String(new Date(item.requiredDate).getMonth() + 1).padStart(2, '0')}-${String(new Date(item.requiredDate).getDate()).padStart(2, '0')}`
          : null) as any,
      })
    })

    setSelectedItemIds(new Set())
  }, [requisitions, selectedItemIds, append, setValue])

  async function handleSupplierChange(partnerId: string) {
    const partner = suppliers.find((s) => s.id === partnerId)
    if (partner) {
      setValue('supplierId', partnerId)
      setValue('supplier', partner.name)
      setValue('supplierContact', partner.contactPerson || '')
      setValue('supplierPhone', partner.phone || '')
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '上传失败')
      }
      const uploaded = await res.json()
      setAttachments((prev) => [...prev, uploaded])
      toast.success('文件上传成功')
    } catch (e: any) {
      toast.error(e.message || '上传失败')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function handleRemoveAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(data: OrderFormValues) {
    try {
      data.attachments = attachments
      if (!data.purchaser) data.purchaser = user.name
      data.procurementMethod = procurementMethod
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('订单创建成功')
      router.push(`/projects/${projectId}/procurement/orders`)
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新建采购订单</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-6 text-sm bg-muted/50 px-4 py-2.5 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">订单编号:</span>
                <span className="font-mono">{orderNo || '生成中...'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">采购人:</span>
                <span>{user.name}</span>
              </div>
            </div>

            <div className="mb-4">
              <Label>采购方式</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant={procurementMethod === 'direct' ? 'default' : 'outline'} size="sm" onClick={() => setProcurementMethod('direct')}>直接采购</Button>
                <Button type="button" variant={procurementMethod === 'inquiry' ? 'default' : 'outline'} size="sm" onClick={() => setProcurementMethod('inquiry')}>询价采购</Button>
              </div>
              {procurementMethod === 'inquiry' && (
                <p className="text-xs text-orange-600 mt-2">询价采购模式下，供应商和单价将在发起询价后确定，创建订单时无需填写。</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="orderDate">订单日期 *</Label>
                <Input id="orderDate" type="date" {...register('orderDate')} />
                {errors.orderDate && <p className="text-sm text-destructive mt-1">{errors.orderDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchaserPhone">采购人电话 *</Label>
                <Input id="purchaserPhone" {...register('purchaserPhone')} placeholder="供应商可见" />
                {errors.purchaserPhone && <p className="text-sm text-destructive mt-1">{errors.purchaserPhone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchaserEmail">采购人邮箱</Label>
                <Input id="purchaserEmail" type="email" {...register('purchaserEmail')} placeholder="供应商可见" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="executingUnitId">采购单位</Label>
                <select
                  id="executingUnitId"
                  value={watch('executingUnitId') || ''}
                  onChange={(e) => {
                    const unit = executingUnits.find((u) => u.id === e.target.value)
                    setValue('executingUnitId', e.target.value || null)
                    setValue('executingUnitName', unit?.name || '')
                  }}
                  className="w-full h-9 border border-input rounded-md px-3 py-1 text-sm bg-background"
                >
                  <option value="">请选择采购单位</option>
                  {executingUnits.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {procurementMethod === 'direct' && (
            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label>供应商 *</Label>
                <Combobox
                  options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="请选择供应商"
                  value={watch('supplierId') || ''}
                  onSelect={(v) => handleSupplierChange(v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplierContact">供应商联系人</Label>
                <Input id="supplierContact" {...register('supplierContact')} placeholder="选择供应商自动填充" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplierPhone">供应商联系方式</Label>
                <Input id="supplierPhone" {...register('supplierPhone')} placeholder="选择供应商自动填充" />
              </div>
            </div>
            )}

            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="deliveryAddress">收货地址 *</Label>
                <Input id="deliveryAddress" {...register('deliveryAddress')} placeholder="请输入收货地址" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deliveryDate">交货日期 *</Label>
                <Input id="deliveryDate" type="date" {...register('deliveryDate')} />
                {errors.deliveryDate && <p className="text-sm text-destructive mt-1">{errors.deliveryDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>流程状态</Label>
                <Select value={watch('status')} onValueChange={(v) => setValue('status', v ?? '草稿')}>
                  <SelectTrigger className="max-w-[200px]">
                    <SelectValue placeholder="请选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="草稿">草稿</SelectItem>
                    <SelectItem value="已批准">已批准</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remark">备注</Label>
              <Textarea id="remark" {...register('remark')} rows={2} placeholder="请输入备注信息（选填）" />
            </div>

            <Separator />

            <div>
              <Label className="text-base font-semibold mb-3 block">请购单选择</Label>
              <div className="space-y-3">
                {requisitions.map((req, rIdx) => (
                  <div key={req.id} className="border rounded-lg">
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleRequisition(rIdx)}
                    >
                      {req.expanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-medium font-mono">{req.reqNo}</span>
                      <span className="text-sm text-muted-foreground">请购人: {req.requester || '-'}</span>
                      <span className="text-sm text-muted-foreground">
                        日期: {req.reqDate ? new Date(req.reqDate).toLocaleDateString('zh-CN') : '-'}
                      </span>
                      <Badge variant="secondary" className="ml-auto">{req.status}</Badge>
                    </div>

                    {req.expanded && req.loaded && (
                      <div className="px-4 pb-3">
                        {req.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">暂无明细</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-xs text-muted-foreground">
                                  <th className="py-2 px-2 w-10"></th>
                                  <th className="py-2 px-2 text-left">名称</th>
                                  <th className="py-2 px-2 text-left">规格</th>
                                  <th className="py-2 px-2 text-left">材质</th>
                                  <th className="py-2 px-2 text-left">等级</th>
                                  <th className="py-2 px-2 text-left">标准规范号</th>
                                  <th className="py-2 px-2 text-right">需求量</th>
                                  <th className="py-2 px-2 text-right">已采购</th>
                                  <th className="py-2 px-2 text-right">待采购</th>
                                  <th className="py-2 px-2 text-left">单位</th>
                                  <th className="py-2 px-2 text-left">用途</th>
                                  <th className="py-2 px-2 text-left">需求日期</th>
                                </tr>
                              </thead>
                              <tbody>
                                {req.items.map((item) => {
                                  const remaining = getRemainingQty(item)
                                  const orderedQty = item.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)
                                  return (
                                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                                      <td className="py-2 px-2">
                                        <input
                                          type="checkbox"
                                          checked={selectedItemIds.has(item.id)}
                                          onChange={() => toggleItem(item.id)}
                                          disabled={remaining <= 0}
                                          className="rounded"
                                        />
                                      </td>
                                      <td className="py-2 px-2 font-medium">{item.materialName}</td>
                                      <td className="py-2 px-2">{item.specification || '-'}</td>
                                      <td className="py-2 px-2">{item.material || '-'}</td>
                                      <td className="py-2 px-2">{item.materialGrade || '-'}</td>
                                      <td className="py-2 px-2 text-xs">{item.applicableStandard || '-'}</td>
                                      <td className="py-2 px-2 text-right">{item.quantity}</td>
                                      <td className="py-2 px-2 text-right text-muted-foreground">{orderedQty}</td>
                                      <td className="py-2 px-2 text-right font-medium text-primary">{remaining}</td>
                                      <td className="py-2 px-2">{item.unit || '-'}</td>
                                      <td className="py-2 px-2 text-xs">{item.purpose || '-'}</td>
                                      <td className="py-2 px-2 text-xs">
                                        {item.requiredDate ? new Date(item.requiredDate).toLocaleDateString('zh-CN') : '-'}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {req.expanded && !req.loaded && (
                      <div className="px-4 pb-3">
                        <p className="text-sm text-muted-foreground">加载中...</p>
                      </div>
                    )}
                  </div>
                ))}

                {requisitions.length === 0 && (
                  <p className="text-sm text-muted-foreground">暂无可用的请购单</p>
                )}
              </div>

              {selectedItemIds.size > 0 && (
                <div className="flex items-center gap-4 mt-4 p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">已选 {selectedItemIds.size} 项</span>
                  <Button type="button" size="sm" onClick={handleAddSelected}>
                    添加到订单明细
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">订单明细</Label>
              </div>
              {errors.items?.root && (
                <p className="text-sm text-destructive mb-2">{errors.items.root.message}</p>
              )}
              {fields.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="py-2 px-2 text-left">名称</th>
                        <th className="py-2 px-2 text-left">规格</th>
                        <th className="py-2 px-2 text-left">材质</th>
                        <th className="py-2 px-2 text-left">等级</th>
                        <th className="py-2 px-2 text-left">标准规范号</th>
                        <th className="py-2 px-2 text-right">数量</th>
                        <th className="py-2 px-2 text-left">单位</th>
                        <th className="py-2 px-2 text-left">用途</th>
                        <th className="py-2 px-2 text-left">需求日期</th>
                        <th className="py-2 px-2 text-left">品牌</th>
                        <th className="py-2 px-2 text-right">
                          单价
                          {procurementMethod === 'inquiry' && <span className="text-orange-500 text-[10px] font-normal block">（询价后回填）</span>}
                        </th>
                        <th className="py-2 px-2 text-right">小计</th>
                        <th className="py-2 px-2 text-left text-orange-600">AI 参考</th>
                        <th className="py-2 px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => (
                        <tr key={field.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="py-2 px-2">
                            <Input {...register(`items.${index}.materialName`)} readOnly className="bg-muted h-8" />
                          </td>
                          <td className="py-2 px-2">
                            <Input {...register(`items.${index}.specification`)} readOnly className="bg-muted h-8" />
                          </td>
                          <td className="py-2 px-2">
                            <Input {...register(`items.${index}.material`)} readOnly className="bg-muted h-8" />
                          </td>
                          <td className="py-2 px-2">
                            <Input {...register(`items.${index}.materialGrade`)} readOnly className="bg-muted h-8" />
                          </td>
                          <td className="py-2 px-2">
                            <Input {...register(`items.${index}.applicableStandard`)} readOnly className="bg-muted h-8 text-xs" />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...register(`items.${index}.quantity`, {
                                onChange: (e) => {
                                  const qty = Number(e.target.value) || 0
                                  const price = Number(
                                    (document.querySelector(`input[name="items.${index}.unitPrice"]`) as HTMLInputElement)?.value
                                  ) || 0
                                  setValue(`items.${index}.totalAmount` as any, qty * price)
                                }
                              })}
                              className="bg-muted h-8 w-20 text-right"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input {...register(`items.${index}.unit`)} readOnly className="bg-muted h-8 w-16" />
                          </td>
                          <td className="py-2 px-2">
                            <Input {...register(`items.${index}.purpose`)} readOnly className="bg-muted h-8" />
                          </td>
                          <td className="py-2 px-2">
                            <Input {...register(`items.${index}.requiredDate`)} readOnly className="bg-muted h-8 w-24 text-xs" />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              {...register(`items.${index}.brand`)}
                              placeholder="品牌"
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...register(`items.${index}.unitPrice`, {
                                onChange: (e) => {
                                  const price = Number(e.target.value) || 0
                                  const qty = Number(
                                    (document.querySelector(`input[name="items.${index}.quantity"]`) as HTMLInputElement)?.value
                                  ) || 0
                                  setValue(`items.${index}.totalAmount` as any, price * qty)
                                }
                              })}
                              placeholder={procurementMethod === 'inquiry' ? '询价后回填' : '单价'}
                              disabled={procurementMethod === 'inquiry'}
                              className="h-8 w-24 text-right"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              {...register(`items.${index}.totalAmount`)}
                              readOnly
                              className="bg-muted h-8 w-24 text-right font-medium"
                            />
                          </td>
                          <td className="py-2 px-2">
                            {(() => {
                              const ref = getAiRef((fields[index] as any).requisitionItemId || fields[index].id)
                              if (!ref || ref.confidence === 'none') return <span className="text-xs text-gray-400">-</span>
                              const tag = confidenceTag(ref.confidence)
                              return (
                                <div className="space-y-0.5">
                                  {ref.referencePrice != null && (
                                    <div className="text-xs font-medium text-orange-700">¥{ref.referencePrice.toFixed(2)}</div>
                                  )}
                                  {ref.referenceSupplier && (
                                    <div className="text-[10px] text-gray-500">{ref.referenceSupplier}</div>
                                  )}
                                  {ref.referenceBrand && (
                                    <div className="text-[10px] text-gray-500">{ref.referenceBrand}</div>
                                  )}
                                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${tag.color}`}>{tag.label}</span>
                                </div>
                              )
                            })()}
                          </td>
                          <td className="py-2 px-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive h-8 w-8 p-0"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-right font-semibold text-lg px-2 pt-3">
                    合计: ¥{totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">请从上方请购单中选择物资添加到订单明细</p>
              )}
            </div>

            <Separator />

            <div>
              <Label className="text-base font-semibold mb-3 block">附件</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="max-w-sm"
                />
                {uploading && <span className="text-sm text-muted-foreground">上传中...</span>}
              </div>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/20 text-sm">
                      <span className="max-w-[200px] truncate">{att.fileName}</span>
                      <span className="text-xs text-muted-foreground">({(att.fileSize / 1024).toFixed(1)}KB)</span>
                      <button
                        type="button"
                        className="text-destructive hover:text-destructive/80 ml-1"
                        onClick={() => handleRemoveAttachment(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? '创建中...' : '创建订单'}
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
