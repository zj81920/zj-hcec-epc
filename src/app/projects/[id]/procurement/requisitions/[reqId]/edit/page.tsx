'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import MaterialSearchInput from '@/components/material-search-input'
import { requisitionSchema, type RequisitionFormValues } from '@/lib/validations'
import { useUser } from '@/lib/user-context'
import { Plus, Trash2 } from 'lucide-react'

const PROCUREMENT_CATEGORIES = ['设备', '材料', '服务', '其他']
const DEMAND_TYPES = ['正常采购', '紧急采购', '补单']

interface ReqItem {
  materialName: string
  specification: string
  material: string
  materialGrade: string
  applicableStandard: string
  quantity: number
  unit: string
  purpose: string
  status: string
  requiredDate?: string | null
}

interface AttachmentInfo {
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
}

interface ReqData {
  reqNo: string
  reqDate: string
  requester: string
  procurementCategory: string
  demandType: string
  discipline: string
  remark: string
  status: string
  attachments: AttachmentInfo[]
  items: ReqItem[]
}

export default function EditRequisitionPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const reqId = params.reqId as string
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [reqNo, setReqNo] = useState('')
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([])
  const [uploading, setUploading] = useState(false)
  const [disciplines, setDisciplines] = useState<Array<{ id: string; name: string; code: string }>>([])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RequisitionFormValues>({
    resolver: zodResolver(requisitionSchema as any),
    defaultValues: {
      projectId,
      requester: user.name,
      procurementCategory: '设备',
      demandType: '正常采购',
      discipline: '',
      status: '草稿',
      remark: '',
      attachments: [],
      items: [],
    },
  })

  useEffect(() => {
    fetch(`/api/requisitions/${reqId}`)
      .then((r) => r.json())
      .then((data: ReqData) => {
        setReqNo(data.reqNo)
        setAttachments(data.attachments || [])
        reset({
          projectId,
          reqDate: data.reqDate ? new Date(data.reqDate) : new Date(),
          requester: data.requester,
          procurementCategory: data.procurementCategory,
          demandType: data.demandType,
          discipline: data.discipline || '',
          remark: data.remark,
          status: '草稿',
          items: data.items.map((item) => ({
            materialName: item.materialName,
            specification: item.specification,
            material: item.material,
            materialGrade: item.materialGrade,
            applicableStandard: item.applicableStandard,
            quantity: item.quantity,
            unit: item.unit,
            purpose: item.purpose,
            status: item.status,
            requiredDate: item.requiredDate ? new Date(item.requiredDate) : null,
          })),
        })
        setLoading(false)
      })
      .catch(() => {
        toast.error('加载请购单数据失败')
        router.back()
      })
    fetch('/api/disciplines/list')
      .then((r) => r.json())
      .then((data) => setDisciplines(data))
  }, [reqId, projectId, reset, router])

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const procurementCategory = watch('procurementCategory')
  const demandType = watch('demandType')
  const discipline = watch('discipline')

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

  async function onSubmit(data: RequisitionFormValues) {
    try {
      data.requester = user.name
      data.attachments = attachments
      const res = await fetch(`/api/requisitions/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, reqNo }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '更新失败')
      }
      toast.success('请购单更新成功')
      router.push(`/projects/${projectId}/procurement/requisitions/${reqId}`)
    } catch (e: any) {
      toast.error(e.message || '更新失败')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">编辑请购单</h1>
        <Card><CardContent className="p-6 text-center text-muted-foreground py-12">加载中...</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">编辑请购单</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2.5 rounded-lg">
              <span className="font-medium text-foreground">请购单号:</span>
              <span className="font-mono">{reqNo}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-4 py-2.5 rounded-lg">
              <span className="font-medium text-foreground">申请人:</span>
              <span>{user.name}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="reqDate">请购日期 *</Label>
                <Input id="reqDate" type="date" {...register('reqDate')} />
                {errors.reqDate && <p className="text-sm text-destructive mt-1">{errors.reqDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>需求类型</Label>
                <Select value={demandType} onValueChange={(v) => setValue('demandType', v as RequisitionFormValues['demandType'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择需求类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMAND_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>采购分类</Label>
                <Select value={procurementCategory} onValueChange={(v) => setValue('procurementCategory', v as RequisitionFormValues['procurementCategory'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择采购分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCUREMENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>专业</Label>
                <Select value={discipline} onValueChange={(v) => setValue('discipline', v ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择专业" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map((d) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>附件</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="remark">备注</Label>
              <Textarea id="remark" placeholder="请输入备注信息" {...register('remark')} rows={2} />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">采购明细</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ materialName: '', specification: '', material: '', materialGrade: '', applicableStandard: '', quantity: 0, unit: '', purpose: '', status: '待采购' })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加明细
                </Button>
              </div>
              {errors.items?.root && (
                <p className="text-sm text-destructive mb-3">{errors.items.root.message}</p>
              )}
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg bg-muted/10">
                    <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">物料名称 *</Label>
                        <MaterialSearchInput
                          value={watch(`items.${index}.materialName`) || ''}
                          onChange={(v) => setValue(`items.${index}.materialName`, v)}
                          onSelect={(m) => {
                            setValue(`items.${index}.materialName`, m.materialName)
                            setValue(`items.${index}.specification`, m.specification)
                            setValue(`items.${index}.material`, m.material)
                            setValue(`items.${index}.materialGrade`, m.materialGrade)
                            setValue(`items.${index}.applicableStandard`, m.applicableStandard)
                            setValue(`items.${index}.unit`, m.unit)
                          }}
                          placeholder="输入物料名称搜索"
                        />
                        {errors.items?.[index]?.materialName && (
                          <p className="text-xs text-destructive mt-0.5">{errors.items[index]?.materialName?.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">规格</Label>
                        <Input placeholder="规格型号" {...register(`items.${index}.specification`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">材质</Label>
                        <Input placeholder="如：碳钢" {...register(`items.${index}.material`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">牌号</Label>
                        <Input placeholder="如：Q235B" {...register(`items.${index}.materialGrade`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">标准规范</Label>
                        <Input placeholder="如：GB/T 8163" {...register(`items.${index}.applicableStandard`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">数量</Label>
                        <Input type="number" step="0.01" placeholder="0" {...register(`items.${index}.quantity`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">单位 *</Label>
                        <Input placeholder="个/只/套" {...register(`items.${index}.unit`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">需求日期</Label>
                        <Input type="date" {...register(`items.${index}.requiredDate`)} />
                      </div>
                    </div>
                    {fields.length > 1 && (
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          删除
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? '保存中...' : '保存修改'}
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
