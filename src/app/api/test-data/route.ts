import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, projectId } = body

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  try {
    if (action === 'setup') {
      const existing = await db.project.findUnique({ where: { id: projectId } })
      if (!existing) {
        await db.project.create({
          data: {
            id: projectId,
            name: '回归测试项目',
            code: `TEST-${Date.now()}`,
            status: 'active',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
          },
        })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'cleanup') {
      await db.materialMaster.deleteMany({
        where: { materialName: { contains: '测试' } },
      })
      await db.purchaseRequisition.deleteMany({
        where: { projectId, remark: { contains: '回归测试' } },
      })
      await db.project.deleteMany({ where: { id: projectId } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
