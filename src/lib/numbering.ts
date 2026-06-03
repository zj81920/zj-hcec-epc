import { db } from '@/lib/db'

export async function generateRequisitionNo(): Promise<string> {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const prefix = `REQ-${y}${m}${d}`

  const last = await db.purchaseRequisition.findFirst({
    where: { reqNo: { startsWith: prefix } },
    orderBy: { reqNo: 'desc' },
    select: { reqNo: true },
  })

  let seq = 1
  if (last) {
    const lastSeq = parseInt(last.reqNo.slice(-3), 10)
    seq = lastSeq + 1
  }

  return `${prefix}-${String(seq).padStart(3, '0')}`
}

export async function generateMaterialCode(): Promise<string> {
  const [reqItem, master] = await Promise.all([
    db.requisitionItem.findFirst({
      orderBy: { materialCode: 'desc' },
      select: { materialCode: true },
    }),
    db.materialMaster.findFirst({
      orderBy: { materialCode: 'desc' },
      select: { materialCode: true },
    }),
  ])

  const codes = [reqItem?.materialCode, master?.materialCode].filter(Boolean) as string[]
  let seq = 1
  if (codes.length > 0) {
    const maxSeq = Math.max(...codes.map((c) => parseInt(c.replace('MAT-', ''), 10)))
    seq = maxSeq + 1
  }

  return `MAT-${String(seq).padStart(6, '0')}`
}

export async function generateOrderNo(): Promise<string> {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const prefix = `PO-${y}${m}${d}`

  const last = await db.procurementOrder.findFirst({
    where: { orderNo: { startsWith: prefix } },
    orderBy: { orderNo: 'desc' },
    select: { orderNo: true },
  })

  let seq = 1
  if (last) {
    const lastSeq = parseInt(last.orderNo.slice(-3), 10)
    seq = lastSeq + 1
  }

  return `${prefix}-${String(seq).padStart(3, '0')}`
}
