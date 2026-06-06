import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Plus, ClipboardCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function InspectionListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const inspections = await db.hSEInspection.findMany({
    where: { projectId: id },
    orderBy: { inspectionDate: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">安全检查记录</h1>
        <Link href={`/projects/${id}/hse/inspections/new`}>
          <Button><Plus className="h-4 w-4 mr-1" />新增记录</Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          {inspections.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无检查记录</p>
          ) : (
            <div className="divide-y">
              {inspections.map((ins) => (
                <Link key={ins.id} href={`/projects/${id}/hse/inspections/${ins.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <ClipboardCheck className="h-5 w-5 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{formatDate(ins.inspectionDate)} - {ins.inspector || '未知'} 检查</p>
                    <p className="text-xs text-muted-foreground">区域: {ins.area || '-'} | 整改期限: {formatDate(ins.deadline)}</p>
                  </div>
                  <Badge>{ins.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
