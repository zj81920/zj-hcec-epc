'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Topbar } from '@/components/layout/topbar'

const TYPE_MAP: Record<string, string> = {
  supplier: '供应商',
  subcontractor: '分包商',
  service: '服务商',
  other: '其他',
}

const TYPE_COLOR_MAP: Record<string, string> = {
  supplier: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  subcontractor: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  service: 'bg-green-100 text-green-700 hover:bg-green-100',
  other: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
}

interface Partner {
  id: string
  name: string
  type: string
  taxId: string
  contactPerson: string
  phone: string
  qualification: string
  status: string
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPartners()
  }, [typeFilter, statusFilter, search])

  function loadPartners() {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter)
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
    if (search.trim()) params.set('search', search.trim())

    fetch(`/api/partners?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setPartners(Array.isArray(data) ? data : data.partners ?? [])
      })
      .catch(() => {
        toast.error('加载合作方列表失败')
        setPartners([])
      })
      .finally(() => setLoading(false))
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确认删除合作方「${name}」？此操作不可撤销。`)) return
    try {
      const res = await fetch(`/api/partners/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '删除失败')
      }
      toast.success('已删除合作方')
      loadPartners()
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">合作方管理</h1>
          <Link href="/company/partners/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              新建合作方
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="supplier">供应商</SelectItem>
                  <SelectItem value="subcontractor">分包商</SelectItem>
                  <SelectItem value="service">服务商</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="启用">启用</SelectItem>
                  <SelectItem value="停用">停用</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="搜索名称/联系人"
                className="w-[220px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">加载中...</p>
            ) : partners.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                暂无合作方数据，点击"新建合作方"开始添加
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>统一信用代码</TableHead>
                    <TableHead>联系人</TableHead>
                    <TableHead>手机</TableHead>
                    <TableHead>资质等级</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={TYPE_COLOR_MAP[p.type] || TYPE_COLOR_MAP.other}
                        >
                          {TYPE_MAP[p.type] || p.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.taxId || '-'}
                      </TableCell>
                      <TableCell>{p.contactPerson || '-'}</TableCell>
                      <TableCell>{p.phone || '-'}</TableCell>
                      <TableCell>{p.qualification || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === '启用' ? 'default' : 'outline'}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/company/partners/${p.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              编辑
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p.id, p.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
