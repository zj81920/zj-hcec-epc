import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orderSchema } from '@/lib/validations'

async function recalcRequisitionStatus(requisitionId: string) {
  const reqItems = await db.requisitionItem.findMany({
    where: { requisitionId },
    include: { orderItems: true },
  })

  let allFulfilled = true
  let anyPartial = false
  let anyOrdered = false

  for (const item of reqItems) {
    const orderedQty = item.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)
    if (orderedQty > 0) {
      anyOrdered = true
    }
    if (orderedQty < item.quantity) {
      allFulfilled = false
      if (orderedQty > 0) {
        anyPartial = true
      }
    }
  }

  let newStatus: string | null = null
  if (allFulfilled && reqItems.length > 0) {
    newStatus = '关闭'
  } else if (anyOrdered) {
    newStatus = '部分采购'
  } else if (reqItems.length > 0) {
    newStatus = '正常'
  }

  if (newStatus) {
    await db.purchaseRequisition.update({
      where: { id: requisitionId },
      data: { businessStatus: newStatus },
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = orderSchema.parse(body)
    const { items, ...orderData } = data

    // 校验请购单是否存在且已批准
    const requisition = await db.purchaseRequisition.findUnique({
      where: { id: orderData.requisitionId },
      select: { status: true, businessStatus: true },
    })

    if (!requisition) {
      return NextResponse.json({ error: '请购单不存在' }, { status: 404 })
    }
    if (requisition.status !== '已批准' || requisition.businessStatus === '关闭') {
      return NextResponse.json({
        error: '只有已批准且未关闭的请购单才能创建采购订单',
        requisitionId: orderData.requisitionId,
        currentStatus: requisition.status,
        currentBusinessStatus: requisition.businessStatus,
      }, { status: 400 })
    }

    const totalAmount = items.reduce((sum, i) => sum + i.totalAmount, 0)

    const order = await db.procurementOrder.create({
      data: {
        ...orderData,
        totalAmount,
        items: {
          create: items,
        },
      },
      include: { items: true },
    })

    await recalcRequisitionStatus(order.requisitionId)

    return NextResponse.json(order, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
