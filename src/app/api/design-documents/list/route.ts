import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const documents = await db.designDocument.findMany({
    where: { projectId },
    select: { id: true, fileName: true, discipline: true, category: true },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json(documents)
}
