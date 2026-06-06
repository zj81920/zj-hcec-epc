import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 导出采购合同为可打印 HTML（浏览器自带"打印为 PDF"功能）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const contract = await db.procurementContract.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!contract) {
    return NextResponse.json({ error: '未找到合同' }, { status: 404 })
  }

  const content = contract.content as any
  const sectionsHtml =
    content && Array.isArray(content.sections)
      ? content.sections
          .map(
            (s: any) =>
              `<h2>${escapeHtml(s.title)}</h2><div class="section-content">${escapeHtml(
                s.content || '',
              ).replace(/\n/g, '<br/>')}</div>`,
          )
          .join('')
      : '<p>合同正文未生成</p>'

  const itemsHtml = contract.items
    .map(
      (item, idx) =>
        `<tr><td>${idx + 1}</td><td>${escapeHtml(item.materialName)}</td><td>${escapeHtml(
          item.specification,
        )}</td><td>${escapeHtml(item.material)}</td><td>${escapeHtml(item.brand)}</td><td>${
          item.quantity
        }</td><td>${escapeHtml(item.unit)}</td><td>${item.unitPrice.toFixed(
          2,
        )}</td><td>${item.totalAmount.toFixed(2)}</td></tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>采购合同 - ${escapeHtml(contract.contractNo)}</title>
  <style>
    body { font-family: 'SimSun', 'Songti SC', serif; padding: 40px; line-height: 1.8; }
    h1 { text-align: center; margin-bottom: 30px; }
    h2 { margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #999; padding: 6px 10px; font-size: 12px; }
    th { background: #f4f4f4; }
    .meta { margin-bottom: 16px; }
    .section-content { white-space: pre-wrap; margin: 10px 0; }
    @media print {
      body { padding: 20px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <button onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:8px 16px;">打印 / 另存为 PDF</button>
  <h1>采购合同 - ${escapeHtml(contract.contractNo)}</h1>
  <div class="meta">
    <p><strong>合同名称：</strong>${escapeHtml(contract.contractName)}</p>
    <p><strong>供应商：</strong>${escapeHtml(contract.supplier)}</p>
    <p><strong>采购单位：</strong>${escapeHtml(contract.executingUnitName)}</p>
    <p><strong>含税总价：</strong>¥${contract.totalAmount.toFixed(2)} 元</p>
    <p><strong>税率：</strong>${escapeHtml(contract.taxRate)}</p>
  </div>
  ${sectionsHtml}
  <h2>物资明细</h2>
  <table>
    <thead>
      <tr><th>序号</th><th>物资名称</th><th>规格型号</th><th>材质</th><th>品牌</th><th>数量</th><th>单位</th><th>含税单价</th><th>含税总价</th></tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

// HTML 转义，防止字段中包含 < > 等字符破坏页面结构
function escapeHtml(text: string): string {
  if (text == null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
