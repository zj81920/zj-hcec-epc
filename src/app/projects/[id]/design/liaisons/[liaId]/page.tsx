import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LiaisonDetailPage({
  params,
}: {
  params: Promise<{ id: string; liaId: string }>
}) {
  const { id, liaId } = await params
  const liaison = await db.designLiaison.findUnique({
    where: { id: liaId },
    include: {
      liaisonDocs: {
        include: { document: true },
      },
    },
  })

  if (!liaison) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href={`/projects/${id}/design/liaisons`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回列表
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{liaison.liaisonNo} - {liaison.title}</CardTitle>
            <Badge>{liaison.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">发件人</p>
              <p className="text-sm">{liaison.sender || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">收件人</p>
              <p className="text-sm">{liaison.receiver || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">创建时间</p>
              <p className="text-sm">{formatDateTime(liaison.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">回复时间</p>
              <p className="text-sm">{liaison.repliedAt ? formatDateTime(liaison.repliedAt) : '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">联络内容</p>
            <p className="text-sm whitespace-pre-wrap">{liaison.content || '-'}</p>
          </div>
          {liaison.replyContent && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">回复内容</p>
              <p className="text-sm whitespace-pre-wrap">{liaison.replyContent}</p>
            </div>
          )}
          {liaison.liaisonDocs.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">关联文件</p>
              <div className="flex flex-wrap gap-2">
                {liaison.liaisonDocs.map((ld) => (
                  <Badge key={ld.documentId} variant="outline">
                    {ld.document.fileName}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
