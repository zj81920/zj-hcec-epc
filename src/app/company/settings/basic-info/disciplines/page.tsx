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

interface Discipline {
  id: string
  name: string
  code: string
  status: string
  sortOrder: number
}

interface EditableRow {
  id: string
  name: string
  status: string
  isNew?: boolean
}

const emptyRow: EditableRow = {
  id: '',
  name: '',
  status: '启用',
  isNew: true,
}

export default function DisciplinesPage() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditableRow>(emptyRow)
  const [isCreating, setIsCreating] = useState(false)

  const loadDisciplines = useCallback(() => {
    setLoading(true)
    fetch('/api/disciplines')
      .then((r) => r.json())
      .then((data) => {
        setDisciplines(Array.isArray(data) ? data : data.disciplines ?? [])
      })
      .catch(() => {
        toast.error('加载专业列表失败')
        setDisciplines([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadDisciplines()
  }, [loadDisciplines])

  function startCreate() {
    setIsCreating(true)
    setEditingId(null)
    setEditForm({ ...emptyRow })
  }

  function cancelCreate() {
    setIsCreating(false)
    setEditForm(emptyRow)
  }

  async function handleCreate() {
    if (!editForm.name.trim()) {
      toast.error('请输入专业名称')
      return
    }
    try {
      const res = await fetch('/api/disciplines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          status: editForm.status,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('专业创建成功')
      setIsCreating(false)
      setEditForm(emptyRow)
      loadDisciplines()
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  function startEdit(d: Discipline) {
    setEditingId(d.id)
    setIsCreating(false)
    setEditForm({
      id: d.id,
      name: d.name,
      status: d.status,
      isNew: false,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(emptyRow)
  }

  async function handleUpdate() {
    if (!editForm.name.trim()) {
      toast.error('请输入专业名称')
      return
    }
    try {
      const res = await fetch(`/api/disciplines/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          status: editForm.status,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '更新失败')
      }
      toast.success('专业更新成功')
      setEditingId(null)
      setEditForm(emptyRow)
      loadDisciplines()
    } catch (e: any) {
      toast.error(e.message || '更新失败')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确认删除专业「${name}」？删除后不可恢复。`)) return
    try {
      const res = await fetch(`/api/disciplines/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '删除失败')
      }
      toast.success('专业已删除')
      loadDisciplines()
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  function toggleStatus() {
    setEditForm((prev) => ({
      ...prev,
      status: prev.status === '启用' ? '停用' : '启用',
    }))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        <div className="text-sm text-muted-foreground">
          <Link href="/company/partners" className="hover:text-foreground transition-colors">公司管理</Link> &gt; 系统设置 &gt; <Link href="/company/settings/basic-info" className="hover:text-foreground transition-colors">基础信息</Link> &gt; 专业字典
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">专业字典管理</h1>
          <Button onClick={startCreate} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-1" />
            新建专业
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">加载中...</p>
            ) : disciplines.length === 0 && !isCreating ? (
              <p className="text-center text-muted-foreground py-12">
                暂无专业数据，点击"新建专业"开始添加
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">序号</TableHead>
                    <TableHead>专业名称</TableHead>
                    <TableHead>专业编码</TableHead>
                    <TableHead className="w-20">状态</TableHead>
                    <TableHead className="w-40 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCreating && (
                    <TableRow>
                      <TableCell className="text-muted-foreground">
                        {disciplines.length + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="请输入专业名称"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">自动生成</span>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelCreate}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            取消
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {disciplines.map((d, idx) => {
                    const isEditing = editingId === d.id

                    if (isEditing) {
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, name: e.target.value }))
                              }
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {d.code}
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                              >
                                <X className="h-3.5 w-3.5 mr-1" />
                                取消
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    }

                    return (
                      <TableRow key={d.id}>
                        <TableCell className="text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="font-mono text-xs">{d.code}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === '启用' ? 'default' : 'outline'}>
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(d)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              编辑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(d.id, d.name)}
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
