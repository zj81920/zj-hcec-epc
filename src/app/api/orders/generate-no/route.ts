import { NextResponse } from 'next/server'
import { generateOrderNo } from '@/lib/numbering'

export async function GET() {
  try {
    const orderNo = await generateOrderNo()
    return NextResponse.json({ orderNo })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '生成编号失败' }, { status: 500 })
  }
}
