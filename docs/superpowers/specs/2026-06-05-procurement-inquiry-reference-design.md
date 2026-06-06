# 采购订单 — 询价采购与AI参考价功能设计说明书

## 一、需求概述

在现有采购订单模块上增加**询价采购**能力（选多家供应商在线报价、多轮报价、报价对比定标），以及**AI 历史参考价**辅助功能（自动匹配历史采购数据提供价格参考）。

---

## 二、状态体系

### 2.1 流程状态（全局统一 4 值）

| 值 | 含义 |
|---|------|
| `草稿` | 编辑中，可编辑/删除/切换采购方式 |
| `审批中` | 已提交等待审批 |
| `已批准` | 审批通过 |
| `已驳回` | 驳回回草稿，可重新编辑 |

### 2.2 业务状态（采购订单专属）

| 值 | 含义 |
|---|------|
| `询价中` | 询价采购已批准，供应商报价进行中 |
| `待发货` | 订单生效，等待供应商发货 |
| `已发货` | 供应商已发货 |
| `已完成` | 收货完成 |

### 2.3 采购方式

| 值 | 含义 |
|---|------|
| `direct` | 直接采购（当前模式） |
| `inquiry` | 询价采购（新增） |

---

## 三、业务流程

### 3.1 直接采购（现有模式，略调整）

```
草稿 → 审批中 → 已批准（业务状态=待发货）
              → 已驳回 → 退草稿
```

### 3.2 询价采购（新增）

```
第一轮审批（询价方案）:
草稿 → 审批中 → 已批准（业务状态=询价中）
              → 已驳回 → 退草稿

询价阶段:
供应商通过 Token 链接在线报价（支持多轮）

第二轮审批（定标结果）:
选标 → 审批中 → 已批准（业务状态=待发货）
              → 已驳回 → 退草稿
```

### 3.3 采购方式切换（草稿状态）

| 从 → 到 | 操作 |
|---------|------|
| direct → inquiry | 清空供应商 + 清空单价/总价 |
| inquiry → direct | 清空供应商列表 + 删除报价记录 |

---

## 四、数据模型

### 4.1 ProcurementOrder 新增字段

```
procurementMethod  String   @default("direct")
inquiryDeadline    DateTime? (报价截止时间)
purchaserPhone     String   @default("")
```

### 4.2 新增模型 OrderQuote

```
model OrderQuote {
  id              String   @id @default(uuid())
  orderId         String
  supplierId      String
  currentRound    Int      @default(1)
  token           String   @unique        // 唯一，报价链接标识
  tokenExpiresAt  DateTime?               // Token 过期时间（可选，默认无过期）
  deadline        DateTime?               // 本轮报价截止
  status          String   @default("待报价")  // 待报价/已提交/已选中/未选中
  submittedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  order     ProcurementOrder @relation(fields: [orderId], references: [id])
  supplier  Partner          @relation(fields: [supplierId], references: [id])
  items     OrderQuoteItem[]
}
```

### 4.3 新增模型 OrderQuoteItem

```
model OrderQuoteItem {
  id                String   @id @default(uuid())
  quoteId           String
  round             Int
  requisitionItemId String
  unitPrice         Float?
  totalAmount       Float?
  brand             String   @default("")
  remark            String   @default("")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  quote OrderQuote @relation(fields: [quoteId], references: [id])
}
```

### 4.4 新增模型 HistoricalOrderItem

用于 Excel 上传的历史采购数据：

```
model HistoricalOrderItem {
  id             String   @id @default(uuid())
  seq            Int?                    // 序号
  materialName   String   @default("")
  specification  String   @default("")
  materialGrade  String   @default("")
  standardCode   String   @default("")
  brand          String   @default("")
  unit           String   @default("")
  quantity       Float    @default(0)
  unitPrice      Float    @default(0)
  totalAmount    Float    @default(0)
  purchaseDate   DateTime?
  supplierName   String   @default("")
  supplierContact String  @default("")
  supplierPhone  String   @default("")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## 五、API 设计

### 5.1 询价管理

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/api/orders/[id]/quotes` | 发起询价（为所选供应商生成 Token） |
| GET | `/api/orders/[id]/quotes` | 获取所有供应商报价概览 |
| PUT | `/api/orders/[id]/quotes/[quoteId]/new-round` | 发起新一轮 |
| POST | `/api/orders/[id]/quotes/[quoteId]/select` | 选标确认（回填价格到订单） |

### 5.2 供应商报价（Token 方式，免登录）

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/api/quotes/verify` | 公司名称校验（入参：token + companyName） |
| GET | `/api/quotes/[token]` | 获取报价单信息（需先通过验证） |
| PUT | `/api/quotes/[token]` | 暂存草稿 |
| POST | `/api/quotes/[token]/submit` | 最终提交 |
| POST | `/api/quotes/[token]/upload` | 上传技术文件 |

### 5.3 AI 参考价

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/api/ai/reference-prices` | 根据物资明细查询参考价 |

入参：
```json
{ "projectId": "xxx", "items": [{ "materialName": "...", "specification": "...", "material": "...", "materialGrade": "..." }] }
```

出参：
```json
{ "items": [{ "requisitionItemId": "xxx", "referencePrice": 125.5, "referenceSupplier": "A公司", "referenceBrand": "太钢", "referenceDate": "2025-11-15", "confidence": "high" }] }
```

### 5.4 历史数据管理

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/api/historical-orders` | 分页查列表明细 |
| POST | `/api/historical-orders/upload` | Excel 上传解析入库 |
| PUT | `/api/historical-orders/[id]` | 编辑单行 |
| DELETE | `/api/historical-orders/[id]` | 删除单行 |
| GET | `/api/historical-orders/template` | 下载上传模板 |

---

## 六、页面清单

| 页面 | 路由 | 说明 |
|------|------|------|
| 新建/编辑订单 | `/procurement/orders/new` | 新增采购方式选择 + 供应商多选 + AI 参考价列 |
| 订单详情 | `/procurement/orders/[id]` | 询价中状态显示供应商报价进度 + Tab 对比 |
| 供应商报价 | 独立 URL（Token） | 两步式：公司名称校验 → 填报价 + 上传技术文件 |
| 报价链接失效 | 独立 URL（Token） | 显示失效原因 + 订单信息 + 采购方联系人 |
| 历史数据管理 | `/settings/historical-orders` | Excel 上传 + 列表明细（支持编辑删除） |

---

## 七、AI 参考价逻辑

### 7.1 数据源优先级

1. 当前项目历史订单 OrderItem（最近 50 条）
2. 全局历史订单 OrderItem（最近 30 条）
3. HistoricalOrderItem（历史数据表，兜底）

### 7.2 空数据处理

历史数据全部为空时跳过 AI 调用，全部返回 null + `confidence: "none"`，不浪费 Token。

### 7.3 提示词

```text
你是一个工程采购价格分析助手。根据历史采购数据，为当前物资清单查找最相似的历史采购记录，提供参考价格和供应商信息。

## 历史采购数据
[{ "materialName": "...", "specification": "...", "material": "...", "supplier": "...", "unitPrice": ..., "brand": "...", "orderDate": "..." }]

## 当前待匹配物资
[{ "materialName": "...", "specification": "...", "material": "...", "quantity": ..., "unit": "..." }]

## 匹配规则
1. 优先匹配：物料名称语义相近 + 规格型号一致
2. 次要匹配：材质相同 + 规格相近
3. 高度相似 → confidence: "high"
4. 仅名称或材质 → confidence: "medium"
5. 无匹配 → 各字段 null, confidence: "low"

## 返回格式
{ "items": [{ "requisitionItemId": "...", "referencePrice": 125.5, "referenceSupplier": "A公司", "referenceBrand": "太钢", "referenceDate": "2025-11-15", "confidence": "high" }] }

只返回合法 JSON，不要包含其他文字。
```

---

## 八、UI 交互要点

### 8.1 供应商报价页（两步式）

**步骤1**：身份验证 — 输入公司全称，与 Token 绑定的供应商匹配，不匹配则报错
**步骤2**：报价 — 显示项目名、订单号、供应商名、截止时间、采购方技术文件、物资报价表、技术文件上传

### 8.2 订单详情页（询价中）

**供应商报价进度**：横条卡片，显示每家供应商的状态（已报价/待报价）、总价、技术文件数
**报价对比**：Tab 切换模式，每 Tab 一张供应商报价表，每行物料下方 AI 参考行

### 8.3 报价链接失效页

显示失效原因、询价单号、项目名称、采购方联系人（`purchaser` + `purchaserPhone`）

---

## 九、技术注意事项

1. **Token 安全**：Token 存储在 `OrderQuote.token`，唯一索引防碰撞
2. **公司名称校验**：供应商输入后与 `OrderQuote.supplierId` 关联的 Partner.name 精确匹配
3. **报价截止**：`OrderQuote.deadline` 到期后供应商端显示「失效页」
4. **多轮报价**：每轮数据按 `round` 字段隔离，不保留同轮内修改历史
5. **选标回填**：选中一家后，该供应商的报价数据回写到 `ProcurementOrder.supplier*` 和 `OrderItem.unitPrice/totalAmount`
6. **Excel 解析**：使用 xlsx 库程序解析，直接入库，用户可在列表页编辑删除
7. **上传模板**：按 `docs/模版文件/采购单明细.xlsx` 的列结构（14列）制作模板供下载
