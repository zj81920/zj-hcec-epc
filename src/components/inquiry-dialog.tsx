'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Send, Copy, X } from 'lucide-react'

interface SupplierOption {
  id: string
  name: string
  contactPerson: string
  phone: string
}

interface QuoteResult {
  id: string
  token: string
  supplierId: string
}

interface InquiryDialogProps {
  orderId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function InquiryDialog({ orderId, open, onOpenChange, onComplete }: InquiryDialogProps) {
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<Array<{ supplierName: string; token: string }>>([])
  const [step, setStep] = useState<'config' | 'result'>('config')

  useEffect(() => {
    if (open) {
      fetch('/api/partners/list?type=supplier')
        .then(r => r.json())
        .then(data => setSuppliers(Array.isArray(data) ? data : []))
      setStep('config')
      setResults([])
      setSelectedIds(new Set())
    }
  }, [open])

  if (!open) return null

  const toggleSupplier = (id: string) => {
    setSelectedIds(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      toast.error('请至少选择一家供应商')
      return
    }
    if (!deadline.trim()) {
      toast.error('请设置报价截止时间')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierIds: [...selectedIds],
          deadline: deadline || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '发起询价失败')
      }
      const data = await res.json()

      const resultList = (data.quotes || []).map((q: QuoteResult) => {
        const supplier = suppliers.find(s => s.id === q.supplierId)
        return { supplierName: supplier?.name || '未知供应商', token: q.token }
      })
      setResults(resultList)
      setStep('result')
      toast.success(`已向 ${resultList.length} 家供应商发起询价`)
    } catch (e: any) {
      toast.error(e.message || '发起询价失败')
    } finally {
      setSubmitting(false)
    }
  }

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/quotes/${token}`
    navigator.clipboard.writeText(url)
    toast.success('链接已复制到剪贴板')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {step === 'config' ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">发起在线询价</h2>
                <button onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <Label>报价截止时间 *</Label>
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="mb-4">
                <Label>选择供应商（可多选）</Label>
                <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                  {suppliers.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3">暂无供应商数据</p>
                  ) : (
                    suppliers.map(s => (
                      <label
                        key={s.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                      >
                        <Checkbox
                          checked={selectedIds.has(s.id)}
                          onCheckedChange={() => toggleSupplier(s.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.contactPerson || '-'} {s.phone || ''}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {selectedIds.size > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">已选 {selectedIds.size} 家</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>取消</Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                  <Send className="h-3 w-3 mr-1" />
                  {submitting ? '提交中...' : '发起询价'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">询价已发起</h2>
                <button onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                复制以下链接发送给对应供应商，供应商打开后即可在线报价。
              </p>

              <div className="space-y-2">
                {results.map(r => (
                  <div key={r.token} className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.supplierName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {window.location.origin}/quotes/{r.token}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copyLink(r.token)}>
                      <Copy className="h-3 w-3 mr-1" />复制
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4">
                <Button size="sm" onClick={() => { onOpenChange(false); onComplete(); }}>完成</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
