import { describe, it, expect } from 'vitest'
import { api } from '../setup'

let createdConfigId = ''

describe('AI 模型配置 API 回归测试', () => {

  it('1. 新增模型配置', async () => {
    const { status, data } = await api('POST', '/api/settings/ai-models', {
      provider: 'openai',
      label: '测试模型配置',
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test-fake-key-for-testing',
      modelName: 'gpt-4o',
      capabilities: 'extract,nlp,fill',
      isActive: true,
    })
    expect(status).toBe(201)
    expect(data.label).toBe('测试模型配置')
    expect(data.isActive).toBe(true)
    expect(data.apiKey).not.toContain('sk-test-fake-key-for-testing')
    createdConfigId = data.id
  })

  it('2. 获取配置列表', async () => {
    const { status, data } = await api('GET', '/api/settings/ai-models')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThanOrEqual(1)
  })

  it('3. 编辑模型配置', async () => {
    const { status, data } = await api('PUT', `/api/settings/ai-models/${createdConfigId}`, {
      label: '测试模型配置-已修改',
      modelName: 'gpt-4o-mini',
    })
    expect(status).toBe(200)
  })

  it('4. 新增第二个配置并测试激活切换', async () => {
    const { status, data } = await api('POST', '/api/settings/ai-models', {
      provider: 'anthropic',
      label: '测试 Anthropic',
      apiEndpoint: 'https://api.anthropic.com/v1',
      apiKey: 'sk-ant-fake-key',
      modelName: 'claude-sonnet-4',
      capabilities: 'nlp',
      isActive: true,
    })
    expect(status).toBe(201)
    const { data: list } = await api('GET', '/api/settings/ai-models')
    const activeCount = list.filter((c: any) => c.isActive).length
    expect(activeCount).toBe(1)
    await api('DELETE', `/api/settings/ai-models/${data.id}`)
  })

  it('5. 测试连接（使用假 key 应失败）', async () => {
    const { status, data } = await api('POST', `/api/settings/ai-models/${createdConfigId}/test`)
    expect(status).toBe(200)
    expect(data.success).toBe(false)
  })

  it('6. 删除模型配置', async () => {
    const { status } = await api('DELETE', `/api/settings/ai-models/${createdConfigId}`)
    expect(status).toBe(200)
  })

  it('7. 删除后查询应为空或不含已删记录', async () => {
    const { status, data } = await api('GET', '/api/settings/ai-models')
    expect(status).toBe(200)
    const found = (data as any[]).find((c: any) => c.id === createdConfigId)
    expect(found).toBeUndefined()
  })
})
