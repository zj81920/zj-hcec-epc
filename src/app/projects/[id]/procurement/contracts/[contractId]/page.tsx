'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  FileDown,
} from 'lucide-react'

// 合同流程状态对应的 Badge 样式
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case '草稿':
      return 'bg-gray-200 text-gray-800 hover:bg-gray-200'
    case '审批中':
      return 'bg-blue-500 text-white hover:bg-blue-500'
    case '已批准':
      return 'bg-green-600 text-white hover:bg-green-600'
    case '已驳回':
      return 'bg-red-500 text-white hover:bg-red-500'
    default:
      return ''
  }
}

// 合同正文章节
interface ContractSection {
  title: string
  content: string
}

// 合同正文整体结构（content 字段）
interface ContractContentJson {
  sections?: ContractSection[]
}

// 关联订单（简略信息）
interface ContractOrderLink {
  id: string
  orderId: string
  order: {
    id: string
    orderNo: string
    totalAmount: number
    status: string
  }
}

// 合同物资明细
interface ContractItemRow {
  id: string
  materialName: string
  specification: string
  material: string
  materialGrade: string
  brand: string
  quantity: number
  unit: string
  unitPrice: number
  totalAmount: number
}

// 合同详情数据
interface ContractDetail {
  id: string
  projectId: string
  contractNo: string
  contractName: string
  supplier: string
  supplierContact: string
  supplierPhone: string
  executingUnitName: string
  totalAmount: number
  taxAmount: number
  taxRate: string
  deliveryTerm: number
  deliveryAddress: string
  transportCost: string
  paymentTerms: string
  warrantyPeriod: number
  arbitrationBody: string
  status: string
  content: ContractContentJson | null
  remark: string
  signDate: string | null
  createdAt: string
  orderLinks: ContractOrderLink[]
  items: ContractItemRow[]
}

export default function ContractDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string; contractId: string }>()
  const projectId = params.id
  const contractId = params.contractId

  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载合同详情
  const loadContract = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/contracts/${contractId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '加载失败')
      }
      const data = (await res.json()) as ContractDetail
      setContract(data)
    } catch (e: any) {
      setError(e.message || '加载失败')
      setContract(null)
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    loadContract()
  }, [loadContract])

  // 状态流转（提交审批 / 通过 / 驳回）
  const updateStatus = async (next: '审批中' | '已批准' | '已驳回', confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setActing(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _statusOnly: true, status: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        window.alert(err.error || '操作失败')
        return
      }
      await loadContract()
    } catch (e) {
      console.error(e)
      window.alert('操作失败')
    } finally {
      setActing(false)
    }
  }

  // 删除合同（仅草稿可删）
  const handleDelete = async () => {
    if (!contract) return
    if (
      !window.confirm(
        `确认删除合同「${contract.contractNo}」？删除后将清除关联订单的合同号。`,
      )
    ) {
      return
    }
    setActing(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        window.alert(err.error || '删除失败')
        return
      }
      // 删除后回到合同列表
      router.push(`/projects/${projectId}/procurement/contracts`)
    } catch (e) {
      console.error(e)
      window.alert('删除失败')
    } finally {
      setActing(false)
    }
  }

  // 导出 Word / PDF
  const handleExport = (kind: 'word' | 'pdf') => {
    window.open(
      `/api/contracts/${contractId}/export-${kind}`,
      '_blank',
    )
  }

  if (loading) {
    return <p className="text-center text-muted-foreground py-12">加载中...</p>
  }
  if (error || !contract) {
    return (
      <div className="space-y-4">
        <Link href={`/projects/${projectId}/procurement/contracts`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回列表
          </Button>
        </Link>
        <p className="text-center text-red-600 py-12">{error || '合同不存在'}</p>
      </div>
    )
  }

  const isDraft = contract.status === '草稿'
  const isRejected = contract.status === '已驳回'
  const isPending = contract.status === '审批中'
  const editable = isDraft || isRejected
  const sections = contract.content?.sections ?? []

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <nav className="text-sm text-muted-foreground">
        <Link href={`/projects/${projectId}`} className="hover:text-foreground">
          项目
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/projects/${projectId}/procurement`}
          className="hover:text-foreground"
        >
          采购管理
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/projects/${projectId}/procurement/contracts`}
          className="hover:text-foreground"
        >
          合同管理
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{contract.contractNo}</span>
      </nav>

      {/* 顶部：返回 + 操作按钮 */}
      <div className="flex items-center justify-between">
        <Link href={`/projects/${projectId}/procurement/contracts`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回列表
          </Button>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {editable && (
            <Link
              href={`/projects/${projectId}/procurement/contracts/${contractId}/edit`}
            >
              <Button variant="outline" size="sm">
                <Pencil className="h-3 w-3 mr-1" />
                编辑
              </Button>
            </Link>
          )}
          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              disabled={acting}
              onClick={() => updateStatus('审批中', '确认提交审批？')}
            >
              <Send className="h-3 w-3 mr-1" />
              提交审批
            </Button>
          )}
          {isPending && (
            <>
              <Button
                size="sm"
                disabled={acting}
                onClick={() => updateStatus('已批准', '确认审批通过？')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                审批通过
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={acting}
                onClick={() => updateStatus('已驳回', '确认驳回？')}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-3 w-3 mr-1" />
                驳回
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => handleExport('word')}>
            <FileText className="h-3 w-3 mr-1" />
            导出 Word
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <FileDown className="h-3 w-3 mr-1" />
            导出 PDF
          </Button>
          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              disabled={acting}
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              删除
            </Button>
          )}
        </div>
      </div>

      {/* 标题区 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle>{contract.contractNo}</CardTitle>
              <span className="text-base text-muted-foreground">
                {contract.contractName || '（未命名）'}
              </span>
            </div>
            <Badge className={getStatusBadgeClass(contract.status)}>
              {contract.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* 基本信息：两列网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {/* 左列 */}
            <div className="space-y-4">
              <Field label="供应商" value={contract.supplier || '-'} />
              <Field
                label="含税总价"
                value={
                  <span className="font-semibold">
                    {formatCurrency(contract.totalAmount)}
                  </span>
                }
              />
              <Field label="税率" value={contract.taxRate || '-'} />
              <Field label="税金" value={formatCurrency(contract.taxAmount)} />
              <Field
                label="执行单位（甲方）"
                value={contract.executingUnitName || '-'}
              />
              <Field
                label="签订日期"
                value={contract.signDate ? formatDate(contract.signDate) : '-'}
              />
            </div>
            {/* 右列 */}
            <div className="space-y-4">
              <Field label="质保期" value={`${contract.warrantyPeriod} 个月`} />
              <Field label="交货期限" value={`${contract.deliveryTerm} 天`} />
              <Field label="付款比例" value={contract.paymentTerms || '-'} />
              <Field label="运输费用" value={contract.transportCost || '-'} />
              <Field label="仲裁委员会" value={contract.arbitrationBody || '-'} />
              <Field label="交货地址" value={contract.deliveryAddress || '-'} />
            </div>
          </div>
          {contract.remark && (
            <div className="mt-6">
              <p className="text-xs text-muted-foreground mb-1">备注</p>
              <p className="text-sm whitespace-pre-wrap">{contract.remark}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 关联采购订单 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            关联采购订单（{contract.orderLinks.length}）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contract.orderLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无关联订单</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contract.orderLinks.map((link) => (
                <Link
                  key={link.id}
                  href={`/projects/${projectId}/procurement/orders/${link.orderId}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/20 text-sm hover:bg-muted/40 transition-colors"
                >
                  <span className="font-mono">{link.order.orderNo}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(link.order.totalAmount)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 物资明细 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">物资明细</CardTitle>
        </CardHeader>
        <CardContent>
          {contract.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无物资明细</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物资名称</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>材质</TableHead>
                    <TableHead>品牌</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead className="text-right">含税单价</TableHead>
                    <TableHead className="text-right">含税总价</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.materialName}
                      </TableCell>
                      <TableCell>{item.specification || '-'}</TableCell>
                      <TableCell>{item.material || '-'}</TableCell>
                      <TableCell>{item.brand || '-'}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right font-semibold text-lg pt-4">
                合计: {formatCurrency(contract.totalAmount)}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 合同正文 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">合同正文</CardTitle>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">合同正文未生成</p>
          ) : (
            <div className="space-y-6 bg-white">
              {sections.map((section, idx) => (
                <section key={idx} className="space-y-2">
                  <h2 className="text-base font-semibold border-b pb-1">
                    {section.title}
                  </h2>
                  <div className="text-sm leading-7 whitespace-pre-wrap text-gray-800">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 单字段展示（label + value）
function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}
