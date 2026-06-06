'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { FileUp, Loader2 } from 'lucide-react'

interface DesignFile {
  id: string
  fileName: string
  discipline: string
  category: string
}

interface MaterialItem {
  materialName: string
  specification: string
  material: string
  materialGrade: string
  applicableStandard: string
  quantity: number
  unit: string
  sourceFile?: string
  _selected?: boolean
}

interface Props {
  projectId: string
  onConfirm: (items: MaterialItem[]) => void
}

const DISCIPLINES = ['工艺', '配管', '设备', '仪表', '电气', '结构', '建筑', '给排水', '暖通', '其他']

export default function ExtractMaterialsDialog({ projectId, onConfirm }: Props) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<DesignFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [disciplineFilter, setDisciplineFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [extractedItems, setExtractedItems] = useState<MaterialItem[]>([])
  const [extracted, setExtracted] = useState(false)

  // 打开对话框时加载文件列表
  useEffect(() => {
    if (!open) return
    fetch(`/api/design-documents/list?projectId=${projectId}`)
      .then(r => r.json())
      .then(data => setFiles(Array.isArray(data) ? data : []))
      .catch(() => toast.error('加载文件列表失败'))
  }, [open, projectId])

  // 从设计文件提取物资
  async function handleExtract() {
    if (selectedFileIds.size === 0) {
      toast.error('请选择至少一个文件')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/extract-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: Array.from(selectedFileIds) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '提取失败')
        return
      }
      setExtractedItems((data.items || []).map((item: MaterialItem) => ({
        ...item,
        _selected: true,
      })))
      setExtracted(true)
      if (data.unparsedFiles?.length > 0) {
        toast.error(`以下文件未解析成功: ${data.unparsedFiles.join(', ')}`)
      }
    } catch {
      toast.error('提取失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 确认填充到请购单
  function handleConfirm() {
    const selected = extractedItems.filter(item => item._selected)
    if (selected.length === 0) {
      toast.error('请至少选择一项物资')
      return
    }
    onConfirm(selected)
    setOpen(false)
    setExtracted(false)
    setExtractedItems([])
  }

  // 按专业筛选文件
  const filteredFiles = files.filter(f =>
    !disciplineFilter || disciplineFilter === '__all__' || f.discipline === disciplineFilter
  )

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setExtracted(false); setExtractedItems([]) }}}>
      <DialogTrigger render={<Button variant="outline" type="button">
          <FileUp className="h-4 w-4 mr-1" />从设计文件提取
        </Button>}>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>从设计文件提取物资</DialogTitle>
        </DialogHeader>

        {!extracted ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={disciplineFilter} onValueChange={(v) => setDisciplineFilter(v ?? '__all__')}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="全部专业" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部专业</SelectItem>
                  {DISCIPLINES.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">共 {filteredFiles.length} 个文件</span>
            </div>

            <div className="border rounded-md max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredFiles.length > 0 && selectedFileIds.size === filteredFiles.length}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedFileIds(new Set(filteredFiles.map(f => f.id)))
                          else setSelectedFileIds(new Set())
                        }}
                      />
                    </TableHead>
                    <TableHead>文件名</TableHead>
                    <TableHead>专业</TableHead>
                    <TableHead>分类</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedFileIds.has(file.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedFileIds)
                            checked ? next.add(file.id) : next.delete(file.id)
                            setSelectedFileIds(next)
                          }}
                        />
                      </TableCell>
                      <TableCell>{file.fileName}</TableCell>
                      <TableCell>{file.discipline}</TableCell>
                      <TableCell>{file.category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleExtract} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />提取中...</> : '提取物资'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              已提取 {extractedItems.length} 条物资明细：
            </p>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={extractedItems.length > 0 && extractedItems.every(i => i._selected)}
                        onCheckedChange={(checked) => setExtractedItems(prev =>
                          prev.map(i => ({ ...i, _selected: !!checked }))
                        )}
                      />
                    </TableHead>
                    <TableHead>物料名称</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>材质</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>来源</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Checkbox
                          checked={item._selected}
                          onCheckedChange={(checked) => setExtractedItems(prev =>
                            prev.map((i, j) => j === idx ? { ...i, _selected: !!checked } : i)
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.materialName}
                          onChange={(e) => setExtractedItems(prev =>
                            prev.map((i, j) => j === idx ? { ...i, materialName: e.target.value } : i)
                          )}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.specification}
                          onChange={(e) => setExtractedItems(prev =>
                            prev.map((i, j) => j === idx ? { ...i, specification: e.target.value } : i)
                          )}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.material || ''}
                          onChange={(e) => setExtractedItems(prev =>
                            prev.map((i, j) => j === idx ? { ...i, material: e.target.value } : i)
                          )}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setExtractedItems(prev =>
                            prev.map((i, j) => j === idx ? { ...i, quantity: Number(e.target.value) } : i)
                          )}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.sourceFile}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setExtracted(false); setExtractedItems([]) }}>
                重新选择文件
              </Button>
              <Button type="button" onClick={handleConfirm}>
                确认填充到请购单
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
