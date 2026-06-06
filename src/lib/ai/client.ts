import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import type { AiModelConfig } from '@prisma/client'
import type { AIClient } from './types'
import { OpenAIClient } from './openai-client'
import { AnthropicClient } from './anthropic-client'

export class AIClientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIClientError'
  }
}

function buildClient(config: AiModelConfig): AIClient {
  const apiKey = config.apiKey ? decrypt(config.apiKey) : ''
  const baseConfig = {
    apiKey,
    apiEndpoint: config.apiEndpoint,
    modelName: config.modelName,
  }

  switch (config.provider) {
    case 'anthropic':
      return new AnthropicClient(baseConfig)
    case 'azure':
    case 'openai':
    case 'custom':
    default:
      return new OpenAIClient(baseConfig)
  }
}

export async function getActiveAIClient(): Promise<AIClient> {
  const config = await db.aiModelConfig.findFirst({
    where: { isActive: true },
  })

  if (!config) {
    throw new AIClientError('未配置 AI 模型，请在系统设置中配置')
  }

  return buildClient(config)
}

export async function testAIConnection(config: Pick<AiModelConfig, 'provider' | 'apiEndpoint' | 'apiKey' | 'modelName'>): Promise<{ success: boolean; message: string }> {
  try {
    const apiKey = config.apiKey ? decrypt(config.apiKey) : ''
    const baseConfig = { apiKey, apiEndpoint: config.apiEndpoint, modelName: config.modelName }
    const client = config.provider === 'anthropic'
      ? new AnthropicClient(baseConfig)
      : new OpenAIClient(baseConfig)
    await client.parseNaturalLanguage('Say OK')
    return { success: true, message: '连接成功' }
  } catch (e: any) {
    return { success: false, message: e.message || '连接失败' }
  }
}
