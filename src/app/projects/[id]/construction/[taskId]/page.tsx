import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ConstructionTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>
}) {
  const { id, taskId } = await params
  const task = await db.constructionTask.findUnique({
    where: { id: taskId },
  })

  if (!task) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href={`/projects/${id}/construction`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回列表
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{task.taskName}</CardTitle>
            <Badge>{task.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">施工区域</p>
              <p className="text-sm">{task.workArea || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">承包商</p>
              <p className="text-sm">{task.contractor || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">进度</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{task.progress}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">计划开始</p>
              <p className="text-sm">{formatDate(task.planStartDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">计划结束</p>
              <p className="text-sm">{formatDate(task.planEndDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">实际结束</p>
              <p className="text-sm">{task.actualEndDate ? formatDate(task.actualEndDate) : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">创建时间</p>
              <p className="text-sm">{formatDateTime(task.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">更新时间</p>
              <p className="text-sm">{formatDateTime(task.updatedAt)}</p>
            </div>
          </div>
          {task.remark && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">备注</p>
              <p className="text-sm">{task.remark}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
