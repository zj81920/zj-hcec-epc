import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { executingUnitSchema } from '@/lib/validations'

// 获取执行单位列表，可按 status 过滤
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where = status ? { status } : {}
  const units = await db.executingUnit.findMany({
    where,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(units)
}

// 新建执行单位
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = executingUnitSchema.parse(body)
    const unit = await db.executingUnit.create({ data })
    return NextResponse.json(unit, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: '单位名称已存在' }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
