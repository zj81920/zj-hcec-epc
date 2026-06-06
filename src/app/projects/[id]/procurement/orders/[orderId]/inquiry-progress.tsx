'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { Copy, RefreshCcw, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useAiReferencePrice, confidenceTag } from '@/components/ai-reference-price'

interface QuoteData {
  id: string
  supplierId: string
  supplier: { id: string; name: string; contactPerson: string; phone: string }
  currentRound: number
  status: string
  token: string
  deadline: string | null
  items: Array<{
    id: string
    round: number
    requisitionItemId: string
    brand: string
    unitPrice: number | null
    totalAmount: number | null
    remark: string
  }>
  total: number
}

interface OrderItem {
  id: string
  requisitionItemId: string
  materialName: string
  specification: string
  material: string
  materialGrade: string
  brand: string
  unit: string
  quantity: number
  unitPrice: number
  totalAmount: number
}

export function InquiryProgress({
  orderId,
  projectId,
  quotes,
  orderItems,
}: {
  orderId: string
  projectId: string
  quotes: QuoteData[]
  orderItems: OrderItem[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [selecting, setSelecting] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [newDeadline, setNewDeadline] = useState('')
  const [savingDeadline, setSavingDeadline] = useState(false)

  // AI 参考价
  const aiItems = orderItems.map(item => ({
    requisitionItemId: item.requisitionItemId,
    materialName: item.materialName,
    specification: item.specification,
    material: item.material,
    materialGrade: item.materialGrade,
  }))
  const { getRef: getAiRef } = useAiReferencePrice(projectId, aiItems)

  const activeQuote = quotes[activeTab]

  // 复制链接
  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/quotes/${token}`)
    toast.success('链接已复制')
  }

  // 发起新一轮
  const newRound = async (quoteId: string) => {
    try {
      await fetch(`/api/orders/${orderId}/quotes/${quoteId}/new-round`, { method: 'PUT' })
      toast.success('已发起新一轮询价')
      router.refresh()
    } catch {
      toast.error('操作失败')
    }
  }

  // 选标
  const selectSupplier = async (quoteId: string) => {
    if (!confirm('确认选定该供应商？选定后价格将自动回填到订单。')) return
    setSelecting(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/quotes/${quoteId}/select`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('选标成功，价格已回填')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || '选标失败')
    } finally {
      setSelecting(false)
    }
  }

  // 更新截止时间
  const updateDeadline = async () => {
    if (!newDeadline.trim()) {
      toast.error('请设置截止时间')
      return
    }
    setSavingDeadline(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/inquiry`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: newDeadline }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '更新失败')
      }
      toast.success('截止时间已更新，需重新复制链接给供应商')
      setEditingDeadline(false)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || '更新失败')
    } finally {
      setSavingDeadline(false)
    }
  }

  // 已选中的供应商不能操作
  const allSelected = quotes.every(q => q.status === '已选中')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          供应商报价进度
          <Badge variant="secondary">第 {activeQuote?.currentRound} 轮</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 供应商卡片列表 */}
        <div className="flex gap-3 mb-5 overflow-x-auto pb-2">
          {quotes.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setActiveTab(idx)}
              className={`flex-shrink-0 p-3 rounded-lg border-2 text-left min-w-[200px] transition
                ${idx === activeTab ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm">{q.supplier.name}</span>
                <Badge variant={q.status === '已提交' ? 'default' : q.status === '已选中' ? 'default' : 'outline'} className="text-xs">
                  {q.status === '已提交' ? '已报价' : q.status === '已选中' ? '已选中' : q.status}
                </Badge>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>联系人: {q.supplier.contactPerson || '-'}</div>
                <div>电话: {q.supplier.phone || '-'}</div>
                {q.status === '已提交' && (
                  <div className="font-semibold text-orange-600">¥{q.total.toLocaleString()}</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {!editingDeadline && !allSelected && (
            <Button size="sm" variant="outline" onClick={() => { setEditingDeadline(true); setNewDeadline(activeQuote?.deadline ? new Date(activeQuote.deadline).toISOString().slice(0, 16) : '') }}>
              <Clock className="h-3 w-3 mr-1" />重新发起询价
            </Button>
          )}
          {editingDeadline && (
            <div className="flex items-center gap-2 w-full bg-orange-50 p-3 rounded-lg border border-orange-200">
              <Label className="text-sm whitespace-nowrap">新截止时间 *</Label>
              <Input
                type="datetime-local"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <Button size="sm" onClick={updateDeadline} disabled={savingDeadline}>
                {savingDeadline ? '保存中...' : '确认'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingDeadline(false)}>取消</Button>
            </div>
          )}
          {activeQuote?.token && (
            <Button size="sm" variant="outline" onClick={() => copyLink(activeQuote.token)}>
              <Copy className="h-3 w-3 mr-1" />复制报价链接
            </Button>
          )}
          {activeQuote?.status === '已提交' && (
            <>
              <Button size="sm" variant="outline" onClick={() => newRound(activeQuote.id)}>
                <RefreshCcw className="h-3 w-3 mr-1" />发起新一轮
              </Button>
              <Button
                size="sm"
                onClick={() => selectSupplier(activeQuote.id)}
                disabled={selecting || allSelected}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-3 w-3 mr-1" />选此供应商
              </Button>
            </>
          )}
        </div>

        {/* 报价明细表 */}
        {activeQuote && activeQuote.status !== '待报价' && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>物料名称</TableHead>
                  <TableHead>规格</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead>品牌</TableHead>
                  <TableHead className="text-right">单价</TableHead>
                  <TableHead className="text-right">小计</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="text-left text-orange-600">AI 参考</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((orderItem) => {
                  const quoteItem = activeQuote.items.find(
                    qi => qi.requisitionItemId === orderItem.requisitionItemId
                  )
                  return (
                    <TableRow key={orderItem.id}>
                      <TableCell className="font-medium">{orderItem.materialName}</TableCell>
                      <TableCell>{orderItem.specification}</TableCell>
                      <TableCell>{orderItem.unit}</TableCell>
                      <TableCell className="text-right">{orderItem.quantity}</TableCell>
                      <TableCell>{quoteItem?.brand || '-'}</TableCell>
                      <TableCell className="text-right">
                        {quoteItem?.unitPrice != null ? `¥${quoteItem.unitPrice.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {quoteItem?.totalAmount != null ? `¥${quoteItem.totalAmount.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{quoteItem?.remark || '-'}</TableCell>
                      <TableCell>
                        {(() => {
                          const ref = getAiRef(orderItem.requisitionItemId)
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
                              <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${tag.color}`}>{tag.label}</span>
                            </div>
                          )
                        })()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="text-right font-semibold text-lg pt-3">
              报价合计: ¥{activeQuote.total.toLocaleString()}
            </div>
          </div>
        )}

        {activeQuote && activeQuote.status === '待报价' && (
          <div className="text-center py-10 text-gray-400">
            该供应商尚未提交报价
          </div>
        )}
      </CardContent>
    </Card>
  )
}
