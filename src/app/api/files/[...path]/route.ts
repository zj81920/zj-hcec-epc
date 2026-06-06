import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const STORAGE_PATH = process.env.STORAGE_PATH || './storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = path.resolve(STORAGE_PATH, ...pathSegments)

    if (!filePath.startsWith(path.resolve(STORAGE_PATH))) {
      return NextResponse.json({ error: '无效的文件路径' }, { status: 403 })
    }

    const buffer = await fs.readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.txt': 'text/plain',
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeMap[ext] || 'application/octet-stream',
        'Content-Disposition': `inline`,
      },
    })
  } catch {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 })
  }
}
