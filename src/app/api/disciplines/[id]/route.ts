import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { disciplineSchema } from '@/lib/validations'
import { generateDisciplineCode } from '@/lib/discipline-utils'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const discipline = await db.discipline.findUnique({ where: { id } })
  if (!discipline) return NextResponse.json({ error: '专业不存在' }, { status: 404 })
  return NextResponse.json(discipline)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const existing = await db.discipline.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: '专业不存在' }, { status: 404 })

    const body = await req.json()
    const data = disciplineSchema.parse(body)

    if (!data.code) {
      data.code = generateDisciplineCode(data.name)
    }

    const updated = await db.discipline.update({
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
    const existing = await db.discipline.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: '专业不存在' }, { status: 404 })

    await db.discipline.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
