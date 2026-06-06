import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

// POST /api/historical-orders/upload — Excel 上传解析入库
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 })
    }

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: 'Excel 文件为空' }, { status: 400 })
    }

    const sheet = workbook.Sheets[sheetName]
    // 表头在第2行（第1行为空），从第2行开始解析
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' })

    // 找到表头行（第一个有"序号"的行）
    let headerRowIndex = -1
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === '序号') {
        headerRowIndex = i
        break
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json({ error: '未找到表头，请确认模板格式' }, { status: 400 })
    }

    // 列映射：序号=0, 物资名称=1, 规格型号=2, 材料牌号=3, 适用标准号=4, 品牌=5, 单位=6, 数量=7, 单价=8, 总价=9, 采购时间=10, 供应商名称=11, 供应商联系人=12, 联系方式=13
    const items: any[] = []
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row[1]) continue // 跳过空行

      items.push({
        seq: row[0] ? parseInt(String(row[0])) || null : null,
        materialName: String(row[1] || ''),
        specification: String(row[2] || ''),
        materialGrade: String(row[3] || ''),
        standardCode: String(row[4] || ''),
        brand: String(row[5] || ''),
        unit: String(row[6] || ''),
        quantity: parseFloat(String(row[7])) || 0,
        unitPrice: parseFloat(String(row[8])) || 0,
        totalAmount: parseFloat(String(row[9])) || 0,
        purchaseDate: row[10] ? parseExcelDate(row[10]) : null,
        supplierName: String(row[11] || ''),
        supplierContact: String(row[12] || ''),
        supplierPhone: String(row[13] || ''),
      })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: '未解析到有效数据' }, { status: 400 })
    }

    // 批量插入
    await db.historicalOrderItem.createMany({ data: items })

    // 返回插入的数据用于测试
    const inserted = await db.historicalOrderItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: items.length,
    })

    return NextResponse.json({ success: true, count: items.length, items: inserted })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '上传失败' }, { status: 500 })
  }
}

// 解析 Excel 日期（可能是数字序列号或字符串）
function parseExcelDate(val: any): Date | null {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    // Excel 日期序列号（1900-01-01 为 1）
    const date = new Date((val - 25569) * 86400 * 1000)
    return isNaN(date.getTime()) ? null : date
  }
  const d = new Date(String(val))
  return isNaN(d.getTime()) ? null : d
}
