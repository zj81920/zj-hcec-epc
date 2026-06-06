import type {
  AIClient,
  MaterialItem,
  FillSuggestion,
  ProjectContext,
  ContractGenerationParams,
  ContractContent,
} from './types'

interface ClientConfig {
  apiKey: string
  apiEndpoint: string
  modelName: string
}

export class AnthropicClient implements AIClient {
  private config: ClientConfig

  constructor(config: ClientConfig) {
    this.config = {
      ...config,
      apiEndpoint: config.apiEndpoint || 'https://api.anthropic.com/v1',
      modelName: config.modelName || 'claude-sonnet-4-20250514',
    }
  }

  private async callAPI(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(`${this.config.apiEndpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.modelName,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API 错误: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.content[0]?.text || ''
  }

  async parseMaterialsFromFile(fileBuffer: Buffer, fileName: string): Promise<MaterialItem[]> {
    const base64 = fileBuffer.toString('base64')
    const response = await fetch(`${this.config.apiEndpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.modelName,
        max_tokens: 4096,
        system: '从以下文件中提取物资清单，返回 JSON 格式的对象 { "items": [...] }。每个元素包含 materialName, specification, material, materialGrade, applicableStandard, quantity, unit。只返回 JSON。',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: '提取这份文件中的物资清单' },
            { type: 'document', source: { type: 'base64', media_type: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png', data: base64 } },
          ],
        }],
      }),
    })

    const data = await response.json()
    const text = data.content[0]?.text || '[]'
    try {
      const parsed = JSON.parse(text)
      return Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  async parseNaturalLanguage(text: string, context?: ProjectContext): Promise<MaterialItem[]> {
    const result = await this.callAPI(
      '将用户的自然语言描述解析为结构化物资清单。返回 JSON: { "items": [{ materialName, specification, materialGrade, quantity, unit, requiredDate }], "unresolvedText": "" }',
      context ? `项目类型: ${context.projectType}\n\n${text}` : text,
    )
    try {
      const parsed = JSON.parse(result)
      return parsed.items || []
    } catch {
      return []
    }
  }

  async suggestOrderFill(
    items: { requisitionItemId: string; materialName: string; specification: string; quantity: number; unit: string }[],
    context?: ProjectContext,
  ): Promise<FillSuggestion[]> {
    const { db } = await import('@/lib/db')
    const historyItems = await db.orderItem.findMany({
      where: { order: { projectId: context?.projectId } },
      include: { order: { select: { supplier: true, supplierId: true } } },
      orderBy: { order: { orderDate: 'desc' } },
      take: 50,
    })

    const result = await this.callAPI(
      `基于历史采购数据为新材料推荐填充信息。返回 JSON 对象 { "items": [...] }。
历史数据: ${JSON.stringify(historyItems.map(h => ({ materialName: h.materialName, specification: h.specification, supplier: h.order.supplier, unitPrice: h.unitPrice, brand: h.brand })))}
每个元素含: requisitionItemId, supplier, supplierId, unitPrice, brand, totalAmount, deliveryDate, confidence{ supplier, unitPrice, brand, deliveryDate: 'high'|'medium'|'low' }`,
      JSON.stringify(items),
    )
    try {
      const parsed = JSON.parse(result)
      return Array.isArray(parsed) ? parsed : parsed.items || []
    } catch {
      return []
    }
  }

  async generateContractContent(
    _params: ContractGenerationParams,
    _template: string,
  ): Promise<ContractContent> {
    throw new Error('AnthropicClient 暂不支持合同生成，请使用 OpenAI/DeepSeek')
  }
}
