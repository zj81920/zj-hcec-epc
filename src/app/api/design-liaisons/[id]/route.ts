import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { liaisonSchema } from '@/lib/validations'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const data = liaisonSchema.partial().parse(body)
    const liaison = await db.designLiaison.update({ where: { id }, data })
    return NextResponse.json(liaison)
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '更新失败' }, { status: 500 })
  }
}
