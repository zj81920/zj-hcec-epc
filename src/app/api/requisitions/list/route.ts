import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const businessStatus = searchParams.get('businessStatus')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const where: Record<string, unknown> = { projectId }
  if (status) {
    const statuses = status.split(',').map((s) => s.trim())
    where.status = statuses.length > 1 ? { in: statuses } : statuses[0]
  }
  if (businessStatus) {
    const bStatuses = businessStatus.split(',').map((s) => s.trim())
    where.businessStatus = bStatuses.length > 1 ? { in: bStatuses } : bStatuses[0]
  }

  const list = await db.purchaseRequisition.findMany({
    where,
    select: { id: true, reqNo: true, requester: true, reqDate: true, status: true, businessStatus: true, discipline: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(list)
}
