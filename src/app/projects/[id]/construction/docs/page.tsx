import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatFileSize, CONSTRUCTION_DOC_CATEGORY_MAP } from '@/lib/utils'
import { Plus, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ConstructionDocsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const docs = await db.constructionDoc.findMany({
    where: { projectId: id },
    orderBy: { uploadedAt: 'desc' },
  })

  const categories = Object.keys(CONSTRUCTION_DOC_CATEGORY_MAP)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">施工资料</h1>
        <div className="flex gap-2">
          <Link href={`/projects/${id}/construction`}>
            <Button variant="outline">返回任务列表</Button>
          </Link>
          <Link href={`/projects/${id}/construction/docs/upload`}>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              上传资料
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="全部">
        <TabsList>
          <TabsTrigger value="全部">全部</TabsTrigger>
          {categories.map((c) => (
            <TabsTrigger key={c} value={c}>{c}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="全部" className="mt-4">
          <DocList docs={docs} projectId={id} />
        </TabsContent>
        {categories.map((c) => (
          <TabsContent key={c} value={c} className="mt-4">
            <DocList docs={docs.filter((d) => d.category === c)} projectId={id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function DocList({ docs, projectId }: { docs: any[]; projectId: string }) {
  if (docs.length === 0) {
    return <p className="text-center text-muted-foreground py-8">暂无资料</p>
  }
  return (
    <div className="grid grid-cols-1 gap-2">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <FileText className="h-8 w-8 text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.docName}</p>
            <p className="text-xs text-muted-foreground">
              {doc.docNo} | {formatFileSize(doc.fileSize)} | {formatDate(doc.uploadedAt)}
            </p>
          </div>
          <Badge variant="outline">{doc.category}</Badge>
        </div>
      ))}
    </div>
  )
}
