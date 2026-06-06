import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/orders/[id]/quotes/[quoteId]/new-round — 发起新一轮
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  const { id, quoteId } = await params
  try {
    const quote = await db.orderQuote.findFirst({
      where: { id: quoteId, orderId: id },
    })
    if (!quote) return NextResponse.json({ error: '报价记录不存在' }, { status: 404 })

    const body = await req.json()
    const newRound = quote.currentRound + 1

    // 复制当前轮物资明细作为新轮模板
    const currentItems = await db.orderQuoteItem.findMany({
      where: { quoteId, round: quote.currentRound },
    })

    if (currentItems.length > 0) {
      await db.orderQuoteItem.createMany({
        data: currentItems.map(item => ({
          quoteId,
          round: newRound,
          requisitionItemId: item.requisitionItemId,
          unitPrice: null,
          totalAmount: null,
          brand: '',
          remark: '',
        })),
      })
    }

    // 更新报价记录
    const updated = await db.orderQuote.update({
      where: { id: quoteId },
      data: {
        currentRound: newRound,
        deadline: body.deadline ? new Date(body.deadline) : null,
        status: '待报价',
        submittedAt: null,
      },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '发起新一轮失败' }, { status: 500 })
  }
}
