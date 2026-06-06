import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Plus, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LiaisonListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const liaisons = await db.designLiaison.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">设计联络单</h1>
        <Link href={`/projects/${id}/design/liaisons/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            新建联络单
          </Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          {liaisons.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无联络单</p>
          ) : (
            <div className="divide-y">
              {liaisons.map((l) => (
                <Link
                  key={l.id}
                  href={`/projects/${id}/design/liaisons/${l.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <MessageSquare className="h-5 w-5 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{l.liaisonNo} - {l.title}</p>
                    <p className="text-xs text-muted-foreground">
                      发件: {l.sender} → 收件: {l.receiver} | {formatDate(l.createdAt)}
                    </p>
                  </div>
                  <Badge variant={l.status === '已回复' ? 'default' : 'outline'}>
                    {l.status}
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
