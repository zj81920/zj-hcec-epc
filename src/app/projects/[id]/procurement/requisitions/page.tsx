import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Plus, FileText, ShoppingCart } from 'lucide-react'
import { StatusSelect } from '@/components/status-select'
import { REQ_FLOW_STATUSES } from '@/lib/status'

export const dynamic = 'force-dynamic'

export default async function RequisitionListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const requisitions = await db.purchaseRequisition.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
    include: { items: { select: { id: true } }, orders: { select: { id: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">请购单管理</h1>
        <div className="flex gap-2">
          <Link href={`/projects/${id}/procurement/materials`}>
            <Button variant="outline" size="sm">
              物料库管理
            </Button>
          </Link>
          <Link href={`/projects/${id}/procurement/orders`}>
            <Button variant="outline">
              <ShoppingCart className="h-4 w-4 mr-1" />
              采购订单
            </Button>
          </Link>
          <Link href={`/projects/${id}/procurement/requisitions/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              新建请购单
            </Button>
          </Link>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          {requisitions.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无请购单</p>
          ) : (
            <div className="divide-y">
              {requisitions.map((r) => (
                <Link
                  key={r.id}
                  href={`/projects/${id}/procurement/requisitions/${r.id}`}
                  className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${r.status === '已关闭' ? 'opacity-60' : ''}`}
                >
                  <FileText className="h-5 w-5 text-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.reqNo}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.procurementCategory && <span className="mr-2">{r.procurementCategory}</span>}
                      {r.discipline && <Badge variant="outline" className="mr-1 text-xs py-0 h-5">{r.discipline}</Badge>}
                      {r.demandType && <span className="mr-2">| {r.demandType}</span>}
                      申请人: {r.requester || '-'} | 日期: {formatDate(r.reqDate)} | {r.items.length} 项明细
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <StatusSelect value={r.status} options={REQ_FLOW_STATUSES} apiUrl={`/api/requisitions/${r.id}/status`} field="status" />
                    <Badge variant="outline" className="text-xs">{r.businessStatus}</Badge>
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
