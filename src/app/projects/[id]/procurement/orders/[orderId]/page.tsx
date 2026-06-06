import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Pencil } from 'lucide-react'
import { DeleteOrderButton } from '@/components/delete-order-button'
import { StatusSelect } from '@/components/status-select'
import { ORDER_FLOW_STATUSES, ORDER_BUSINESS_STATUSES } from '@/lib/status'
import { InquiryProgress } from './inquiry-progress'
import { InquiryDialogWrapper } from './inquiry-dialog-wrapper'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; orderId: string }>
}) {
  const { id, orderId } = await params
  const order = await db.procurementOrder.findUnique({
    where: { id: orderId },
    include: { items: true, requisition: { select: { reqNo: true } } },
  })

  if (!order) notFound()

  const orderAttachments = (order.attachments as Array<{ fileName: string; filePath: string; fileSize: number; fileType: string }>) || []

  // 获取询价数据
  let quotes: any[] = []
  if ((order as any).procurementMethod === 'inquiry' && order.businessStatus === '询价中') {
    quotes = await db.orderQuote.findMany({
      where: { orderId: order.id },
      include: { supplier: { select: { id: true, name: true, contactPerson: true, phone: true } }, items: true },
      orderBy: { createdAt: 'asc' },
    })
    // 计算每家总价
    quotes = await Promise.all(quotes.map(async (q) => {
      const items = await db.orderQuoteItem.findMany({
        where: { quoteId: q.id, round: q.currentRound },
      })
      const total = items.reduce((sum, i) => sum + (i.totalAmount || 0), 0)
      return { ...q, items, total }
    }))
  }

  const procurementMethod = (order as any).procurementMethod || 'direct'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/projects/${id}/procurement/orders`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回列表
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {(order.status === '草稿' || order.status === '已驳回') && (
            <>
              <Link href={`/projects/${id}/procurement/orders/${orderId}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-3 w-3 mr-1" />
                  编辑
                </Button>
              </Link>
              <DeleteOrderButton orderId={orderId} projectId={id} procurementMethod={procurementMethod} />
            </>
          )}
          {order.status !== '草稿' && order.status !== '已驳回' && (
            <DeleteOrderButton orderId={orderId} projectId={id} procurementMethod={procurementMethod} />
          )}
          <InquiryDialogWrapper
            orderId={orderId}
            procurementMethod={procurementMethod}
            businessStatus={order.businessStatus || ''}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>{order.orderNo}</CardTitle>
              <Badge variant="outline" className={procurementMethod === 'inquiry' ? 'border-orange-400 text-orange-600' : 'border-blue-400 text-blue-600'}>
                {procurementMethod === 'inquiry' ? '询价采购' : '直接采购'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <StatusSelect value={order.status} options={ORDER_FLOW_STATUSES} apiUrl={`/api/orders/${orderId}`} field="status" />
              <StatusSelect value={order.businessStatus} options={ORDER_BUSINESS_STATUSES} apiUrl={`/api/orders/${orderId}`} field="businessStatus" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">关联请购单</p>
              <p className="text-sm">{order.requisition.reqNo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">采购人</p>
              <p className="text-sm">{order.purchaser || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">采购单位</p>
              <p className="text-sm">{(order as any).executingUnitName || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">订单日期</p>
              <p className="text-sm">{formatDate(order.orderDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">供应商</p>
              <p className="text-sm">{order.supplier || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">供应商联系人</p>
              <p className="text-sm">{order.supplierContact || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">供应商联系方式</p>
              <p className="text-sm">{order.supplierPhone || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">专业</p>
              <p className="text-sm">{order.discipline || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">收货地址</p>
              <p className="text-sm">{order.deliveryAddress || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">交货日期</p>
              <p className="text-sm">{formatDate(order.deliveryDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">订单总额</p>
              <p className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</p>
            </div>
            {procurementMethod === 'inquiry' && (order as any).inquiryDeadline && (
              <div>
                <p className="text-xs text-muted-foreground">询价截止</p>
                <p className="text-sm text-red-600">{formatDateTime((order as any).inquiryDeadline)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">备注</p>
              <p className="text-sm">{order.remark || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">创建时间</p>
              <p className="text-sm">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>

          {orderAttachments.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">附件</p>
              <div className="flex flex-wrap gap-2">
                {orderAttachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={`/api/files/${att.filePath}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-md bg-muted/20 text-sm hover:bg-muted/40 transition-colors"
                  >
                    {att.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 询价进度（仅询价采购且在询价中时显示） */}
      {procurementMethod === 'inquiry' && order.businessStatus === '询价中' && quotes.length > 0 && (
        <InquiryProgress orderId={orderId} projectId={id} quotes={quotes} orderItems={order.items} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">采购明细</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>物料编码</TableHead>
                <TableHead>物料名称</TableHead>
                <TableHead>规格</TableHead>
                <TableHead>材质</TableHead>
                <TableHead>品牌</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>单位</TableHead>
                <TableHead className="text-right">单价</TableHead>
                <TableHead className="text-right">金额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.materialCode || '-'}</TableCell>
                  <TableCell className="font-medium">{item.materialName}</TableCell>
                  <TableCell>{item.specification || '-'}</TableCell>
                  <TableCell>{(item as any).material || '-'}</TableCell>
                  <TableCell>{(item as any).brand || '-'}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.totalAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="text-right font-semibold text-lg pt-4">
            合计: {formatCurrency(order.totalAmount)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
