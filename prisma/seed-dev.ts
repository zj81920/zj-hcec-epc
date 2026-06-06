// 开发环境测试数据：专业和请购单
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const projectId = 'b405c026-7b07-4862-95e4-347a7f5b238f' // 惠州大亚湾石化扩建项目

  // 0. 清理 UUID 名称的供应商测试数据（name 存的是 UUID 而非实际名称）
  await prisma.partner.deleteMany({
    where: {
      type: 'supplier',
      name: { contains: '-' },  // UUID 格式包含连字符
    },
  })

  // 0.1 创建示例供应商
  const suppliers = [
    { name: '天阳工程设备有限公司', type: 'supplier', contactPerson: '赵总', phone: '13800001111', status: '启用', remark: '主营：泵、阀门、压力容器' },
    { name: '华东钢材贸易公司', type: 'supplier', contactPerson: '钱经理', phone: '13800002222', status: '启用', remark: '主营：碳钢、不锈钢管材板材' },
    { name: '恒通仪表电气', type: 'supplier', contactPerson: '孙工', phone: '13800003333', status: '启用', remark: '主营：仪表、电缆、电气设备' },
    { name: '建安建材供应商', type: 'supplier', contactPerson: '李经理', phone: '13800004444', status: '启用', remark: '主营：法兰、紧固件、密封件' },
  ]

  console.log('创建供应商数据...')
  for (const s of suppliers) {
    await prisma.partner.upsert({
      where: { id: '' }, // 不存在所以总是 create
      update: {},
      create: s,
    })
  }
  console.log('已清理供应商测试数据，请重新添加供应商')

  // 1. 创建专业
  const disciplines = [
    { name: '工艺', code: 'DISC-PROCESS', sortOrder: 1 },
    { name: '管道', code: 'DISC-PIPING', sortOrder: 2 },
    { name: '设备', code: 'DISC-EQUIP', sortOrder: 3 },
    { name: '仪表', code: 'DISC-INSTR', sortOrder: 4 },
    { name: '电气', code: 'DISC-ELEC', sortOrder: 5 },
    { name: '结构', code: 'DISC-STRUCT', sortOrder: 6 },
    { name: '建筑', code: 'DISC-ARCH', sortOrder: 7 },
    { name: '暖通', code: 'DISC-HVAC', sortOrder: 8 },
    { name: '给排水', code: 'DISC-WSD', sortOrder: 9 },
    { name: '总图', code: 'DISC-PLOT', sortOrder: 10 },
  ]

  console.log('创建专业数据...')
  for (const d of disciplines) {
    await prisma.discipline.upsert({
      where: { code: d.code },
      update: { name: d.name, sortOrder: d.sortOrder },
      create: d,
    })
  }

  // 2. 创建物料主数据
  const materials = [
    { materialCode: 'MAT-000001', materialName: '碳钢无缝钢管', specification: 'DN100 SCH40', material: '20#钢', materialGrade: 'GB/T 8163', applicableStandard: 'GB/T 8163-2018', unit: '米' },
    { materialCode: 'MAT-000002', materialName: '不锈钢法兰', specification: 'DN150 PN16', material: '304L', materialGrade: 'ASTM A182', applicableStandard: 'HG/T 20592-2009', unit: '片' },
    { materialCode: 'MAT-000003', materialName: '离心泵', specification: 'Q=200m³/h H=50m', material: '铸铁', materialGrade: 'HT250', applicableStandard: 'GB/T 5656-2008', unit: '台' },
    { materialCode: 'MAT-000004', materialName: '电力电缆', specification: 'YJV-0.6/1kV 3×95+1×50', material: '铜芯交联聚乙烯', materialGrade: 'GB/T 12706', applicableStandard: 'GB/T 12706.1-2020', unit: '米' },
    { materialCode: 'MAT-000005', materialName: '压力变送器', specification: '0-1.6MPa 4-20mA', material: '316L不锈钢', materialGrade: '', applicableStandard: 'JJG 882-2019', unit: '台' },
  ]

  console.log('创建物料数据...')
  for (const m of materials) {
    await prisma.materialMaster.upsert({
      where: { materialCode: m.materialCode },
      update: m,
      create: m,
    })
  }

  // 3. 创建请购单
  const reqNo1 = 'REQ-20260603-001'
  const reqNo2 = 'REQ-20260603-002'

  // 先删除旧的同名请购单（避免冲突）
  await prisma.requisitionItem.deleteMany({ where: { requisition: { reqNo: { in: [reqNo1, reqNo2] } } } })
  await prisma.purchaseRequisition.deleteMany({ where: { reqNo: { in: [reqNo1, reqNo2] } } })

  console.log('创建请购单...')

  await prisma.purchaseRequisition.create({
    data: {
      projectId,
      reqNo: reqNo1,
      reqDate: new Date('2026-06-03'),
      requester: '张工',
      status: '审批中',
      procurementCategory: '设备',
      demandType: '正常采购',
      discipline: '设备',
      remark: '乙烯装置核心设备采购',
      items: {
        create: [
          {
            materialCode: 'MAT-000003',
            materialName: '离心泵',
            specification: 'Q=200m³/h H=50m',
            material: '铸铁',
            materialGrade: 'HT250',
            applicableStandard: 'GB/T 5656-2008',
            quantity: 3,
            unit: '台',
            purpose: '循环水系统',
            requiredDate: new Date('2026-08-15'),
            status: '待采购',
          },
          {
            materialCode: 'MAT-000005',
            materialName: '压力变送器',
            specification: '0-1.6MPa 4-20mA',
            material: '316L不锈钢',
            materialGrade: '',
            applicableStandard: 'JJG 882-2019',
            quantity: 12,
            unit: '台',
            purpose: '反应器压力监测',
            requiredDate: new Date('2026-09-01'),
            status: '待采购',
          },
        ],
      },
    },
  })

  await prisma.purchaseRequisition.create({
    data: {
      projectId,
      reqNo: reqNo2,
      reqDate: new Date('2026-06-03'),
      requester: '李工',
      status: '草稿',
      procurementCategory: '材料',
      demandType: '正常采购',
      discipline: '管道',
      remark: '管道安装材料',
      items: {
        create: [
          {
            materialCode: 'MAT-000001',
            materialName: '碳钢无缝钢管',
            specification: 'DN100 SCH40',
            material: '20#钢',
            materialGrade: 'GB/T 8163',
            applicableStandard: 'GB/T 8163-2018',
            quantity: 500,
            unit: '米',
            purpose: '工艺管道安装',
            requiredDate: new Date('2026-07-20'),
            status: '待采购',
          },
          {
            materialCode: 'MAT-000002',
            materialName: '不锈钢法兰',
            specification: 'DN150 PN16',
            material: '304L',
            materialGrade: 'ASTM A182',
            applicableStandard: 'HG/T 20592-2009',
            quantity: 80,
            unit: '片',
            purpose: '管道连接',
            requiredDate: new Date('2026-07-20'),
            status: '待采购',
          },
          {
            materialCode: 'MAT-000004',
            materialName: '电力电缆',
            specification: 'YJV-0.6/1kV 3×95+1×50',
            material: '铜芯交联聚乙烯',
            materialGrade: 'GB/T 12706',
            applicableStandard: 'GB/T 12706.1-2020',
            quantity: 1200,
            unit: '米',
            purpose: '配电系统',
            requiredDate: new Date('2026-07-25'),
            status: '待采购',
          },
        ],
      },
    },
  })

  console.log('✅ 测试数据创建完成！')
  console.log('  - 10个专业')
  console.log('  - 5个物料主数据')
  console.log('  - 2个请购单（共计5个明细项）')
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
