import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Plus, HardHat, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ConstructionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tasks = await db.constructionTask.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">施工管理</h1>
        <div className="flex gap-2">
          <Link href={`/projects/${id}/construction/docs`}>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-1" />
              施工资料
            </Button>
          </Link>
          <Link href={`/projects/${id}/construction/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              新建任务
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">施工任务列表</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无施工任务</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/projects/${id}/construction/${task.id}`}
                  className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.taskName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.workArea || '未指定区域'} | {task.contractor || '未指定承包商'} | {formatDate(task.planStartDate)} ~ {formatDate(task.planEndDate)}
                      </p>
                    </div>
                    <Badge>{task.status}</Badge>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>进度</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span>{task.progress}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
