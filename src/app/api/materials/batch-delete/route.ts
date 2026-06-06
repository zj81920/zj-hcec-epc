import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { codes }: { codes: string[] } = body
  if (!codes || codes.length === 0) {
    return NextResponse.json({ error: '请选择要删除的物料' }, { status: 400 })
  }
  try {
    const result = await db.materialMaster.deleteMany({
      where: { materialCode: { in: codes } },
    })
    return NextResponse.json({ success: true, count: result.count })
  } catch {
    return NextResponse.json({ error: '批量删除失败' }, { status: 400 })
  }
}
