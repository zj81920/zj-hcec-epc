'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { formatDateTime } from '@/lib/utils'
import { Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Material {
  id: string
  materialCode: string
  materialName: string
  specification: string
  material: string
  materialGrade: string
  applicableStandard: string
  unit: string
  createdAt: string
}

export default function MaterialListPage() {
  const params = useParams()
  const projectId = params.id as string
  const [materials, setMaterials] = useState<Material[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function load() {
    fetch('/api/materials')
      .then((r) => r.json())
      .then(setMaterials)
    setSelected(new Set())
  }

  useEffect(load, [])

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === materials.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(materials.map((m) => m.materialCode)))
    }
  }

  async function handleBatchDelete() {
    if (selected.size === 0) {
      toast.error('请先选择要删除的物料')
      return
    }
    if (!confirm(`确认删除选中的 ${selected.size} 个物料？此操作不可撤销。`)) return
    try {
      const res = await fetch('/api/materials/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: Array.from(selected) }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '删除失败')
      }
      toast.success(`已删除 ${selected.size} 个物料`)
      load()
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}/procurement/requisitions`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">物料库管理</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">共 {materials.length} 条物料</p>
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              删除选中的 {selected.size} 项
            </Button>
          )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">全部物料</CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无物料，新建请购单录入物料后会自动保存到这里</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="accent-primary size-4 cursor-pointer"
                      checked={selected.size === materials.length && materials.length > 0}
                      onChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>物料编码</TableHead>
                  <TableHead>物料名称</TableHead>
                  <TableHead>规格</TableHead>
                  <TableHead>材质</TableHead>
                  <TableHead>牌号</TableHead>
                  <TableHead>标准规范</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m) => (
                  <TableRow key={m.id} className={selected.has(m.materialCode) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="accent-primary size-4 cursor-pointer"
                        checked={selected.has(m.materialCode)}
                        onChange={() => toggle(m.materialCode)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.materialCode}</TableCell>
                    <TableCell className="font-medium">{m.materialName}</TableCell>
                    <TableCell>{m.specification || '-'}</TableCell>
                    <TableCell>{m.material || '-'}</TableCell>
                    <TableCell>{m.materialGrade || '-'}</TableCell>
                    <TableCell>{m.applicableStandard || '-'}</TableCell>
                    <TableCell>{m.unit || '-'}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(m.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
