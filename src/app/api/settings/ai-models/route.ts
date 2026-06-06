import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiModelConfigSchema } from '@/lib/validations'
import { encrypt } from '@/lib/crypto'
import { maskApiKey } from '@/lib/ai/types'

export async function GET() {
  const configs = await db.aiModelConfig.findMany({
    orderBy: { createdAt: 'desc' },
  })
  const masked = configs.map(c => ({
    ...c,
    apiKey: c.apiKey ? maskApiKey(c.apiKey) : '',
  }))
  return NextResponse.json(masked)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = aiModelConfigSchema.parse(body)

    const encryptedKey = data.apiKey ? encrypt(data.apiKey) : ''

    if (data.isActive) {
      await db.aiModelConfig.updateMany({ where: { isActive: true }, data: { isActive: false } })
    }

    const config = await db.aiModelConfig.create({
      data: {
        ...data,
        apiKey: encryptedKey,
      },
    })

    return NextResponse.json({ ...config, apiKey: maskApiKey(config.apiKey) }, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
