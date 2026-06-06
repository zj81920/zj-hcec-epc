import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// PUT /api/orders/[id]/inquiry — 更新询价截止时间并重新生成 Token
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const order = await db.procurementOrder.findUnique({
      where: { id },
      include: { quotes: true },
    })
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })

    const body = await req.json()
    const { deadline } = body as { deadline: string }

    if (!deadline) {
      return NextResponse.json({ error: '请设置截止时间' }, { status: 400 })
    }

    const deadlineDate = new Date(deadline)
    if (isNaN(deadlineDate.getTime())) {
      return NextResponse.json({ error: '无效的截止时间' }, { status: 400 })
    }

    // 更新订单截止时间
    await db.procurementOrder.update({
      where: { id },
      data: { inquiryDeadline: deadlineDate },
    })

    // 为每个报价记录更新截止时间并重新生成 Token（让旧链接失效后重开）
    await Promise.all(
      order.quotes
        .filter(q => q.status !== '已选中') // 已选中的不重置
        .map(q =>
          db.orderQuote.update({
            where: { id: q.id },
            data: {
              deadline: deadlineDate,
              token: crypto.randomUUID(),
              status: '待报价',
              submittedAt: null,
            },
          })
        )
    )

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '更新失败' }, { status: 500 })
  }
}
