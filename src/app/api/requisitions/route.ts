import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requisitionSchema } from '@/lib/validations'
import { generateRequisitionNo, generateMaterialCode } from '@/lib/numbering'

// 生成物料属性唯一键，用于去重
function materialKey(item: { materialName: string; specification: string; material: string; materialGrade: string; applicableStandard: string; unit: string }) {
  return `${item.materialName || ''}|${item.specification || ''}|${item.material || ''}|${item.materialGrade || ''}|${item.applicableStandard || ''}|${item.unit || ''}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = requisitionSchema.parse(body)
    const { items, ...reqData } = data

    const reqNo = await generateRequisitionNo()

    // 第一步：先去重，收集所有需要创建的物料属性组合
    const newMaterialMap = new Map<string, string>() // key -> materialCode
    const itemsWithCodes: Record<string, any>[] = []

    for (const item of items) {
      // 已有物料编码，直接校验
      if (item.materialCode) {
        const existing = await db.materialMaster.findUnique({ where: { materialCode: item.materialCode } })
        if (existing) {
          itemsWithCodes.push({ ...item, materialCode: existing.materialCode })
          continue
        }
      }

      // 在已有物料库中查找
      const existing = await db.materialMaster.findFirst({
        where: {
          materialName: item.materialName || '',
          specification: item.specification || '',
          material: item.material || '',
          materialGrade: item.materialGrade || '',
          applicableStandard: item.applicableStandard || '',
          unit: item.unit || '',
        },
      })

      if (existing) {
        itemsWithCodes.push({ ...item, materialCode: existing.materialCode })
        continue
      }

      // 新物料：先看在本次请求中是否已有同类物料
      const key = materialKey(item)
      if (!newMaterialMap.has(key)) {
        // 生成编码并创建物料（串行执行，避免编码冲突）
        const code = await generateMaterialCode()
        await db.materialMaster.create({
          data: {
            materialCode: code,
            materialName: item.materialName || '',
            specification: item.specification || '',
            material: item.material || '',
            materialGrade: item.materialGrade || '',
            applicableStandard: item.applicableStandard || '',
            unit: item.unit || '',
          },
        })
        newMaterialMap.set(key, code)
      }

      itemsWithCodes.push({ ...item, materialCode: newMaterialMap.get(key)! })
    }

    const requisition = await db.purchaseRequisition.create({
      data: {
        ...reqData,
        reqNo,
        requester: data.requester || '管理员',
        items: {
          create: itemsWithCodes as any,
        },
      },
      include: { items: true },
    })

    return NextResponse.json(requisition, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: '数据校验失败', details: e.errors }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || '创建失败' }, { status: 500 })
  }
}
