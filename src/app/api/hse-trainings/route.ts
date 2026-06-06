import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hseTrainingSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = hseTrainingSchema.parse(body)
    const training = await db.hSETraining.create({ data })
    return NextResponse.json(training, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
