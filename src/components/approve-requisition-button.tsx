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
