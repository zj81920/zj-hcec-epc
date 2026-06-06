import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || '启用'

  const list = await db.discipline.findMany({
    where: { status },
    select: { id: true, name: true, code: true },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(list)
}
