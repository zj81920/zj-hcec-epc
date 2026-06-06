import { describe, it, expect } from 'vitest'
import { api } from '../setup'

let createdPartnerId = ''

describe('合作方 API 回归测试', () => {

  it('1. 合作方列表查询（空数据）- GET /api/partners', async () => {
    const { status, data } = await api('GET', '/api/partners')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })

  it('2. 创建合作方 - POST /api/partners', async () => {
    const { status, data } = await api('POST', '/api/partners', {
      name: '测试供应商有限公司',
      type: 'supplier',
      taxId: '91110000MA00000001',
      contactPerson: '张三',
      phone: '13800138000',
      email: 'zhangsan@test.com',
      address: '北京市朝阳区测试路1号',
      qualification: '一级',
      bankName: '中国银行',
      bankAccount: '6222020000000000001',
      rating: 5,
      status: '启用',
      remark: '回归测试数据，可删除',
    })
    expect(status).toBe(201)
    expect(data.name).toBe('测试供应商有限公司')
    expect(data.type).toBe('supplier')
    expect(data.rating).toBe(5)
    expect(data.status).toBe('启用')
    createdPartnerId = data.id
  })

  it('3. 合作方详情查询 - GET /api/partners/[id]', async () => {
    const { status, data } = await api('GET', `/api/partners/${createdPartnerId}`)
    expect(status).toBe(200)
    expect(data.name).toBe('测试供应商有限公司')
    expect(data.contactPerson).toBe('张三')
    expect(data.phone).toBe('13800138000')
    expect(data.bankName).toBe('中国银行')
  })

  it('4. 编辑合作方 - PUT /api/partners/[id]', async () => {
    const { status, data } = await api('PUT', `/api/partners/${createdPartnerId}`, {
      name: '测试供应商有限公司（已编辑）',
      type: 'subcontractor',
      taxId: '91110000MA00000001',
      contactPerson: '李四',
      phone: '13900139000',
      email: 'lisi@test.com',
      address: '上海市浦东新区',
      qualification: '特级',
      bankName: '工商银行',
      bankAccount: '6222020000000000002',
      rating: 4,
      status: '启用',
      remark: '已编辑',
    })
    expect(status).toBe(200)
    expect(data.name).toBe('测试供应商有限公司（已编辑）')
    expect(data.type).toBe('subcontractor')
    expect(data.contactPerson).toBe('李四')
    expect(data.qualification).toBe('特级')
    expect(data.rating).toBe(4)
  })

  it('5. 供应商下拉列表 - GET /api/partners/list?type=supplier', async () => {
    const { status, data } = await api('GET', '/api/partners/list?type=supplier')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })

  it('6. 按类型筛选 - GET /api/partners?type=subcontractor', async () => {
    const { status, data } = await api('GET', '/api/partners?type=subcontractor')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    const found = data.find((p: any) => p.id === createdPartnerId)
    expect(found).toBeTruthy()
  })

  it('7. 删除合作方 - DELETE /api/partners/[id]', async () => {
    const { status } = await api('DELETE', `/api/partners/${createdPartnerId}`)
    expect(status).toBe(200)
  })

  it('8. 删除后查询应为 404', async () => {
    const { status } = await api('GET', `/api/partners/${createdPartnerId}`)
    expect(status).toBe(404)
  })
})
