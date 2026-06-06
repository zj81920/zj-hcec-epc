import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getStorage } from '@/lib/storage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDateTime } from '@/lib/utils'
import DeleteRequisitionButton from '@/components/delete-requisition-button'
import { StatusSelect } from '@/components/status-select'
import { REQ_FLOW_STATUSES } from '@/lib/status'
import { ArrowLeft, Pencil, Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ITEM_STATUS_MAP: Record<string, { label: string; variant: 'outline' | 'default' | 'secondary' }> = {
  待采购: { label: '待采购', variant: 'outline' },
  部分采购: { label: '部分采购', variant: 'default' },
  已采购: { label: '已采购', variant: 'secondary' },
}

function calcItemStatus(item: { quantity: number; orderItems: { quantity: number }[] }): string {
  const orderedQty = item.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)
  if (orderedQty === 0) return '待采购'
  if (orderedQty < item.quantity) return '部分采购'
  return '已采购'
}

function calcOrderedQty(item: { orderItems: { quantity: number }[] }): number {
  return item.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)
}

export default async function RequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string; reqId: string }>
}) {
  const { id, reqId } = await params
  const requisition = await db.purchaseRequisition.findUnique({
    where: { id: reqId },
    include: {
      items: {
        include: {
          orderItems: { select: { quantity: true } },
        },
      },
    },
  })

  if (!requisition) notFound()

  return (
    <div className="space-y-6">
      <Link href={`/projects/${id}/procurement/requisitions`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回列表
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>请购单 {requisition.reqNo}</CardTitle>
            <div className="flex items-center gap-2">
              {requisition.status === '草稿' && (
                <>
                  <Link href={`/projects/${id}/procurement/requisitions/${reqId}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-3 w-3 mr-1" />
                      编辑
                    </Button>
                  </Link>
                  <DeleteRequisitionButton reqId={reqId} projectId={id} />
                </>
              )}
              <div className="flex items-center gap-2">
                <StatusSelect value={requisition.status} options={REQ_FLOW_STATUSES} apiUrl={`/api/requisitions/${reqId}/status`} field="status" />
                <Badge variant="outline">{requisition.businessStatus}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">请购日期</p>
              <p className="text-sm">{formatDate(requisition.reqDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">申请人</p>
              <p className="text-sm">{requisition.requester || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">采购分类</p>
              <p className="text-sm">{requisition.procurementCategory || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">需求类型</p>
              <p className="text-sm">{requisition.demandType || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">专业</p>
              <p className="text-sm">{requisition.discipline || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">创建时间</p>
              <p className="text-sm">{formatDateTime(requisition.createdAt)}</p>
            </div>
          </div>
          {requisition.remark && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">备注</p>
              <p className="text-sm">{requisition.remark}</p>
            </div>
          )}
          {(() => {
            const atts = requisition.attachments as Array<{ fileName: string; filePath: string; fileSize: number; fileType: string }> | null
            if (!atts || atts.length === 0) return null
            const storage = getStorage()
            return (
              <div>
                <p className="text-xs text-muted-foreground mb-2">附件</p>
                <div className="flex flex-wrap gap-2">
                  {atts.map((att, idx) => (
                    <a
                      key={idx}
                      href={storage.getUrl(att.filePath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 border rounded-md bg-muted/20 text-sm hover:bg-muted/40 transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      <span className="max-w-[200px] truncate">{att.fileName}</span>
                      <span className="text-xs text-muted-foreground">({(att.fileSize / 1024).toFixed(1)}KB)</span>
                    </a>
                  ))}
                </div>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">采购明细</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>物料名称</TableHead>
                <TableHead>规格</TableHead>
                <TableHead>材质</TableHead>
                <TableHead>牌号</TableHead>
                <TableHead>标准规范</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>单位</TableHead>
                <TableHead className="text-right">已订购</TableHead>
                <TableHead className="text-right">剩余</TableHead>
                <TableHead>需求日期</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisition.items.map((item) => {
                const orderedQty = calcOrderedQty(item)
                const remaining = item.quantity - orderedQty
                const itemStatus = calcItemStatus(item)
                const statusInfo = ITEM_STATUS_MAP[itemStatus] || { label: itemStatus, variant: 'outline' as const }
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.materialName}</TableCell>
                    <TableCell>{item.specification || '-'}</TableCell>
                    <TableCell>{item.material || '-'}</TableCell>
                    <TableCell>{item.materialGrade || '-'}</TableCell>
                    <TableCell>{item.applicableStandard || '-'}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    <TableCell className="text-right">{orderedQty}</TableCell>
                    <TableCell className="text-right">{remaining}</TableCell>
                    <TableCell>{item.requiredDate ? formatDate(item.requiredDate) : '-'}</TableCell>
                    <TableCell><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
