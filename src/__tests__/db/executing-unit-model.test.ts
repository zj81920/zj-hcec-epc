import { describe, it, expect, afterAll } from 'vitest'
import { db } from '@/lib/db'

// 执行单位（合同甲方）DB 模型测试
describe('ExecutingUnit Model', () => {
  afterAll(async () => {
    // 清理：所有带【测试】前缀的执行单位
    await db.executingUnit.deleteMany({
      where: { name: { startsWith: '【测试】' } },
    })
  })

  it('应能创建一个执行单位（包含所有字段）', async () => {
    const unit = await db.executingUnit.create({
      data: {
        name: '【测试】完整执行单位-' + Date.now(),
        address: '北京市朝阳区XX路100号',
        contactPerson: '张三',
        phone: '13800138000',
        bankName: '中国工商银行北京分行',
        bankAccount: '1101234567890123456',
        taxId: '91110000MA12345678',
        status: '启用',
      },
    })

    expect(unit.name).toContain('【测试】完整执行单位')
    expect(unit.address).toBe('北京市朝阳区XX路100号')
    expect(unit.contactPerson).toBe('张三')
    expect(unit.phone).toBe('13800138000')
    expect(unit.bankName).toBe('中国工商银行北京分行')
    expect(unit.bankAccount).toBe('1101234567890123456')
    expect(unit.taxId).toBe('91110000MA12345678')
    expect(unit.status).toBe('启用')
    expect(unit.id).toBeDefined()
    expect(unit.createdAt).toBeInstanceOf(Date)
  })

  it('单位名称应当唯一', async () => {
    const sameName = '【测试】唯一名称-' + Date.now()
    await db.executingUnit.create({ data: { name: sameName } })

    await expect(
      db.executingUnit.create({ data: { name: sameName } })
    ).rejects.toThrow()
  })

  it('应能按状态过滤', async () => {
    const suffix = '-' + Date.now()
    await db.executingUnit.create({
      data: { name: '【测试】启用单位' + suffix, status: '启用' },
    })
    await db.executingUnit.create({
      data: { name: '【测试】停用单位' + suffix, status: '停用' },
    })

    const enabledUnits = await db.executingUnit.findMany({
      where: {
        status: '启用',
        name: { startsWith: '【测试】' },
      },
    })

    expect(enabledUnits.some((u) => u.name === '【测试】启用单位' + suffix)).toBe(true)
    expect(enabledUnits.some((u) => u.name === '【测试】停用单位' + suffix)).toBe(false)
  })

  it('默认状态应为启用', async () => {
    const unit = await db.executingUnit.create({
      data: { name: '【测试】默认状态-' + Date.now() },
    })
    expect(unit.status).toBe('启用')
  })
})
