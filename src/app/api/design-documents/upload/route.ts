import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { designDocSchema } from '@/lib/validations'
import { getStorage } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string
    const discipline = formData.get('discipline') as string || '其他'
    const category = formData.get('category') as string || '设计图纸'
    const versionStr = formData.get('version') as string || '1'
    const uploadedBy = formData.get('uploadedBy') as string || ''

    if (!file || !projectId) {
      return NextResponse.json({ error: '缺少文件或项目ID' }, { status: 400 })
    }

    const storage = getStorage()
    const uploaded = await storage.save(file, `projects/${projectId}/design`)

    const doc = await db.designDocument.create({
      data: {
        projectId,
        fileName: uploaded.fileName,
        filePath: uploaded.filePath,
        fileSize: uploaded.fileSize,
        fileType: file.type || 'application/octet-stream',
        discipline,
        category,
        version: parseInt(versionStr),
        uploadedBy,
      },
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '上传失败' }, { status: 500 })
  }
}
