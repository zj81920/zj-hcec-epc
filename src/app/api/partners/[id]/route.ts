import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { partnerSchema } from '@/lib/validations'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const partner = await db.partner.findUnique({ where: { id } })
  if (!partner) return NextResponse.json({ error: '合作方不存在' }, { status: 404 })
  return NextResponse.json(partner)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const existing = await db.partner.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: '合作方不存在' }, { status: 404 })

    const body = await req.json()
    const data = partnerSchema.parse(body)

    const updated = await db.partner.update({
      where: { id },
      data,
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
    const existing = await db.partner.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: '合作方不存在' }, { status: 404 })

    await db.partner.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
