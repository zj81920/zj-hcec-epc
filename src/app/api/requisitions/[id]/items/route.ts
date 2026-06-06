import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const items = await db.requisitionItem.findMany({
      where: { requisitionId: id },
      include: { orderItems: { select: { quantity: true } } },
      orderBy: { materialName: 'asc' },
    })
    return NextResponse.json(items)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
