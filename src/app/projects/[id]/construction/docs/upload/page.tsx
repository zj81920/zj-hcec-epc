'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CONSTRUCTION_DOC_CATEGORY_MAP } from '@/lib/utils'
import { Upload } from 'lucide-react'

export default function ConstructionDocUploadPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const [file, setFile] = useState<File | null>(null)
  const [docNo, setDocNo] = useState('')
  const [docName, setDocName] = useState('')
  const [category, setCategory] = useState('施工日志')
  const [relatedTask, setRelatedTask] = useState('')
  const [uploading, setUploading] = useState(false)

  async function handleUpload() {
    if (!file) {
      toast.error('请选择文件')
      return
    }
    if (!docNo || !docName) {
      toast.error('请输入资料编号和名称')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('docNo', docNo)
      formData.append('docName', docName)
      formData.append('category', category)
      formData.append('relatedTask', relatedTask)
      formData.append('uploadedBy', '当前用户')

      const res = await fetch('/api/construction-docs/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '上传失败')
      }
      toast.success('施工资料上传成功')
      router.push(`/projects/${projectId}/construction/docs`)
    } catch (e: any) {
      toast.error(e.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">上传施工资料</h1>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-1.5">
            <Label>选择文件 *</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="docNo">资料编号 *</Label>
              <Input id="docNo" value={docNo} onChange={(e) => setDocNo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="docName">资料名称 *</Label>
              <Input id="docName" value={docName} onChange={(e) => setDocName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label>分类</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(CONSTRUCTION_DOC_CATEGORY_MAP).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relatedTask">关联任务</Label>
              <Input
                id="relatedTask"
                value={relatedTask}
                onChange={(e) => setRelatedTask(e.target.value)}
                placeholder="施工任务名称"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleUpload} disabled={uploading || !file}>
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? '上传中...' : '上传文件'}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
