'use client'

import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { constructionTaskSchema, type ConstructionTaskFormValues } from '@/lib/validations'

export default function NewConstructionTaskPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConstructionTaskFormValues>({
    resolver: zodResolver(constructionTaskSchema as any),
    defaultValues: {
      projectId,
      taskName: '',
      workArea: '',
      contractor: '',
      progress: 0,
      status: '待施工',
      remark: '',
    },
  })

  const status = watch('status')

  async function onSubmit(data: ConstructionTaskFormValues) {
    try {
      const res = await fetch('/api/construction-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('施工任务创建成功')
      router.push(`/projects/${projectId}/construction`)
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">新建施工任务</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="taskName">任务名称 *</Label>
              <Input id="taskName" placeholder="请输入任务名称" {...register('taskName')} />
              {errors.taskName && <p className="text-sm text-destructive mt-1">{errors.taskName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="workArea">施工区域</Label>
                <Input id="workArea" placeholder="请输入施工区域" {...register('workArea')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contractor">承包商</Label>
                <Input id="contractor" placeholder="请输入承包商" {...register('contractor')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="planStartDate">计划开始 *</Label>
                <Input id="planStartDate" type="date" {...register('planStartDate')} />
                {errors.planStartDate && <p className="text-sm text-destructive mt-1">{errors.planStartDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="planEndDate">计划结束 *</Label>
                <Input id="planEndDate" type="date" {...register('planEndDate')} />
                {errors.planEndDate && <p className="text-sm text-destructive mt-1">{errors.planEndDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="progress">进度 (%)</Label>
                <Input id="progress" type="number" min={0} max={100} placeholder="0" {...register('progress')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">状态</Label>
              <Select
                value={status}
                onValueChange={(v) => setValue('status', v as ConstructionTaskFormValues['status'])}
              >
                <SelectTrigger className="w-full max-w-[200px]">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="待施工">待施工</SelectItem>
                  <SelectItem value="施工中">施工中</SelectItem>
                  <SelectItem value="已完工">已完工</SelectItem>
                  <SelectItem value="验收中">验收中</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="remark">备注</Label>
              <Textarea id="remark" placeholder="请输入备注信息" {...register('remark')} rows={3} />
            </div>

            <Separator />

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? '创建中...' : '创建任务'}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
