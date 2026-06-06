import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// POST /api/orders/[id]/quotes — 发起询价
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const order = await db.procurementOrder.findUnique({
      where: { id },
      include: { items: { include: { requisitionItem: true } } },
    })
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })

    const body = await req.json()
    const { supplierIds } = body as { supplierIds: string[] }

    if (!supplierIds || supplierIds.length === 0) {
      return NextResponse.json({ error: '请选择供应商' }, { status: 400 })
    }

    // 为每个供应商生成 Token 和报价记录
    const quotes = await Promise.all(
      supplierIds.map(async (supplierId) => {
        const supplier = await db.partner.findUnique({ where: { id: supplierId } })
        if (!supplier) return null

        // 检查是否已有报价记录（同一订单+供应商），有则复用
        const existingQuote = await db.orderQuote.findFirst({
          where: { orderId: id, supplierId },
        })
        if (existingQuote) {
          // 更新 token
          return db.orderQuote.update({
            where: { id: existingQuote.id },
            data: {
              token: crypto.randomUUID(),
              deadline: body.deadline ? new Date(body.deadline) : undefined,
              status: '待报价',
            },
          })
        }

        const token = crypto.randomUUID()
        const quote = await db.orderQuote.create({
          data: {
            orderId: id,
            supplierId,
            token,
            currentRound: 1,
            deadline: body.deadline ? new Date(body.deadline) : null,
          },
        })

        // 为每条物资明细创建报价明细（空数据）
        const quoteItems = order.items.map(item => ({
          quoteId: quote.id,
          round: 1,
          requisitionItemId: item.requisitionItemId,
        }))
        if (quoteItems.length > 0) {
          await db.orderQuoteItem.createMany({ data: quoteItems })
        }

        return quote
      })
    )

    const validQuotes = quotes.filter(Boolean)

    // 更新订单业务状态
    if (validQuotes.length > 0 && order.businessStatus !== '询价中') {
      await db.procurementOrder.update({
        where: { id },
        data: { businessStatus: '询价中' },
      })
    }

    return NextResponse.json({ quotes: validQuotes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '发起询价失败' }, { status: 500 })
  }
}

// GET /api/orders/[id]/quotes — 获取报价概览
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const quotes = await db.orderQuote.findMany({
      where: { orderId: id },
      include: {
        supplier: { select: { id: true, name: true, contactPerson: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // 计算每家供应商的报价总额，并附加当前轮报价明细
    const quotesWithDetail = await Promise.all(
      quotes.map(async (q) => {
        const items = await db.orderQuoteItem.findMany({
          where: { quoteId: q.id, round: q.currentRound },
        })
        const total = items.reduce((sum, i) => sum + (i.totalAmount || 0), 0)
        return { ...q, items, total }
      })
    )

    return NextResponse.json({ quotes: quotesWithDetail })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '查询失败' }, { status: 500 })
  }
}
