import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string; incId: string }>
}) {
  const { id, incId } = await params
  const incident = await db.hSEIncident.findUnique({ where: { id: incId } })
  if (!incident) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href={`/projects/${id}/hse/incidents`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回列表
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{incident.incidentNo}</CardTitle>
            <div className="flex gap-2">
              <Badge>{incident.type}</Badge>
              <Badge variant={incident.severity === '严重' || incident.severity === '重大' ? 'destructive' : 'secondary'}>
                {incident.severity}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-xs text-muted-foreground">发生日期</p><p className="text-sm">{formatDate(incident.incidentDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">发生地点</p><p className="text-sm">{incident.location || '-'}</p></div>
            <div><p className="text-xs text-muted-foreground">状态</p><Badge>{incident.status}</Badge></div>
          </div>
          <div><p className="text-xs text-muted-foreground mb-1">事件描述</p><p className="text-sm whitespace-pre-wrap">{incident.description || '-'}</p></div>
          <div><p className="text-xs text-muted-foreground mb-1">原因分析</p><p className="text-sm whitespace-pre-wrap">{incident.cause || '-'}</p></div>
          <div><p className="text-xs text-muted-foreground mb-1">纠正措施</p><p className="text-sm whitespace-pre-wrap">{incident.correctiveAction || '-'}</p></div>
        </CardContent>
      </Card>
    </div>
  )
}
