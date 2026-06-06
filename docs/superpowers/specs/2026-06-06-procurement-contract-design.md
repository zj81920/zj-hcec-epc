# 采购合同管理模块设计文档

## 1. 概述

采购合同管理模块是采购管理流程的延伸，在采购订单审批通过后，支持基于相同供应商的多笔采购订单合并生成合同，通过 AI 填充模板生成合同内容，支持审批流程和 Word/PDF 导出。

### 业务流程图

```
请购单 → 采购订单(已批准) → 选择订单 → 填写变量 → AI生成合同 → 审批 → 已批准
                                                                  ↓
                                                           回填合同编号到采购订单
                                                                  ↓
                                                          导出Word/PDF
```

---

## 2. 数据模型

### 2.1 ExecutingUnit（执行单位 — 合同甲方）

系统设置中管理，供采购订单选择"采购单位"时下拉引用。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String @id @default(uuid()) | 主键 |
| name | String | 单位名称（必填） |
| address | String @default("") | 地址 |
| contactPerson | String @default("") | 联系人 |
| phone | String @default("") | 联系电话 |
| bankName | String @default("") | 开户行 |
| bankAccount | String @default("") | 银行账号 |
| taxId | String @default("") | 统一社会信用代码 |
| status | String @default("启用") | 启用/停用 |
| createdAt/updatedAt | DateTime | 时间戳 |

### 2.2 ProcurementContract（合同主表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String @id @default(uuid()) | 主键 |
| projectId | String | 所属项目 |
| contractNo | String | 合同编号（格式 PC-YYYYMMDD-NNN） |
| contractName | String | 合同名称 |
| supplierId | String? | 供应商 ID（关联 Partner） |
| supplier | String @default("") | 供应商名称 |
| supplierContact | String @default("") | 供应商联系人 |
| supplierPhone | String @default("") | 供应商电话 |
| executingUnitId | String? | 执行单位ID（甲方，关联 ExecutingUnit） |
| executingUnitName | String @default("") | 执行单位名称（快照） |
| totalAmount | Float @default(0) | 含税总价 |
| taxAmount | Float @default(0) | 税金 |
| taxRate | String @default("13%") | 税率（下拉选择） |
| deliveryTerm | Int @default(30) | 交货期限（合同生效后天数） |
| deliveryAddress | String @default("") | 交货地址（继承采购订单） |
| transportCost | String @default("乙方承担") | 运输费用承担方 |
| paymentTerms | String @default("30:40:20:10") | 付款比例（预付:到货:验收:质保） |
| warrantyPeriod | Int @default(12) | 质保期（月） |
| arbitrationBody | String @default("") | 仲裁委员会 |
| lateDeliveryPct | Float @default(0.1) | 逾期交货违约金比例(%/天) |
| latePaymentPct | Float @default(0.1) | 逾期付款违约金比例(%/天) |
| status | String @default("草稿") | 流程状态（草稿/审批中/已批准/已驳回） |
| remark | String @default("") | 备注 |
| signDate | DateTime? | 签订日期（审批通过时自动填充） |
| createdAt/updatedAt | DateTime | 时间戳 |

### 2.3 ContractOrderLink（合同-订单关联表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String @id @default(uuid()) | 主键 |
| contractId | String | 合同 ID |
| orderId | String | 采购订单 ID |
| @@unique([contractId, orderId]) | 联合唯一 | 防止重复关联 |

### 2.4 ContractItem（合同明细表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String @id @default(uuid()) | 主键 |
| contractId | String | 合同 ID |
| orderItemId | String | 来源 OrderItem ID |
| materialName | String | 物资名称 |
| specification | String @default("") | 规格型号 |
| materialCode | String @default("") | 物料编码 |
| material | String @default("") | 材质 |
| materialGrade | String @default("") | 材料等级 |
| brand | String @default("") | 品牌 |
| quantity | Float @default(0) | 数量 |
| unit | String @default("") | 单位 |
| unitPrice | Float @default(0) | 含税单价 |
| totalAmount | Float @default(0) | 含税总价 |

### 2.5 ProcurementOrder 变更

在 `ProcurementOrder` 模型中新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| executingUnitId | String? | 执行单位ID（甲方，关联 ExecutingUnit） |
| executingUnitName | String @default("") | 执行单位名称快照 |

同时需要在创建/编辑采购订单时补充"采购单位"下拉选择。

---

## 3. 页面路由设计

基准路径：`/projects/[id]/procurement/contracts`

| 路由 | 页面 | 说明 |
|------|------|------|
| `/contracts` | 合同列表页 | 项目内所有合同，支持状态筛选、搜索 |
| `/contracts/new` | 新建合同页 | 选择订单 → 填写变量 → AI生成 → 预览提交 |
| `/contracts/[contractId]` | 合同详情页 | 查看完整合同信息 + 实时渲染合同正文 |
| `/contracts/[contractId]/edit` | 编辑合同页 | 编辑变量字段，重新生成合同内容 |

### 采购订单列表页联动

在采购订单列表的操作列增加"生成合同"按钮（仅已批准 + 无 `contractNo` 的订单显示），点击跳转到 `/contracts/new?selectedOrderIds=xxx,yyy` 自动选中。

---

## 4. API 路由设计

### 4.1 合同 CRUD

| 方法 | 路由 | 功能 |
|------|------|------|
| GET | `/api/contracts?projectId=xxx` | 合同列表（支持 status 筛选、关键词搜索） |
| POST | `/api/contracts` | 创建合同（含关联订单和明细） |
| GET | `/api/contracts/[id]` | 合同详情（含关联订单、明细、执行单位、供应商信息） |
| PUT | `/api/contracts/[id]` | 更新合同（草稿/已驳回可编辑） |
| DELETE | `/api/contracts/[id]` | 删除合同（草稿可删，清除关联订单 contractNo） |
| GET | `/api/contracts/generate-no` | 自动生成合同编号 |

### 4.2 审批操作（复用 _statusOnly 模式）

| 方法 | 路由 | 参数 | 说明 |
|------|------|------|------|
| PUT | `/api/contracts/[id]` | `{ _statusOnly: true, status: "审批中" }` | 提交审批 |
| PUT | `/api/contracts/[id]` | `{ _statusOnly: true, status: "已批准" }` | 审批通过（触发回填 contractNo） |
| PUT | `/api/contracts/[id]` | `{ _statusOnly: true, status: "已驳回" }` | 驳回 |

### 4.3 查询可用订单

| 方法 | 路由 | 功能 |
|------|------|------|
| GET | `/api/contracts/available-orders?projectId=xxx&supplierId=yyy` | 查某供应商下可签合同的订单 |

### 4.4 AI 合同生成

| 方法 | 路由 | 功能 |
|------|------|------|
| POST | `/api/contracts/generate-content` | 调用 AI 根据模板 + 变量 + 明细生成合同内容 |

### 4.5 执行单位 CRUD

| 方法 | 路由 | 功能 |
|------|------|------|
| GET | `/api/executing-units` | 执行单位列表 |
| POST | `/api/executing-units` | 新建执行单位 |
| PUT | `/api/executing-units/[id]` | 更新执行单位 |
| DELETE | `/api/executing-units/[id]` | 删除执行单位 |

---

## 5. AI 合同生成流程

### 5.1 AI 能力扩展

在 `src/lib/ai/types.ts` 中新增接口：

```typescript
interface AIClient {
  // 新增：生成合同内容
  generateContractContent(params: ContractGenerationParams): Promise<string>
}

interface ContractGenerationParams {
  contractName: string
  buyerName: string        // 甲方（执行单位名称）
  buyerAddress: string     // 甲方地址
  buyerContact: string     // 甲方联系人
  buyerPhone: string       // 甲方电话
  buyerBank: string        // 甲方开户行
  buyerAccount: string     // 甲方银行账号
  buyerTaxId: string       // 甲方税号
  supplierName: string     // 乙方（供应商名称）
  supplierAddress: string  // 乙方地址
  supplierContact: string  // 乙方联系人
  supplierPhone: string    // 乙方电话
  supplierBank: string     // 乙方开户行
  supplierAccount: string  // 乙方银行账号
  supplierTaxId: string    // 乙方税号
  items: ContractItemData[]
  variables: ContractVariables
}

interface ContractVariables {
  taxRate: string
  totalAmount: number
  taxAmount: number
  totalAmountCN: string    // 大写金额
  paymentTerms: string
  deliveryTerm: number
  deliveryAddress: string
  transportCost: string
  warrantyPeriod: number
  arbitrationBody: string
  lateDeliveryPct: number
  latePaymentPct: number
  signDate: string
}
```

### 5.2 生成流程

1. 前端收集：已选订单的物资明细 + 用户填写的变量字段 + 甲乙双方信息
2. 调用 `POST /api/contracts/generate-content`
3. 后端组装 Prompt（含预定义合同模板 + 填充数据）
4. 调用 AI 客户端 `generateContractContent()`
5. AI 返回结构化的合同段落数据（JSON 格式，每个章节一段）
6. 前端实时渲染展示完整合同文本

### 5.3 合同内容渲染

- 合同内容**不存储完整 HTML 到数据库**，而是存储 AI 返回的结构化数据
- 每次查看详情时**实时渲染**：读取结构化数据 + 数据模型中的变量字段 + 甲乙双方信息 → 拼装展示
- 渲染使用服务端组件，减少客户端负担

### 5.4 Prompt 设计概要

```
你是一个采购合同生成助手。根据模板和填充数据生成完整的采购合同文本（JSON格式）。

## 数据输入
- 甲方信息：{buyerInfo}
- 乙方信息：{supplierInfo}
- 合同变量：{variables}
- 物资明细表：{itemsTable}

## 合同模板
{template}

请输出 JSON 格式，每个章节为独立段落：
{"sections": [
  {"title": "第一章 合同标的与物资明细", "content": "..."},
  {"title": "第二章 合同价款及支付", "content": "..."},
  ...
]}
```

---

## 6. 导出功能

### 6.1 Word 导出

- 使用 `docx`（npm 库）在后端生成 .docx 文件
- 将合同数据拼接为 Word 文档格式
- 返回文件流供前端下载

### 6.2 PDF 导出

- 使用 `puppeteer` 或 `@react-pdf/renderer` 在后端生成 PDF
- 合同样式与详情页一致
- 返回文件流供前端下载

---

## 7. 合同编号回填逻辑

### 审批通过时

```typescript
// 在 PUT /api/contracts/[id] 的 _statusOnly 分支
if (status === '已批准' && oldStatus === '审批中') {
  // 1. 设置签订日期
  updateData.signDate = new Date()
  // 2. 查询所有关联订单
  const links = await db.contractOrderLink.findMany({ where: { contractId: id } })
  // 3. 回填 contractNo 到每个订单
  for (const link of links) {
    await db.procurementOrder.update({
      where: { id: link.orderId },
      data: { contractNo: contract.contractNo }
    })
  }
}
```

### 删除合同时

```typescript
// 在 DELETE /api/contracts/[id] 中
// 1. 先查询关联订单
const links = await db.contractOrderLink.findMany({ where: { contractId: id } })
// 2. 清除每个订单的 contractNo
for (const link of links) {
  await db.procurementOrder.update({
    where: { id: link.orderId },
    data: { contractNo: '' }
  })
}
// 3. 级联删除 ContractOrderLink + ContractItem + 合同本身
await db.procurementContract.delete({ where: { id } })
```

---

## 8. 合同模板

合同模板由用户提供，硬编码到代码中（`src/lib/contract-template.ts`），不作为可管理的动态数据。

### 模板章节结构

| 章节 | 内容 | 变量来源 |
|------|------|---------|
| 第一章 合同标的与物资明细 | 合同概述 + 物资明细表 + 总价 | 订单明细 + 变量 |
| 第二章 合同价款及支付 | 含税总价、税率、税金、付款比例、发票要求 | 变量 |
| 第三章 交货与验收 | 交货期限、地点、运输、验收标准 | 变量 + 采购订单 |
| 第四章 质量保证 | 质保期、质保范围、质保责任 | 变量 |
| 第五章 违约责任 | 逾期交货/逾期付款违约金比例 | 变量 |
| 第六章 知识产权 | 技术文件知识产权归属 | 固定条款 |
| 第七章 保密条款 | 保密范围、保密期限 | 固定条款 |
| 第八章 不可抗力 | 不可抗力处理 | 固定条款 |
| 第九章 争议解决 | 仲裁委员会 | 变量 |
| 第十章 其他 | 生效条件、合同份数 | 固定条款 |

---

## 9. 执行单位管理（系统设置）

### 9.1 页面位置

系统设置首页（`/company/settings/basic-info`）新增卡片"执行单位管理"，点击进入管理页面。

### 9.2 管理页面

参考专业基础数据的行内编辑模式：

- 表格列：单位名称 | 地址 | 联系人 | 联系电话 | 开户行 | 银行账号 | 税号 | 状态 | 操作
- 支持行内新增/编辑/删除
- 状态切换（启用/停用）

### 9.3 采购订单联动

在创建/编辑采购订单时，"采购单位"字段改为下拉选择，选项来自执行单位列表（仅启用状态的）。

---

## 10. 关键业务流程说明

### 10.1 创建合同

```
选择订单 → 系统自动过滤：
  ① 仅显示已批准的订单
  ② 仅显示无 contractNo（未签合同）的订单
  ③ 仅显示同一供应商的订单（选择第一个订单后锁定供应商）
→ 填写合同变量字段（下拉选择）
→ 点击"生成合同内容" → 调用 AI → 预览
→ 确认无误后"提交审批"
```

### 10.2 合同审批

```
草稿 → 提交 → 审批中 → 已批准（触发回填）
                   → 已驳回（退回草稿，保留数据）
```

### 10.3 合同删除

- 仅"草稿"状态可删除
- 删除时清除关联采购订单的 `contractNo`
- 清除后对应的采购订单可重新用于签合同

---

## 11. 待办事项（后续实施）

1. 将合同模板文件放置在 `src/lib/contract-template.ts`（用户提供模板文案）
2. 在 AI 客户端中实现 `generateContractContent` 方法
3. 实现 Word 和 PDF 导出功能
