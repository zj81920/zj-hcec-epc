import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import OpenAI from 'openai'

interface ReqItem {
  requisitionItemId: string
  materialName: string
  specification?: string
  material?: string
  materialGrade?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, items } = body as { projectId: string; items: ReqItem[] }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: '请提供物资明细' }, { status: 400 })
    }

    // 1. 查同项目历史订单
    let historyItems = await db.orderItem.findMany({
      where: { order: { projectId } },
      include: { order: { select: { supplier: true, orderDate: true } } },
      orderBy: { order: { orderDate: 'desc' } },
      take: 50,
    })

    // 2. 同项目 < 3 条，补充全局历史
    if (historyItems.length < 3) {
      const globalItems = await db.orderItem.findMany({
        where: { order: { projectId: { not: projectId } } },
        include: { order: { select: { supplier: true, orderDate: true } } },
        orderBy: { order: { orderDate: 'desc' } },
        take: 30,
      })
      historyItems = [...historyItems, ...globalItems]
    }

    // 3. 全局也 < 3 条，补充历史数据表
    if (historyItems.length < 3) {
      const historicalItems = await db.historicalOrderItem.findMany({
        orderBy: { purchaseDate: 'desc' },
        take: 30,
      })
      // 将 HistoricalOrderItem 映射为统一格式
      historyItems = [
        ...historyItems,
        ...historicalItems.map(h => ({
          materialName: h.materialName,
          specification: h.specification,
          material: h.materialGrade,
          brand: h.brand,
          unitPrice: h.unitPrice,
          unit: h.unit,
          quantity: h.quantity,
          order: {
            supplier: h.supplierName,
            orderDate: h.purchaseDate || new Date(),
          },
        })),
      ] as any
    }

    // 4. 无历史数据，直接返回 null
    if (historyItems.length === 0) {
      return NextResponse.json({
        items: items.map(item => ({
          requisitionItemId: item.requisitionItemId,
          referencePrice: null,
          referenceSupplier: null,
          referenceBrand: null,
          referenceDate: null,
          confidence: 'none',
        })),
      })
    }

    // 5. 组装历史数据
    const historyData = historyItems.map((h: any) => ({
      materialName: h.materialName,
      specification: h.specification,
      material: h.material || '',
      supplier: h.order?.supplier || '',
      unitPrice: h.unitPrice,
      brand: h.brand || '',
      orderDate: h.order?.orderDate || '',
      quantity: h.quantity,
      unit: h.unit || '',
    }))

    // 6. 获取 AI 配置（无配置时降级返回 null）
    const config = await db.aiModelConfig.findFirst({ where: { isActive: true } })
    if (!config || !config.apiKey) {
      return NextResponse.json({
        items: items.map(item => ({
          requisitionItemId: item.requisitionItemId,
          referencePrice: null,
          referenceSupplier: null,
          referenceBrand: null,
          referenceDate: null,
          confidence: 'none',
        })),
      })
    }

    const apiKey = config.apiKey ? decrypt(config.apiKey) : ''
    const openai = new OpenAI({
      apiKey,
      baseURL: config.apiEndpoint || undefined,
      timeout: 30000,
    })

    const prompt = `你是一个工程采购价格分析助手。根据历史采购数据，为当前物资清单查找最相似的历史采购记录，提供参考价格和供应商信息。

## 历史采购数据
${JSON.stringify(historyData)}

## 当前待匹配物资
${JSON.stringify(items.map(i => ({
  requisitionItemId: i.requisitionItemId,
  materialName: i.materialName,
  specification: i.specification,
  material: i.material,
  materialGrade: i.materialGrade,
})))}

## 匹配规则
1. 优先匹配：物料名称语义相近 + 规格型号一致
2. 次要匹配：材质相同 + 规格相近
3. 高度相似 → confidence: "high"
4. 仅名称或材质相近 → confidence: "medium"
5. 无匹配 → 各字段填 null，confidence: "low"

## 返回格式
{ "items": [{ "requisitionItemId": "xxx", "referencePrice": 125.5, "referenceSupplier": "A公司", "referenceBrand": "太钢", "referenceDate": "2025-11-15", "confidence": "high" }] }

只返回合法 JSON，不要包含其他文字。`

    const response = await openai.chat.completions.create({
      model: config.modelName || 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
    })

    const text = response.choices[0]?.message?.content || '{}'
    const result = JSON.parse(text)
    const resultItems = Array.isArray(result.items) ? result.items : []

    // 确保每个入参 item 都有对应返回
    const finalItems = items.map(item => {
      const matched = resultItems.find((r: any) => r.requisitionItemId === item.requisitionItemId)
      return matched || {
        requisitionItemId: item.requisitionItemId,
        referencePrice: null,
        referenceSupplier: null,
        referenceBrand: null,
        referenceDate: null,
        confidence: 'low',
      }
    })

    return NextResponse.json({ items: finalItems })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '参考价查询失败' }, { status: 500 })
  }
}
