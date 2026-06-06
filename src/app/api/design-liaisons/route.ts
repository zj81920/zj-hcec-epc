import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { liaisonSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = liaisonSchema.parse(body)
    const liaison = await db.designLiaison.create({ data })
    return NextResponse.json(liaison, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
