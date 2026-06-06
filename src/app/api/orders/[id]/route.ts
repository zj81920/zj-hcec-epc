import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const order = await db.procurementOrder.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '查询失败' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await db.procurementOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            requisitionItem: {
              select: { requisitionId: true },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }

    if (order.status !== '草稿') {
      return NextResponse.json({ error: '仅草稿状态的订单可以删除' }, { status: 400 })
    }

    if (order.procurementMethod === 'inquiry') {
      return NextResponse.json({ error: '询价采购订单不允许删除' }, { status: 400 })
    }

    const requisitionIds = [...new Set(order.items.map(i => i.requisitionItem.requisitionId))]

    await db.procurementOrder.delete({ where: { id } })

    for (const rid of requisitionIds) {
      await recalcRequisitionStatus(rid)
    }

    return NextResponse.json({ message: '删除成功' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '删除失败' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, businessStatus } = body

    const order = await db.procurementOrder.findUnique({
      where: { id },
      include: { items: { include: { requisitionItem: { select: { requisitionId: true } } } } },
    })
    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }

    // 仅状态更新（StatusSelect 使用）
    if (body._statusOnly) {
      const updateData: Record<string, string> = {}
      if (status !== undefined) updateData.status = status
      if (businessStatus !== undefined) updateData.businessStatus = businessStatus

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: '未提供更新数据' }, { status: 400 })
      }

      const updated = await db.procurementOrder.update({
        where: { id },
        data: updateData,
      })
      return NextResponse.json(updated)
    }

    // 全量编辑：仅草稿/已驳回可编辑
    if (order.status !== '草稿' && order.status !== '已驳回') {
      return NextResponse.json({ error: '仅草稿或已驳回状态的订单可以编辑' }, { status: 400 })
    }

    const {
      supplier,
      supplierContact,
      supplierPhone,
      deliveryAddress,
      deliveryDate,
      remark,
      attachments,
      items,
      procurementMethod,
      inquiryDeadline,
      purchaserPhone,
      executingUnitId,
      executingUnitName,
    } = body

    const headerData: Record<string, any> = {}
    if (supplier !== undefined) headerData.supplier = supplier
    if (supplierContact !== undefined) headerData.supplierContact = supplierContact
    if (supplierPhone !== undefined) headerData.supplierPhone = supplierPhone
    if (deliveryAddress !== undefined) headerData.deliveryAddress = deliveryAddress
    if (deliveryDate !== undefined) headerData.deliveryDate = new Date(deliveryDate)
    if (remark !== undefined) headerData.remark = remark
    if (attachments !== undefined) headerData.attachments = attachments
    if (procurementMethod !== undefined) headerData.procurementMethod = procurementMethod
    if (inquiryDeadline !== undefined) {
      headerData.inquiryDeadline = inquiryDeadline ? new Date(inquiryDeadline) : null
    }
    if (purchaserPhone !== undefined) headerData.purchaserPhone = purchaserPhone
    if (executingUnitId !== undefined) headerData.executingUnitId = executingUnitId || null
    if (executingUnitName !== undefined) headerData.executingUnitName = executingUnitName || ''

    // 事务更新
    await db.$transaction(async (tx) => {
      // 更新头部
      if (Object.keys(headerData).length > 0) {
        await tx.procurementOrder.update({
          where: { id },
          data: headerData,
        })
      }

      // 更新明细：删除旧明细，创建新明细
      if (items && Array.isArray(items)) {
        const oldRequisitionIds = [...new Set(order.items.map(i => i.requisitionItem.requisitionId))]

        await tx.orderItem.deleteMany({ where: { orderId: id } })

        let totalAmount = 0
        const newRequisitionIds = new Set<string>()

        for (const item of items) {
          const amount = (item.unitPrice || 0) * (item.quantity || 0)
          totalAmount += amount

          const rItem = await tx.requisitionItem.findUnique({
            where: { id: item.requisitionItemId },
            select: { requisitionId: true },
          })
          if (rItem) newRequisitionIds.add(rItem.requisitionId)

          await tx.orderItem.create({
            data: {
              orderId: id,
              requisitionItemId: item.requisitionItemId,
              materialCode: item.materialCode || '',
              materialName: item.materialName,
              specification: item.specification || '',
              unit: item.unit || '',
              quantity: item.quantity || 0,
              unitPrice: item.unitPrice || 0,
              totalAmount: amount,
              material: item.material || '',
              materialGrade: item.materialGrade || '',
              brand: item.brand || '',
              applicableStandard: item.applicableStandard || '',
            },
          })
        }

        await tx.procurementOrder.update({
          where: { id },
          data: { totalAmount },
        })

        // 重新计算关联请购单状态
        const allRequisitionIds = [...new Set([...oldRequisitionIds, ...newRequisitionIds])]
        for (const rid of allRequisitionIds) {
          const reqItems = await tx.requisitionItem.findMany({
            where: { requisitionId: rid },
            include: { orderItems: true },
          })

          let allFulfilled = true
          let anyOrdered = false

          for (const rItem of reqItems) {
            const orderedQty = rItem.orderItems.reduce((sum, oi) => sum + oi.quantity, 0)
            if (orderedQty > 0) anyOrdered = true
            if (orderedQty < rItem.quantity) allFulfilled = false
          }

          let newStatus: string
          if (allFulfilled && reqItems.length > 0) {
            newStatus = '关闭'
          } else if (anyOrdered) {
            newStatus = '部分采购'
          } else {
            newStatus = '正常'
          }

          await tx.purchaseRequisition.update({
            where: { id: rid },
            data: { businessStatus: newStatus },
          })
        }
      }
    })

    const updated = await db.procurementOrder.findUnique({
      where: { id },
      include: { items: true },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '更新失败' }, { status: 500 })
  }
}
