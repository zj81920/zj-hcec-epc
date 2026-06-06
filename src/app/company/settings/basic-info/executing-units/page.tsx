'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Topbar } from '@/components/layout/topbar'

// 执行单位实体（与后端 Prisma 模型一致）
interface ExecutingUnit {
  id: string
  name: string
  address: string
  contactPerson: string
  phone: string
  bankName: string
  bankAccount: string
  taxId: string
  status: string
}

// 行内编辑表单
interface EditableRow {
  id: string
  name: string
  address: string
  contactPerson: string
  phone: string
  bankName: string
  bankAccount: string
  taxId: string
  status: string
  isNew?: boolean
}

const emptyRow: EditableRow = {
  id: '',
  name: '',
  address: '',
  contactPerson: '',
  phone: '',
  bankName: '',
  bankAccount: '',
  taxId: '',
  status: '启用',
  isNew: true,
}

export default function ExecutingUnitsPage() {
  const [units, setUnits] = useState<ExecutingUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditableRow>(emptyRow)
  const [isCreating, setIsCreating] = useState(false)

  // 加载执行单位列表
  const loadUnits = useCallback(() => {
    setLoading(true)
    fetch('/api/executing-units')
      .then((r) => r.json())
      .then((data) => {
        setUnits(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        toast.error('加载执行单位列表失败')
        setUnits([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadUnits()
  }, [loadUnits])

  function startCreate() {
    setIsCreating(true)
    setEditingId(null)
    setEditForm({ ...emptyRow })
  }

  function cancelCreate() {
    setIsCreating(false)
    setEditForm(emptyRow)
  }

  // 创建新执行单位
  async function handleCreate() {
    if (!editForm.name.trim()) {
      toast.error('请输入单位名称')
      return
    }
    try {
      const res = await fetch('/api/executing-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          address: editForm.address.trim(),
          contactPerson: editForm.contactPerson.trim(),
          phone: editForm.phone.trim(),
          bankName: editForm.bankName.trim(),
          bankAccount: editForm.bankAccount.trim(),
          taxId: editForm.taxId.trim(),
          status: editForm.status,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('执行单位创建成功')
      setIsCreating(false)
      setEditForm(emptyRow)
      loadUnits()
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  function startEdit(u: ExecutingUnit) {
    setEditingId(u.id)
    setIsCreating(false)
    setEditForm({
      id: u.id,
      name: u.name ?? '',
      address: u.address ?? '',
      contactPerson: u.contactPerson ?? '',
      phone: u.phone ?? '',
      bankName: u.bankName ?? '',
      bankAccount: u.bankAccount ?? '',
      taxId: u.taxId ?? '',
      status: u.status ?? '启用',
      isNew: false,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(emptyRow)
  }

  // 更新执行单位
  async function handleUpdate() {
    if (!editForm.name.trim()) {
      toast.error('请输入单位名称')
      return
    }
    try {
      const res = await fetch(`/api/executing-units/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          address: editForm.address.trim(),
          contactPerson: editForm.contactPerson.trim(),
          phone: editForm.phone.trim(),
          bankName: editForm.bankName.trim(),
          bankAccount: editForm.bankAccount.trim(),
          taxId: editForm.taxId.trim(),
          status: editForm.status,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '更新失败')
      }
      toast.success('执行单位更新成功')
      setEditingId(null)
      setEditForm(emptyRow)
      loadUnits()
    } catch (e: any) {
      toast.error(e.message || '更新失败')
    }
  }

  // 硬删除
  async function handleDelete(id: string, name: string) {
    if (!confirm(`确认删除执行单位「${name}」？删除后不可恢复。`)) return
    try {
      const res = await fetch(`/api/executing-units/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '删除失败')
      }
      toast.success('执行单位已删除')
      loadUnits()
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  // 切换启用/停用状态（仅修改表单本地状态，待保存提交）
  function toggleStatus() {
    setEditForm((prev) => ({
      ...prev,
      status: prev.status === '启用' ? '停用' : '启用',
    }))
  }

  // 直接切换某行的状态并立即保存（非编辑态下）
  async function quickToggleStatus(u: ExecutingUnit) {
    const next = u.status === '启用' ? '停用' : '启用'
    try {
      const res = await fetch(`/api/executing-units/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '状态更新失败')
      }
      toast.success(`已${next}`)
      loadUnits()
    } catch (e: any) {
      toast.error(e.message || '状态更新失败')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="text-sm text-muted-foreground">
          <Link href="/company/partners" className="hover:text-foreground transition-colors">公司管理</Link> &gt; 系统设置 &gt; <Link href="/company/settings/basic-info" className="hover:text-foreground transition-colors">基础信息</Link> &gt; 执行单位
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">执行单位管理</h1>
          <Button onClick={startCreate} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-1" />
            新建执行单位
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">加载中...</p>
            ) : units.length === 0 && !isCreating ? (
              <p className="text-center text-muted-foreground py-12">
                暂无执行单位数据，点击"新建执行单位"开始添加
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">序号</TableHead>
                    <TableHead className="min-w-[160px]">单位名称</TableHead>
                    <TableHead className="min-w-[160px]">地址</TableHead>
                    <TableHead className="w-24">联系人</TableHead>
                    <TableHead className="w-32">联系电话</TableHead>
                    <TableHead className="min-w-[140px]">开户行</TableHead>
                    <TableHead className="min-w-[160px]">银行账号</TableHead>
                    <TableHead className="min-w-[180px]">统一社会信用代码</TableHead>
                    <TableHead className="w-20">状态</TableHead>
                    <TableHead className="w-40 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCreating && (
                    <TableRow>
                      <TableCell className="text-muted-foreground">新</TableCell>
                      <TableCell>
                        <Input
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="请输入单位名称"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.address}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, address: e.target.value }))
                          }
                          placeholder="地址"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.contactPerson}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, contactPerson: e.target.value }))
                          }
                          placeholder="联系人"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.phone}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                          }
                          placeholder="电话"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.bankName}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, bankName: e.target.value }))
                          }
                          placeholder="开户行"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.bankAccount}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, bankAccount: e.target.value }))
                          }
                          placeholder="银行账号"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.taxId}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, taxId: e.target.value }))
                          }
                          placeholder="统一社会信用代码"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={editForm.status === '启用' ? 'default' : 'outline'}
                          className="cursor-pointer select-none"
                          onClick={toggleStatus}
                        >
                          {editForm.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={handleCreate}>
                            <Check className="h-3.5 w-3.5 mr-1" />
                            保存
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelCreate}>
                            <X className="h-3.5 w-3.5 mr-1" />
                            取消
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {units.map((u, idx) => {
                    const isEditing = editingId === u.id

                    if (isEditing) {
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <Input
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, name: e.target.value }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.address}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, address: e.target.value }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.contactPerson}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, contactPerson: e.target.value }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.phone}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.bankName}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, bankName: e.target.value }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.bankAccount}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, bankAccount: e.target.value }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.taxId}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, taxId: e.target.value }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={editForm.status === '启用' ? 'default' : 'outline'}
                              className="cursor-pointer select-none"
                              onClick={toggleStatus}
                            >
                              {editForm.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={handleUpdate}>
                                <Check className="h-3.5 w-3.5 mr-1" />
                                保存
                              </Button>
                              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                <X className="h-3.5 w-3.5 mr-1" />
                                取消
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    }

                    return (
                      <TableRow key={u.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm">{u.address || '-'}</TableCell>
                        <TableCell className="text-sm">{u.contactPerson || '-'}</TableCell>
                        <TableCell className="text-sm">{u.phone || '-'}</TableCell>
                        <TableCell className="text-sm">{u.bankName || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{u.bankAccount || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{u.taxId || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={u.status === '启用' ? 'default' : 'outline'}
                            className="cursor-pointer select-none"
                            onClick={() => quickToggleStatus(u)}
                          >
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(u)}>
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              编辑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(u.id, u.name)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              删除
                            </Button>
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
      </main>
    </div>
  )
}
