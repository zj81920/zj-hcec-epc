'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { aiModelConfigSchema, type AiModelConfigFormValues } from '@/lib/validations'

// zod 的 .default() 导致推断为可选，这里定义表单实际使用的类型（全必填）
type FormValues = {
  provider: 'openai' | 'anthropic' | 'azure' | 'custom'
  label: string
  apiEndpoint: string
  apiKey: string
  modelName: string
  capabilities: string
  isActive: boolean
}

interface AiModelFormProps {
  config?: { id: string; label: string; provider: string; apiEndpoint: string; modelName: string; capabilities: string; isActive: boolean } | null
  onSuccess: () => void
}

export default function AiModelForm({ config, onSuccess }: AiModelFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(aiModelConfigSchema) as any,
    defaultValues: {
      provider: (config?.provider as FormValues['provider']) || 'openai',
      label: config?.label || '',
      apiEndpoint: config?.apiEndpoint || '',
      apiKey: '',
      modelName: config?.modelName || '',
      capabilities: config?.capabilities || 'extract,nlp,fill',
      isActive: config?.isActive || false,
    },
  })

  const provider = watch('provider')
  const capabilities = watch('capabilities')

  function toggleCapability(cap: string) {
    const current = (capabilities || '').split(',').filter(Boolean)
    const next = current.includes(cap) ? current.filter(c => c !== cap) : [...current, cap]
    setValue('capabilities', next.join(','))
  }

  async function onSubmit(data: FormValues) {
    const url = config ? `/api/settings/ai-models/${config.id}` : '/api/settings/ai-models'
    const method = config ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error || '保存失败')
      return
    }

    toast.success(config ? '已更新' : '已创建')
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1.5">
        <Label>显示名称 *</Label>
        <Input {...register('label')} placeholder="GPT-4o 主模型" />
        {errors.label && <p className="text-sm text-destructive mt-1">{errors.label.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>提供商</Label>
        <Select value={provider} onValueChange={(v) => setValue('provider', v as FormValues['provider'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="azure">Azure OpenAI</SelectItem>
            <SelectItem value="custom">自定义</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>API 端点</Label>
        <Input {...register('apiEndpoint')} placeholder="https://api.openai.com/v1" />
      </div>

      <div className="space-y-1.5">
        <Label>API 密钥</Label>
        <Input {...register('apiKey')} type="password" placeholder={config ? '留空则不修改' : 'sk-...'} />
      </div>

      <div className="space-y-1.5">
        <Label>模型名称</Label>
        <Input {...register('modelName')} placeholder="gpt-4o / claude-sonnet-4" />
      </div>

      <div className="space-y-1.5">
        <Label>能力</Label>
        <div className="flex gap-4 mt-1">
          {['extract', 'nlp', 'fill'].map((cap) => (
            <label key={cap} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <Checkbox
                checked={(capabilities || '').split(',').includes(cap)}
                onCheckedChange={() => toggleCapability(cap)}
              />
              {cap === 'extract' ? '设计文件提取' : cap === 'nlp' ? '自然语言建单' : '采购单填充'}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" {...register('isActive')} id="isActive" />
        <Label htmlFor="isActive" className="cursor-pointer">保存后立即激活</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : config ? '保存修改' : '保存并激活'}
        </Button>
      </div>
    </form>
  )
}
