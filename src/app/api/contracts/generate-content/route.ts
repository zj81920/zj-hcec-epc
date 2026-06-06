import { NextRequest, NextResponse } from 'next/server'
import { getActiveAIClient } from '@/lib/ai/client'
import { contractTemplate } from '@/lib/contract-template'
import type { ContractGenerationParams } from '@/lib/ai/types'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ContractGenerationParams
    const ai = await getActiveAIClient()
    const content = await ai.generateContractContent(body, contractTemplate)
    return NextResponse.json({ content })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'AI 合同生成失败' },
      { status: 500 },
    )
  }
}
