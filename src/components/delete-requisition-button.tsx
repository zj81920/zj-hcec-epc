'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export default function DeleteRequisitionButton({
  reqId,
  projectId,
}: {
  reqId: string
  projectId: string
}) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('确认删除此请购单？')) return
    try {
      const res = await fetch(`/api/requisitions/${reqId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '删除失败')
      }
      router.push(`/projects/${projectId}/procurement/requisitions`)
    } catch (e: any) {
      alert(e.message || '删除失败')
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-destructive border-destructive/30 hover:bg-destructive/10"
      onClick={handleDelete}
    >
      <Trash2 className="h-3 w-3 mr-1" />
      删除
    </Button>
  )
}
