import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, ShoppingCart, FileSignature } from 'lucide-react'
import { StatusSelect } from '@/components/status-select'
import { ORDER_FLOW_STATUSES, ORDER_BUSINESS_STATUSES } from '@/lib/status'

export const dynamic = 'force-dynamic'

export default async function OrderListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const orders = await db.procurementOrder.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
    include: { requisition: { select: { reqNo: true } }, items: { select: { id: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">采购订单管理</h1>
        <Link href={`/projects/${id}/procurement/orders/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            新建订单
          </Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无采购订单</p>
          ) : (
            <div className="divide-y">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <Link
                    href={`/projects/${id}/procurement/orders/${o.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0"
                  >
                    <ShoppingCart className="h-5 w-5 text-purple-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {o.orderNo} - {o.supplier || '未指定供应商'}
                      {(o as any).procurementMethod === 'inquiry' && (
                        <Badge variant="outline" className="ml-2 border-orange-400 text-orange-600 text-[10px]">询价</Badge>
                      )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        关联请购: {o.requisition.reqNo} | {formatDate(o.orderDate)} | {formatCurrency(o.totalAmount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{(o as any).businessStatus || o.status}</Badge>
                      <Badge>{o.status}</Badge>
                    </div>
                  </Link>
                  {/* 合同联动：已批准且无合同 → 生成合同；已有合同号 → 显示跳转 */}
                  {o.status === '已批准' && !(o as any).contractNo && (
                    <Link href={`/projects/${id}/procurement/contracts/new?selectedOrderIds=${o.id}`}>
                      <Button size="sm" variant="outline" className="shrink-0">
                        <FileSignature className="h-3.5 w-3.5 mr-1" />
                        生成合同
                      </Button>
                    </Link>
                  )}
                  {(o as any).contractNo && (
                    <Link href={`/projects/${id}/procurement/contracts?search=${(o as any).contractNo}`}>
                      <Badge variant="outline" className="border-blue-400 text-blue-600 shrink-0 cursor-pointer hover:bg-blue-50">
                        合同：{(o as any).contractNo}
                      </Badge>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
