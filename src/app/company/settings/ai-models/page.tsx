'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Topbar } from '@/components/layout/topbar'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import AiModelForm from '@/components/ai-model-form'
import { Power, Trash2, Wifi, Plus } from 'lucide-react'

interface AiModelConfig {
  id: string
  label: string
  provider: string
  apiEndpoint: string
  modelName: string
  capabilities: string
  isActive: boolean
  apiKey: string
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  azure: 'Azure OpenAI',
  custom: '自定义',
}

const CAPABILITY_LABELS: Record<string, string> = {
  extract: '设计文件提取',
  nlp: '自然语言建单',
  fill: '采购单填充',
}

export default function AiModelSettingsPage() {
  const [configs, setConfigs] = useState<AiModelConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingConfig, setEditingConfig] = useState<AiModelConfig | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function loadConfigs() {
    setLoading(true)
    const res = await fetch('/api/settings/ai-models')
    const data = await res.json()
    setConfigs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadConfigs() }, [])

  async function handleTest(id: string) {
    const res = await fetch(`/api/settings/ai-models/${id}/test`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      toast.success('连接成功')
    } else {
      toast.error(data.message || '连接失败')
    }
  }

  async function handleActivate(id: string) {
    await fetch('/api/settings/ai-models/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    toast.success('已切换激活')
    loadConfigs()
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此配置？')) return
    await fetch(`/api/settings/ai-models/${id}`, { method: 'DELETE' })
    toast.success('已删除')
    loadConfigs()
  }

  async function handleSave() {
    setDialogOpen(false)
    setEditingConfig(null)
    loadConfigs()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        <div className="text-sm text-muted-foreground">
          <Link href="/company/partners" className="hover:text-foreground transition-colors">公司管理</Link> &gt; <Link href="/company/settings/basic-info" className="hover:text-foreground transition-colors">系统设置</Link> &gt; AI 模型配置
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI 模型配置</h1>
            <p className="text-sm text-muted-foreground mt-1">管理 AI 模型连接配置</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button onClick={() => setEditingConfig(null)}>
                <Plus className="h-4 w-4 mr-1" />新增配置
              </Button>}>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingConfig ? '编辑配置' : '新增配置'}</DialogTitle>
              </DialogHeader>
              <AiModelForm config={editingConfig} onSuccess={handleSave} />
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground">加载中...</p>
        ) : configs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              暂无 AI 模型配置，请新增
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {configs.map((cfg) => (
              <Card key={cfg.id} className={cfg.isActive ? 'ring-2 ring-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{cfg.label}</span>
                        {cfg.isActive && <Badge variant="default">已激活</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {PROVIDER_LABELS[cfg.provider] || cfg.provider} | 模型: {cfg.modelName}
                      </p>
                      <div className="flex gap-1.5 mt-1">
                        {cfg.capabilities.split(',').filter(Boolean).map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {CAPABILITY_LABELS[cap] || cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleTest(cfg.id)}>
                        <Wifi className="h-4 w-4" />
                      </Button>
                      {!cfg.isActive && (
                        <Button variant="ghost" size="sm" onClick={() => handleActivate(cfg.id)}>
                          <Power className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingConfig(cfg); setDialogOpen(true) }}
                      >
                        编辑
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cfg.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
