import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  try {
    await db.materialMaster.delete({ where: { materialCode: code } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除失败，物料不存在或已被引用' }, { status: 400 })
  }
}
