import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { id } = await req.json()

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  await db.aiModelConfig.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  })

  await db.aiModelConfig.update({
    where: { id },
    data: { isActive: true },
  })

  return NextResponse.json({ success: true })
}
