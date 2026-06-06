import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, businessStatus } = body

    const requisition = await db.purchaseRequisition.findUnique({ where: { id } })
    if (!requisition) {
      return NextResponse.json({ error: '请购单不存在' }, { status: 404 })
    }

    const updateData: Record<string, string> = {}
    if (status !== undefined) updateData.status = status
    if (businessStatus !== undefined) updateData.businessStatus = businessStatus

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '未提供更新数据' }, { status: 400 })
    }

    const updated = await db.purchaseRequisition.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '更新失败' }, { status: 500 })
  }
}
