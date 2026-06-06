import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status') || '启用'

  const where: Record<string, unknown> = { status }
  if (type) where.type = type

  const list = await db.partner.findMany({
    where,
    select: { id: true, name: true, contactPerson: true, phone: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(list)
}
