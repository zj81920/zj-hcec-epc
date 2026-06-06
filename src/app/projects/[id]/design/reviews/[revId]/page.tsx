import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string; revId: string }>
}) {
  const { id, revId } = await params
  const review = await db.designReview.findUnique({
    where: { id: revId },
  })

  if (!review) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href={`/projects/${id}/design/reviews`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回列表
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{review.reviewNo} - {review.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">会审日期</p>
              <p className="text-sm">{formatDate(review.reviewDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">创建时间</p>
              <p className="text-sm">{formatDateTime(review.createdAt)}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">参会人员</p>
            <p className="text-sm">{review.participants || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">会审结论</p>
            <p className="text-sm whitespace-pre-wrap">{review.conclusions || '-'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
