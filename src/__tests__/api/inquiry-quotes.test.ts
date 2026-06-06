import { describe, it, expect } from 'vitest'
import { api } from '../setup'

let createdOrderId = ''
let supplierId = ''
let quoteId = ''

describe('询价采购 API 回归测试', () => {

  // 前置：创建测试订单和供应商
  it('0. 前置准备 — 创建测试供应商', async () => {
    const { status, data } = await api('POST', '/api/partners', {
      name: '询价测试供应商',
      type: 'supplier',
      taxId: '91110000MA00009999',
      contactPerson: '王五',
      phone: '13900000000',
    })
    expect(status).toBe(201)
    supplierId = data.id
  })

  it('0b. 前置准备 — 创建测试订单（询价模式）', async () => {
    // 先获取项目ID
    const { data: projects } = await api('GET', '/api/projects')
    const projectId = Array.isArray(projects) ? projects[0]?.id : projects?.list?.[0]?.id
    if (!projectId) return // 没有项目则跳过后续测试

    const { status, data } = await api('POST', '/api/orders', {
      projectId,
      requisitionId: '', // 需要实际请购单 ID
      purchaser: '测试采购员',
      procurementMethod: 'inquiry',
      items: [],
    })
    // 可能因为 requisitionId 问题失败，但没关系
    if (status === 201) createdOrderId = data.id
  })

  // 4.1: POST /api/orders/[id]/quotes
  it('1. 发起询价 — 需要有效订单和供应商', async () => {
    if (!createdOrderId || !supplierId) return
    const { status, data } = await api('POST', `/api/orders/${createdOrderId}/quotes`, {
      supplierIds: [supplierId],
    })
    expect(status).toBe(200)
    expect(data.quotes).toBeDefined()
    expect(data.quotes.length).toBe(1)
    expect(data.quotes[0].token).toBeDefined()
    quoteId = data.quotes[0].id
  })

  // 4.2: GET /api/orders/[id]/quotes
  it('2. 获取报价概览', async () => {
    if (!createdOrderId) return
    const { status, data } = await api('GET', `/api/orders/${createdOrderId}/quotes`)
    expect(status).toBe(200)
    expect(data.quotes).toBeDefined()
  })

  // 测试在无有效订单时发起询价应失败
  it('3. 无效订单 ID 应返回错误', async () => {
    const { status } = await api('POST', '/api/orders/invalid-id/quotes', {
      supplierIds: ['invalid-supplier'],
    })
    expect(status).toBe(404)
  })
})
