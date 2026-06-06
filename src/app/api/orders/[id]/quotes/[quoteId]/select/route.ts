import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/orders/[id]/quotes/[quoteId]/select — 选标确认
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  const { id, quoteId } = await params
  try {
    const order = await db.procurementOrder.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })

    const quote = await db.orderQuote.findFirst({
      where: { id: quoteId, orderId: id },
      include: { supplier: true },
    })
    if (!quote) return NextResponse.json({ error: '报价记录不存在' }, { status: 404 })
    if (quote.status !== '已提交') {
      return NextResponse.json({ error: '该供应商尚未提交报价' }, { status: 400 })
    }

    // 获取选中报价的物资明细
    const quoteItems = await db.orderQuoteItem.findMany({
      where: { quoteId, round: quote.currentRound },
    })

    // 回填供应商信息到订单
    await db.procurementOrder.update({
      where: { id },
      data: {
        supplierId: quote.supplierId,
        supplier: quote.supplier.name,
        supplierContact: quote.supplier.contactPerson,
        supplierPhone: quote.supplier.phone,
      },
    })

    // 回填单价到 OrderItem
    for (const qi of quoteItems) {
      if (qi.unitPrice != null) {
        await db.orderItem.updateMany({
          where: { orderId: id, requisitionItemId: qi.requisitionItemId },
          data: {
            unitPrice: qi.unitPrice,
            totalAmount: qi.totalAmount || 0,
            brand: qi.brand || undefined,
          },
        })
      }
    }

    // 计算总价
    const allOrderItems = await db.orderItem.findMany({ where: { orderId: id } })
    const totalAmount = allOrderItems.reduce((sum, i) => sum + (i.totalAmount || 0), 0)

    // 更新订单状态
    await db.procurementOrder.update({
      where: { id },
      data: {
        totalAmount,
        businessStatus: '待发货',
      },
    })

    // 更新所有报价状态
    await db.orderQuote.updateMany({
      where: { orderId: id },
      data: { status: '未选中' },
    })
    await db.orderQuote.update({
      where: { id: quoteId },
      data: { status: '已选中' },
    })

    return NextResponse.json({ success: true, selectedSupplier: quote.supplier.name })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '选标失败' }, { status: 500 })
  }
}
