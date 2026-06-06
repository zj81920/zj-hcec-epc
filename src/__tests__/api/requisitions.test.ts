import { describe, it, expect } from 'vitest'
import { api, TEST_PROJECT_ID } from '../setup'

const PROJECT_ID = TEST_PROJECT_ID
let createdRequisitionId = ''
let createdMaterialCode = ''

describe('请购单 API 回归测试', () => {

  it('1. 生成请购单号 - GET /api/requisitions/generate-no', async () => {
    const { status, data } = await api('GET', '/api/requisitions/generate-no')
    expect(status).toBe(200)
    expect(data.reqNo).toMatch(/^REQ-\d{8}-\d{3}$/)
  })

  it('2. 创建请购单（草稿）- POST /api/requisitions', async () => {
    const { status, data } = await api('POST', '/api/requisitions', {
      projectId: PROJECT_ID,
      reqDate: '2026-06-02',
      requester: '测试用户',
      procurementCategory: '材料',
      demandType: '正常采购',
      remark: '回归测试数据，可删除',
      items: [
        {
          materialName: '测试物料',
          specification: 'DN100',
          material: '碳钢',
          materialGrade: '20#',
          applicableStandard: 'GB/T 8163',
          quantity: 10,
          unit: '米',
          purpose: '回归测试',
          status: '待采购',
        },
      ],
    })
    expect(status).toBe(201)
    expect(data.reqNo).toMatch(/^REQ-\d{8}-\d{3}$/)
    expect(data.status).toBe('草稿')
    expect(data.items).toHaveLength(1)
    expect(data.items[0].materialCode).toMatch(/^MAT-\d{6}$/)
    createdRequisitionId = data.id
    createdMaterialCode = data.items[0].materialCode
  })

  it('3. 物料自动入库 - 物料应在 MaterialMaster 中存在', async () => {
    const { status, data } = await api('GET', `/api/materials/search?q=测试物料`)
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    const found = data.find((m: any) => m.materialName === '测试物料')
    expect(found).toBeTruthy()
    expect(found.materialCode).toBe(createdMaterialCode)
    expect(found.specification).toBe('DN100')
    expect(found.material).toBe('碳钢')
    expect(found.materialGrade).toBe('20#')
    expect(found.applicableStandard).toBe('GB/T 8163')
  })

  it('4. 物料去重 - 相同物料不会重复创建', async () => {
    const { status, data } = await api('POST', '/api/requisitions', {
      projectId: PROJECT_ID,
      reqDate: '2026-06-02',
      requester: '测试用户',
      procurementCategory: '材料',
      demandType: '正常采购',
      remark: '回归测试物料去重',
      items: [
        {
          materialName: '测试物料',
          specification: 'DN100',
          material: '碳钢',
          materialGrade: '20#',
          applicableStandard: 'GB/T 8163',
          quantity: 5,
          unit: '米',
          purpose: '回归测试',
          status: '待采购',
        },
      ],
    })
    expect(status).toBe(201)
    expect(data.items[0].materialCode).toBe(createdMaterialCode)
  })

  it('5. 搜索联想 - GET /api/materials/search', async () => {
    const { status, data } = await api('GET', '/api/materials/search?q=测试')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThanOrEqual(1)
    expect(data[0].materialName).toContain('测试')
    expect(data[0].materialCode).toBeTruthy()
  })

  it('6. 编辑草稿请购单 - PUT /api/requisitions/[id]', async () => {
    const { status, data } = await api('PUT', `/api/requisitions/${createdRequisitionId}`, {
      projectId: PROJECT_ID,
      reqDate: '2026-06-02',
      requester: '测试用户',
      procurementCategory: '设备',
      demandType: '紧急采购',
      remark: '已编辑-回归测试',
      items: [
        {
          materialName: '测试物料',
          specification: 'DN200',
          material: '不锈钢',
          materialGrade: '304',
          applicableStandard: 'GB/T 14976',
          quantity: 20,
          unit: '米',
          purpose: '回归测试-已编辑',
          status: '待采购',
        },
      ],
    })
    expect(status).toBe(200)
    expect(data.procurementCategory).toBe('设备')
    expect(data.demandType).toBe('紧急采购')
    expect(data.remark).toBe('已编辑-回归测试')
    expect(data.items[0].quantity).toBe(20)
  })

  it('7. 查询单条请购单 - GET /api/requisitions/[id]', async () => {
    const { status, data } = await api('GET', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
    expect(data.reqNo).toBeTruthy()
    expect(data.items).toBeDefined()
    expect(data.items.length).toBeGreaterThanOrEqual(1)
  })

  it('8. 删除草稿请购单 - DELETE /api/requisitions/[id]', async () => {
    const { status } = await api('DELETE', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(200)
  })

  it('9. 删除后查询应为 404', async () => {
    const { status } = await api('GET', `/api/requisitions/${createdRequisitionId}`)
    expect(status).toBe(404)
  })
})
