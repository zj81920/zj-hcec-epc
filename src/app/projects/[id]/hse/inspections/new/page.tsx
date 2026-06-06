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
import { hseInspectionSchema, type HseInspectionFormValues } from '@/lib/validations'

export default function NewInspectionPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HseInspectionFormValues>({
    resolver: zodResolver(hseInspectionSchema as any),
    defaultValues: {
      projectId,
      inspector: '',
      area: '',
      findings: '',
      rectification: '',
      status: '待整改',
    },
  })

  const status = watch('status')

  async function onSubmit(data: HseInspectionFormValues) {
    try {
      const res = await fetch('/api/hse-inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('检查记录创建成功')
      router.push(`/projects/${projectId}/hse/inspections`)
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">新增检查记录</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="inspectionDate">检查日期 *</Label>
                <Input id="inspectionDate" type="date" {...register('inspectionDate')} />
                {errors.inspectionDate && <p className="text-sm text-destructive mt-1">{errors.inspectionDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inspector">检查人</Label>
                <Input id="inspector" placeholder="请输入检查人" {...register('inspector')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="area">检查区域</Label>
                <Input id="area" placeholder="请输入检查区域" {...register('area')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deadline">整改期限 *</Label>
                <Input id="deadline" type="date" {...register('deadline')} />
                {errors.deadline && <p className="text-sm text-destructive mt-1">{errors.deadline.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">状态</Label>
              <Select
                value={status}
                onValueChange={(v) => setValue('status', v as HseInspectionFormValues['status'])}
              >
                <SelectTrigger className="w-full max-w-[200px]">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="待整改">待整改</SelectItem>
                  <SelectItem value="整改中">整改中</SelectItem>
                  <SelectItem value="已关闭">已关闭</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="findings">检查发现</Label>
              <Textarea id="findings" placeholder="请输入检查发现" {...register('findings')} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rectification">整改要求</Label>
              <Textarea id="rectification" placeholder="请输入整改要求" {...register('rectification')} rows={3} />
            </div>

            <Separator />

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={isSubmitting} size="lg">{isSubmitting ? '创建中...' : '提交记录'}</Button>
              <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>取消</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
