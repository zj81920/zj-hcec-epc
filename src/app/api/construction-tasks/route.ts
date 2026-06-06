import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { constructionTaskSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = constructionTaskSchema.parse(body)
    const task = await db.constructionTask.create({ data })
    return NextResponse.json(task, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
