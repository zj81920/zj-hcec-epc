import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/historical-orders/[id] — 编辑
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const existing = await db.historicalOrderItem.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

    const body = await req.json()
    const updated = await db.historicalOrderItem.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '编辑失败' }, { status: 500 })
  }
}

// DELETE /api/historical-orders/[id] — 删除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const existing = await db.historicalOrderItem.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

    await db.historicalOrderItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
