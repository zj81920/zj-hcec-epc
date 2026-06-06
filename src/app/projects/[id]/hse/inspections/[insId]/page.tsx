import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; insId: string }>
}) {
  const { id, insId } = await params
  const inspection = await db.hSEInspection.findUnique({ where: { id: insId } })
  if (!inspection) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href={`/projects/${id}/hse/inspections`}>
        <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />返回列表</Button>
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>安全检查记录</CardTitle>
            <Badge>{inspection.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-xs text-muted-foreground">检查日期</p><p className="text-sm">{formatDate(inspection.inspectionDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">检查人</p><p className="text-sm">{inspection.inspector || '-'}</p></div>
            <div><p className="text-xs text-muted-foreground">检查区域</p><p className="text-sm">{inspection.area || '-'}</p></div>
            <div><p className="text-xs text-muted-foreground">整改期限</p><p className="text-sm">{formatDate(inspection.deadline)}</p></div>
          </div>
          <div><p className="text-xs text-muted-foreground mb-1">检查发现</p><p className="text-sm whitespace-pre-wrap">{inspection.findings || '-'}</p></div>
          <div><p className="text-xs text-muted-foreground mb-1">整改要求</p><p className="text-sm whitespace-pre-wrap">{inspection.rectification || '-'}</p></div>
        </CardContent>
      </Card>
    </div>
  )
}
