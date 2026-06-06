import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'

// 采购合同 DB 模型测试
describe('ProcurementContract Model', () => {
  let projectId: string

  beforeAll(async () => {
    // 创建测试项目（Project 必填字段：name/code/startDate/endDate）
    const project = await db.project.create({
      data: {
        name: '【测试】合同测试项目',
        code: 'CT-TEST-' + Date.now(),
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    })
    projectId = project.id
  })

  afterAll(async () => {
    // 清理顺序：先删合同（级联删 link 和 item），再删项目
    await db.procurementContract.deleteMany({
      where: { contractName: { startsWith: '【测试】' } },
    })
    await db.project.delete({ where: { id: projectId } }).catch(() => {})
  })

  it('应能创建合同（含基本字段）', async () => {
    const contract = await db.procurementContract.create({
      data: {
        projectId,
        contractNo: 'PC-TEST-' + Date.now(),
        contractName: '【测试】基本合同',
        supplier: '测试供应商',
        totalAmount: 100000,
        taxAmount: 11504.42,
        taxRate: '13%',
        status: '草稿',
      },
    })

    expect(contract.contractName).toBe('【测试】基本合同')
    expect(contract.status).toBe('草稿')
    expect(contract.totalAmount).toBe(100000)
    expect(contract.taxRate).toBe('13%')
    expect(contract.id).toBeDefined()
  })

  it('默认 status 应为草稿，并具备其他默认值', async () => {
    const contract = await db.procurementContract.create({
      data: {
        projectId,
        contractNo: 'PC-TEST-DEFAULT-' + Date.now(),
        contractName: '【测试】默认状态',
      },
    })
    expect(contract.status).toBe('草稿')
    expect(contract.taxRate).toBe('13%')
    expect(contract.paymentTerms).toBe('30:40:20:10')
    expect(contract.warrantyPeriod).toBe(12)
    expect(contract.deliveryTerm).toBe(30)
  })

  it('contractNo 在同一项目内应唯一', async () => {
    const sameNo = 'PC-TEST-UNIQUE-' + Date.now()
    await db.procurementContract.create({
      data: {
        projectId,
        contractNo: sameNo,
        contractName: '【测试】唯一编号1',
      },
    })

    await expect(
      db.procurementContract.create({
        data: {
          projectId,
          contractNo: sameNo,
          contractName: '【测试】唯一编号2',
        },
      })
    ).rejects.toThrow()
  })

  it('合同删除应级联删除 ContractOrderLink', async () => {
    // 先创建请购单（ProcurementOrder.requisitionId 必填）
    const requisition = await db.purchaseRequisition.create({
      data: {
        projectId,
        reqNo: 'REQ-CT-TEST-' + Date.now(),
        remark: '【测试】合同级联用请购单',
      },
    })

    // 创建一个真实订单用于关联
    const order = await db.procurementOrder.create({
      data: {
        projectId,
        requisitionId: requisition.id,
        orderNo: 'ORD-CT-TEST-' + Date.now(),
      },
    })

    const contract = await db.procurementContract.create({
      data: {
        projectId,
        contractNo: 'PC-TEST-CASCADE-' + Date.now(),
        contractName: '【测试】级联删除',
        orderLinks: {
          create: [{ orderId: order.id }],
        },
      },
      include: { orderLinks: true },
    })

    expect(contract.orderLinks).toHaveLength(1)
    const linkId = contract.orderLinks[0].id

    await db.procurementContract.delete({ where: { id: contract.id } })

    const remainingLink = await db.contractOrderLink.findUnique({
      where: { id: linkId },
    })
    expect(remainingLink).toBeNull()

    // 订单本身不会被级联删除
    const remainingOrder = await db.procurementOrder.findUnique({
      where: { id: order.id },
    })
    expect(remainingOrder).not.toBeNull()

    // 清理订单和请购单
    await db.procurementOrder.delete({ where: { id: order.id } }).catch(() => {})
    await db.purchaseRequisition.delete({ where: { id: requisition.id } }).catch(() => {})
  })
})
