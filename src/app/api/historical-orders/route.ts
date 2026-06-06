import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/historical-orders — 分页列表查询
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const keyword = searchParams.get('keyword') || ''

    const where: Record<string, unknown> = {}
    if (keyword) {
      where.OR = [
        { materialName: { contains: keyword } },
        { specification: { contains: keyword } },
        { supplierName: { contains: keyword } },
      ]
    }

    const [list, total] = await Promise.all([
      db.historicalOrderItem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.historicalOrderItem.count({ where }),
    ])

    return NextResponse.json({ list, total, page, pageSize })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '查询失败' }, { status: 500 })
  }
}
