import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const supplierId = searchParams.get('supplierId')

  if (!projectId) {
    return NextResponse.json({ error: '缺少 projectId' }, { status: 400 })
  }

  const where: any = {
    projectId,
    status: '已批准',
    contractNo: '',
  }
  if (supplierId) where.supplierId = supplierId

  const orders = await db.procurementOrder.findMany({
    where,
    select: {
      id: true,
      orderNo: true,
      supplier: true,
      supplierId: true,
      supplierContact: true,
      supplierPhone: true,
      executingUnitId: true,
      executingUnitName: true,
      totalAmount: true,
      contractNo: true,
      deliveryAddress: true,
      items: {
        select: {
          id: true,
          materialName: true,
          specification: true,
          materialCode: true,
          material: true,
          materialGrade: true,
          brand: true,
          quantity: true,
          unit: true,
          unitPrice: true,
          totalAmount: true,
        },
      },
    },
    orderBy: { orderNo: 'asc' },
  })

  return NextResponse.json(orders)
}
