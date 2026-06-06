import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const contract = await db.procurementContract.findUnique({
    where: { id },
    include: {
      orderLinks: {
        include: {
          order: {
            select: { id: true, orderNo: true, totalAmount: true, status: true },
          },
        },
      },
      items: { orderBy: { materialName: 'asc' } },
    },
  })
  if (!contract) {
    return NextResponse.json({ error: '未找到合同' }, { status: 404 })
  }
  return NextResponse.json(contract)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { _statusOnly, status, ...updateData } = body

    if (_statusOnly && status) {
      // 审批流状态更新
      const oldContract = await db.procurementContract.findUnique({ where: { id } })
      if (!oldContract) {
        return NextResponse.json({ error: '未找到合同' }, { status: 404 })
      }

      const updatePayload: any = { status }

      // 审批通过 → 回填合同编号到关联采购订单
      if (status === '已批准' && oldContract.status === '审批中') {
        updatePayload.signDate = new Date()
        const links = await db.contractOrderLink.findMany({ where: { contractId: id } })
        for (const link of links) {
          await db.procurementOrder.update({
            where: { id: link.orderId },
            data: { contractNo: oldContract.contractNo },
          })
        }
      }

      const updated = await db.procurementContract.update({
        where: { id },
        data: updatePayload,
      })
      return NextResponse.json(updated)
    }

    // 全量编辑（仅草稿/已驳回状态）
    const current = await db.procurementContract.findUnique({ where: { id } })
    if (!current) {
      return NextResponse.json({ error: '未找到合同' }, { status: 404 })
    }
    if (current.status !== '草稿' && current.status !== '已驳回') {
      return NextResponse.json({ error: '当前状态不可编辑' }, { status: 400 })
    }

    // 如果有 items 或 orderIds，重新建立关联
    const { orderIds, items, ...rest } = updateData

    if (Array.isArray(orderIds) || Array.isArray(items)) {
      // 删除旧的关联
      if (Array.isArray(orderIds)) {
        await db.contractOrderLink.deleteMany({ where: { contractId: id } })
      }
      if (Array.isArray(items)) {
        await db.contractItem.deleteMany({ where: { contractId: id } })
      }
    }

    const contract = await db.procurementContract.update({
      where: { id },
      data: {
        ...rest,
        ...(Array.isArray(orderIds)
          ? { orderLinks: { create: orderIds.map((oid: string) => ({ orderId: oid })) } }
          : {}),
        ...(Array.isArray(items)
          ? {
              items: {
                create: items.map((item: any) => ({
                  orderItemId: item.orderItemId,
                  materialName: item.materialName,
                  specification: item.specification || '',
                  materialCode: item.materialCode || '',
                  material: item.material || '',
                  materialGrade: item.materialGrade || '',
                  brand: item.brand || '',
                  quantity: item.quantity || 0,
                  unit: item.unit || '',
                  unitPrice: item.unitPrice || 0,
                  totalAmount: item.totalAmount || 0,
                })),
              },
            }
          : {}),
      },
    })
    return NextResponse.json(contract)
  } catch (e: any) {
    if (e.code === 'P2025') {
      return NextResponse.json({ error: '未找到合同' }, { status: 404 })
    }
    return NextResponse.json({ error: e.message || '更新失败' }, { status: 400 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contract = await db.procurementContract.findUnique({
      where: { id },
      include: { orderLinks: true },
    })
    if (!contract) {
      return NextResponse.json({ error: '未找到合同' }, { status: 404 })
    }
    if (contract.status !== '草稿') {
      return NextResponse.json({ error: '仅草稿状态可删除' }, { status: 400 })
    }

    // 清除关联订单的 contractNo
    for (const link of contract.orderLinks) {
      await db.procurementOrder.update({
        where: { id: link.orderId },
        data: { contractNo: '' },
      })
    }

    // 硬删除（onDelete: Cascade 会自动删除 ContractItem 和 ContractOrderLink）
    await db.procurementContract.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.code === 'P2025') {
      return NextResponse.json({ error: '未找到合同' }, { status: 404 })
    }
    return NextResponse.json({ error: e.message || '删除失败' }, { status: 400 })
  }
}
