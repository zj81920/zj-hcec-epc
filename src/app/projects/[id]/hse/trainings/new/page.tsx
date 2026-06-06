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
import { hseTrainingSchema, type HseTrainingFormValues } from '@/lib/validations'

export default function NewTrainingPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HseTrainingFormValues>({
    resolver: zodResolver(hseTrainingSchema as any),
    defaultValues: {
      projectId,
      topic: '',
      trainer: '',
      location: '',
      participantCount: 0,
      participants: '',
      content: '',
    },
  })

  async function onSubmit(data: HseTrainingFormValues) {
    try {
      const res = await fetch('/api/hse-trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('培训记录创建成功')
      router.push(`/projects/${projectId}/hse/trainings`)
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">新增培训记录</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="topic">培训主题 *</Label>
                <Input id="topic" {...register('topic')} placeholder="请输入培训主题" />
                {errors.topic && <p className="text-sm text-destructive mt-1">{errors.topic.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trainingDate">培训日期 *</Label>
                <Input id="trainingDate" type="date" {...register('trainingDate')} />
                {errors.trainingDate && <p className="text-sm text-destructive mt-1">{errors.trainingDate.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="trainer">讲师</Label>
                <Input id="trainer" {...register('trainer')} placeholder="请输入讲师姓名" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">培训地点</Label>
                <Input id="location" {...register('location')} placeholder="请输入培训地点" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="participantCount">参与人数</Label>
                <Input id="participantCount" type="number" min={0} {...register('participantCount')} placeholder="输入人数" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="participants">参与人员</Label>
              <Input id="participants" {...register('participants')} placeholder="多个人员用逗号分隔" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="content">培训内容</Label>
              <Textarea id="content" {...register('content')} rows={4} placeholder="请输入培训内容" />
            </div>
            <Separator className="my-2" />
            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? '创建中...' : '提交记录'}</Button>
              <Button type="button" size="lg" variant="outline" onClick={() => router.back()}>取消</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
