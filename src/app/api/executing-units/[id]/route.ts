import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { executingUnitUpdateSchema } from '@/lib/validations'

// 获取单个执行单位
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const unit = await db.executingUnit.findUnique({ where: { id } })
  if (!unit) {
    return NextResponse.json({ error: '未找到执行单位' }, { status: 404 })
  }
  return NextResponse.json(unit)
}

// 更新执行单位（部分字段）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const existing = await db.executingUnit.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '未找到执行单位' }, { status: 404 })
    }

    const body = await req.json()
    const data = executingUnitUpdateSchema.parse(body)

    const unit = await db.executingUnit.update({
      where: { id },
      data,
    })
    return NextResponse.json(unit)
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: '单位名称已存在' }, { status: 400 })
    }
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: '未找到执行单位' }, { status: 404 })
    }
    return NextResponse.json({ error: e.message || '更新失败' }, { status: 500 })
  }
}

// 硬删除执行单位
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const existing = await db.executingUnit.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '未找到执行单位' }, { status: 404 })
    }
    await db.executingUnit.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: '未找到执行单位' }, { status: 404 })
    }
    return NextResponse.json({ error: e.message || '删除失败' }, { status: 500 })
  }
}
