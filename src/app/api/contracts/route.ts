import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')

  if (!projectId) {
    return NextResponse.json({ error: '缺少 projectId' }, { status: 400 })
  }

  const where: any = { projectId }
  if (status) where.status = status
  if (keyword) {
    where.OR = [
      { contractNo: { contains: keyword, mode: 'insensitive' } },
      { contractName: { contains: keyword, mode: 'insensitive' } },
      { supplier: { contains: keyword, mode: 'insensitive' } },
    ]
  }

  const contracts = await db.procurementContract.findMany({
    where,
    include: {
      _count: { select: { orderLinks: true, items: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(contracts)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderIds = [], items = [], ...contractData } = body

    if (!contractData.projectId) {
      return NextResponse.json({ error: '缺少 projectId' }, { status: 400 })
    }
    if (!contractData.contractNo) {
      return NextResponse.json({ error: '缺少 contractNo' }, { status: 400 })
    }

    const contract = await db.procurementContract.create({
      data: {
        ...contractData,
        orderLinks: {
          create: orderIds.map((orderId: string) => ({ orderId })),
        },
        items: {
          create: items.map((item: any) => ({
            orderItemId: item.orderItemId,
            materialName: item.materialName,
            specification: item.specification || '',
            materialCode: item.materialCode || '',
            material: item.material || '',
            materialGrade: item.materialGrade || '',
            brand: item.brand || '',
            quantity: item.quantity || 0,
            unit: item.unit || '',
            unitPrice: item.unitPrice || 0,
            totalAmount: item.totalAmount || 0,
          })),
        },
      },
      include: { orderLinks: true, items: true },
    })

    return NextResponse.json(contract, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: '合同编号已存在' }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 400 })
  }
}
