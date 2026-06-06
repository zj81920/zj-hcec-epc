import { NextResponse } from 'next/server'
import { generateRequisitionNo } from '@/lib/numbering'

export async function GET() {
  const reqNo = await generateRequisitionNo()
  return NextResponse.json({ reqNo })
}
