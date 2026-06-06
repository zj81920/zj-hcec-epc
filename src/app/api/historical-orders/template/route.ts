import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// GET /api/historical-orders/template — 下载上传模板
export async function GET() {
  // 直接从 public/templates 读取
  try {
    const templatePath = path.join(process.cwd(), 'public', 'templates', '采购单明细.xlsx')
    const buffer = await fs.readFile(templatePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('采购单明细模板.xlsx')}`,
      },
    })
  } catch {
    return NextResponse.json({ error: '模板文件不存在' }, { status: 404 })
  }
}
