import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.MOCK_APPROVE_ENABLED !== 'true' && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '模拟审批仅在非生产环境可用' }, { status: 403 })
  }

  const { id } = await params

  const requisition = await db.purchaseRequisition.findUnique({
    where: { id },
    select: { id: true, status: true, businessStatus: true },
  })

  if (!requisition) {
    return NextResponse.json({ error: '请购单不存在' }, { status: 404 })
  }

  if (requisition.status !== '草稿') {
    return NextResponse.json({
      error: '当前状态不允许审批',
      currentStatus: requisition.status,
    }, { status: 400 })
  }

  await db.purchaseRequisition.update({
    where: { id },
    data: {
      status: '已批准',
    },
  })

  return NextResponse.json({
    id: requisition.id,
    status: '已批准',
    approved: true,
  })
}
