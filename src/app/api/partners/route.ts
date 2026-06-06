import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { partnerSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (type) where.type = type
  if (status) where.status = status
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactPerson: { contains: search, mode: 'insensitive' } },
    ]
  }

  const partners = await db.partner.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(partners)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = partnerSchema.parse(body)

    const partner = await db.partner.create({ data })

    return NextResponse.json(partner, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
