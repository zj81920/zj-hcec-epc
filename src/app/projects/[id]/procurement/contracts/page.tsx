'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react'

// 合同流程状态枚举（与全局规范一致）
const STATUS_TABS = ['全部', '草稿', '审批中', '已批准', '已驳回'] as const
type StatusTab = (typeof STATUS_TABS)[number]

// 合同列表项类型（与 GET /api/contracts 返回结构对齐）
interface ContractListItem {
  id: string
  contractNo: string
  contractName: string
  supplier: string | null
  totalAmount: number
  taxRate: number | null
  status: string
  _count: {
    orderLinks: number
    items: number
  }
}

// 状态对应的 Badge 颜色样式
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

export default function ContractListPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const projectId = params.id

  const [contracts, setContracts] = useState<ContractListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [statusTab, setStatusTab] = useState<StatusTab>('全部')
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // 加载合同列表
  const loadContracts = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ projectId })
      if (statusTab !== '全部') qs.set('status', statusTab)
      if (keyword) qs.set('keyword', keyword)
      const res = await fetch(`/api/contracts?${qs.toString()}`)
      if (!res.ok) throw new Error('加载失败')
      const data = (await res.json()) as ContractListItem[]
      setContracts(data)
    } catch (e) {
      console.error(e)
      setContracts([])
    } finally {
      setLoading(false)
    }
  }, [projectId, statusTab, keyword])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  // 删除合同（仅草稿可删）
  const handleDelete = async (id: string, contractNo: string) => {
    if (!window.confirm(`确认删除合同「${contractNo}」？删除后将清除关联订单的合同号。`)) {
      return
    }
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        window.alert(err.error || '删除失败')
        return
      }
      await loadContracts()
    } catch (e) {
      console.error(e)
      window.alert('删除失败')
    }
  }

  // 触发搜索（点击按钮 / 回车）
  const handleSearch = () => {
    setKeyword(searchInput.trim())
  }

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
        <span className="text-foreground">合同管理</span>
      </nav>

      {/* 页面标题 + 新建按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">合同管理</h1>
        <Link href={`/projects/${projectId}/procurement/contracts/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            新建合同
          </Button>
        </Link>
      </div>

      {/* 状态过滤标签 + 搜索框 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab}
              variant={statusTab === tab ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusTab(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="合同编号 / 名称 / 供应商"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
            className="w-64"
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4 mr-1" />
            搜索
          </Button>
        </div>
      </div>

      {/* 数据表格 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">加载中...</p>
          ) : contracts.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无合同数据</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>合同编号</TableHead>
                  <TableHead>合同名称</TableHead>
                  <TableHead>供应商</TableHead>
                  <TableHead className="text-center">关联订单数</TableHead>
                  <TableHead className="text-right">含税总价</TableHead>
                  <TableHead className="text-center">税率</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => {
                  const editable = c.status === '草稿' || c.status === '已驳回'
                  const deletable = c.status === '草稿'
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.contractNo}</TableCell>
                      <TableCell>{c.contractName}</TableCell>
                      <TableCell>{c.supplier || '-'}</TableCell>
                      <TableCell className="text-center">
                        {c._count.orderLinks}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(c.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {c.taxRate != null ? `${(c.taxRate * 100).toFixed(0)}%` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusBadgeClass(c.status)}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/projects/${projectId}/procurement/contracts/${c.id}`,
                              )
                            }
                            title="查看"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {editable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/projects/${projectId}/procurement/contracts/${c.id}/edit`,
                                )
                              }
                              title="编辑"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {deletable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(c.id, c.contractNo)}
                              title="删除"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
