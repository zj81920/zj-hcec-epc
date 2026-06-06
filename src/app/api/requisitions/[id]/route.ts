import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requisitionSchema } from '@/lib/validations'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const requisition = await db.purchaseRequisition.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!requisition) return NextResponse.json({ error: '请购单不存在' }, { status: 404 })
  return NextResponse.json(requisition)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const existing = await db.purchaseRequisition.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: '请购单不存在' }, { status: 404 })
    if (existing.status !== '草稿') return NextResponse.json({ error: '仅草稿状态的请购单可以编辑' }, { status: 400 })

    const body = await req.json()
    const data = requisitionSchema.parse(body)
    const { items, ...reqData } = data

    await db.requisitionItem.deleteMany({ where: { requisitionId: id } })

    const updated = await db.purchaseRequisition.update({
      where: { id },
      data: {
        ...reqData,
        requester: data.requester || '管理员',
        items: {
          create: items,
        },
      },
      include: { items: true },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const existing = await db.purchaseRequisition.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: '请购单不存在' }, { status: 404 })
    if (existing.status !== '草稿') return NextResponse.json({ error: '仅草稿状态的请购单可以删除' }, { status: 400 })

    await db.purchaseRequisition.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
