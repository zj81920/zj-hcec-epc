import { NextRequest, NextResponse } from 'next/server'
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  WidthType,
  AlignmentType,
} from 'docx'
import { db } from '@/lib/db'

// 导出采购合同为 Word（.docx）文件
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

  // 文档主体内容
  const children: any[] = []

  // 标题
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `采购合同 - ${contract.contractNo}`,
          bold: true,
          size: 36,
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
  )

  children.push(new Paragraph({ children: [new TextRun({ text: '' })] }))

  // 基本信息
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `合同名称：${contract.contractName}`, size: 24 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `供应商：${contract.supplier}`, size: 24 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `采购单位：${contract.executingUnitName}`, size: 24 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `含税总价：¥${contract.totalAmount.toFixed(2)} 元`,
          size: 24,
        }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
  )

  // 合同正文（content.sections）
  const content = contract.content as any
  if (content && Array.isArray(content.sections)) {
    for (const section of content.sections) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: section.title, bold: true, size: 28 }),
          ],
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: section.content || '', size: 22 }),
          ],
        }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
      )
    }
  }

  // 物资明细表
  if (contract.items.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '物资明细', bold: true, size: 28 }),
        ],
        heading: HeadingLevel.HEADING_2,
      }),
    )

    const headerRow = new TableRow({
      children: [
        '序号',
        '物资名称',
        '规格型号',
        '材质',
        '品牌',
        '数量',
        '单位',
        '含税单价',
        '含税总价',
      ].map(
        (text) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text, bold: true })],
              }),
            ],
          }),
      ),
    })

    const dataRows = contract.items.map(
      (item, idx) =>
        new TableRow({
          children: [
            String(idx + 1),
            item.materialName,
            item.specification,
            item.material,
            item.brand,
            String(item.quantity),
            item.unit,
            item.unitPrice.toFixed(2),
            item.totalAmount.toFixed(2),
          ].map(
            (text) =>
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text })] }),
                ],
              }),
          ),
        }),
    )

    children.push(
      new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    )
  }

  const doc = new Document({
    sections: [{ children }],
  })

  const buffer = await Packer.toBuffer(doc)
  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(
        contract.contractNo,
      )}.docx"`,
    },
  })
}
