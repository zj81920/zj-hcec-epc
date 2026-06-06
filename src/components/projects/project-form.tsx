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

export function ProjectForm() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema as any),
    defaultValues: {
      name: '',
      code: '',
      type: 'EPC',
      location: '',
      budget: 0,
      status: '前期',
      description: '',
    },
  })

  async function onSubmit(data: ProjectFormValues) {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      const project = await res.json()
      toast.success('项目创建成功')
      router.push(`/projects/${project.id}`)
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">项目名称 *</Label>
              <Input id="name" {...register('name')} placeholder="请输入项目名称" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">项目编码 *</Label>
              <Input id="code" {...register('code')} placeholder="如 HY-DYW-2024" />
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
            <Input id="location" {...register('location')} placeholder="请输入项目地点" />
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
            <Input id="budget" type="number" step="0.01" {...register('budget')} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">项目描述</Label>
            <Textarea id="description" {...register('description')} placeholder="请输入项目描述" rows={3} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '创建中...' : '创建项目'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
