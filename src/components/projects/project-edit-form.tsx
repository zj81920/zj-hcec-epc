'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { projectSchema, type ProjectFormValues } from '@/lib/validations'

interface ProjectEditFormProps {
  project: any
}

export function ProjectEditForm({ project }: ProjectEditFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema as any),
    defaultValues: {
      name: project.name,
      code: project.code,
      type: project.type,
      location: project.location,
      startDate: project.startDate.split('T')[0],
      endDate: project.endDate.split('T')[0],
      budget: project.budget,
      status: project.status,
      description: project.description,
    },
  })

  async function onSubmit(data: ProjectFormValues) {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '更新失败')
      }
      toast.success('项目更新成功')
      router.push(`/projects/${project.id}`)
    } catch (e: any) {
      toast.error(e.message || '更新失败')
    }
  }

  async function handleDelete() {
    if (!confirm('确定要删除该项目吗？此操作不可撤销。')) return
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除失败')
      toast.success('项目已删除')
      router.push('/projects')
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">项目名称 *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">项目编码 *</Label>
              <Input id="code" {...register('code')} />
              {errors.code && <p className="text-sm text-destructive mt-1">{errors.code.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="type">项目类型</Label>
              <select
                id="type"
                {...register('type')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              >
                <option value="EPC">EPC</option>
                <option value="EP">EP</option>
                <option value="PC">PC</option>
                <option value="E">E</option>
                <option value="P">P</option>
                <option value="C">C</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">项目状态</Label>
              <select
                id="status"
                {...register('status')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              >
                <option value="前期">前期</option>
                <option value="在建">在建</option>
                <option value="暂停">暂停</option>
                <option value="竣工">竣工</option>
                <option value="结算">结算</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">项目地点</Label>
            <Input id="location" {...register('location')} />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">开始日期 *</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">结束日期 *</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-sm text-destructive mt-1">{errors.endDate.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget">预算金额（元）</Label>
            <Input id="budget" type="number" step="0.01" {...register('budget')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">项目描述</Label>
            <Textarea id="description" {...register('description')} rows={3} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存修改'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              取消
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="destructive" onClick={handleDelete}>
              删除项目
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
