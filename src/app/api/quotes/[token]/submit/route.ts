import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/quotes/[token]/submit — 最终提交报价
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const quote = await db.orderQuote.findUnique({ where: { token } })
    if (!quote) return NextResponse.json({ error: '无效的报价链接' }, { status: 404 })

    // 检查是否截止
    if (quote.deadline && new Date() > quote.deadline) {
      return NextResponse.json({ error: '报价已截止' }, { status: 403 })
    }

    // 检查是否已填写了所有明细
    const items = await db.orderQuoteItem.findMany({
      where: { quoteId: quote.id, round: quote.currentRound },
    })
    const unfilled = items.filter(i => i.unitPrice == null || i.unitPrice === 0)
    if (unfilled.length > 0) {
      return NextResponse.json({ error: '请填写完所有物料的单价' }, { status: 400 })
    }

    // 更新报价状态
    await db.orderQuote.update({
      where: { id: quote.id },
      data: {
        status: '已提交',
        submittedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '提交失败' }, { status: 500 })
  }
}
