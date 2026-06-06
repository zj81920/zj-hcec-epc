import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const materials = await db.materialMaster.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(materials)
}
