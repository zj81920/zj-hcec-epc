import { describe, it, expect } from 'vitest'
import { api, TEST_PROJECT_ID } from '../setup'

const PROJECT_ID = TEST_PROJECT_ID
let createdRequisitionId = ''
let itemId = ''
let createdOrderId = ''

describe('审批流程回归测试', () => {

  it('1. 创建草稿请购单', async () => {
    const { status, data } = await api('POST', '/api/requisitions', {
      projectId: PROJECT_ID,
      requester: '测试用户',
      procurementCategory: '材料',
      demandType: '正常采购',
      items: [
        {
          materialName: '测试钢管',
          specification: 'DN100',
          material: '碳钢',
          materialGrade: 'Q235B',
          quantity: 10,
          unit: '米',
          purpose: '审批流程测试',
        },
      ],
    })
    expect(status).toBe(201)
    expect(data.status).toBe('草稿')
    createdRequisitionId = data.id
    itemId = data.items[0].id
  })

  it('2. 草稿状态的请购单不能创建采购单', async () => {
    const { status, data } = await api('POST', '/api/orders', {
      projectId: PROJECT_ID,
      orderNo: 'TEST-APPROVAL-001',
      requisitionId: createdRequisitionId,
      purchaser: '测试',
      deliveryAddress: '测试地址',
      items: [
        {
          requisitionItemId: itemId,
          materialName: '测试钢管',
          specification: 'DN100',
          quantity: 10,
          unit: '米',
          unitPrice: 100,
          totalAmount: 1000,
        },
      ],
    })
    expect(status).toBe(400)
    expect(data.error).toContain('已批准')
    expect(data.currentStatus).toBe('草稿')
  })

  it('3. 模拟审批通过', async () => {
    const { status, data } = await api('PUT', `/api/requisitions/${createdRequisitionId}/approve`)
    expect(status).toBe(200)
    expect(data.status).toBe('已批准')
    expect(data.approved).toBe(true)
  })

  it('4. 已批准的请购单可以创建采购单', async () => {
    const { status, data } = await api('POST', '/api/orders', {
      projectId: PROJECT_ID,
      orderNo: 'TEST-APPROVAL-002',
      requisitionId: createdRequisitionId,
      purchaser: '测试',
      deliveryAddress: '测试地址',
      items: [
        {
          requisitionItemId: itemId,
          materialName: '测试钢管',
          specification: 'DN100',
          quantity: 10,
          unit: '米',
          unitPrice: 100,
          totalAmount: 1000,
        },
      ],
    })
    expect(status).toBe(201)
    createdOrderId = data.id
  })

  it('5. 重复审批应幂等', async () => {
    const { status, data } = await api('PUT', `/api/requisitions/${createdRequisitionId}/approve`)
    expect(status).toBe(200)
    expect(data.status).toBe('已批准')
  })

  it('6. 清理 - 删除采购单', async () => {
    const { status } = await api('DELETE', `/api/orders/${createdOrderId}`)
    expect(status).toBe(200)
  })

  it('7. 清理 - 删除请购单', async () => {
    const { status } = await api('DELETE', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
  })
})
