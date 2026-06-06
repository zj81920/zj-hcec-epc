'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { orderSchema, type OrderFormValues } from '@/lib/validations'
import { useUser } from '@/lib/user-context'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useAiReferencePrice, confidenceTag } from '@/components/ai-reference-price'
import { z } from 'zod'

// 编辑模式宽松验证
const editOrderSchema = orderSchema.extend({ items: z.array(z.any()).default([]) })

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

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const orderId = params.orderId as string
  const { user } = useUser()

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [executingUnits, setExecutingUnits] = useState<ExecutingUnitOption[]>([])
  const [requisitions, setRequisitions] = useState<RequisitionCard[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [procurementMethod, setProcurementMethod] = useState<'direct' | 'inquiry'>('direct')

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(editOrderSchema as any),
    defaultValues: {
      projectId,
      orderNo: '',
      requisitionId: '',
      purchaser: user?.name || '',
      deliveryAddress: '',
      attachments: [],
      supplierId: null,
      supplier: '',
      supplierContact: '',
      supplierPhone: '',
      status: '草稿',
      remark: '',
      procurementMethod: 'direct',
      purchaserPhone: '',
      purchaserEmail: '',
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

  // 监听明细变更计算合计
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

  // 加载订单数据 + 供应商 + 请购单
  useEffect(() => {
    async function loadData() {
      try {
        const [suppliersRes, orderRes] = await Promise.all([
          fetch(`/api/partners/list?type=supplier`),
          fetch(`/api/orders/${orderId}`),
        ])
        const suppliersData = await suppliersRes.json()
        const orderData = await orderRes.json()

        setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])

        // 加载执行单位
        fetch(`/api/executing-units?status=启用`)
          .then((r) => r.json())
          .then((data) => setExecutingUnits(Array.isArray(data) ? data : []))

        if (orderData) {
          const method = orderData.procurementMethod || 'direct'
          setProcurementMethod(method)
          reset({
            projectId,
            orderNo: orderData.orderNo || '',
            requisitionId: orderData.requisitionId || '',
            purchaser: orderData.purchaser || user?.name || '',
            deliveryAddress: orderData.deliveryAddress || '',
            attachments: orderData.attachments || [],
            supplierId: orderData.supplierId || null,
            supplier: orderData.supplier || '',
            supplierContact: orderData.supplierContact || '',
            supplierPhone: orderData.supplierPhone || '',
            status: orderData.status || '草稿',
            remark: orderData.remark || '',
            procurementMethod: method,
            purchaserPhone: orderData.purchaserPhone || '',
            purchaserEmail: orderData.purchaserEmail || '',
            executingUnitId: orderData.executingUnitId || null,
            executingUnitName: orderData.executingUnitName || '',
            orderDate: (orderData.orderDate ? new Date(orderData.orderDate).toISOString().split('T')[0] : '') as any,
            deliveryDate: (orderData.deliveryDate ? new Date(orderData.deliveryDate).toISOString().split('T')[0] : '') as any,
            items: (orderData.items || []).map((item: any) => ({
              id: item.id,
              requisitionItemId: item.requisitionItemId,
              materialName: item.materialName || '',
              specification: item.specification || '',
              material: item.material || '',
              materialGrade: item.materialGrade || '',
              brand: item.brand || '',
              unit: item.unit || '',
              quantity: item.quantity || 0,
              unitPrice: item.unitPrice || 0,
              totalAmount: item.totalAmount || 0,
              applicableStandard: item.applicableStandard || '',
              materialCode: item.materialCode || '',
            })),
          })
        }

        // 加载可用请购单
        const reqRes = await fetch(`/api/requisitions/list?projectId=${projectId}&status=已批准&businessStatus=正常,部分采购`)
        const reqData = await reqRes.json()
        const reqList = Array.isArray(reqData) ? reqData : []
        setRequisitions(reqList.map((r: any) => ({
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
      } catch (e) {
        toast.error('加载数据失败')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [projectId, orderId, user, reset])

  // 请购单展开/折叠
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
      if (copy.has(itemId)) copy.delete(itemId)
      else copy.add(itemId)
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
        specification: item.specification || '',
        materialCode: item.materialCode || '',
        material: item.material || '',
        materialGrade: item.materialGrade || '',
        applicableStandard: item.applicableStandard || '',
        brand: '',
        quantity: getRemainingQty(item),
        unit: item.unit || '',
        unitPrice: 0,
        totalAmount: 0,
      } as any)
    })

    setSelectedItemIds(new Set())
  }, [requisitions, selectedItemIds, fields, append, setValue])

  // 采购方式切换
  const handleMethodChange = (method: 'direct' | 'inquiry') => {
    if (method === procurementMethod) return
    if (!confirm(method === 'inquiry' ? '切换为询价采购将清空供应商信息和明细单价，确定切换吗？' : '切换为直接采购将清空询价相关数据，确定切换吗？')) return
    setProcurementMethod(method)
    setValue('procurementMethod', method)
    if (method === 'inquiry') {
      setValue('supplier', '')
      setValue('supplierContact', '')
      setValue('supplierPhone', '')
      setValue('supplierId', null)
      fields.forEach((_, idx) => {
        setValue(`items.${idx}.unitPrice`, 0)
        setValue(`items.${idx}.totalAmount`, 0)
      })
    }
  }

  const onSubmit = async (data: OrderFormValues) => {
    try {
      const payload = {
        ...data,
        procurementMethod,
        deliveryDate: data.deliveryDate || undefined,
        orderDate: data.orderDate || undefined,
        items: data.items.map((item: any) => ({
          ...item,
          unitPrice: Number(item.unitPrice) || 0,
          quantity: Number(item.quantity) || 0,
        })),
      }
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '保存失败')
      }
      toast.success('订单已更新')
      router.push(`/projects/${projectId}/procurement/orders/${orderId}`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />返回
        </Button>
        <h1 className="text-lg font-semibold">编辑采购订单</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>订单编号</Label>
                <Input {...register('orderNo')} disabled className="bg-muted" />
              </div>
              <div>
                <Label>采购人</Label>
                <Input value={user?.name || ''} disabled className="bg-muted" />
              </div>
              <div>
                <Label>采购人电话 *</Label>
                <Input {...register('purchaserPhone')} placeholder="供应商可见" />
                {errors.purchaserPhone && <p className="text-sm text-destructive mt-1">{errors.purchaserPhone.message}</p>}
              </div>
              <div>
                <Label>采购人邮箱</Label>
                <Input type="email" {...register('purchaserEmail')} placeholder="供应商可见" />
              </div>
              <div>
                <Label>订单日期</Label>
                <Input type="date" {...register('orderDate')} />
              </div>
              <div>
                <Label>交货日期</Label>
                <Input type="date" {...register('deliveryDate')} />
              </div>
            </div>

            <div>
              <Label>采购方式</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant={procurementMethod === 'direct' ? 'default' : 'outline'} size="sm" onClick={() => handleMethodChange('direct')}>直接采购</Button>
                <Button type="button" variant={procurementMethod === 'inquiry' ? 'default' : 'outline'} size="sm" onClick={() => handleMethodChange('inquiry')}>询价采购</Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>供应商</Label>
                <Combobox
                  options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="请选择供应商"
                  value={watch('supplierId') || ''}
                  onSelect={(v) => {
                    const partner = suppliers.find((s) => s.id === v)
                    if (partner) {
                      setValue('supplierId', v)
                      setValue('supplier', partner.name)
                      setValue('supplierContact', partner.contactPerson || '')
                      setValue('supplierPhone', partner.phone || '')
                    }
                  }}
                />
              </div>
              <div>
                <Label>供应商联系人</Label>
                <Input {...register('supplierContact')} />
              </div>
              <div>
                <Label>供应商电话</Label>
                <Input {...register('supplierPhone')} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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

            <div><Label>收货地址</Label><Input {...register('deliveryAddress')} /></div>
            <div><Label>备注</Label><Textarea {...register('remark')} rows={2} /></div>
          </CardContent>
        </Card>

        <Separator className="my-4" />

        {/* 请购单物资选择 */}
        <Card>
          <CardHeader><CardTitle className="text-base">从请购单添加物资</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requisitions.map((req, rIdx) => (
                <div key={req.id} className="border rounded-lg">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleRequisition(rIdx)}
                  >
                    {req.expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="font-medium font-mono">{req.reqNo}</span>
                    <span className="text-sm text-muted-foreground">请购人: {req.requester || '-'}</span>
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
                                <th className="py-2 px-2 text-right">需求量</th>
                                <th className="py-2 px-2 text-right">已采购</th>
                                <th className="py-2 px-2 text-right">待采购</th>
                                <th className="py-2 px-2 text-left">单位</th>
                              </tr>
                            </thead>
                            <tbody>
                              {req.items.map((item) => {
                                const remaining = getRemainingQty(item)
                                const orderedQty = item.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)
                                return (
                                  <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                                    <td className="py-2 px-2">
                                      <input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => toggleItem(item.id)} disabled={remaining <= 0} className="rounded" />
                                    </td>
                                    <td className="py-2 px-2 font-medium">{item.materialName}</td>
                                    <td className="py-2 px-2">{item.specification || '-'}</td>
                                    <td className="py-2 px-2">{item.material || '-'}</td>
                                    <td className="py-2 px-2 text-right">{item.quantity}</td>
                                    <td className="py-2 px-2 text-right text-muted-foreground">{orderedQty}</td>
                                    <td className="py-2 px-2 text-right font-medium text-primary">{remaining}</td>
                                    <td className="py-2 px-2">{item.unit || '-'}</td>
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
                    <div className="px-4 pb-3"><p className="text-sm text-muted-foreground">加载中...</p></div>
                  )}
                </div>
              ))}
              {requisitions.length === 0 && <p className="text-sm text-muted-foreground">暂无可用的请购单</p>}
            </div>

            {selectedItemIds.size > 0 && (
              <div className="flex items-center gap-4 mt-4 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">已选 {selectedItemIds.size} 项物资</span>
                <Button type="button" size="sm" onClick={handleAddSelected}>
                  <Plus className="h-3 w-3 mr-1" />添加到订单明细
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="my-4" />

        {/* 明细表 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">物资明细</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ requisitionItemId: '', materialName: '', specification: '', material: '', materialGrade: '', brand: '', unit: '', quantity: 1, unitPrice: 0, totalAmount: 0, applicableStandard: '', materialCode: '' } as any)}>
              <Plus className="h-3 w-3 mr-1" />手动添加行
            </Button>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无明细，请从上方请购单添加或手动添加</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">操作</TableHead>
                        <TableHead>物资名称</TableHead>
                        <TableHead>规格</TableHead>
                        <TableHead>材质</TableHead>
                        <TableHead>品牌</TableHead>
                        <TableHead className="text-right w-20">数量</TableHead>
                        <TableHead className="w-16">单位</TableHead>
                        <TableHead className="text-right w-24">
                          单价
                          {procurementMethod === 'inquiry' && <span className="text-orange-500 text-[10px] font-normal block">（报价后回填）</span>}
                        </TableHead>
                        <TableHead className="text-right w-24">小计</TableHead>
                        <TableHead className="text-left text-orange-600">AI 参考</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(index)}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </TableCell>
                          <TableCell><Input {...register(`items.${index}.materialName`)} className="h-8 text-sm" /></TableCell>
                          <TableCell><Input {...register(`items.${index}.specification`)} className="h-8 text-sm" /></TableCell>
                          <TableCell><Input {...register(`items.${index}.material`)} className="h-8 text-sm" /></TableCell>
                          <TableCell><Input {...register(`items.${index}.brand`)} className="h-8 text-sm" /></TableCell>
                          <TableCell><Input type="number" step="any" min="0" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="h-8 text-sm text-right" /></TableCell>
                          <TableCell><Input {...register(`items.${index}.unit`)} className="h-8 text-sm" /></TableCell>
                          <TableCell>
                            <Input type="number" step="any" min="0" {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} className="h-8 text-sm text-right" disabled={procurementMethod === 'inquiry'} />
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCurrency((Number(watch(`items.${index}.quantity`)) || 0) * (Number(watch(`items.${index}.unitPrice`)) || 0))}
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-right font-semibold text-lg pt-4">合计: {formatCurrency(totalAmount)}</div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          {Object.keys(errors).length > 0 && (
            <div className="text-sm text-destructive flex-1">
              {Object.entries(errors).map(([key, err]: [string, any]) => (
                <p key={key}>{key}: {err.message || '验证失败'}</p>
              ))}
            </div>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存修改'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/projects/${projectId}/procurement/orders/${orderId}`)}>
            取消
          </Button>
        </div>
      </form>
    </div>
  )
}
