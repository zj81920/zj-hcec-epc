## DOM 嵌套规范（@base-ui/react）

项目中使用了 `@base-ui/react` 组件库，其 Trigger 类组件（如 `DialogTrigger`、`SelectTrigger`、`AlertDialogTrigger` 等）默认渲染为 `<button>` DOM 元素。

**禁止**直接将 `<Button>` 组件作为 Trigger 的子元素，否则会产生 `<button>` 嵌套 `<button>` 的 React DOM 校验错误（`validateDOMNesting: <button> cannot contain a nested <button>`）。

**正确做法**：使用 `render` 属性将 Button 注入为 Trigger：

```tsx
{/* ✅ 正确 - 使用 render 属性 */}
<DialogTrigger render={<Button variant="outline">
    <Plus className="h-4 w-4 mr-1" />新增配置
  </Button>}>
</DialogTrigger>

{/* ❌ 错误 - Button 作为子元素会导致嵌套 */}
<DialogTrigger>
  <Button variant="outline">
    <Plus className="h-4 w-4 mr-1" />新增配置
  </Button>
</DialogTrigger>
```

此规则适用于所有 `@base-ui/react` 的 Trigger 类组件，不限于 DialogTrigger。

## 全局流程状态规范

系统中所有需要审批流程的模块（如请购单、采购订单等），**流程状态**字段统一使用以下 4 个值，不得超出或遗漏：

| 状态值 | 含义 | 说明 |
|--------|------|------|
| `草稿` | 编辑中 | 创建时默认状态，可编辑/删除 |
| `审批中` | 已提交等待审批 | 进入审批链后锁定编辑 |
| `已批准` | 审批通过 | 终态之一，可进入下一步业务操作 |
| `已驳回` | 审批未通过 | 回退到草稿状态，可重新编辑/提交 |

**规则**：
1. 所有新增模块的流程状态必须使用这 4 个值，保持全局一致
2. 流程状态与业务状态分离管理（业务状态描述具体业务阶段）
3. 驳回到草稿时保留原始数据，方便修改后重新提交

---

## 模块开发完成文档归档规则

每个模块开发完成并调试通过后，必须在 `docs/模块开发完成文档/` 下编写完成文档，按系统模块分类存放。

### 目录结构

```
docs/模块开发完成文档/
├── 采购管理/
│   ├── 请购单管理.md
│   ├── 采购订单管理.md
│   └── 物料基础数据管理.md
├── 系统设置/
│   ├── AI模型配置.md
│   └── 专业基础数据.md
├── 设计管理/
│   └── 设计管理模块.md
├── 施工管理/
│   └── 施工管理模块.md
├── HSE管理/
│   └── HSE管理模块.md
└── 项目管理/
    └── EPC项目基础管理.md
```

### 文档格式

每个文档使用以下三段式结构：

```markdown
# 模块名称

## 需求概述
（这个模块是做什么的，一句话说明）

## 功能清单
1. **功能A** — 说明
2. **功能B** — 说明
...

## 注意事项
（有什么坑、特殊逻辑、后续要注意的）
```

### 规则

1. **文件名使用中文**，能一眼看出文档内容
2. **按系统模块归类**到对应子目录（采购管理/系统设置/设计管理/施工管理/HSE管理/项目管理等）
3. **内容避免分散**，同一模块的所有功能写在一个文件里，不拆分到多个文件
4. **模块开发完成一个，归档一个**，不积压

### 1. 子代理（sub-agent）使用策略

**核心原则：优先使用主代理直接操作，谨慎使用子代理。**

#### 禁止使用子代理的场景
- **大文件全面重写**（>500行）：子代理处理大文件时 token 消耗呈指数增长，极易卡死或超时
- **单文件多位置局部修改**：主代理 `SearchReplace` 更精准可控
- **需要上下文关联的连续修改**：前一步的修改结果影响后一步，子代理无法与主代理通信

#### 可以使用子代理的场景
- **纯搜索/调研任务**（search 类子代理）：跨模块搜索代码、文档
- **创建新的独立文件**：结构清晰、token 可控的小文件创建
- **并行独立任务**：多个不相关的小任务可以并行派给不同子代理

### 2. 代码修改策略

- **修改现有文件**：始终优先使用 `SearchReplace`，精确定位 old_str，避免重写整个文件
- **创建新文件**：先确认目录存在，再使用 `Write` 工具
- **数据库 Schema 变更后**：必须运行 `npx prisma validate` + `npx prisma db push`，然后检查是否有 Prisma Client 类型变化导致的构建错误
- **构建验证**：每次重大修改后运行 `npx next build` 确认无类型错误

### 3. Prisma Schema 变更注意事项

- 新增字段时注意已有 API 路由中的 Prisma 类型断言（如 `as { update: ... }`）可能因 Client 重新生成而失效
- 新增必填字段需提供默认值，否则 `db push` 后已有数据会出问题
- Prisma Client 重新生成后，`select` 中未包含的字段会导致类型错误，需同步更新 select

### 4. 项目构建命令

- Schema 验证：`npx prisma validate`
- 数据库同步：`npx prisma db push`
- 构建验证：`npx next build`
- 开发服务器：`npm run dev`

### 5. 回归验证（强制执行）

**每次重大变更后（Schema 变更、路由改动、middleware 修改），必须运行回归脚本：**

```bash
bash scripts/verify.sh
```

该脚本验证：
- Prisma Schema 合法性
- Next.js 构建成功
- 开发服务器可正常启动（middleware 无 Edge Runtime 错误）
- 关键页面 HTTP 状态码正常
- 登录/权限拦截逻辑正确

**验证不通过不得提交。**

### 测试体系与 TDD 规范

#### 测试方式一览

| 类型 | 框架 | 文件位置 | 运行命令 | 测试时机 |
|------|------|---------|---------|---------|
| **单元测试** (Unit) | Vitest | `test/unit/*.test.ts` | `npx vitest run test/unit/` | 每次代码提交前 |
| **DB 模型测试** | Vitest | `test/db/*.test.ts` | `npx vitest run test/db/` | Schema 变更后 |
| **API 集成测试** | Vitest | `test/api/*.test.ts` | dev server 运行中执行 `npx vitest run test/api/` | API 路由改动后 |
| **E2E 测试** | Playwright | `e2e/*.spec.ts` | `npx playwright test` | 重大功能上线前 |
| **回归验证** | Bash | `scripts/verify.sh` | `bash scripts/verify.sh` | Schema/路由/middleware 变更后 |
| **路由完整性检查** | Vitest | `test/unit/route-integrity.test.ts` | `npx vitest run test/unit/route-integrity.test.ts` | 新增菜单项或页面后 |

#### TDD 开发方式

TDD（Test-Driven Development）是"先写测试，再写代码"的开发流程，不是一种测试类型：

```
① 先写测试（描述期望的行为）→ ② 跑测试（预期失败，红）
→ ③ 写实现代码 → ④ 跑测试（通过，绿）→ ⑤ 重构优化
```
**TDD 核心原则：** 必须先写测试再写代码。代码写完再补测试不算 TDD。每次生成执行计划时，需要将执行计划里需要做tdd测试的任务列出来，并写入到执行计划里，开发时必须严格按照要求做TDD

#### 推荐开发流程

```bash
# 1. 修改代码前先写测试（TDD）
# 2. 修改代码后跑快速验证
npx vitest run test/unit/ test/db/

# 3. 新增 API 路由后
npx vitest run test/api/          # 先开 dev server

# 4. 新增菜单/页面后
npx vitest run test/unit/route-integrity.test.ts

# 5. Schema/middleware 改后
bash scripts/verify.sh

# 6. 功能模块开发完成后
npx playwright test e2e/business-scenarios-multi-org.spec.ts

### 11. 审批权限判断规范（强制 — 后端驱动）

**审批操作权限（能否通过/驳回/归档/支付）必须由后端计算并返回，前端只负责读取和渲染，禁止在前端自行计算审批权限。**

- **唯一的权限判断函数**：`resolveUserApprovalCapabilities`（位于 `src/lib/approval-engine.ts`），集中处理角色匹配、轮次感知、发起人排除
- **后端 API 必须返回权限标志**：`GET /api/approval-instances/:id` 响应中必须包含 `canApprove`、`canReject`、`canArchive`、`canPayment`、`isInitiator`、`hasActedThisRound` 字段
- **后端 action 接口必须校验权限**：`POST /api/approval-instances/:id/actions` 在执行审批动作前必须调用 `resolveUserApprovalCapabilities` 校验调用者权限
- **前端禁止自行计算权限**：`ApprovalActionButton` 组件不得包含任何角色匹配、轮次判断、发起人检测逻辑，所有权限判断从 `approvalInstance` 对象中读取
- **修改审批权限逻辑时**：只需修改 `resolveUserApprovalCapabilities` 一处，前后端自动同步
- **发起人不能审批自己的申请**：`resolveUserApprovalCapabilities` 对发起人返回所有审批权限为 false

### 12. 删除操作规范（强制 — 硬删除）

**系统中所有前端触发的删除操作必须使用硬删除（DELETE），禁止使用软删除（逻辑删除）。**

- 数据被删除后直接从数据库中移除，不保留标记（如 `isDeleted`、`deletedAt` 等字段）
- 需在删除操作前确认业务约束（如只有"草稿"状态可删除）
- 删除关联数据时使用 Prisma 级联删除（`onDelete: Cascade`）
- 关联表的外键约束由数据库确保完整性
