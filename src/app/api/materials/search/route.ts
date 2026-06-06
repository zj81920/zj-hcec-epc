import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''

  const results = await db.materialMaster.findMany({
    where: {
      materialName: { contains: q },
    },
    take: 10,
    orderBy: { materialName: 'asc' },
  })

  return NextResponse.json(results)
}
