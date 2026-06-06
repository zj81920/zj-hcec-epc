# 采购订单询价与AI参考价 — 执行计划

**关联设计文档**: `docs/superpowers/specs/2026-06-05-procurement-inquiry-reference-design.md`

---

## 任务拆解

### 阶段一：数据模型变更（Schema）

| # | 任务 | 类型 | TDD | 说明 |
|---|------|------|-----|------|
| 1.1 | ProcurementOrder 新增字段 | Schema | 否 | `procurementMethod`, `inquiryDeadline`, `purchaserPhone` |
| 1.2 | 新增 OrderQuote 模型 | Schema | 是 | 含关联关系 |
| 1.3 | 新增 OrderQuoteItem 模型 | Schema | 是 | 含关联关系 |
| 1.4 | 新增 HistoricalOrderItem 模型 | Schema | 否 | Excel 上传数据 |
| 1.5 | 运行 `npx prisma validate` + `npx prisma db push` | 验证 | 否 | Schema 生效 |
| 1.6 | 运行 `bash scripts/verify.sh` | 回归 | 否 | 确保无破坏 |

### 阶段二：历史数据管理（系统设置）

| # | 任务 | 类型 | TDD | 说明 |
|---|------|------|-----|------|
| 2.1 | 安装 xlsx 依赖 | 依赖 | 否 | `npm install xlsx @types/xlsx` |
| 2.2 | POST `/api/historical-orders/upload` — Excel 上传解析 | API | 是 | 解析后直接入库 |
| 2.3 | GET `/api/historical-orders` — 列表分页查询 | API | 是 | 支持搜索筛选 |
| 2.4 | PUT `/api/historical-orders/[id]` — 编辑单行 | API | 是 | |
| 2.5 | DELETE `/api/historical-orders/[id]` — 删除单行 | API | 是 | |
| 2.6 | GET `/api/historical-orders/template` — 下载模板 | API | 否 | |
| 2.7 | 历史数据管理页面 — 列表 + 上传 + 编辑/删除 | 页面 | 否 | `/settings/historical-orders` |

### 阶段三：AI 参考价

| # | 任务 | 类型 | TDD | 说明 |
|---|------|------|-----|------|
| 3.1 | POST `/api/ai/reference-prices` — 核心逻辑 | API | 是 | 三数据源查询 + AI 匹配 |
| 3.2 | 前端 AiReferencePrice 组件 | 组件 | 否 | 自动触发，加载态 + 展示态 |
| 3.3 | 新建/编辑订单页集成 AI 参考价列 | 页面 | 否 | 直接采购 + 询价采购共用 |

### 阶段四：询价采购核心流程

| # | 任务 | 类型 | TDD | 说明 |
|---|------|------|-----|------|
| 4.1 | POST `/api/orders/[id]/quotes` — 发起询价 | API | 是 | 为供应商生成 Token |
| 4.2 | GET `/api/orders/[id]/quotes` — 报价概览 | API | 是 | 返回各供应商报价状态 |
| 4.3 | PUT `/api/orders/[id]/quotes/[quoteId]/new-round` — 新一轮 | API | 是 | currentRound+1, 重置 status |
| 4.4 | POST `/api/orders/[id]/quotes/[quoteId]/select` — 选标 | API | 是 | 回填价格 + 更新订单状态 |

### 阶段五：供应商报价（Token 方式）

| # | 任务 | 类型 | TDD | 说明 |
|---|------|------|-----|------|
| 5.1 | POST `/api/quotes/verify` — 公司名称校验 | API | 是 | token + companyName 匹配 |
| 5.2 | GET `/api/quotes/[token]` — 获取报价信息 | API | 是 | 验证后返回订单 + 物资明细 |
| 5.3 | PUT `/api/quotes/[token]` — 暂存草稿 | API | 是 | |
| 5.4 | POST `/api/quotes/[token]/submit` — 最终提交 | API | 是 | 更新 OrderQuote.status |
| 5.5 | POST `/api/quotes/[token]/upload` — 技术文件上传 | API | 否 | |
| 5.6 | 供应商报价页（两步式） | 页面 | 否 | 公司名验证 → 报价表单 |
| 5.7 | 报价链接失效页 | 页面 | 否 | |

### 阶段六：订单页面改造

| # | 任务 | 类型 | TDD | 说明 |
|---|------|------|-----|------|
| 6.1 | 新建订单页：采购方式切换 + 供应商多选 | 页面 | 否 | direct/inquiry 切换清空逻辑 |
| 6.2 | 新建订单页：询价模式下单价禁用 | 页面 | 否 | 显示「询价后回填」 |
| 6.3 | 订单详情页：询价中状态布局 | 页面 | 否 | 供应商横条 + Tab 对比 |
| 6.4 | 订单详情页：选标按钮 + 新一轮按钮 | 页面 | 否 | |
| 6.5 | 更新订单列表页：显示采购方式 + 询价状态 | 页面 | 否 | |

### 阶段七：集成验证

| # | 任务 | 类型 | TDD | 说明 |
|---|------|------|-----|------|
| 7.1 | `npx prisma validate` + `npx prisma db push` | 验证 | 否 | |
| 7.2 | `npx next build` — 类型检查 + 构建 | 验证 | 否 | |
| 7.3 | `bash scripts/verify.sh` — 回归验证 | 回归 | 否 | |
| 7.4 | 手动完整流程验证 | 验证 | 否 | 直接采购 + 询价完整链路 |

---

## TDD 任务清单（必须按 TDD 流程执行）

以下任务必须先写测试再写实现代码：

1. **1.2** OrderQuote 模型 DB 测试
2. **1.3** OrderQuoteItem 模型 DB 测试
3. **2.2** Excel 上传解析 API 测试
4. **2.3** 历史数据列表查询 API 测试
5. **2.4** 历史数据编辑 API 测试
6. **2.5** 历史数据删除 API 测试
7. **3.1** AI 参考价 API 测试
8. **4.1** 发起询价 API 测试
9. **4.2** 报价概览 API 测试
10. **4.3** 新一轮询价 API 测试
11. **4.4** 选标 API 测试
12. **5.1** 公司名称校验 API 测试
13. **5.2** 获取报价信息 API 测试
14. **5.3** 暂存草稿 API 测试
15. **5.4** 提交报价 API 测试

---

## 执行顺序

```
阶段一（Schema）→ 阶段二（历史数据）→ 阶段三（AI参考价）
                                              ↓
阶段四（询价核心API）←──────────────────────────┘
        ↓
阶段五（供应商Token API + 页面）
        ↓
阶段六（订单页面改造）
        ↓
阶段七（集成验证）
```

---

## UI Mockup 参考文件

| 页面 | 文件 |
|------|------|
| 供应商报价页 | `supplier-quote-v3.html`（两步验证式） |
| 报价链接失效页 | `quote-link-expired.html` |
| 订单详情（询价进度） | `order-inquiry-detail.html`（Tab 对比式） |
| 新建订单（询价模式） | `order-create-inquiry.html` |
