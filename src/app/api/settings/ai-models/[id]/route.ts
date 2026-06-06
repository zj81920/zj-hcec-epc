import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiModelConfigSchema } from '@/lib/validations'
import { encrypt } from '@/lib/crypto'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const data = aiModelConfigSchema.partial().parse(body)

    const updateData: Record<string, unknown> = { ...data }
    if (data.apiKey) {
      updateData.apiKey = encrypt(data.apiKey)
    }

    if (data.isActive) {
      await db.aiModelConfig.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      })
    }

    const config = await db.aiModelConfig.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(config)
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 })
    }
    return NextResponse.json({ error: e.message || '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  await db.aiModelConfig.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
