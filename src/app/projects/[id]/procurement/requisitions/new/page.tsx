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
import { Plus, Trash2, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

const PROCUREMENT_CATEGORIES = ['设备', '材料', '服务', '其他']
const DEMAND_TYPES = ['正常采购', '紧急采购', '补单']

export default function NewRequisitionPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const { user } = useUser()
  const [reqNo, setReqNo] = useState('')
  const [attachments, setAttachments] = useState<Array<{ fileName: string; filePath: string; fileSize: number; fileType: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [disciplines, setDisciplines] = useState<Array<{ id: string; name: string; code: string }>>([])
  useEffect(() => {
    fetch('/api/requisitions/generate-no')
      .then((r) => r.json())
      .then((data) => setReqNo(data.reqNo))
    fetch('/api/disciplines/list')
      .then((r) => r.json())
      .then((data) => setDisciplines(data))
  }, [])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
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
      items: [{ materialName: '', specification: '', material: '', materialGrade: '', applicableStandard: '', quantity: 0, unit: '', purpose: '', status: '待采购' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const procurementCategory = watch('procurementCategory')
  const demandType = watch('demandType')
  const discipline = watch('discipline')

  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        toast.error('文件中无有效数据')
        return
      }
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)

      if (!jsonData || jsonData.length === 0) {
        toast.error('文件中无有效数据')
        return
      }

      const columnMap: Record<string, string> = {
        '物料名称': 'materialName',
        '规格': 'specification',
        '材质': 'material',
        '牌号': 'materialGrade',
        '标准规范': 'applicableStandard',
        '数量': 'quantity',
        '单位': 'unit',
        '用途': 'purpose',
        '需求日期': 'requiredDate',
      }

      const firstRowKeys = Object.keys(jsonData[0])
      const hasValidColumn = firstRowKeys.some((key) => columnMap[key])
      if (!hasValidColumn) {
        toast.error('请检查 Excel 列名格式，需要包含：物料名称、规格、数量、单位等列')
        return
      }

      let importedCount = 0
      jsonData.forEach((row) => {
        const mapped: Record<string, any> = {}
        for (const [excelCol, formField] of Object.entries(columnMap)) {
          if (row[excelCol] !== undefined && row[excelCol] !== '') {
            mapped[formField] = row[excelCol]
          }
        }

        if (mapped.materialName) {
          const quantity = parseFloat(mapped.quantity) || 0
          let requiredDate: Date | null = null
          if (mapped.requiredDate) {
            const parsed = new Date(mapped.requiredDate)
            if (!isNaN(parsed.getTime())) requiredDate = parsed
          }

          append({
            materialName: mapped.materialName,
            specification: mapped.specification || '',
            material: mapped.material || '',
            materialGrade: mapped.materialGrade || '',
            applicableStandard: mapped.applicableStandard || '',
            quantity,
            unit: mapped.unit || '',
            purpose: mapped.purpose || '',
            requiredDate,
            status: '待采购',
          })
          importedCount++
        }
      })

      if (importedCount > 0) {
        toast.success(`成功导入 ${importedCount} 条物料明细`)
      } else {
        toast.error('未能从文件中解析出有效物料数据')
      }
    } catch (err) {
      toast.error('Excel 解析失败，请检查文件格式')
    } finally {
      e.target.value = ''
    }
  }

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
      const res = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '创建失败')
      }
      toast.success('请购单创建成功')
      router.push(`/projects/${projectId}/procurement/requisitions`)
    } catch (e: any) {
      toast.error(e.message || '创建失败')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新建请购单</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2.5 rounded-lg">
              <span className="font-medium text-foreground">请购单号:</span>
              <span className="font-mono">{reqNo || '生成中...'}</span>
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

              {/* Excel 导入物料明细 */}
              <div className="mb-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  id="excel-upload"
                  className="hidden"
                  onChange={handleExcelImport}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('excel-upload')?.click()}>
                  <Upload className="h-4 w-4 mr-1" />
                  导入 Excel 物料
                </Button>
                <span className="text-xs text-muted-foreground ml-2">支持 .xlsx / .xls 格式</span>
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
                {isSubmitting ? '创建中...' : '创建请购单'}
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
