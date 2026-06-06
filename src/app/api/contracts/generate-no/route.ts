import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateContractNo } from '@/lib/contract-utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: '缺少 projectId' }, { status: 400 })
  }

  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const prefix = `PC-${y}${m}${d}-`

  const lastContract = await db.procurementContract.findFirst({
    where: {
      projectId,
      contractNo: { startsWith: prefix },
    },
    orderBy: { contractNo: 'desc' },
  })

  let seq = 1
  if (lastContract) {
    const lastSeq = parseInt(lastContract.contractNo.slice(-3), 10)
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }

  return NextResponse.json({ contractNo: generateContractNo(seq) })
}
