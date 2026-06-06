import { NextRequest, NextResponse } from 'next/server'
import { getActiveAIClient, AIClientError } from '@/lib/ai/client'

export async function POST(req: NextRequest) {
  try {
    const { text, projectId } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '请输入文本' }, { status: 400 })
    }

    const ai = await getActiveAIClient()
    const items = await ai.parseNaturalLanguage(text, projectId ? { projectId } : undefined)

    return NextResponse.json({ items })
  } catch (e: any) {
    if (e instanceof AIClientError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '解析失败' }, { status: 500 })
  }
}
