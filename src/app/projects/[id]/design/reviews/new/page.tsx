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
import { reviewSchema, type ReviewFormValues } from '@/lib/validations'

export default function NewReviewPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema as any),
    defaultValues: {
      projectId,
      reviewNo: '',
      title: '',
      participants: '',
      conclusions: '',
    },
  })

  async function onSubmit(data: ReviewFormValues) {
    try {
      const res = await fetch('/api/design-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('会审记录创建成功')
      router.push(`/projects/${projectId}/design/reviews`)
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">新建会审记录</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="reviewNo">会审编号 *</Label>
                <Input id="reviewNo" {...register('reviewNo')} placeholder="请输入会审编号" />
                {errors.reviewNo && <p className="text-sm text-destructive mt-1">{errors.reviewNo.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reviewDate">会审日期 *</Label>
                <Input id="reviewDate" type="date" {...register('reviewDate')} />
                {errors.reviewDate && <p className="text-sm text-destructive mt-1">{errors.reviewDate.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">标题 *</Label>
              <Input id="title" {...register('title')} placeholder="请输入会审标题" />
              {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="participants">参会人员</Label>
              <Input id="participants" {...register('participants')} placeholder="多个人员用逗号分隔" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conclusions">会审结论</Label>
              <Textarea id="conclusions" {...register('conclusions')} rows={4} placeholder="请输入会审结论" />
            </div>
            <Separator className="my-2" />
            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? '创建中...' : '创建记录'}
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={() => router.back()}>
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
