import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();

  const project = await prisma.project.create({
    data: {
      name: '惠州大亚湾石化扩建项目',
      code: 'HY-DYW-2024',
      type: 'EPC',
      location: '广东省惠州市大亚湾石化区',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2025-12-31'),
      budget: 860000000,
      status: '施工',
      description: '惠州大亚湾石化区乙烯装置扩建工程，采用EPC总承包模式，涵盖设计、采购、施工全流程管理。',
    },
  });

  const milestones = [
    { name: '项目立项审批', plannedDate: new Date('2024-03-15'), weight: 5, status: '已完成', sortOrder: 1, actualDate: new Date('2024-03-10') },
    { name: '基础设计完成', plannedDate: new Date('2024-06-30'), weight: 15, status: '已完成', sortOrder: 2, actualDate: new Date('2024-06-25') },
    { name: '详细设计完成', plannedDate: new Date('2024-09-30'), weight: 15, status: '已完成', sortOrder: 3, actualDate: new Date('2024-09-20') },
    { name: '长周期设备采购完成', plannedDate: new Date('2024-11-30'), weight: 20, status: '已完成', sortOrder: 4, actualDate: new Date('2024-11-15') },
    { name: '土建施工完成', plannedDate: new Date('2025-04-30'), weight: 20, status: '进行中', sortOrder: 5 },
    { name: '设备安装完成', plannedDate: new Date('2025-08-31'), weight: 15, status: '未开始', sortOrder: 6 },
    { name: '联动试车', plannedDate: new Date('2025-10-31'), weight: 10, status: '未开始', sortOrder: 7 },
  ];

  for (const m of milestones) {
    await prisma.milestone.create({
      data: {
        ...m,
        projectId: project.id,
      },
    });
  }

  console.log(`✅ 种子数据创建完成，项目ID: ${project.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
