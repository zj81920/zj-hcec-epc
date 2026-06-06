import { describe, it, expect } from 'vitest'

const BASE = (process.env.TEST_BASE_URL || 'http://localhost:3000') + '/api/contracts'

describe('Contracts API', () => {
  it('GET /api/contracts/generate-no — 应返回符合格式的合同编号', async () => {
    const res = await fetch(`${BASE}/generate-no?projectId=test-project-id`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.contractNo).toMatch(/^PC-\d{8}-\d{3}$/)
  })

  it('GET /api/contracts/generate-no — 缺少 projectId 应返回 400', async () => {
    const res = await fetch(`${BASE}/generate-no`)
    expect(res.status).toBe(400)
  })

  it('GET /api/contracts/available-orders — 应返回数组', async () => {
    const res = await fetch(`${BASE}/available-orders?projectId=nonexistent-project`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('GET /api/contracts — 缺少 projectId 应返回 400', async () => {
    const res = await fetch(`${BASE}?`)
    expect(res.status).toBe(400)
  })

  it('GET /api/contracts — 应返回合同列表（数组）', async () => {
    const res = await fetch(`${BASE}?projectId=nonexistent-project`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })
})
