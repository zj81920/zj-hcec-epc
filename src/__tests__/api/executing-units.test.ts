import { describe, it, expect } from 'vitest'

const BASE = (process.env.TEST_BASE_URL || 'http://localhost:3000') + '/api/executing-units'

describe('ExecutingUnits API', () => {
  let createdId: string

  it('POST /api/executing-units — 应创建执行单位', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '【API测试】执行单位-' + Date.now(),
        address: '测试地址',
        contactPerson: '李四',
        phone: '13900139000',
        bankName: '建设银行',
        bankAccount: '6543210987654321',
        taxId: '91234567MA1234',
      }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toContain('【API测试】')
    expect(data.id).toBeDefined()
    createdId = data.id
  })

  it('GET /api/executing-units — 应返回执行单位列表', async () => {
    const res = await fetch(BASE)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.some((u: any) => u.id === createdId)).toBe(true)
  })

  it('PUT /api/executing-units/:id — 应更新执行单位', async () => {
    const res = await fetch(`${BASE}/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13700137000' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.phone).toBe('13700137000')
  })

  it('DELETE /api/executing-units/:id — 应硬删除', async () => {
    const res = await fetch(`${BASE}/${createdId}`, { method: 'DELETE' })
    expect(res.status).toBe(200)

    const getRes = await fetch(`${BASE}/${createdId}`)
    expect(getRes.status).toBe(404)
  })
})
