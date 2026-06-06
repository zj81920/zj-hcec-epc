import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { disciplineSchema } from '@/lib/validations'
import { generateDisciplineCode } from '@/lib/discipline-utils'

export async function GET() {
  const disciplines = await db.discipline.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(disciplines)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = disciplineSchema.parse(body)

    if (!data.code) {
      data.code = generateDisciplineCode(data.name)
    }

    const discipline = await db.discipline.create({ data })

    return NextResponse.json(discipline, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
