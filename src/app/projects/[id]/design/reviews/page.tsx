import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Plus, ClipboardCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ReviewListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const reviews = await db.designReview.findMany({
    where: { projectId: id },
    orderBy: { reviewDate: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">会审记录</h1>
        <Link href={`/projects/${id}/design/reviews/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            新建会审记录
          </Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          {reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无会审记录</p>
          ) : (
            <div className="divide-y">
              {reviews.map((r) => (
                <Link
                  key={r.id}
                  href={`/projects/${id}/design/reviews/${r.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <ClipboardCheck className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.reviewNo} - {r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      会审日期: {formatDate(r.reviewDate)} | 参会人: {r.participants || '-'}
                    </p>
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
