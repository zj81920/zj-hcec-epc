import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Plus, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function IncidentListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const incidents = await db.hSEIncident.findMany({
    where: { projectId: id },
    orderBy: { incidentDate: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">事故事件记录</h1>
        <Link href={`/projects/${id}/hse/incidents/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            记录事件
          </Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          {incidents.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无记录</p>
          ) : (
            <div className="divide-y">
              {incidents.map((inc) => (
                <Link
                  key={inc.id}
                  href={`/projects/${id}/hse/incidents/${inc.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <AlertTriangle className={`h-5 w-5 shrink-0 ${inc.severity === '严重' || inc.severity === '重大' ? 'text-red-500' : 'text-yellow-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{inc.incidentNo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(inc.incidentDate)} | {inc.location || '-'}
                    </p>
                  </div>
                  <Badge variant="outline">{inc.type}</Badge>
                  <Badge variant={inc.severity === '严重' || inc.severity === '重大' ? 'destructive' : 'secondary'}>
                    {inc.severity}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
