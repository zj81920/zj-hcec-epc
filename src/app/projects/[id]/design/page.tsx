import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatFileSize, DESIGN_DISCIPLINE_MAP, DESIGN_CATEGORY_MAP } from '@/lib/utils'
import { FileText, Upload, Filter, MessageSquare, ClipboardCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DesignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ discipline?: string; category?: string }>
}) {
  const { id } = await params
  const { discipline, category } = await searchParams

  const where: any = { projectId: id }
  if (discipline) where.discipline = discipline
  if (category) where.category = category

  const documents = await db.designDocument.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
  })

  const disciplines = Object.keys(DESIGN_DISCIPLINE_MAP)
  const categories = Object.keys(DESIGN_CATEGORY_MAP)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">设计管理</h1>
        <div className="flex gap-2">
          <Link href={`/projects/${id}/design/liaisons`}>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-1" />
              联络单
            </Button>
          </Link>
          <Link href={`/projects/${id}/design/reviews`}>
            <Button variant="outline">
              <ClipboardCheck className="h-4 w-4 mr-1" />
              会审记录
            </Button>
          </Link>
          <Link href={`/projects/${id}/design/upload`}>
            <Button>
              <Upload className="h-4 w-4 mr-1" />
              上传文件
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center mr-1">专业：</span>
            <Link
              href={`/projects/${id}/design`}
              className={!discipline ? 'hidden' : ''}
            >
              <Badge variant="outline" className="cursor-pointer">全部</Badge>
            </Link>
            {disciplines.map((d) => (
              <Link
                key={d}
                href={`/projects/${id}/design?discipline=${d}${category ? `&category=${category}` : ''}`}
              >
                <Badge
                  variant={discipline === d ? 'default' : 'outline'}
                  className="cursor-pointer"
                >
                  {d}
                </Badge>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-sm text-muted-foreground self-center mr-1">分类：</span>
            <Link
              href={`/projects/${id}/design`}
              className={!category ? 'hidden' : ''}
            >
              <Badge variant="outline" className="cursor-pointer">全部</Badge>
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                href={`/projects/${id}/design?category=${c}${discipline ? `&discipline=${discipline}` : ''}`}
              >
                <Badge
                  variant={category === c ? 'default' : 'outline'}
                  className="cursor-pointer"
                >
                  {c}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">设计文件库</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无设计文件</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-8 w-8 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      版本 {doc.version} | {formatFileSize(doc.fileSize)} | {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                  <Badge variant="outline">{doc.discipline}</Badge>
                  <Badge variant="secondary">{doc.category}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
