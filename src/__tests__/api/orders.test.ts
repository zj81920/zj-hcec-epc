import { describe, it, expect } from 'vitest'
import { api, TEST_PROJECT_ID } from '../setup'

const PROJECT_ID = TEST_PROJECT_ID
let createdRequisitionId = ''
let createdPartnerId = ''
let item1Id = ''
let item2Id = ''
let createdOrderId1 = ''
let createdOrderId2 = ''

describe('采购订单 API 回归测试', () => {

  it('1. 准备测试数据 - 创建合作方（供应商）', async () => {
    const { status, data } = await api('POST', '/api/partners', {
      name: '测试供应商A',
      type: 'supplier',
      contactPerson: '王五',
      phone: '13700137000',
      status: '启用',
      remark: '订单回归测试用',
    })
    expect(status).toBe(201)
    expect(data.id).toBeTruthy()
    createdPartnerId = data.id
  })

  it('2. 准备测试数据 - 创建请购单（含两条明细）', async () => {
    const { status, data } = await api('POST', '/api/requisitions', {
      projectId: PROJECT_ID,
      reqDate: '2026-06-02',
      requester: '测试用户',
      procurementCategory: '材料',
      demandType: '正常采购',
      remark: '订单回归测试用请购单',
      items: [
        {
          materialName: '钢管',
          specification: 'DN150',
          material: '碳钢',
          materialGrade: 'Q235B',
          applicableStandard: 'GB/T 3091',
          quantity: 100,
          unit: '米',
          purpose: '订单测试-明细1',
          status: '待采购',
        },
        {
          materialName: '法兰',
          specification: 'DN150 PN16',
          material: '碳钢',
          materialGrade: '20#',
          applicableStandard: 'HG/T 20592',
          quantity: 50,
          unit: '个',
          purpose: '订单测试-明细2',
          status: '待采购',
        },
      ],
    })
    expect(status).toBe(201)
    expect(data.items).toHaveLength(2)
    expect(data.status).toBe('草稿')
    createdRequisitionId = data.id
    item1Id = data.items[0].id
    item2Id = data.items[1].id
  })

  it('2.5 审批请购单', async () => {
    const { status, data } = await api('PUT', `/api/requisitions/${createdRequisitionId}/approve`)
    expect(status).toBe(200)
    expect(data.status).toBe('已批准')
  })

  it('3. 创建采购订单（扩展字段）- POST /api/orders', async () => {
    const { status, data } = await api('POST', '/api/orders', {
      projectId: PROJECT_ID,
      orderNo: 'TEST-ORDER-001',
      requisitionId: createdRequisitionId,
      purchaser: '测试采购员',
      deliveryAddress: '项目施工现场仓库',
      attachments: [],
      supplierId: createdPartnerId,
      supplier: '测试供应商A',
      supplierContact: '王五',
      supplierPhone: '13700137000',
      orderDate: '2026-06-02',
      deliveryDate: '2026-06-15',
      status: '草稿',
      remark: '回归测试订单1',
      items: [
        {
          requisitionItemId: item1Id,
          materialName: '钢管',
          specification: 'DN150',
          materialCode: '',
          material: '碳钢',
          materialGrade: 'Q235B',
          applicableStandard: 'GB/T 3091',
          brand: '宝钢',
          purpose: '订单测试-明细1',
          quantity: 60,
          unit: '米',
          unitPrice: 85.5,
          totalAmount: 5130,
          requiredDate: null,
        },
        {
          requisitionItemId: item2Id,
          materialName: '法兰',
          specification: 'DN150 PN16',
          materialCode: '',
          material: '碳钢',
          materialGrade: '20#',
          applicableStandard: 'HG/T 20592',
          brand: '',
          purpose: '订单测试-明细2',
          quantity: 20,
          unit: '个',
          unitPrice: 120,
          totalAmount: 2400,
          requiredDate: null,
        },
      ],
    })
    expect(status).toBe(201)
    expect(data.orderNo).toBe('TEST-ORDER-001')
    expect(data.purchaser).toBe('测试采购员')
    expect(data.deliveryAddress).toBe('项目施工现场仓库')
    expect(data.supplierId).toBe(createdPartnerId)
    expect(data.supplier).toBe('测试供应商A')
    expect(data.supplierContact).toBe('王五')
    expect(data.supplierPhone).toBe('13700137000')
    expect(data.totalAmount).toBe(7530)
    expect(data.items).toHaveLength(2)
    expect(data.items[0].brand).toBe('宝钢')
    createdOrderId1 = data.id
  })

  it('4. 订单创建后请购单状态应为"部分采购"（基于已批准请购单）', async () => {
    const { status, data } = await api('GET', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
    expect(data.status).toBe('部分采购')
  })

  it('5. 创建第二个订单补齐剩余数量', async () => {
    const { status, data } = await api('POST', '/api/orders', {
      projectId: PROJECT_ID,
      orderNo: 'TEST-ORDER-002',
      requisitionId: createdRequisitionId,
      purchaser: '测试采购员2',
      deliveryAddress: '项目施工现场仓库B',
      attachments: [],
      supplierId: createdPartnerId,
      supplier: '测试供应商A',
      supplierContact: '王五',
      supplierPhone: '13700137000',
      orderDate: '2026-06-02',
      deliveryDate: '2026-06-20',
      status: '草稿',
      remark: '回归测试订单2-补齐',
      items: [
        {
          requisitionItemId: item1Id,
          materialName: '钢管',
          specification: 'DN150',
          materialCode: '',
          material: '碳钢',
          materialGrade: 'Q235B',
          applicableStandard: 'GB/T 3091',
          brand: '',
          purpose: '订单测试-明细1',
          quantity: 40,
          unit: '米',
          unitPrice: 80,
          totalAmount: 3200,
          requiredDate: null,
        },
        {
          requisitionItemId: item2Id,
          materialName: '法兰',
          specification: 'DN150 PN16',
          materialCode: '',
          material: '碳钢',
          materialGrade: '20#',
          applicableStandard: 'HG/T 20592',
          brand: '',
          purpose: '订单测试-明细2',
          quantity: 30,
          unit: '个',
          unitPrice: 110,
          totalAmount: 3300,
          requiredDate: null,
        },
      ],
    })
    expect(status).toBe(201)
    createdOrderId2 = data.id
  })

  it('6. 全部采购完成后请购单状态应为"已关闭"', async () => {
    const { status, data } = await api('GET', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
    expect(data.status).toBe('已关闭')
  })

  it('7. 删除订单触发数量回收 - DELETE /api/orders/[id]', async () => {
    const { status } = await api('DELETE', `/api/orders/${createdOrderId2}`)
    expect(status).toBe(200)
  })

  it('8. 删除订单后请购单状态应恢复为"部分采购"', async () => {
    const { status, data } = await api('GET', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
    expect(data.status).toBe('部分采购')
  })

  it('9. 删除第一个订单', async () => {
    const { status } = await api('DELETE', `/api/orders/${createdOrderId1}`)
    expect(status).toBe(200)
  })

  it('10. 所有订单删除后请购单状态应不变（仍为已批准）', async () => {
    const { status, data } = await api('GET', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
    expect(data.status).toBe('已批准')
  })

  it('11. 清理 - 删除请购单', async () => {
    const { status } = await api('DELETE', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
  })

  it('12. 清理 - 删除合作方', async () => {
    const { status } = await api('DELETE', `/api/partners/${createdPartnerId}`)
    expect(status).toBe(200)
  })
})
