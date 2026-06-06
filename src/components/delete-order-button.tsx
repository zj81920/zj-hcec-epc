'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function DeleteOrderButton({ orderId, projectId, procurementMethod }: { orderId: string; projectId: string; procurementMethod?: string }) {
  const router = useRouter()

  if (procurementMethod === 'inquiry') {
    return null
  }

  async function handleDelete() {
    if (!confirm('确认删除此订单？删除后请购单数量将被回收。')) return
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '删除失败')
      }
      toast.success('订单已删除')
      router.push(`/projects/${projectId}/procurement/orders`)
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete}>
      <Trash2 className="h-4 w-4 mr-1" />
      删除订单
    </Button>
  )
}
