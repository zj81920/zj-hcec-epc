import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActiveAIClient, AIClientError } from '@/lib/ai/client'
import { readFile } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const { fileIds } = await req.json()

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: '请选择至少一个文件' }, { status: 400 })
    }

    const files = await db.designDocument.findMany({
      where: { id: { in: fileIds } },
    })

    if (files.length === 0) {
      return NextResponse.json({ error: '未找到指定文件' }, { status: 404 })
    }

    const ai = await getActiveAIClient()
    const allItems: any[] = []
    const unparsedFiles: string[] = []

    for (const file of files) {
      try {
        const filePath = path.join(process.cwd(), file.filePath)
        const buffer = await readFile(filePath)

        const items = await ai.parseMaterialsFromFile(buffer, file.fileName)
        if (items.length === 0) {
          unparsedFiles.push(file.fileName)
        } else {
          allItems.push(...items.map(item => ({ ...item, sourceFile: file.fileName })))
        }
      } catch {
        unparsedFiles.push(file.fileName)
      }
    }

    return NextResponse.json({ items: allItems, unparsedFiles })
  } catch (e: any) {
    if (e instanceof AIClientError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '提取失败' }, { status: 500 })
  }
}
