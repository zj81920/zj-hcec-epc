import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { constructionDocSchema } from '@/lib/validations'
import { getStorage } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string
    const docNo = formData.get('docNo') as string || ''
    const docName = formData.get('docName') as string || ''
    const category = formData.get('category') as string || '施工日志'
    const relatedTask = formData.get('relatedTask') as string || ''
    const uploadedBy = formData.get('uploadedBy') as string || ''

    if (!file || !projectId) {
      return NextResponse.json({ error: '缺少文件或项目ID' }, { status: 400 })
    }

    const storage = getStorage()
    const uploaded = await storage.save(file, `projects/${projectId}/construction`)

    const doc = await db.constructionDoc.create({
      data: {
        projectId,
        docNo,
        docName: docName || file.name,
        category,
        relatedTask,
        filePath: uploaded.filePath,
        fileSize: uploaded.fileSize,
        uploadedBy,
      },
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '上传失败' }, { status: 500 })
  }
}
