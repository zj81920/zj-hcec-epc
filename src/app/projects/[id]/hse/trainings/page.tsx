import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Plus, GraduationCap, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TrainingListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trainings = await db.hSETraining.findMany({
    where: { projectId: id },
    orderBy: { trainingDate: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">培训记录</h1>
        <Link href={`/projects/${id}/hse/trainings/new`}>
          <Button><Plus className="h-4 w-4 mr-1" />新增记录</Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          {trainings.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无培训记录</p>
          ) : (
            <div className="divide-y">
              {trainings.map((t) => (
                <Link key={t.id} href={`/projects/${id}/hse/trainings/${t.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <GraduationCap className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(t.trainingDate)} | 讲师: {t.trainer || '-'} | 地点: {t.location || '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {t.participantCount}
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
