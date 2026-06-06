'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DESIGN_DISCIPLINE_MAP, DESIGN_CATEGORY_MAP } from '@/lib/utils'
import { Upload } from 'lucide-react'

export default function DesignUploadPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const [file, setFile] = useState<File | null>(null)
  const [discipline, setDiscipline] = useState('其他')
  const [category, setCategory] = useState('设计图纸')
  const [version, setVersion] = useState(1)
  const [uploading, setUploading] = useState(false)

  async function handleUpload() {
    if (!file) {
      toast.error('请选择文件')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('discipline', discipline)
      formData.append('category', category)
      formData.append('version', String(version))
      formData.append('uploadedBy', '当前用户')

      const res = await fetch('/api/design-documents/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '上传失败')
      }
      toast.success('文件上传成功')
      router.push(`/projects/${projectId}/design`)
    } catch (e: any) {
      toast.error(e.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">上传设计文件</h1>
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
              <Label>专业</Label>
              <Select value={discipline} onValueChange={(v) => v && setDiscipline(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(DESIGN_DISCIPLINE_MAP).map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>分类</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(DESIGN_CATEGORY_MAP).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>版本号</Label>
            <Input
              type="number"
              value={version}
              onChange={(e) => setVersion(Number(e.target.value))}
              min={1}
            />
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
