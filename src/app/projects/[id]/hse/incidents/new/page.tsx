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
import { hseIncidentSchema, type HseIncidentFormValues } from '@/lib/validations'

export default function NewIncidentPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HseIncidentFormValues>({
    resolver: zodResolver(hseIncidentSchema as any),
    defaultValues: {
      projectId,
      incidentNo: '',
      location: '',
      type: '其他',
      severity: '轻微',
      description: '',
      cause: '',
      correctiveAction: '',
      status: '处理中',
    },
  })

  async function onSubmit(data: HseIncidentFormValues) {
    try {
      const res = await fetch('/api/hse-incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('事故事件记录成功')
      router.push(`/projects/${projectId}/hse/incidents`)
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">记录事故事件</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="incidentNo">事件编号 *</Label>
                <Input id="incidentNo" placeholder="请输入事件编号" {...register('incidentNo')} />
                {errors.incidentNo && <p className="text-sm text-destructive mt-1">{errors.incidentNo.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="incidentDate">发生日期 *</Label>
                <Input id="incidentDate" type="date" {...register('incidentDate')} />
                {errors.incidentDate && <p className="text-sm text-destructive mt-1">{errors.incidentDate.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="type">事件类型</Label>
                <Select value={watch('type') ?? ''} onValueChange={(v) => setValue('type', v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择事件类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="人员伤害">人员伤害</SelectItem>
                    <SelectItem value="财产损失">财产损失</SelectItem>
                    <SelectItem value="环境事件">环境事件</SelectItem>
                    <SelectItem value="未遂事件">未遂事件</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="severity">严重程度</Label>
                <Select value={watch('severity') ?? ''} onValueChange={(v) => setValue('severity', v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择严重程度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="轻微">轻微</SelectItem>
                    <SelectItem value="一般">一般</SelectItem>
                    <SelectItem value="严重">严重</SelectItem>
                    <SelectItem value="重大">重大</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">状态</Label>
                <Select value={watch('status') ?? ''} onValueChange={(v) => setValue('status', v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="处理中">处理中</SelectItem>
                    <SelectItem value="已关闭">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">发生地点</Label>
              <Input id="location" placeholder="请输入发生地点" {...register('location')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">事件描述</Label>
              <Textarea id="description" placeholder="请输入事件描述" {...register('description')} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cause">原因分析</Label>
              <Textarea id="cause" placeholder="请输入原因分析" {...register('cause')} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="correctiveAction">纠正措施</Label>
              <Textarea id="correctiveAction" placeholder="请输入纠正措施" {...register('correctiveAction')} rows={3} />
            </div>

            <Separator />

            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? '创建中...' : '提交记录'}
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
