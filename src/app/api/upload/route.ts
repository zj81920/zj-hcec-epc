import { NextRequest, NextResponse } from 'next/server'
import { getStorage } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过10MB' }, { status: 400 })
    }

    const storage = getStorage()
    const uploaded = await storage.save(file, 'uploads')

    return NextResponse.json({
      fileName: uploaded.fileName,
      filePath: uploaded.filePath,
      fileSize: uploaded.fileSize,
      fileType: uploaded.fileType,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '上传失败' }, { status: 500 })
  }
}
