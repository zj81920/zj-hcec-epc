import { describe, it, expect } from 'vitest'
import { api } from '../setup'

describe('AI 参考价 API 测试', () => {

  // 3.1: POST /api/ai/reference-prices
  it('1. 空数据库返回空参考价', async () => {
    const { status, data } = await api('POST', '/api/ai/reference-prices', {
      projectId: 'test-project-123',
      items: [
        {
          requisitionItemId: 'item-1',
          materialName: '不锈钢无缝钢管',
          specification: 'DN50 SCH40',
          material: '304',
          materialGrade: '06Cr19Ni10',
        },
      ],
    })
    expect(status).toBe(200)
    expect(data.items).toBeDefined()
    expect(data.items.length).toBe(1)
    expect(data.items[0].requisitionItemId).toBe('item-1')
    // 空数据库应返回 null 值
    expect(data.items[0].confidence).toBe('none')
  })

  it('2. 无效参数应返回 400', async () => {
    const { status } = await api('POST', '/api/ai/reference-prices', {
      items: [],
    })
    expect(status).toBe(400)
  })
})
