import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string; traId: string }>
}) {
  const { id, traId } = await params
  const training = await db.hSETraining.findUnique({ where: { id: traId } })
  if (!training) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href={`/projects/${id}/hse/trainings`}>
        <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />返回列表</Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{training.topic}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-xs text-muted-foreground">培训日期</p><p className="text-sm">{formatDate(training.trainingDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">讲师</p><p className="text-sm">{training.trainer || '-'}</p></div>
            <div><p className="text-xs text-muted-foreground">地点</p><p className="text-sm">{training.location || '-'}</p></div>
            <div><p className="text-xs text-muted-foreground">参与人数</p><p className="text-sm">{training.participantCount}</p></div>
            <div><p className="text-xs text-muted-foreground">创建时间</p><p className="text-sm">{formatDateTime(training.createdAt)}</p></div>
          </div>
          <div><p className="text-xs text-muted-foreground mb-1">参与人员</p><p className="text-sm">{training.participants || '-'}</p></div>
          <div><p className="text-xs text-muted-foreground mb-1">培训内容</p><p className="text-sm whitespace-pre-wrap">{training.content || '-'}</p></div>
        </CardContent>
      </Card>
    </div>
  )
}
