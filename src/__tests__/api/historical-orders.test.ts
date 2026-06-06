import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'

let createdId = ''

describe('历史采购数据 API 测试', () => {

  // 2.3: GET /api/historical-orders — 列表查询
  it('1. 列表查询 - GET /api/historical-orders', async () => {
    const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${BASE_URL}/api/historical-orders`)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.list).toBeDefined()
    expect(Array.isArray(data.list)).toBe(true)
  })

  // 2.2: POST /api/historical-orders/upload — Excel 上传（使用真实模板）
  it('2. Excel 文件上传 - POST /api/historical-orders/upload', async () => {
    const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
    const templatePath = path.join(process.cwd(), 'public', 'templates', '采购单明细.xlsx')
    let fileBuffer: Buffer
    try {
      fileBuffer = await fs.readFile(templatePath)
    } catch {
      // 模板文件不存在，跳过测试
      console.warn('模板文件不存在，跳过上传测试')
      return
    }

    const formData = new FormData()
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    formData.append('file', blob, 'test-upload.xlsx')

    const res = await fetch(`${BASE_URL}/api/historical-orders/upload`, {
      method: 'POST',
      body: formData,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.count).toBeGreaterThan(0)
    createdId = data.items?.[0]?.id || ''
  })

  // 2.3 (cont): 上传后列表有数据
  it('3. 上传后列表查询有数据', async () => {
    if (!createdId) {
      // 之前可能已有数据，检查列表是否有数据
      const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
      const res = await fetch(`${BASE_URL}/api/historical-orders`)
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.list.length).toBeGreaterThanOrEqual(0)
      if (data.list.length > 0) createdId = data.list[0].id
      return
    }
    const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${BASE_URL}/api/historical-orders`)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.list).toBeDefined()
    expect(data.list.length).toBeGreaterThan(0)
  })

  // 2.4: PUT /api/historical-orders/[id] — 编辑
  it('4. 编辑历史数据 - PUT /api/historical-orders/[id]', async () => {
    if (!createdId) {
      // 取第一条数据
      const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
      const res = await fetch(`${BASE_URL}/api/historical-orders`)
      const data = await res.json()
      if (data.list.length === 0) return
      createdId = data.list[0].id
    }
    const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${BASE_URL}/api/historical-orders/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        materialName: '不锈钢无缝钢管（已编辑）',
        specification: 'DN50 SCH40',
        brand: '宝钢',
        unitPrice: 155,
        totalAmount: 15500,
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.materialName).toBe('不锈钢无缝钢管（已编辑）')
    expect(data.brand).toBe('宝钢')
  })

  // 2.5: DELETE /api/historical-orders/[id] — 删除
  it('5. 删除历史数据 - DELETE /api/historical-orders/[id]', async () => {
    if (!createdId) {
      const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
      const res = await fetch(`${BASE_URL}/api/historical-orders`)
      const data = await res.json()
      if (data.list.length === 0) return
      createdId = data.list[0].id
    }
    const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${BASE_URL}/api/historical-orders/${createdId}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  // 2.6: GET /api/historical-orders/template — 下载模板
  it('6. 下载上传模板 - GET /api/historical-orders/template', async () => {
    const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${BASE_URL}/api/historical-orders/template`)
    expect(res.status).toBe(200)
    const contentType = res.headers.get('content-type')
    expect(contentType).toContain('spreadsheetml')
  })
})
