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
import { liaisonSchema, type LiaisonFormValues } from '@/lib/validations'

export default function NewLiaisonPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LiaisonFormValues>({
    resolver: zodResolver(liaisonSchema as any),
    defaultValues: {
      projectId,
      liaisonNo: '',
      title: '',
      sender: '',
      receiver: '',
      content: '',
      status: '待回复',
    },
  })

  const status = watch('status')

  async function onSubmit(data: LiaisonFormValues) {
    try {
      const res = await fetch('/api/design-liaisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('联络单创建成功')
      router.push(`/projects/${projectId}/design/liaisons`)
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">新建联络单</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="liaisonNo">联络单编号 *</Label>
                <Input id="liaisonNo" placeholder="请输入联络单编号" {...register('liaisonNo')} />
                {errors.liaisonNo && <p className="text-sm text-destructive mt-1">{errors.liaisonNo.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">状态</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setValue('status', v as LiaisonFormValues['status'])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="待回复">待回复</SelectItem>
                    <SelectItem value="已回复">已回复</SelectItem>
                    <SelectItem value="已关闭">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">标题 *</Label>
              <Input id="title" placeholder="请输入标题" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="sender">发件人</Label>
                <Input id="sender" placeholder="请输入发件人" {...register('sender')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="receiver">收件人</Label>
                <Input id="receiver" placeholder="请输入收件人" {...register('receiver')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="content">联络内容</Label>
              <Textarea id="content" placeholder="请输入联络内容" {...register('content')} rows={4} />
            </div>

            <Separator />

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? '创建中...' : '创建联络单'}
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
