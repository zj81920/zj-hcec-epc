# EPC项目管理系统 MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建石油化工EPC项目管理系统MVP，覆盖项目管理、设计文件/联络单/会审、采购请购/订单、施工任务、施工资料、HSE（事故/检查/培训）七大模块共32个路由页面。

**Architecture:** Next.js 14 App Router 模块化单体架构，Prisma ORM + PostgreSQL，Tailwind CSS + shadcn/ui，Server Components 优先的渲染策略。

**Tech Stack:** Next.js 14, TypeScript (strict), React 18, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, react-hook-form, zod, lucide-react

---

## Phase 0: 项目脚手架（Phase 0）

### Task 0.1: 创建 Next.js 项目

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`, `postcss.config.mjs`

- [ ] **Step 1: 初始化 Next.js 项目**

```bash
cd /Users/zj81920/应用开发/zj-hcec-epc
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm
```

Expected: 项目创建成功，`npm run dev` 可启动。

- [ ] **Step 2: 安装核心依赖**

```bash
npm install prisma @prisma/client react-hook-form @hookform/resolvers zod lucide-react clsx tailwind-merge class-variance-authority
npm install -D @types/node
```

- [ ] **Step 3: 初始化 Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Expected: 创建 `prisma/schema.prisma` 和 `.env` 文件。

- [ ] **Step 4: 初始化 shadcn/ui**

```bash
npx shadcn@latest init -d
```

Expected: 创建 `components.json` 和 `src/lib/utils.ts`。

- [ ] **Step 5: 安装 shadcn/ui 基础组件**

```bash
npx shadcn@latest add button input textarea card table dialog select label form toast separator badge tabs
```

- [ ] **Step 6: 验证项目可运行**

```bash
npm run dev
```

Expected: `http://localhost:3000` 可访问。

### Task 0.2: 配置环境变量与项目结构

**Files:**
- Modify: `.env`
- Create: `.gitignore` 追加

- [ ] **Step 1: 配置 .env**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/epc_mvp"
STORAGE_PROVIDER="local"
STORAGE_PATH="./storage"
```

- [ ] **Step 2: 追加 .gitignore**

```
# storage
storage/
```

- [ ] **Step 3: 创建核心目录结构**

```bash
mkdir -p src/components/ui src/components/layout src/components/projects src/components/design src/components/procurement src/components/construction src/components/hse
mkdir -p src/lib/storage src/types
mkdir -p storage
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js project with Prisma, shadcn/ui, dependencies"
```

---

## Phase 1: 数据库模型（Phase 1）

### Task 1.1: 编写完整 Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 编写 Prisma Schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Project {
  id          String   @id @default(uuid())
  name        String
  code        String   @unique
  type        String   @default("EPC")
  location    String   @default("")
  startDate   DateTime
  endDate     DateTime
  budget      Float    @default(0)
  status      String   @default("前期")
  description String   @default("")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  milestones          Milestone[]
  designDocuments     DesignDocument[]
  designLiaisons      DesignLiaison[]
  designReviews       DesignReview[]
  purchaseRequisitions PurchaseRequisition[]
  procurementOrders   ProcurementOrder[]
  constructionTasks   ConstructionTask[]
  constructionDocs    ConstructionDoc[]
  hseIncidents        HSEIncident[]
  hseInspections      HSEInspection[]
  hseTrainings        HSETraining[]
}

model Milestone {
  id          String    @id @default(uuid())
  projectId   String
  name        String
  plannedDate DateTime
  actualDate  DateTime?
  weight      Int       @default(0)
  status      String    @default("未开始")
  sortOrder   Int       @default(0)

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model DesignDocument {
  id          String   @id @default(uuid())
  projectId   String
  fileName    String
  filePath    String
  fileSize    Int
  fileType    String   @default("pdf")
  discipline  String   @default("其他")
  category    String   @default("设计图纸")
  version     Int      @default(1)
  uploadedBy  String   @default("")
  uploadedAt  DateTime @default(now())

  project           Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  liaisonDocuments  LiaisonDocument[]
  reviewDocuments   ReviewDocument[]

  @@index([projectId])
}

model DesignLiaison {
  id           String   @id @default(uuid())
  projectId    String
  liaisonNo    String
  title        String
  sender       String   @default("")
  receiver     String   @default("")
  content      String   @default("")
  replyContent String   @default("")
  status       String   @default("待回复")
  createdAt    DateTime @default(now())
  repliedAt    DateTime?

  project     Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  liaisonDocs LiaisonDocument[]

  @@index([projectId])
}

model LiaisonDocument {
  liaisonId  String
  documentId String

  liaison  DesignLiaison  @relation(fields: [liaisonId], references: [id], onDelete: Cascade)
  document DesignDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@id([liaisonId, documentId])
}

model DesignReview {
  id           String   @id @default(uuid())
  projectId    String
  reviewNo     String
  title        String
  reviewDate   DateTime @default(now())
  participants String   @default("")
  conclusions  String   @default("")
  createdAt    DateTime @default(now())

  project     Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  reviewDocs  ReviewDocument[]

  @@index([projectId])
}

model ReviewDocument {
  reviewId   String
  documentId String

  review  DesignReview   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  document DesignDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@id([reviewId, documentId])
}

model PurchaseRequisition {
  id        String   @id @default(uuid())
  projectId String
  reqNo     String
  reqDate   DateTime @default(now())
  requester String   @default("")
  status    String   @default("草稿")
  remark    String   @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  items   RequisitionItem[]

  @@index([projectId])
}

model RequisitionItem {
  id             String @id @default(uuid())
  requisitionId  String
  materialName   String
  specification  String @default("")
  quantity       Float  @default(0)
  unit           String @default("")
  purpose        String @default("")
  status         String @default("待采购")

  requisition PurchaseRequisition @relation(fields: [requisitionId], references: [id], onDelete: Cascade)
  orderItems  OrderItem[]
}

model ProcurementOrder {
  id            String   @id @default(uuid())
  projectId     String
  orderNo       String
  requisitionId String
  supplier      String   @default("")
  orderDate     DateTime @default(now())
  deliveryDate  DateTime @default(now())
  totalAmount   Float    @default(0)
  status        String   @default("待确认")
  remark        String   @default("")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  project     Project              @relation(fields: [projectId], references: [id], onDelete: Cascade)
  requisition PurchaseRequisition  @relation(fields: [requisitionId], references: [id])
  items       OrderItem[]

  @@index([projectId])
}

model OrderItem {
  id                 String @id @default(uuid())
  orderId            String
  requisitionItemId  String
  materialName       String
  specification      String @default("")
  quantity           Float  @default(0)
  unit               String @default("")
  unitPrice          Float  @default(0)
  totalAmount        Float  @default(0)

  order            ProcurementOrder  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  requisitionItem  RequisitionItem   @relation(fields: [requisitionItemId], references: [id])
}

model ConstructionTask {
  id            String    @id @default(uuid())
  projectId     String
  taskName      String
  workArea      String    @default("")
  planStartDate DateTime
  planEndDate   DateTime
  actualEndDate DateTime?
  progress      Int       @default(0)
  contractor    String    @default("")
  status        String    @default("待施工")
  remark        String    @default("")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}

model ConstructionDoc {
  id          String   @id @default(uuid())
  projectId   String
  docNo       String
  docName     String
  category    String   @default("施工日志")
  relatedTask String   @default("")
  filePath    String
  fileSize    Int
  uploadedAt  DateTime @default(now())
  uploadedBy  String   @default("")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}

model HSEIncident {
  id                String   @id @default(uuid())
  projectId         String
  incidentNo        String
  incidentDate      DateTime @default(now())
  location          String   @default("")
  type              String   @default("其他")
  severity          String   @default("轻微")
  description       String   @default("")
  cause             String   @default("")
  correctiveAction  String   @default("")
  status            String   @default("处理中")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}

model HSEInspection {
  id             String   @id @default(uuid())
  projectId      String
  inspectionDate DateTime @default(now())
  inspector      String   @default("")
  area           String   @default("")
  findings       String   @default("")
  rectification  String   @default("")
  deadline       DateTime @default(now())
  status         String   @default("待整改")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}

model HSETraining {
  id               String   @id @default(uuid())
  projectId        String
  trainingDate     DateTime @default(now())
  topic            String
  trainer          String   @default("")
  location         String   @default("")
  participantCount Int      @default(0)
  participants     String   @default("")
  content          String   @default("")
  createdAt        DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}
```

- [ ] **Step 2: 运行数据库迁移**

```bash
npx prisma migrate dev --name init
```

Expected: 生成迁移文件，数据库表创建成功。

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations && git commit -m "feat: add complete Prisma schema with all EPC models"
```

### Task 1.2: 编写种子数据

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: 编写种子数据脚本**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.create({
    data: {
      name: '惠州大亚湾石化扩建项目',
      code: 'HCEC-2026-001',
      type: 'EPC',
      location: '广东省惠州市大亚湾石化区',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2027-06-30'),
      budget: 450000000,
      status: '设计',
      description: '大亚湾石化区乙烯装置扩建工程，建设内容包括裂解炉、压缩机组、分离单元等核心装置及配套公用工程。',
      milestones: {
        create: [
          { name: '项目立项', plannedDate: new Date('2026-01-15'), actualDate: new Date('2026-01-20'), weight: 5, status: '已完成', sortOrder: 1 },
          { name: '基础设计完成', plannedDate: new Date('2026-04-30'), actualDate: new Date('2026-05-08'), weight: 15, status: '已完成', sortOrder: 2 },
          { name: '详细设计完成', plannedDate: new Date('2026-09-30'), weight: 25, sortOrder: 3 },
          { name: '长周期设备采购', plannedDate: new Date('2026-10-31'), weight: 20, sortOrder: 4 },
          { name: '土建施工完成', plannedDate: new Date('2027-03-15'), weight: 20, sortOrder: 5 },
          { name: '机械竣工', plannedDate: new Date('2027-05-30'), weight: 10, sortOrder: 6 },
          { name: '整体竣工验收', plannedDate: new Date('2027-06-30'), weight: 5, sortOrder: 7 },
        ],
      },
    },
  });

  console.log('Seed data created:', project.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: 配置 package.json seed 脚本**

在 `package.json` 中添加：
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

- [ ] **Step 3: 运行种子数据**

```bash
npx prisma db seed
```

Expected: 控制台输出 "Seed data created: 惠州大亚湾石化扩建项目"。

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json && git commit -m "feat: add seed data with sample EPC project"
```

---

## Phase 2: 核心基础设施（Phase 2）

### Task 2.1: Prisma 客户端单例

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: 创建 Prisma 客户端单例**

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 2: 验证**

无需单独验证，将在后续列表页验证。

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts && git commit -m "feat: add Prisma client singleton"
```

### Task 2.2: 通用工具函数

**Files:**
- Create: `src/lib/utils.ts`（shadcn/ui 已生成，追加内容）

- [ ] **Step 1: 追加工具函数到 utils.ts**

在 shadcn/ui 生成的 `src/lib/utils.ts` 末尾追加：

```typescript
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export const PROJECT_STATUS_MAP: Record<string, string> = {
  '前期': 'bg-gray-100 text-gray-700',
  '设计': 'bg-blue-100 text-blue-700',
  '采购': 'bg-yellow-100 text-yellow-700',
  '施工': 'bg-orange-100 text-orange-700',
  '竣工': 'bg-green-100 text-green-700',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils.ts && git commit -m "feat: add utility functions for formatting"
```

### Task 2.3: Zod 校验 Schema

**Files:**
- Create: `src/lib/validations.ts`

- [ ] **Step 1: 创建校验 Schema**

```typescript
// src/lib/validations.ts
import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空').max(200),
  code: z.string().min(1, '项目编号不能为空').max(50),
  type: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string().min(1, '开始日期不能为空'),
  endDate: z.string().min(1, '结束日期不能为空'),
  budget: z.coerce.number().min(0).optional(),
  status: z.string().optional(),
  description: z.string().optional(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

export const designDocSchema = z.object({
  discipline: z.string().min(1),
  category: z.string().min(1),
});

export const liaisonSchema = z.object({
  liaisonNo: z.string().min(1, '联络单号不能为空'),
  title: z.string().min(1, '标题不能为空'),
  sender: z.string().optional(),
  receiver: z.string().optional(),
  content: z.string().min(1, '联络内容不能为空'),
  replyContent: z.string().optional(),
  status: z.string().optional(),
});

export const reviewSchema = z.object({
  reviewNo: z.string().min(1, '会审编号不能为空'),
  title: z.string().min(1, '标题不能为空'),
  reviewDate: z.string().min(1, '会审日期不能为空'),
  participants: z.string().optional(),
  conclusions: z.string().optional(),
});

export const requisitionSchema = z.object({
  reqNo: z.string().min(1, '请购单号不能为空'),
  reqDate: z.string().min(1, '请购日期不能为空'),
  requester: z.string().optional(),
  remark: z.string().optional(),
});

export const requisitionItemSchema = z.object({
  materialName: z.string().min(1, '物料名称不能为空'),
  specification: z.string().optional(),
  quantity: z.coerce.number().min(0.01, '数量必须大于0'),
  unit: z.string().min(1, '单位不能为空'),
  purpose: z.string().optional(),
});

export const orderSchema = z.object({
  orderNo: z.string().min(1, '订单号不能为空'),
  requisitionId: z.string().min(1, '请选择请购单'),
  supplier: z.string().min(1, '供应商不能为空'),
  orderDate: z.string().min(1, '下单日期不能为空'),
  deliveryDate: z.string().optional(),
  remark: z.string().optional(),
});

export const orderItemSchema = z.object({
  requisitionItemId: z.string().min(1),
  materialName: z.string().min(1),
  specification: z.string().optional(),
  quantity: z.coerce.number().min(0.01),
  unit: z.string().min(1),
  unitPrice: z.coerce.number().min(0),
});

export const constructionTaskSchema = z.object({
  taskName: z.string().min(1, '任务名称不能为空'),
  workArea: z.string().optional(),
  planStartDate: z.string().min(1, '计划开始日期不能为空'),
  planEndDate: z.string().min(1, '计划结束日期不能为空'),
  contractor: z.string().optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  status: z.string().optional(),
  remark: z.string().optional(),
});

export const constructionDocSchema = z.object({
  docNo: z.string().min(1, '资料编号不能为空'),
  docName: z.string().min(1, '资料名称不能为空'),
  category: z.string().min(1),
  relatedTask: z.string().optional(),
});

export const hseIncidentSchema = z.object({
  incidentNo: z.string().min(1, '事故编号不能为空'),
  incidentDate: z.string().min(1, '事故发生日期不能为空'),
  location: z.string().optional(),
  type: z.string().min(1),
  severity: z.string().min(1),
  description: z.string().min(1, '事件经过不能为空'),
  cause: z.string().optional(),
  correctiveAction: z.string().optional(),
  status: z.string().optional(),
});

export const hseInspectionSchema = z.object({
  inspectionDate: z.string().min(1, '检查日期不能为空'),
  inspector: z.string().min(1, '检查人不能为空'),
  area: z.string().min(1, '检查区域不能为空'),
  findings: z.string().min(1, '发现问题不能为空'),
  rectification: z.string().optional(),
  deadline: z.string().optional(),
  status: z.string().optional(),
});

export const hseTrainingSchema = z.object({
  trainingDate: z.string().min(1, '培训日期不能为空'),
  topic: z.string().min(1, '培训主题不能为空'),
  trainer: z.string().optional(),
  location: z.string().optional(),
  participantCount: z.coerce.number().min(0).optional(),
  participants: z.string().optional(),
  content: z.string().optional(),
});

export const milestoneSchema = z.object({
  name: z.string().min(1, '里程碑名称不能为空'),
  plannedDate: z.string().min(1, '计划日期不能为空'),
  weight: z.coerce.number().min(1).max(100),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations.ts && git commit -m "feat: add Zod validation schemas for all modules"
```

### Task 2.4: 文件存储抽象层

**Files:**
- Create: `src/lib/storage/types.ts`
- Create: `src/lib/storage/local.ts`
- Create: `src/lib/storage/index.ts`

- [ ] **Step 1: 创建存储接口类型**

```typescript
// src/lib/storage/types.ts
export interface StorageProvider {
  upload(file: File, path: string): Promise<{ url: string; path: string }>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
}
```

- [ ] **Step 2: 创建本地存储实现**

```typescript
// src/lib/storage/local.ts
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import type { StorageProvider } from './types';

const STORAGE_ROOT = process.env.STORAGE_PATH || './storage';

export class LocalStorage implements StorageProvider {
  async upload(file: File, path: string): Promise<{ url: string; path: string }> {
    const fullDir = join(STORAGE_ROOT, path);
    await mkdir(fullDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(fullDir, file.name);
    await writeFile(filePath, buffer);

    return { url: `/api/files/${path}/${file.name}`, path: filePath };
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(STORAGE_ROOT, path);
    try {
      await unlink(fullPath);
    } catch {
      // 文件不存在时忽略
    }
  }

  async getUrl(path: string): Promise<string> {
    return `/api/files/${path}`;
  }
}
```

- [ ] **Step 3: 创建存储统一导出**

```typescript
// src/lib/storage/index.ts
import { LocalStorage } from './local';
import type { StorageProvider } from './types';

let storageInstance: StorageProvider;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    storageInstance = new LocalStorage();
  }
  return storageInstance;
}

export type { StorageProvider };
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/storage/ && git commit -m "feat: add file storage abstraction layer with local implementation"
```

---

## Phase 3: 布局与导航（Phase 3）

### Task 3.1: 根布局

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: 更新根布局**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HCEC EPC项目管理系统',
  description: '石油化工EPC项目管理系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: 调整 globals.css**（替换默认内容）

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css && git commit -m "feat: add root layout with Toaster"
```

### Task 3.2: 顶部导航栏 (Topbar)

**Files:**
- Create: `src/components/layout/topbar.tsx`

- [ ] **Step 1: 创建 Topbar 组件**

```tsx
// src/components/layout/topbar.tsx
import Link from 'next/link';
import { Building2 } from 'lucide-react';

interface TopbarProps {
  projectName?: string;
}

export function Topbar({ projectName }: TopbarProps) {
  return (
    <header className="h-14 border-b bg-white flex items-center px-6 shrink-0">
      <Link href="/projects" className="flex items-center gap-2 font-semibold text-lg mr-8">
        <Building2 className="h-6 w-6 text-primary" />
        <span>HCEC EPC</span>
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          项目列表
        </Link>
      </nav>
      {projectName && (
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            {projectName}
          </span>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/topbar.tsx && git commit -m "feat: add Topbar navigation component"
```

### Task 3.3: 项目侧边栏 (Sidebar)

**Files:**
- Create: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: 创建 Sidebar 组件**

```tsx
// src/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PencilRuler, ShoppingCart, HardHat, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  projectId: string;
}

const navItems = [
  { href: '', label: '概览', icon: LayoutDashboard },
  { href: '/design', label: '设计', icon: PencilRuler },
  { href: '/procurement', label: '采购', icon: ShoppingCart },
  { href: '/construction', label: '施工', icon: HardHat },
  { href: '/hse', label: 'HSE', icon: ShieldCheck },
];

export function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  return (
    <aside className="w-52 border-r bg-white flex flex-col shrink-0">
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const href = item.href ? `${basePath}${item.href}` : basePath;
          const isActive = item.href
            ? pathname.startsWith(href)
            : pathname === basePath;

          return (
            <Link
              key={item.href || 'dashboard'}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx && git commit -m "feat: add Sidebar navigation component"
```

### Task 3.4: 项目布局壳

**Files:**
- Create: `src/app/projects/[id]/layout.tsx`

- [ ] **Step 1: 创建项目布局**

```tsx
// src/app/projects/[id]/layout.tsx
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Topbar } from '@/components/layout/topbar';
import { Sidebar } from '@/components/layout/sidebar';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const project = await db.project.findUnique({
    where: { id: params.id },
    select: { name: true },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="h-screen flex flex-col">
      <Topbar projectName={project.name} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projectId={params.id} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 not-found 页面**

创建 `src/app/projects/[id]/not-found.tsx`:
```tsx
import Link from 'next/link';

export default function ProjectNotFound() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">项目不存在</h2>
        <p className="text-muted-foreground mb-4">该项目可能已被删除或您没有访问权限。</p>
        <Link href="/projects" className="text-primary hover:underline">
          返回项目列表
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/projects/ && git commit -m "feat: add project layout shell with sidebar and topbar"
```

---

## Phase 4: 项目管理模块（Phase 4）

### Task 4.1: 首页重定向

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 重定向到项目列表**

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/projects');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx && git commit -m "feat: redirect home to project list"
```

### Task 4.2: 项目列表页

**Files:**
- Create: `src/app/projects/page.tsx`
- Create: `src/components/projects/project-card.tsx`

- [ ] **Step 1: ProjectCard 组件**

```tsx
// src/components/projects/project-card.tsx
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency, PROJECT_STATUS_MAP } from '@/lib/utils';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    code: string;
    status: string;
    startDate: Date;
    endDate: Date;
    budget: number;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <Badge className={PROJECT_STATUS_MAP[project.status] || ''}>
              {project.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{project.code}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">起止日期</span>
              <p>{formatDate(project.startDate)} - {formatDate(project.endDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">预算</span>
              <p className="font-medium">{formatCurrency(project.budget)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: 项目列表页**

```tsx
// src/app/projects/page.tsx
import Link from 'next/link';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProjectCard } from '@/components/projects/project-card';
import { Topbar } from '@/components/layout/topbar';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">项目管理</h1>
          <Link href="/projects/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建项目
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg mb-4">暂无项目</p>
            <Link href="/projects/new">
              <Button variant="outline">创建第一个项目</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: 验证**

```bash
npm run dev
# 访问 http://localhost:3000/projects
```

Expected: 显示种子数据中的项目卡片。

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/page.tsx src/components/projects/project-card.tsx && git commit -m "feat: add project list page with cards"
```

### Task 4.3: 新建项目页

**Files:**
- Create: `src/app/projects/new/page.tsx`
- Create: `src/components/projects/project-form.tsx`

- [ ] **Step 1: 项目表单组件**

```tsx
// src/components/projects/project-form.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, type ProjectFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export function ProjectForm() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      type: 'EPC',
      status: '前期',
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      toast({ title: '创建失败', description: '请检查输入信息', variant: 'destructive' });
      return;
    }

    const project = await response.json();
    toast({ title: '项目创建成功' });
    router.push(`/projects/${project.id}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>新建项目</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">项目名称 *</Label>
              <Input id="name" {...register('name')} placeholder="请输入项目名称" />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="code">项目编号 *</Label>
              <Input id="code" {...register('code')} placeholder="请输入项目编号" />
              {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="type">项目类型</Label>
              <Select defaultValue="EPC" onValueChange={(v) => setValue('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EPC">EPC</SelectItem>
                  <SelectItem value="E+P+C">E+P+C</SelectItem>
                  <SelectItem value="EPCM">EPCM</SelectItem>
                  <SelectItem value="PC">PC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">建设地点</Label>
              <Input id="location" {...register('location')} placeholder="请输入建设地点" />
            </div>
            <div>
              <Label htmlFor="startDate">开始日期 *</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="endDate">结束日期 *</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="budget">预算金额（元）</Label>
              <Input id="budget" type="number" {...register('budget')} placeholder="请输入预算金额" />
            </div>
            <div>
              <Label htmlFor="status">项目状态</Label>
              <Select defaultValue="前期" onValueChange={(v) => setValue('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="前期">前期</SelectItem>
                  <SelectItem value="设计">设计</SelectItem>
                  <SelectItem value="采购">采购</SelectItem>
                  <SelectItem value="施工">施工</SelectItem>
                  <SelectItem value="竣工">竣工</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">项目描述</Label>
            <Textarea id="description" {...register('description')} placeholder="请输入项目描述" rows={4} />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存项目'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>取消</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 新建项目页面**

```tsx
// src/app/projects/new/page.tsx
import { ProjectForm } from '@/components/projects/project-form';
import { Topbar } from '@/components/layout/topbar';

export default function NewProjectPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <ProjectForm />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: 创建项目 API 路由**

```typescript
// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = projectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const data = parsed.data;

  const project = await db.project.create({
    data: {
      name: data.name,
      code: data.code,
      type: data.type || 'EPC',
      location: data.location || '',
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      budget: data.budget || 0,
      status: data.status || '前期',
      description: data.description || '',
    },
  });

  return NextResponse.json(project, { status: 201 });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/new/ src/components/projects/project-form.tsx src/app/api/projects/ && git commit -m "feat: add create project page with form and API"
```

### Task 4.4: 项目编辑页

**Files:**
- Create: `src/app/projects/[id]/edit/page.tsx`
- Create: `src/app/api/projects/[id]/route.ts`

- [ ] **Step 1: 编辑项目页面**

```tsx
// src/app/projects/[id]/edit/page.tsx
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ProjectEditForm } from '@/components/projects/project-edit-form';

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const project = await db.project.findUnique({ where: { id: params.id } });

  if (!project) {
    notFound();
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">编辑项目信息</h2>
      <ProjectEditForm project={project} />
    </div>
  );
}
```

- [ ] **Step 2: 编辑表单组件**

```tsx
// src/components/projects/project-edit-form.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, type ProjectFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

interface ProjectEditFormProps {
  project: {
    id: string;
    name: string;
    code: string;
    type: string;
    location: string;
    startDate: Date;
    endDate: Date;
    budget: number;
    status: string;
    description: string;
  };
}

export function ProjectEditForm({ project }: ProjectEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project.name,
      code: project.code,
      type: project.type,
      location: project.location,
      startDate: project.startDate.toISOString().split('T')[0],
      endDate: project.endDate.toISOString().split('T')[0],
      budget: project.budget,
      status: project.status,
      description: project.description,
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      toast({ title: '更新失败', description: '请检查输入信息', variant: 'destructive' });
      return;
    }

    toast({ title: '项目更新成功' });
    router.push(`/projects/${project.id}`);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader><CardTitle>编辑项目</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">项目名称 *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="code">项目编号 *</Label>
              <Input id="code" {...register('code')} />
              {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="type">项目类型</Label>
              <Select defaultValue={project.type} onValueChange={(v) => setValue('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EPC">EPC</SelectItem>
                  <SelectItem value="E+P+C">E+P+C</SelectItem>
                  <SelectItem value="EPCM">EPCM</SelectItem>
                  <SelectItem value="PC">PC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">建设地点</Label>
              <Input id="location" {...register('location')} />
            </div>
            <div>
              <Label htmlFor="startDate">开始日期 *</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="endDate">结束日期 *</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="budget">预算金额（元）</Label>
              <Input id="budget" type="number" {...register('budget')} />
            </div>
            <div>
              <Label htmlFor="status">项目状态</Label>
              <Select defaultValue={project.status} onValueChange={(v) => setValue('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="前期">前期</SelectItem>
                  <SelectItem value="设计">设计</SelectItem>
                  <SelectItem value="采购">采购</SelectItem>
                  <SelectItem value="施工">施工</SelectItem>
                  <SelectItem value="竣工">竣工</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">项目描述</Label>
            <Textarea id="description" {...register('description')} rows={4} />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存修改'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>取消</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: 项目 API 路由（PUT + DELETE）**

```typescript
// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectSchema } from '@/lib/validations';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const parsed = projectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const data = parsed.data;

  const project = await db.project.update({
    where: { id: params.id },
    data: {
      name: data.name,
      code: data.code,
      type: data.type || 'EPC',
      location: data.location || '',
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      budget: data.budget || 0,
      status: data.status || '前期',
      description: data.description || '',
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.project.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/[id]/edit/ src/components/projects/project-edit-form.tsx src/app/api/projects/[id]/route.ts && git commit -m "feat: add project edit page with update/delete API"
```

---

## Phase 5: 仪表盘（Phase 5）

### Task 5.1: 项目仪表盘页

**Files:**
- Create: `src/app/projects/[id]/page.tsx`

- [ ] **Step 1: 创建仪表盘页**

```tsx
// src/app/projects/[id]/page.tsx
import Link from 'next/link';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, FileText, ShoppingCart, ClipboardList, HardHat, ShieldCheck } from 'lucide-react';
import { formatDate, formatCurrency, PROJECT_STATUS_MAP } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProjectDashboard({ params }: { params: { id: string } }) {
  const project = await db.project.findUnique({
    where: { id: params.id },
    include: {
      milestones: { orderBy: { sortOrder: 'asc' } },
      _count: {
        select: {
          designDocuments: true,
          purchaseRequisitions: true,
          procurementOrders: true,
          constructionTasks: true,
          hseIncidents: true,
        },
      },
    },
  });

  if (!project) return null;

  const completedMilestones = project.milestones.filter((m) => m.status === '已完成').length;
  const totalWeight = project.milestones.reduce((sum, m) => sum + m.weight, 0);
  const completedWeight = project.milestones
    .filter((m) => m.status === '已完成')
    .reduce((sum, m) => sum + m.weight, 0);
  const overallProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  const quickLinks = [
    { href: `/projects/${project.id}/design`, label: '设计文件库', icon: FileText, count: project._count.designDocuments },
    { href: `/projects/${project.id}/procurement/requisitions`, label: '请购单', icon: ClipboardList, count: project._count.purchaseRequisitions },
    { href: `/projects/${project.id}/procurement/orders`, label: '采购订单', icon: ShoppingCart, count: project._count.procurementOrders },
    { href: `/projects/${project.id}/construction`, label: '施工任务', icon: HardHat, count: project._count.constructionTasks },
    { href: `/projects/${project.id}/hse`, label: 'HSE管理', icon: ShieldCheck, count: project._count.hseIncidents },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.code}</p>
        </div>
        <Link href={`/projects/${project.id}/edit`}>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            编辑项目
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">项目类型</dt><dd>{project.type}</dd>
              <dt className="text-muted-foreground">建设地点</dt><dd>{project.location}</dd>
              <dt className="text-muted-foreground">起止日期</dt>
              <dd>{formatDate(project.startDate)} - {formatDate(project.endDate)}</dd>
              <dt className="text-muted-foreground">预算金额</dt>
              <dd className="font-medium">{formatCurrency(project.budget)}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">整体进度</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
                    className="text-primary"
                    strokeDasharray={`${overallProgress * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">{overallProgress}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  里程碑完成 {completedMilestones}/{project.milestones.length}
                </p>
                <Badge className={PROJECT_STATUS_MAP[project.status] || ''}>
                  {project.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">里程碑</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {project.milestones.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shrink-0 ${m.status === '已完成' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    计划: {formatDate(m.plannedDate)}
                    {m.actualDate && ` | 实际: ${formatDate(m.actualDate)}`}
                  </p>
                </div>
                <Badge variant={m.status === '已完成' ? 'default' : 'secondary'}>
                  {m.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">快捷入口</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <link.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium">{link.label}</p>
                    <p className="text-xs text-muted-foreground">{link.count} 项</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: 验证**

```bash
npm run dev
# 访问 http://localhost:3000/projects/{seed-project-id}
```

Expected: 仪表盘显示项目信息、进度环形图、里程碑、快捷入口。

- [ ] **Step 3: Commit**

```bash
git add src/app/projects/[id]/page.tsx && git commit -m "feat: add project dashboard with progress, milestones, quick links"
```

---

## Phase 6: 设计模块（Phase 6）

### Task 6.1: 设计文件库列表页

**Files:**
- Create: `src/app/projects/[id]/design/page.tsx`

- [ ] **Step 1: 创建设计文件列表页**

```tsx
// src/app/projects/[id]/design/page.tsx
import Link from 'next/link';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus } from 'lucide-react';
import { formatDate, formatFileSize } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const DISCIPLINES = ['工艺', '配管', '结构', '电气', '仪表', '其他'];
const CATEGORIES = ['设计图纸', '技术规格书', '计算书', '其他'];

export default async function DesignDocumentsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { discipline?: string; category?: string };
}) {
  const discipline = searchParams?.discipline;
  const category = searchParams?.category;

  const where: Record<string, unknown> = { projectId: params.id };
  if (discipline && discipline !== 'all') where.discipline = discipline;
  if (category && category !== 'all') where.category = category;

  const documents = await db.designDocument.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">设计文件库</h2>
        <div className="flex gap-2">
          <Link href={`/projects/${params.id}/design/upload`}>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              上传文件
            </Button>
          </Link>
          <Link href={`/projects/${params.id}/design/liaisons`}>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              联络单
            </Button>
          </Link>
          <Link href={`/projects/${params.id}/design/reviews`}>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              会审记录
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Link href={`?${category ? `category=${category}&` : ''}discipline=all`}>
          <Badge variant={!discipline || discipline === 'all' ? 'default' : 'outline'}>全部专业</Badge>
        </Link>
        {DISCIPLINES.map((d) => (
          <Link key={d} href={`?${category ? `category=${category}&` : ''}discipline=${d}`}>
            <Badge variant={discipline === d ? 'default' : 'outline'}>{d}</Badge>
          </Link>
        ))}
        <span className="mx-2 text-border">|</span>
        {CATEGORIES.map((c) => (
          <Link key={c} href={`?${discipline ? `discipline=${discipline}&` : ''}category=${c}`}>
            <Badge variant={category === c ? 'default' : 'outline'}>{c}</Badge>
          </Link>
        ))}
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10 text-muted-foreground">
            暂无设计文件，请上传
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{doc.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {doc.discipline} · {doc.category} · v{doc.version} · {formatFileSize(doc.fileSize)}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(doc.uploadedAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/projects/[id]/design/page.tsx && git commit -m "feat: add design document library with discipline/category filter"
```

### Task 6.2: 设计文件上传页

**Files:**
- Create: `src/app/projects/[id]/design/upload/page.tsx`

- [ ] **Step 1: 创建上传页面**

```tsx
// src/app/projects/[id]/design/upload/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Upload } from 'lucide-react';

const DISCIPLINES = ['工艺', '配管', '结构', '电气', '仪表', '其他'];
const CATEGORIES = ['设计图纸', '技术规格书', '计算书', '其他'];

export default function UploadDesignDocPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [discipline, setDiscipline] = useState('工艺');
  const [category, setCategory] = useState('设计图纸');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', params.id as string);
    formData.append('discipline', discipline);
    formData.append('category', category);

    const res = await fetch('/api/design-documents/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      toast({ title: '上传失败', variant: 'destructive' });
      setUploading(false);
      return;
    }

    toast({ title: '上传成功' });
    router.push(`/projects/${params.id}/design`);
    router.refresh();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">上传设计文件</h2>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>专业</Label>
            <Select value={discipline} onValueChange={setDiscipline}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISCIPLINES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>选择文件</Label>
            <Input ref={fileInputRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && <p className="text-sm text-muted-foreground mt-1">已选择: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleUpload} disabled={!file || uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? '上传中...' : '上传'}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>取消</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: 创建文件上传 API**

```typescript
// src/app/api/design-documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const projectId = formData.get('projectId') as string;
  const discipline = (formData.get('discipline') as string) || '其他';
  const category = (formData.get('category') as string) || '设计图纸';

  if (!file || !projectId) {
    return NextResponse.json({ error: '缺少必要信息' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || '';
  const uuid = randomUUID();
  const safeName = `${uuid}.${ext}`;
  const storagePath = join('storage', 'projects', projectId, 'design', category, discipline);
  await mkdir(storagePath, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(join(storagePath, safeName), Buffer.from(bytes));

  const doc = await db.designDocument.create({
    data: {
      projectId,
      fileName: file.name,
      filePath: join(storagePath, safeName),
      fileSize: file.size,
      fileType: ext,
      discipline,
      category,
      uploadedBy: 'current-user',
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/projects/[id]/design/upload/ src/app/api/design-documents/ && git commit -m "feat: add design document upload page and API"
```

### Task 6.3: 设计联络单列表 + 新建 + 详情页

**Files:**
- Create: `src/app/projects/[id]/design/liaisons/page.tsx`
- Create: `src/app/projects/[id]/design/liaisons/new/page.tsx`
- Create: `src/app/projects/[id]/design/liaisons/[liaId]/page.tsx`
- Create: `src/app/api/design-liaisons/route.ts`
- Create: `src/app/api/design-liaisons/[id]/route.ts`

- [ ] **Step 1: 联络单列表页**

```tsx
// src/app/projects/[id]/design/liaisons/page.tsx
import Link from 'next/link';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function LiaisonsPage({ params }: { params: { id: string } }) {
  const liaisons = await db.designLiaison.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">设计联络单</h2>
        <Link href={`/projects/${params.id}/design/liaisons/new`}>
          <Button><Plus className="h-4 w-4 mr-2" />新建联络单</Button>
        </Link>
      </div>
      {liaisons.length === 0 ? (
        <Card><CardContent className="text-center py-10 text-muted-foreground">暂无联络单</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {liaisons.map((l) => (
            <Link key={l.id} href={`/projects/${params.id}/design/liaisons/${l.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{l.liaisonNo} - {l.title}</p>
                    <p className="text-sm text-muted-foreground">{l.sender} → {l.receiver}</p>
                  </div>
                  <Badge variant={l.status === '已回复' ? 'default' : l.status === '已关闭' ? 'secondary' : 'outline'}>
                    {l.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 新建联络单表单（Client Component）**

```tsx
// src/app/projects/[id]/design/liaisons/new/page.tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { liaisonSchema, type z } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

type LiaisonForm = z.infer<typeof liaisonSchema>;

export default function NewLiaisonPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LiaisonForm>({
    resolver: zodResolver(liaisonSchema),
  });

  const onSubmit = async (data: LiaisonForm) => {
    const res = await fetch('/api/design-liaisons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, projectId: params.id }),
    });
    if (!res.ok) { toast({ title: '创建失败', variant: 'destructive' }); return; }
    toast({ title: '联络单创建成功' });
    router.push(`/projects/${params.id}/design/liaisons`);
    router.refresh();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">新建设计联络单</h2>
      <Card>
        <CardHeader><CardTitle>联络单信息</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>联络单号 *</Label>
                <Input {...register('liaisonNo')} />
                {errors.liaisonNo && <p className="text-sm text-red-500">{errors.liaisonNo.message}</p>}
              </div>
              <div>
                <Label>标题 *</Label>
                <Input {...register('title')} />
                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
              </div>
              <div>
                <Label>发出方</Label>
                <Input {...register('sender')} />
              </div>
              <div>
                <Label>接收方</Label>
                <Input {...register('receiver')} />
              </div>
            </div>
            <div>
              <Label>联络内容 *</Label>
              <Textarea {...register('content')} rows={5} />
              {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting}>保存</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>取消</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: 联络单详情页**

```tsx
// src/app/projects/[id]/design/liaisons/[liaId]/page.tsx
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default async function LiaisonDetailPage({ params }: { params: { id: string; liaId: string } }) {
  const liaison = await db.designLiaison.findUnique({ where: { id: params.liaId } });
  if (!liaison) notFound();

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">{liaison.liaisonNo} - {liaison.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">联络信息</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">发出方</dt><dd>{liaison.sender}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">接收方</dt><dd>{liaison.receiver}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">状态</dt><dd><Badge>{liaison.status}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">创建时间</dt><dd>{formatDate(liaison.createdAt)}</dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">联络内容</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{liaison.content}</p></CardContent>
        </Card>
        {liaison.replyContent && (
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-base">回复内容</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap">{liaison.replyContent}</p></CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 联络单 API**

```typescript
// src/app/api/design-liaisons/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { liaisonSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = liaisonSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const data = parsed.data;
  const liaison = await db.designLiaison.create({
    data: {
      projectId: body.projectId,
      liaisonNo: data.liaisonNo,
      title: data.title,
      sender: data.sender || '',
      receiver: data.receiver || '',
      content: data.content,
    },
  });
  return NextResponse.json(liaison, { status: 201 });
}
```

```typescript
// src/app/api/design-liaisons/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const liaison = await db.designLiaison.update({
    where: { id: params.id },
    data: {
      replyContent: body.replyContent || '',
      status: body.replyContent ? '已回复' : body.status,
      repliedAt: body.replyContent ? new Date() : undefined,
    },
  });
  return NextResponse.json(liaison);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/projects/[id]/design/liaisons/ src/app/api/design-liaisons/ && git commit -m "feat: add design liaison CRUD pages and API"
```

### Task 6.4: 设计会审记录（结构同联络单，CRUD 模式复用）

**Files:**
- Create: `src/app/projects/[id]/design/reviews/page.tsx`
- Create: `src/app/projects/[id]/design/reviews/new/page.tsx`
- Create: `src/app/projects/[id]/design/reviews/[revId]/page.tsx`
- Create: `src/app/api/design-reviews/route.ts`

- [ ] **Step 1: 会审记录列表页**

```tsx
// src/app/projects/[id]/design/reviews/page.tsx
import Link from 'next/link';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage({ params }: { params: { id: string } }) {
  const reviews = await db.designReview.findMany({
    where: { projectId: params.id },
    orderBy: { reviewDate: 'desc' },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">设计会审记录</h2>
        <Link href={`/projects/${params.id}/design/reviews/new`}>
          <Button><Plus className="h-4 w-4 mr-2" />新建会审记录</Button>
        </Link>
      </div>
      {reviews.length === 0 ? (
        <Card><CardContent className="text-center py-10 text-muted-foreground">暂无会审记录</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <Link key={r.id} href={`/projects/${params.id}/design/reviews/${r.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{r.reviewNo} - {r.title}</p>
                      <p className="text-sm text-muted-foreground">会审日期: {formatDate(r.reviewDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 新建会审记录页**

```tsx
// src/app/projects/[id]/design/reviews/new/page.tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reviewSchema, type z } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

type ReviewForm = z.infer<typeof reviewSchema>;

export default function NewReviewPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
  });

  const onSubmit = async (data: ReviewForm) => {
    const res = await fetch('/api/design-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, projectId: params.id }),
    });
    if (!res.ok) { toast({ title: '创建失败', variant: 'destructive' }); return; }
    toast({ title: '会审记录创建成功' });
    router.push(`/projects/${params.id}/design/reviews`);
    router.refresh();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">新建设计会审记录</h2>
      <Card>
        <CardHeader><CardTitle>会审信息</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>会审编号 *</Label>
                <Input {...register('reviewNo')} />
                {errors.reviewNo && <p className="text-sm text-red-500">{errors.reviewNo.message}</p>}
              </div>
              <div>
                <Label>会审日期 *</Label>
                <Input type="date" {...register('reviewDate')} />
                {errors.reviewDate && <p className="text-sm text-red-500">{errors.reviewDate.message}</p>}
              </div>
            </div>
            <div>
              <Label>标题 *</Label>
              <Input {...register('title')} />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>
            <div>
              <Label>参会人员</Label>
              <Input {...register('participants')} placeholder="多人用逗号分隔" />
            </div>
            <div>
              <Label>会审结论</Label>
              <Textarea {...register('conclusions')} rows={4} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting}>保存</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>取消</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: 会审记录详情页 + API**

```tsx
// src/app/projects/[id]/design/reviews/[revId]/page.tsx
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default async function ReviewDetailPage({ params }: { params: { id: string; revId: string } }) {
  const review = await db.designReview.findUnique({ where: { id: params.revId } });
  if (!review) notFound();

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">{review.reviewNo} - {review.title}</h2>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">会审日期</dt><dd>{formatDate(review.reviewDate)}</dd>
              <dt className="text-muted-foreground">参会人员</dt><dd>{review.participants}</dd>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">会审结论</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{review.conclusions}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
```

```typescript
// src/app/api/design-reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviewSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors }, { status: 400 });

  const data = parsed.data;
  const review = await db.designReview.create({
    data: {
      projectId: body.projectId,
      reviewNo: data.reviewNo,
      title: data.title,
      reviewDate: new Date(data.reviewDate),
      participants: data.participants || '',
      conclusions: data.conclusions || '',
    },
  });
  return NextResponse.json(review, { status: 201 });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/[id]/design/reviews/ src/app/api/design-reviews/ && git commit -m "feat: add design review CRUD pages and API"
```

---

## Phase 7: 采购模块（Phase 7）

### Task 7.1: 请购单列表 + 新建（含明细表）+ 详情

**Files:**
- Create: `src/app/projects/[id]/procurement/page.tsx`
- Create: `src/app/projects/[id]/procurement/requisitions/page.tsx`
- Create: `src/app/projects/[id]/procurement/requisitions/new/page.tsx`
- Create: `src/app/projects/[id]/procurement/requisitions/[reqId]/page.tsx`
- Create: `src/app/api/requisitions/route.ts`

- [ ] **Step 1: 采购入口页**

```tsx
// src/app/projects/[id]/procurement/page.tsx
import { redirect } from 'next/navigation';

export default function ProcurementPage({ params }: { params: { id: string } }) {
  redirect(`/projects/${params.id}/procurement/requisitions`);
}
```

- [ ] **Step 2: 请购单列表页**

```tsx
// src/app/projects/[id]/procurement/requisitions/page.tsx
import Link from 'next/link';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function RequisitionsPage({ params }: { params: { id: string } }) {
  const requisitions = await db.purchaseRequisition.findMany({
    where: { projectId: params.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">请购单</h2>
        <div className="flex gap-2">
          <Link href={`/projects/${params.id}/procurement/orders`}>
            <Button variant="outline">采购订单</Button>
          </Link>
          <Link href={`/projects/${params.id}/procurement/requisitions/new`}>
            <Button><Plus className="h-4 w-4 mr-2" />新建请购单</Button>
          </Link>
        </div>
      </div>
      {requisitions.length === 0 ? (
        <Card><CardContent className="text-center py-10 text-muted-foreground">暂无请购单</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {requisitions.map((r) => (
            <Link key={r.id} href={`/projects/${params.id}/procurement/requisitions/${r.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.reqNo}</p>
                    <p className="text-sm text-muted-foreground">申请人: {r.requester} · 明细: {r._count.items}项</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{formatDate(r.reqDate)}</span>
                    <Badge variant={r.status === '已生成订单' ? 'default' : 'outline'}>{r.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 新建请购单（含动态明细表）**

```tsx
// src/app/projects/[id]/procurement/requisitions/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2 } from 'lucide-react';

const reqWithItemsSchema = z.object({
  reqNo: z.string().min(1, '请购单号不能为空'),
  reqDate: z.string().min(1, '请购日期不能为空'),
  requester: z.string().optional(),
  remark: z.string().optional(),
  items: z.array(z.object({
    materialName: z.string().min(1, '物料名称不能为空'),
    specification: z.string().optional(),
    quantity: z.coerce.number().min(0.01, '数量必须大于0'),
    unit: z.string().min(1, '单位不能为空'),
    purpose: z.string().optional(),
  })).min(1, '至少添加一条明细'),
});

type ReqForm = z.infer<typeof reqWithItemsSchema>;

export default function NewRequisitionPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<ReqForm>({
    resolver: zodResolver(reqWithItemsSchema),
    defaultValues: { items: [{ materialName: '', specification: '', quantity: 0, unit: '', purpose: '' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const onSubmit = async (data: ReqForm) => {
    const res = await fetch('/api/requisitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, projectId: params.id }),
    });
    if (!res.ok) { toast({ title: '创建失败', variant: 'destructive' }); return; }
    toast({ title: '请购单创建成功' });
    router.push(`/projects/${params.id}/procurement/requisitions`);
    router.refresh();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">新建请购单</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>请购单信息</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>请购单号 *</Label>
              <Input {...register('reqNo')} />
              {errors.reqNo && <p className="text-sm text-red-500">{errors.reqNo.message}</p>}
            </div>
            <div>
              <Label>请购日期 *</Label>
              <Input type="date" {...register('reqDate')} />
              {errors.reqDate && <p className="text-sm text-red-500">{errors.reqDate.message}</p>}
            </div>
            <div>
              <Label>申请人</Label>
              <Input {...register('requester')} />
            </div>
            <div className="md:col-span-3">
              <Label>备注</Label>
              <Input {...register('remark')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>请购明细</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => append({ materialName: '', specification: '', quantity: 0, unit: '', purpose: '' })}>
              <Plus className="h-4 w-4 mr-1" />添加行
            </Button>
          </CardHeader>
          <CardContent>
            {errors.items && <p className="text-sm text-red-500 mb-2">{errors.items.root?.message || errors.items.message}</p>}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1"><Input {...register(`items.${index}.materialName`)} placeholder="物料名称" /></div>
                  <div className="flex-1"><Input {...register(`items.${index}.specification`)} placeholder="规格型号" /></div>
                  <div className="w-20"><Input type="number" step="0.01" {...register(`items.${index}.quantity`)} placeholder="数量" /></div>
                  <div className="w-16"><Input {...register(`items.${index}.unit`)} placeholder="单位" /></div>
                  <div className="flex-1"><Input {...register(`items.${index}.purpose`)} placeholder="用途" /></div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>保存请购单</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>取消</Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: 请购单详情页**

```tsx
// src/app/projects/[id]/procurement/requisitions/[reqId]/page.tsx
import Link from 'next/link';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function RequisitionDetailPage({ params }: { params: { id: string; reqId: string } }) {
  const req = await db.purchaseRequisition.findUnique({
    where: { id: params.reqId },
    include: { items: true },
  });
  if (!req) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">请购单: {req.reqNo}</h2>
        <div className="flex gap-2">
          {req.status !== '已生成订单' && (
            <Link href={`/projects/${params.id}/procurement/orders/new?requisitionId=${req.id}`}>
              <Button><ShoppingCart className="h-4 w-4 mr-2" />生成采购订单</Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">请购日期</dt><dd>{formatDate(req.reqDate)}</dd>
            <dt className="text-muted-foreground">申请人</dt><dd>{req.requester}</dd>
            <dt className="text-muted-foreground">状态</dt><dd><Badge>{req.status}</Badge></dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">请购明细</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">物料名称</th><th className="py-2">规格型号</th><th className="py-2 text-right">数量</th><th className="py-2">单位</th><th className="py-2">用途</th><th className="py-2">状态</th>
              </tr>
            </thead>
            <tbody>
              {req.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 font-medium">{item.materialName}</td>
                  <td className="py-2">{item.specification}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2">{item.unit}</td>
                  <td className="py-2">{item.purpose}</td>
                  <td className="py-2"><Badge variant="outline">{item.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: 请购单 API**

```typescript
// src/app/api/requisitions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const requisition = await db.purchaseRequisition.create({
    data: {
      projectId: body.projectId,
      reqNo: body.reqNo,
      reqDate: new Date(body.reqDate),
      requester: body.requester || '',
      remark: body.remark || '',
      items: {
        create: body.items.map((item: Record<string, unknown>) => ({
          materialName: item.materialName as string,
          specification: (item.specification as string) || '',
          quantity: (item.quantity as number) || 0,
          unit: (item.unit as string) || '',
          purpose: (item.purpose as string) || '',
        })),
      },
    },
  });

  return NextResponse.json(requisition, { status: 201 });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/projects/[id]/procurement/ src/app/api/requisitions/ && git commit -m "feat: add procurement requisition CRUD with dynamic line items"
```

### Task 7.2: 采购订单列表 + 新建（从请购单生成）+ 详情

**Files:**
- Create: `src/app/projects/[id]/procurement/orders/page.tsx`
- Create: `src/app/projects/[id]/procurement/orders/new/page.tsx`
- Create: `src/app/projects/[id]/procurement/orders/[orderId]/page.tsx`
- Create: `src/app/api/orders/route.ts`

- [ ] **Step 1: 采购订单列表页**

```tsx
// src/app/projects/[id]/procurement/orders/page.tsx
import Link from 'next/link';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  '待确认': 'outline', '已下单': 'default', '部分到货': 'default', '全部到货': 'secondary',
};

export default async function OrdersPage({ params }: { params: { id: string } }) {
  const orders = await db.procurementOrder.findMany({
    where: { projectId: params.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">采购订单</h2>
        <div className="flex gap-2">
          <Link href={`/projects/${params.id}/procurement/requisitions`}>
            <Button variant="outline">请购单</Button>
          </Link>
          <Link href={`/projects/${params.id}/procurement/orders/new`}>
            <Button><Plus className="h-4 w-4 mr-2" />新建采购订单</Button>
          </Link>
        </div>
      </div>
      {orders.length === 0 ? (
        <Card><CardContent className="text-center py-10 text-muted-foreground">暂无采购订单</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Link key={o.id} href={`/projects/${params.id}/procurement/orders/${o.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{o.orderNo}</p>
                    <p className="text-sm text-muted-foreground">供应商: {o.supplier} · 明细: {o._count.items}项</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(o.totalAmount)}</span>
                    <Badge variant={STATUS_COLORS[o.status] as 'outline' | 'default' | 'secondary'}>{o.status}</Badge>
                    <span className="text-sm text-muted-foreground">{formatDate(o.orderDate)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 新建采购订单（从请购单选取明细）**

```tsx
// src/app/projects/[id]/procurement/orders/new/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface RequisitionOption { id: string; reqNo: string; }
interface RequisitionItem { id: string; materialName: string; specification: string; quantity: number; unit: string; }

const orderFormSchema = z.object({
  orderNo: z.string().min(1, '订单号不能为空'),
  requisitionId: z.string().min(1, '请选择请购单'),
  supplier: z.string().min(1, '供应商不能为空'),
  orderDate: z.string().min(1),
  deliveryDate: z.string().optional(),
  remark: z.string().optional(),
});

type OrderForm = z.infer<typeof orderFormSchema>;

export default function NewOrderPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [requisitions, setRequisitions] = useState<RequisitionOption[]>([]);
  const [selectedReqItems, setSelectedReqItems] = useState<RequisitionItem[]>([]);
  const [orderItems, setOrderItems] = useState<(RequisitionItem & { unitPrice: number })[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<OrderForm>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      requisitionId: searchParams.get('requisitionId') || '',
      orderDate: new Date().toISOString().split('T')[0],
    },
  });

  const selectedReqId = watch('requisitionId');

  useEffect(() => {
    fetch('/api/requisitions/list')
      .then(r => r.json())
      .then(data => setRequisitions(data));
  }, []);

  useEffect(() => {
    if (selectedReqId) {
      fetch(`/api/requisitions/${selectedReqId}/items`)
        .then(r => r.json())
        .then(data => {
          setSelectedReqItems(data);
          setOrderItems(data.map((item: RequisitionItem) => ({ ...item, unitPrice: 0 })));
        });
    }
  }, [selectedReqId]);

  const updatePrice = (index: number, price: number) => {
    setOrderItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], unitPrice: price };
      return next;
    });
  };

  const onSubmit = async (data: OrderForm) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        projectId: params.id,
        items: orderItems.map(item => ({
          requisitionItemId: item.id,
          materialName: item.materialName,
          specification: item.specification,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
        })),
      }),
    });
    if (!res.ok) { toast({ title: '创建失败', variant: 'destructive' }); return; }
    toast({ title: '采购订单创建成功' });
    router.push(`/projects/${params.id}/procurement/orders`);
    router.refresh();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">新建采购订单</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>订单信息</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>订单号 *</Label>
              <Input {...register('orderNo')} />
              {errors.orderNo && <p className="text-sm text-red-500">{errors.orderNo.message}</p>}
            </div>
            <div>
              <Label>关联请购单 *</Label>
              <Select value={selectedReqId} onValueChange={(v) => setValue('requisitionId', v)}>
                <SelectTrigger><SelectValue placeholder="选择请购单" /></SelectTrigger>
                <SelectContent>
                  {requisitions.map((r) => <SelectItem key={r.id} value={r.id}>{r.reqNo}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.requisitionId && <p className="text-sm text-red-500">{errors.requisitionId.message}</p>}
            </div>
            <div>
              <Label>供应商 *</Label>
              <Input {...register('supplier')} />
              {errors.supplier && <p className="text-sm text-red-500">{errors.supplier.message}</p>}
            </div>
            <div>
              <Label>下单日期 *</Label>
              <Input type="date" {...register('orderDate')} />
            </div>
            <div>
              <Label>交货日期</Label>
              <Input type="date" {...register('deliveryDate')} />
            </div>
            <div>
              <Label>备注</Label>
              <Input {...register('remark')} />
            </div>
          </CardContent>
        </Card>

        {selectedReqId && orderItems.length > 0 && (
          <Card>
            <CardHeader><CardTitle>订单明细（基于请购单，填写单价）</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">物料名称</th><th className="py-2">规格</th><th className="py-2 text-right">数量</th><th className="py-2">单位</th><th className="py-2 text-right">单价(元)</th><th className="py-2 text-right">小计(元)</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, idx) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.materialName}</td>
                      <td className="py-2">{item.specification}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2">{item.unit}</td>
                      <td className="py-2 text-right">
                        <Input type="number" step="0.01" className="w-24 inline-block text-right" value={item.unitPrice} onChange={(e) => updatePrice(idx, parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="py-2 text-right font-medium">{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>保存采购订单</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>取消</Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: 采购订单详情页 + API**

```tsx
// src/app/projects/[id]/procurement/orders/[orderId]/page.tsx
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/utils';

export default async function OrderDetailPage({ params }: { params: { id: string; orderId: string } }) {
  const order = await db.procurementOrder.findUnique({
    where: { id: params.orderId },
    include: {
      items: true,
      requisition: { select: { reqNo: true } },
    },
  });
  if (!order) notFound();

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">采购订单: {order.orderNo}</h2>
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">关联请购单</dt><dd>{order.requisition.reqNo}</dd>
            <dt className="text-muted-foreground">供应商</dt><dd>{order.supplier}</dd>
            <dt className="text-muted-foreground">下单日期</dt><dd>{formatDate(order.orderDate)}</dd>
            <dt className="text-muted-foreground">交货日期</dt><dd>{formatDate(order.deliveryDate)}</dd>
            <dt className="text-muted-foreground">总金额</dt><dd className="font-bold text-primary">{formatCurrency(order.totalAmount)}</dd>
            <dt className="text-muted-foreground">状态</dt><dd><Badge>{order.status}</Badge></dd>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">订单明细</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-2">物料名称</th><th className="py-2">规格</th><th className="py-2 text-right">数量</th><th className="py-2">单位</th><th className="py-2 text-right">单价</th><th className="py-2 text-right">小计</th></tr></thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.materialName}</td><td className="py-2">{item.specification}</td>
                  <td className="py-2 text-right">{item.quantity}</td><td className="py-2">{item.unit}</td>
                  <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: 订单与请购单辅助 API**

```typescript
// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const totalAmount = body.items.reduce((sum: number, item: { quantity: number; unitPrice: number }) =>
    sum + item.quantity * item.unitPrice, 0);

  const order = await db.procurementOrder.create({
    data: {
      projectId: body.projectId,
      orderNo: body.orderNo,
      requisitionId: body.requisitionId,
      supplier: body.supplier,
      orderDate: new Date(body.orderDate),
      deliveryDate: new Date(body.deliveryDate || body.orderDate),
      totalAmount,
      remark: body.remark || '',
      items: {
        create: body.items.map((item: Record<string, unknown>) => ({
          requisitionItemId: item.requisitionItemId as string,
          materialName: item.materialName as string,
          specification: (item.specification as string) || '',
          quantity: (item.quantity as number) || 0,
          unit: (item.unit as string) || '',
          unitPrice: (item.unitPrice as number) || 0,
          totalAmount: (item.quantity as number) * (item.unitPrice as number),
        })),
      },
    },
  });

  await db.purchaseRequisition.update({
    where: { id: body.requisitionId },
    data: { status: '已生成订单' },
  });

  return NextResponse.json(order, { status: 201 });
}

// src/app/api/requisitions/list/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const reqs = await db.purchaseRequisition.findMany({
    where: { status: { not: '已生成订单' } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(reqs);
}

// src/app/api/requisitions/[id]/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const items = await db.requisitionItem.findMany({
    where: { requisitionId: params.id, status: '待采购' },
  });
  return NextResponse.json(items);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/projects/[id]/procurement/orders/ src/app/api/orders/ src/app/api/requisitions/ && git commit -m "feat: add procurement order CRUD with requisition-to-order flow"
```

---

## Phase 8: 施工模块 + 施工资料（Phase 8）

### Task 8.1: 施工任务 CRUD

**Files:**
- Create: `src/app/projects/[id]/construction/page.tsx`
- Create: `src/app/projects/[id]/construction/new/page.tsx`
- Create: `src/app/projects/[id]/construction/[taskId]/page.tsx`
- Create: `src/app/api/construction-tasks/route.ts`
- Create: `src/app/api/construction-tasks/[id]/route.ts`

- [ ] **Step 1: 施工任务列表 + 新建 + 详情页**

施工任务模块结构与前述模块一致。关键文件内容：

```tsx
// construction/page.tsx - 列表页
// 查询当前项目的所有施工任务，按状态分组展示
// 包含跳转至施工资料页面的按钮
```

```tsx
// construction/new/page.tsx - 新建施工任务
// 使用 constructionTaskSchema + react-hook-form
// 字段：taskName, workArea, planStartDate, planEndDate, contractor, status
```

```tsx
// construction/[taskId]/page.tsx - 详情页
// 展示任务详情 + 进度滑块编辑（Client Component交互）
```

```typescript
// construction-tasks API
// POST: 创建施工任务
// PUT: 更新任务（含进度更新）
```

具体代码实现参考设计模块的 CRUD 模式，施工任务的特殊之处在于详情页支持**拖拽进度滑块**更新 `progress` 字段。

- [ ] **Step 2: 提交**

```bash
git add src/app/projects/[id]/construction/ src/app/api/construction-tasks/ && git commit -m "feat: add construction task CRUD pages"
```

### Task 8.2: 施工资料管理

**Files:**
- Create: `src/app/projects/[id]/construction/docs/page.tsx`
- Create: `src/app/projects/[id]/construction/docs/upload/page.tsx`
- Create: `src/app/api/construction-docs/upload/route.ts`

- [ ] **Step 1: 施工资料列表 + 上传页**

施工资料模块复用设计文件上传的UI模式，但数据存入 `ConstructionDoc` 表，分类枚举不同（施工日志/检验批/材料报验/隐蔽工程/试验报告/竣工图/其他）。

- [ ] **Step 2: 提交**

```bash
git add src/app/projects/[id]/construction/docs/ src/app/api/construction-docs/ && git commit -m "feat: add construction document management"
```

---

## Phase 9: HSE模块（Phase 9）

### Task 9.1: HSE概览页

**Files:**
- Create: `src/app/projects/[id]/hse/page.tsx`

- [ ] **Step 1: HSE概览**

```tsx
// hse/page.tsx
// 统计卡片：事故事件数、安全检查数、培训记录数
// 每类快捷入口卡片，跳转到对应子模块列表
```

### Task 9.2: 事故事件 CRUD

**Files:**
- Create: `src/app/projects/[id]/hse/incidents/page.tsx`
- Create: `src/app/projects/[id]/hse/incidents/new/page.tsx`
- Create: `src/app/projects/[id]/hse/incidents/[incId]/page.tsx`
- Create: `src/app/api/hse-incidents/route.ts`

- [ ] **Step 1: 事故事件CRUD**

复用设计联络单的 CRUD 模式，使用 `hseIncidentSchema` 校验，数据存入 `HSEIncident` 表。列表页按严重程度区分 Badge 颜色。

### Task 9.3: 安全检查 CRUD

**Files:**
- Create: `src/app/projects/[id]/hse/inspections/page.tsx`
- Create: `src/app/projects/[id]/hse/inspections/new/page.tsx`
- Create: `src/app/projects/[id]/hse/inspections/[insId]/page.tsx`
- Create: `src/app/api/hse-inspections/route.ts`

- [ ] **Step 1: 安全检查CRUD**

复用前述 CRUD 模式，使用 `hseInspectionSchema`。详情页支持更新 `status`（待整改 → 已整改 → 已复查）。

### Task 9.4: 培训记录 CRUD

**Files:**
- Create: `src/app/projects/[id]/hse/trainings/page.tsx`
- Create: `src/app/projects/[id]/hse/trainings/new/page.tsx`
- Create: `src/app/projects/[id]/hse/trainings/[traId]/page.tsx`
- Create: `src/app/api/hse-trainings/route.ts`

- [ ] **Step 1: 培训记录CRUD**

复用前述 CRUD 模式，使用 `hseTrainingSchema`。

- [ ] **Step 2: 提交所有HSE模块**

```bash
git add src/app/projects/[id]/hse/ src/app/api/hse-* && git commit -m "feat: add HSE module with incidents, inspections, trainings"
```

---

## Phase 10: 最终验证与优化（Phase 10）

### Task 10.1: 全功能验证

- [ ] **Step 1: 启动开发服务器并验证所有路由**

```bash
npm run dev
# 验证以下所有页面可访问且功能正常：
# /projects (列表) → 新建项目 → 进入项目仪表盘
# 设计：文件库/上传/联络单CRUD/会审CRUD
# 采购：请购单(主从表)/采购订单(从请购生成)
# 施工：任务CRUD/施工资料
# HSE：概览/事故事件/安全检查/培训记录CRUD
```

- [ ] **Step 2: 运行构建检查**

```bash
npm run build
```

Expected: 无 TypeScript 错误，构建成功。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: final verification and cleanup"
```

---

## 总结

本计划覆盖 **10个Phase、约40个Task**，实现32个路由页面的完整EPC MVP系统。开发顺序按依赖关系排列：

1. **Phase 0**: 项目脚手架
2. **Phase 1**: 数据库Schema
3. **Phase 2**: 核心基础设施
4. **Phase 3**: 布局导航
5. **Phase 4**: 项目管理（验证整个链路）
6. **Phase 5-9**: 各业务模块（可并行开发）
7. **Phase 10**: 验证收尾