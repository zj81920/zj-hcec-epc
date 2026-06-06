import { describe, it, expect } from 'vitest'
import { api, TEST_PROJECT_ID } from '../setup'

const PROJECT_ID = TEST_PROJECT_ID
let createdRequisitionId = ''
let createdPartnerId = ''
let item1Id = ''
let item2Id = ''
let createdOrderId1 = ''
let createdOrderId2 = ''

describe('双状态管理 回归测试', () => {

  it('1. 准备测试数据 - 创建合作方（供应商）', async () => {
    const { status, data } = await api('POST', '/api/partners', {
      name: '测试供应商-双状态',
      type: 'supplier',
      contactPerson: '王五',
      phone: '13700137000',
      status: '启用',
    })
    expect(status).toBe(201)
    expect(data.id).toBeTruthy()
    createdPartnerId = data.id
  })

  it('2. 创建请购单（默认流程状态=草稿，业务状态=正常）', async () => {
    const { status, data } = await api('POST', '/api/requisitions', {
      projectId: PROJECT_ID,
      reqDate: '2026-06-05',
      requester: '测试用户',
      procurementCategory: '材料',
      demandType: '正常采购',
      items: [
        {
          materialName: '钢管',
          specification: 'DN150',
          material: '碳钢',
          quantity: 100,
          unit: '米',
          purpose: '双状态测试',
          status: '待采购',
        },
        {
          materialName: '法兰',
          specification: 'DN150 PN16',
          material: '碳钢',
          quantity: 50,
          unit: '个',
          purpose: '双状态测试',
          status: '待采购',
        },
      ],
    })
    expect(status).toBe(201)
    expect(data.status).toBe('草稿')
    expect(data.businessStatus).toBe('正常')
    createdRequisitionId = data.id
    item1Id = data.items[0].id
    item2Id = data.items[1].id
  })

  it('3. 草稿状态可以编辑请购单', async () => {
    const { status, data } = await api('PUT', `/api/requisitions/${createdRequisitionId}`, {
      projectId: PROJECT_ID,
      reqDate: '2026-06-05',
      requester: '测试用户-已编辑',
      procurementCategory: '材料',
      demandType: '正常采购',
      items: [
        {
          materialName: '钢管',
          specification: 'DN150',
          material: '碳钢',
          quantity: 100,
          unit: '米',
          purpose: '双状态测试',
          status: '待采购',
        },
        {
          materialName: '法兰',
          specification: 'DN150 PN16',
          material: '碳钢',
          quantity: 50,
          unit: '个',
          purpose: '双状态测试',
          status: '待采购',
        },
      ],
    })
    expect(status).toBe(200)
    // 编辑后明细行ID会变（deleteMany + create），更新引用
    item1Id = data.items[0].id
    item2Id = data.items[1].id
  })

  it('4. 草稿请购单不能创建采购订单', async () => {
    const { status, data } = await api('POST', '/api/orders', {
      projectId: PROJECT_ID,
      orderNo: 'TEST-ORDER-SHOULD-FAIL',
      requisitionId: createdRequisitionId,
      purchaser: '测试',
      supplierId: createdPartnerId,
      supplier: '测试供应商-双状态',
      orderDate: '2026-06-05',
      deliveryDate: '2026-06-15',
      status: '草稿',
      items: [{
        requisitionItemId: item1Id,
        materialName: '钢管',
        specification: 'DN150',
        quantity: 60,
        unit: '米',
        unitPrice: 85,
        totalAmount: 5100,
      }],
    })
    expect(status).toBe(400)
    expect(data.error).toContain('已批准')
  })

  it('5. 通过状态API将请购单流程状态改为"已批准"', async () => {
    const { status, data } = await api('PUT', `/api/requisitions/${createdRequisitionId}/status`, {
      status: '已批准',
    })
    expect(status).toBe(200)
    expect(data.status).toBe('已批准')
  })

  it('6. 已批准的请购单不能再编辑', async () => {
    const { status } = await api('PUT', `/api/requisitions/${createdRequisitionId}`, {
      projectId: PROJECT_ID,
      reqDate: '2026-06-05',
      requester: '尝试修改',
      procurementCategory: '材料',
      demandType: '正常采购',
      items: [{
        materialName: '钢管',
        specification: 'DN150',
        material: '碳钢',
        quantity: 100,
        unit: '米',
        purpose: '应失败',
        status: '待采购',
      }],
    })
    expect(status).toBe(400)
  })

  it('7. 创建采购订单（默认流程状态=草稿，业务状态=待发货）', async () => {
    const { status, data } = await api('POST', '/api/orders', {
      projectId: PROJECT_ID,
      orderNo: 'TEST-ORDER-DUAL-STATUS-001',
      requisitionId: createdRequisitionId,
      purchaser: '测试采购员',
      deliveryAddress: '项目施工现场',
      supplierId: createdPartnerId,
      supplier: '测试供应商-双状态',
      supplierContact: '王五',
      supplierPhone: '13700137000',
      orderDate: '2026-06-05',
      deliveryDate: '2026-06-15',
      status: '草稿',
      items: [
        {
          requisitionItemId: item1Id,
          materialName: '钢管',
          specification: 'DN150',
          material: '碳钢',
          quantity: 60,
          unit: '米',
          unitPrice: 85,
          totalAmount: 5100,
        },
        {
          requisitionItemId: item2Id,
          materialName: '法兰',
          specification: 'DN150 PN16',
          material: '碳钢',
          quantity: 20,
          unit: '个',
          unitPrice: 120,
          totalAmount: 2400,
        },
      ],
    })
    if (status !== 201) console.log('ORDER CREATE ERROR:', JSON.stringify(data))
    expect(status).toBe(201)
    expect(data.status).toBe('草稿')
    expect(data.businessStatus).toBe('待发货')
    expect(data.totalAmount).toBe(7500)
    createdOrderId1 = data.id
  })

  it('8. 创建订单后请购单业务状态应变为"部分采购"，流程状态仍为"已批准"', async () => {
    const { status, data } = await api('GET', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
    expect(data.status).toBe('已批准')
    expect(data.businessStatus).toBe('部分采购')
  })

  it('9. 草稿订单可以删除', async () => {
    // 先创建再立即删除
    const { data: order } = await api('POST', '/api/orders', {
      projectId: PROJECT_ID,
      orderNo: 'TEST-ORDER-TO-DELETE',
      requisitionId: createdRequisitionId,
      purchaser: '测试',
      supplierId: createdPartnerId,
      supplier: '测试供应商-双状态',
      orderDate: '2026-06-05',
      deliveryDate: '2026-06-15',
      status: '草稿',
      items: [{
        requisitionItemId: item1Id,
        materialName: '钢管',
        specification: 'DN150',
        quantity: 10,
        unit: '米',
        unitPrice: 80,
        totalAmount: 800,
      }],
    })
    expect(order.id).toBeTruthy()
    // 草稿可以删除
    const { status } = await api('DELETE', `/api/orders/${order.id}`)
    expect(status).toBe(200)
  })

  it('10. 通过API更新订单流程状态为"已批准"', async () => {
    const { status, data } = await api('PUT', `/api/orders/${createdOrderId1}`, {
      status: '已批准',
    })
    expect(status).toBe(200)
    expect(data.status).toBe('已批准')
  })

  it('11. 已批准的订单不能再删除', async () => {
    const { status, data } = await api('DELETE', `/api/orders/${createdOrderId1}`)
    expect(status).toBe(400)
    expect(data.error).toContain('草稿')
  })

  it('12. 通过API更新订单业务状态为"已发货"', async () => {
    const { status, data } = await api('PUT', `/api/orders/${createdOrderId1}`, {
      businessStatus: '已发货',
    })
    expect(status).toBe(200)
    expect(data.businessStatus).toBe('已发货')
  })

  it('13. 补齐剩余数量创建第二个订单', async () => {
    const { status, data } = await api('POST', '/api/orders', {
      projectId: PROJECT_ID,
      orderNo: 'TEST-ORDER-DUAL-STATUS-002',
      requisitionId: createdRequisitionId,
      purchaser: '测试采购员',
      supplierId: createdPartnerId,
      supplier: '测试供应商-双状态',
      orderDate: '2026-06-05',
      deliveryDate: '2026-06-20',
      status: '草稿',
      items: [
        {
          requisitionItemId: item1Id,
          materialName: '钢管',
          specification: 'DN150',
          quantity: 40,
          unit: '米',
          unitPrice: 80,
          totalAmount: 3200,
        },
        {
          requisitionItemId: item2Id,
          materialName: '法兰',
          specification: 'DN150 PN16',
          quantity: 30,
          unit: '个',
          unitPrice: 110,
          totalAmount: 3300,
        },
      ],
    })
    expect(status).toBe(201)
    createdOrderId2 = data.id
  })

  it('14. 全部采购完成后请购单业务状态应为"关闭"', async () => {
    const { status, data } = await api('GET', `/api/requisitions/${createdRequisitionId}`)
    console.log('REQ STATUS:', data.status, 'BIZ:', data.businessStatus)
    // 也查看每个明细的已订购情况
    for (const item of data.items) {
      console.log('ITEM:', item.materialName, 'qty:', item.quantity, 'orderedQty:', item.orderItems?.reduce((s: number, o: any) => s + o.quantity, 0) ?? 'N/A')
    }
    expect(status).toBe(200)
    expect(data.status).toBe('已批准')
    expect(data.businessStatus).toBe('关闭')
  })

  it('15. 已关闭的请购单不能创建新订单', async () => {
    const { status } = await api('POST', '/api/orders', {
      projectId: PROJECT_ID,
      orderNo: 'TEST-ORDER-SHOULD-FAIL-CLOSED',
      requisitionId: createdRequisitionId,
      purchaser: '测试',
      supplierId: createdPartnerId,
      supplier: '测试供应商-双状态',
      orderDate: '2026-06-05',
      deliveryDate: '2026-06-20',
      status: '草稿',
      items: [{
        requisitionItemId: item1Id,
        materialName: '钢管',
        specification: 'DN150',
        quantity: 1,
        unit: '米',
        unitPrice: 80,
        totalAmount: 80,
      }],
    })
    expect(status).toBe(400)
  })

  it('16. 清理 - 删除草稿订单（订单2）', async () => {
    const { status } = await api('DELETE', `/api/orders/${createdOrderId2}`)
    expect(status).toBe(200)
  })

  it('17. 删除后请购单业务状态恢复为"部分采购"', async () => {
    const { status, data } = await api('GET', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
    expect(data.businessStatus).toBe('部分采购')
  })

  it('18. 清理 - 删除请购单（流程状态应可变回草稿后删除）', async () => {
    // 先将订单1改回草稿并删除
    await api('PUT', `/api/orders/${createdOrderId1}`, { status: '草稿' })
    await api('DELETE', `/api/orders/${createdOrderId1}`)
    // 再将流程状态改回草稿才能删除请购单
    await api('PUT', `/api/requisitions/${createdRequisitionId}/status`, {
      status: '草稿',
    })
    const { status } = await api('DELETE', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
  })

  it('19. 清理 - 删除合作方', async () => {
    const { status } = await api('DELETE', `/api/partners/${createdPartnerId}`)
    expect(status).toBe(200)
  })
})
