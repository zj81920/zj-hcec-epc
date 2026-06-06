import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStorage } from '@/lib/storage'

// POST /api/quotes/[token]/upload — 供应商上传技术文件
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const quote = await db.orderQuote.findUnique({ where: { token } })
    if (!quote) return NextResponse.json({ error: '无效的报价链接' }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过10MB' }, { status: 400 })
    }

    const storage = getStorage()
    const uploaded = await storage.save(file, `uploads/quotes/${quote.id}`)

    return NextResponse.json({
      name: uploaded.fileName,
      path: uploaded.filePath,
      size: uploaded.fileSize,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '上传失败' }, { status: 500 })
  }
}
