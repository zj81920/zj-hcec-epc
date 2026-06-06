import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { testAIConnection } from '@/lib/ai/client'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const config = await db.aiModelConfig.findUnique({ where: { id } })

  if (!config) {
    return NextResponse.json({ error: '配置不存在' }, { status: 404 })
  }

  const result = await testAIConnection(config)
  return NextResponse.json(result)
}
