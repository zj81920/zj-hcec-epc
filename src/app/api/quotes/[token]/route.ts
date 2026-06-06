import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/quotes/[token] — 获取报价单信息
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const quote = await db.orderQuote.findUnique({
      where: { token },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            project: { select: { name: true } },
            purchaser: true,
            purchaserPhone: true,
            purchaserEmail: true,
            attachments: true,
            items: {
              include: { requisitionItem: true },
            },
          },
        },
        supplier: { select: { id: true, name: true } },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: '无效的报价链接' }, { status: 404 })
    }

    // 检查是否过期/截止
    if (quote.tokenExpiresAt && new Date() > quote.tokenExpiresAt) {
      return NextResponse.json({ error: '链接已过期' }, { status: 410 })
    }
    if (quote.deadline && new Date() > quote.deadline) {
      return NextResponse.json({ error: '报价已截止', deadline: quote.deadline.toISOString() }, { status: 410 })
    }

    // 获取当前轮次已填报价（如果有的话，用于草稿恢复）
    const quoteItems = await db.orderQuoteItem.findMany({
      where: { quoteId: quote.id, round: quote.currentRound },
    })

    // 组装物资明细
    const materials = quote.order.items.map((item) => {
      const existingQuote = quoteItems.find(qi => qi.requisitionItemId === item.requisitionItem?.id)
      return {
        requisitionItemId: item.requisitionItem?.id || item.id,
        materialName: item.materialName,
        specification: item.specification,
        material: item.material,
        materialGrade: item.materialGrade,
        unit: item.unit,
        quantity: item.quantity,
        requiredDate: item.requiredDate?.toISOString() || null,
        // 已有报价
        brand: existingQuote?.brand || '',
        unitPrice: existingQuote?.unitPrice ?? null,
        totalAmount: existingQuote?.totalAmount ?? null,
        remark: existingQuote?.remark || '',
      }
    })

    return NextResponse.json({
      orderNo: quote.order.orderNo,
      projectName: quote.order.project.name,
      supplierName: quote.supplier.name,
      currentRound: quote.currentRound,
      deadline: quote.deadline?.toISOString() || null,
      purchaser: quote.order.purchaser,
      purchaserPhone: quote.order.purchaserPhone,
      purchaserEmail: quote.order.purchaserEmail,
      attachments: quote.order.attachments,
      quoteAttachments: quote.attachments || [],
      materials,
      status: quote.status,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '获取报价信息失败' }, { status: 500 })
  }
}

// PUT /api/quotes/[token] — 暂存草稿
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const quote = await db.orderQuote.findUnique({ where: { token } })
    if (!quote) return NextResponse.json({ error: '无效的报价链接' }, { status: 404 })

    const body = await req.json()
    const { items, attachments } = body as {
      items: { requisitionItemId: string; brand?: string; unitPrice?: number; totalAmount?: number; remark?: string }[]
      attachments?: { name: string; path: string; size: number }[]
    }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: '请提供报价明细' }, { status: 400 })
    }

    // 逐条更新报价明细
    for (const item of items) {
      await db.orderQuoteItem.updateMany({
        where: {
          quoteId: quote.id,
          round: quote.currentRound,
          requisitionItemId: item.requisitionItemId,
        },
        data: {
          brand: item.brand !== undefined ? item.brand : undefined,
          unitPrice: item.unitPrice !== undefined ? item.unitPrice : undefined,
          totalAmount: item.totalAmount !== undefined ? item.totalAmount : undefined,
          remark: item.remark !== undefined ? item.remark : undefined,
        },
      })
    }

    // 保存附件
    if (attachments && Array.isArray(attachments)) {
      await db.orderQuote.update({
        where: { id: quote.id },
        data: { attachments },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '保存草稿失败' }, { status: 500 })
  }
}
