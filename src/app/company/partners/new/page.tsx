'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Topbar } from '@/components/layout/topbar'
import { partnerSchema, type PartnerFormValues } from '@/lib/validations'

const PARTNER_TYPES = [
  { value: 'supplier', label: '供应商' },
  { value: 'subcontractor', label: '分包商' },
  { value: 'service', label: '服务商' },
  { value: 'other', label: '其他' },
]
const STAR_RATINGS = [1, 2, 3, 4, 5]

export default function NewPartnerPage() {
  const router = useRouter()
  const [attachments, setAttachments] = useState<Array<{ fileName: string; filePath: string; fileSize: number; fileType: string }>>([])
  const [uploading, setUploading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema as any),
    defaultValues: {
      name: '',
      type: 'supplier',
      taxId: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      qualification: '',
      bankName: '',
      bankAccount: '',
      rating: 3,
      attachments: [],
      status: '启用',
      remark: '',
    },
  })

  const type = watch('type')
  const status = watch('status')
  const rating = watch('rating')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '上传失败')
      }
      const uploaded = await res.json()
      setAttachments((prev) => [...prev, uploaded])
      toast.success('文件上传成功')
    } catch (e: any) {
      toast.error(e.message || '上传失败')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function handleRemoveAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(data: PartnerFormValues) {
    try {
      data.attachments = attachments
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('合作方创建成功')
      router.push('/company/partners')
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        <h1 className="text-2xl font-bold">新建合作方</h1>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <h3 className="text-base font-semibold mb-4">基本信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">名称 *</Label>
                    <Input id="name" placeholder="请输入合作方名称" {...register('name')} />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>类型</Label>
                    <Select value={type} onValueChange={(v) => setValue('type', v as PartnerFormValues['type'])}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {PARTNER_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="taxId">统一信用代码</Label>
                    <Input id="taxId" placeholder="请输入统一信用代码" {...register('taxId')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="qualification">资质等级</Label>
                    <Input id="qualification" placeholder="请输入资质等级" {...register('qualification')} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-base font-semibold mb-4">联系方式</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="contactPerson">联系人</Label>
                    <Input id="contactPerson" placeholder="请输入联系人" {...register('contactPerson')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">手机</Label>
                    <Input id="phone" placeholder="请输入手机号" {...register('phone')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">邮箱</Label>
                    <Input id="email" type="email" placeholder="请输入邮箱" {...register('email')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address">地址</Label>
                    <Input id="address" placeholder="请输入地址" {...register('address')} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-base font-semibold mb-4">财务信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="bankName">开户行</Label>
                    <Input id="bankName" placeholder="请输入开户行" {...register('bankName')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bankAccount">银行账号</Label>
                    <Input id="bankAccount" placeholder="请输入银行账号" {...register('bankAccount')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>评级</Label>
                    <div className="flex items-center gap-1 pt-1">
                      {STAR_RATINGS.map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="text-2xl leading-none transition-colors"
                          style={{ color: star <= rating ? '#f59e0b' : '#d1d5db' }}
                          onClick={() => setValue('rating', star as PartnerFormValues['rating'])}
                        >
                          ★
                        </button>
                      ))}
                      <span className="text-sm text-muted-foreground ml-2">{rating} 星</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-base font-semibold mb-4">其他</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label>状态</Label>
                    <Select value={status} onValueChange={(v) => setValue('status', v as PartnerFormValues['status'])}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="启用">启用</SelectItem>
                        <SelectItem value="停用">停用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1" />
                </div>
                <div className="mt-5 space-y-1.5">
                  <Label htmlFor="remark">备注</Label>
                  <Textarea id="remark" placeholder="请输入备注信息" {...register('remark')} rows={3} />
                </div>
                <div className="mt-5 space-y-2">
                  <Label>资质文件</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      onChange={handleUpload}
                      disabled={uploading}
                      className="max-w-sm"
                    />
                    {uploading && <span className="text-sm text-muted-foreground">上传中...</span>}
                  </div>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/20 text-sm">
                          <span className="max-w-[200px] truncate">{att.fileName}</span>
                          <span className="text-xs text-muted-foreground">({(att.fileSize / 1024).toFixed(1)}KB)</span>
                          <button
                            type="button"
                            className="text-destructive hover:text-destructive/80 ml-1"
                            onClick={() => handleRemoveAttachment(idx)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={isSubmitting} size="lg">
                  {isSubmitting ? '创建中...' : '创建合作方'}
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
