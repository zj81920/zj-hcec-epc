import OpenAI from 'openai'
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

export class OpenAIClient implements AIClient {
  private client: OpenAI
  private modelName: string

  constructor(config: ClientConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiEndpoint || undefined,
      timeout: 30000,
    })
    this.modelName = config.modelName || 'gpt-4o'
  }

  async parseMaterialsFromFile(fileBuffer: Buffer, fileName: string): Promise<MaterialItem[]> {
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    let fileContent: string

    if (isExcel) {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
      fileContent = JSON.stringify(jsonData)
    } else {
      fileContent = fileBuffer.toString('base64')
    }

    const prompt = `你是一个工程采购助理。从以下数据中提取物资清单，返回 JSON 对象，格式为 { "items": [...] }。
每个元素包含：materialName（物料名称）, specification（规格型号）, material（材质）, materialGrade（牌号）, applicableStandard（标准规范）, quantity（数量）, unit（单位）。
只返回合法的 JSON 对象，不要包含其他文字。`

    const messages: any[] = [
      { role: 'system', content: prompt },
    ]

    if (isExcel) {
      messages.push({ role: 'user', content: fileContent })
    } else {
      const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png'
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: '从这份文件中提取物资清单' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileContent}` } },
        ],
      })
    }

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages,
      response_format: { type: 'json_object' },
    })

    const text = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text)
    return Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : []
  }

  async parseNaturalLanguage(text: string, context?: ProjectContext): Promise<MaterialItem[]> {
    const prompt = `你是一个工程采购助理。将用户的自然语言描述解析为结构化的物资清单。
返回 JSON 对象，格式为 { "items": [...] }。
每个元素包含：materialName, specification, materialGrade, quantity, unit, requiredDate（可选）。
无法解析的部分放到 unresolvedText 字段。
只返回合法的 JSON 对象，不要包含其他文字。`

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: context ? `项目类型: ${context.projectType}\n\n${text}` : text },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{}')
    return result.items || []
  }

  async suggestOrderFill(
    items: { requisitionItemId: string; materialName: string; specification: string; quantity: number; unit: string }[],
    context?: ProjectContext,
  ): Promise<FillSuggestion[]> {
    const { db } = await import('@/lib/db')
    const historyItems = await db.orderItem.findMany({
      where: {
        order: { projectId: context?.projectId },
      },
      include: { order: { select: { supplier: true, supplierId: true, supplierContact: true, supplierPhone: true } } },
      orderBy: { order: { orderDate: 'desc' } },
      take: 50,
    })

    const historyData = historyItems.map(h => ({
      materialName: h.materialName,
      specification: h.specification,
      supplier: h.order.supplier,
      supplierId: h.order.supplierId,
      unitPrice: h.unitPrice,
      brand: h.brand,
      quantity: h.quantity,
      unit: h.unit,
    }))

    const prompt = `你是一个采购助理。基于以下历史采购数据，为新材料推荐供应商、单价、品牌和交货日期。
历史数据: ${JSON.stringify(historyData)}
新采购项: ${JSON.stringify(items)}

返回 JSON 对象，格式为 { "items": [...] }，每个元素包含：requisitionItemId, supplier, supplierId, unitPrice, brand, totalAmount(quantity*unitPrice), deliveryDate, confidence(对象含 supplier/unitPrice/brand/deliveryDate，值 high/medium/low)。
没有历史参考的字段填 null。只返回合法 JSON。`

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: '请填充以上采购项' },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '[]')
    return Array.isArray(result) ? result : result.items || []
  }

  async generateContractContent(
    params: ContractGenerationParams,
    template: string,
  ): Promise<ContractContent> {
    const { parsePaymentTerms } = await import('@/lib/contract-utils')
    const pay = parsePaymentTerms(params.variables.paymentTerms)

    // 构造物资明细 Markdown 表格行
    const itemsTable = params.items
      .map(
        (item, idx) =>
          `| ${idx + 1} | ${item.materialName} | ${item.specification} | ${item.material} | ${item.brand} | ${item.quantity} | ${item.unit} | ${item.unitPrice} | ${item.totalAmount} |`,
      )
      .join('\n')

    const userPrompt = `请根据以下数据和合同模板，生成完整的采购合同。

## 甲方信息
- 名称：${params.buyerName}
- 地址：${params.buyerAddress}
- 联系人：${params.buyerContact}
- 电话：${params.buyerPhone}
- 开户行：${params.buyerBank}
- 银行账号：${params.buyerAccount}
- 税号：${params.buyerTaxId}

## 乙方信息
- 名称：${params.supplierName}
- 地址：${params.supplierAddress}
- 联系人：${params.supplierContact}
- 电话：${params.supplierPhone}
- 开户行：${params.supplierBank}
- 银行账号：${params.supplierAccount}
- 税号：${params.supplierTaxId}

## 合同变量
- 税率：${params.variables.taxRate}
- 含税总价：¥${params.variables.totalAmount}（${params.variables.totalAmountCN}元整）
- 税金：¥${params.variables.taxAmount}
- 付款比例：预付${pay.prepay}% / 到货${pay.delivery}% / 验收${pay.accept}% / 质保${pay.warranty}%
- 交货期限：${params.variables.deliveryTerm}天
- 交货地点：${params.variables.deliveryAddress}
- 运输费用承担：${params.variables.transportCost}
- 质保期：${params.variables.warrantyPeriod}个月
- 仲裁委员会：${params.variables.arbitrationBody}
- 逾期交货违约金比例：${params.variables.lateDeliveryPct}‰/天
- 逾期付款违约金比例：${params.variables.latePaymentPct}‰/天
- 签订日期：${params.variables.signDate}

## 物资明细表（已为你格式化为 markdown 表格行）
${itemsTable}

## 合同模板（变量已用占位符 {xxx} 标记，请用上面的数据填充）
${template}

请输出严格的 JSON 格式：
{
  "sections": [
    {"title": "第一章 合同标的与物资明细", "content": "完整的章节内容，保留 markdown 格式"},
    {"title": "第二章 合同价款及支付", "content": "..."}
  ]
}

只返回 JSON 对象，不要包含其他文字。每个章节的 content 应是完整文本，物资明细表已格式化好直接嵌入即可。`

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的采购合同生成助手，根据模板和填充数据生成完整的中文采购合同。严格输出 JSON 格式。',
        },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const text = response.choices[0]?.message?.content || '{"sections":[]}'
    const parsed = JSON.parse(text)
    return { sections: Array.isArray(parsed.sections) ? parsed.sections : [] }
  }
}
