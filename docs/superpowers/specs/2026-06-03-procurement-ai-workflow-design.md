# 采购流程审批与 AI 集成设计方案

## 1. 背景与目标

### 1.1 当前状态

- 请购单已有完整状态机：`草稿 → 已提交 → 已审批 → 部分采购 → 已关闭`
- 采购单需引用已审批的请购单才能执行采购
- **但当前没有审批工作流**，无法将请购单从"草稿"推进到"已审批"
- 存在设计管理模块，设计文件中包含物资数据（Excel BOM 表 / PDF 图纸材料明细），目前需要人工录入到请购单

### 1.2 目标

1. **建立审批占位机制**：在无真实工作流引擎的情况下，通过模拟审批接口打通"请购→审批→采购"全链路，并预留未来替换为真实工作流的集成缝
2. **AI 辅助填单**：消除重复录入工作，包括从设计文件提取物资、自然语言快速建单、采购单智能填充
3. **所有 AI 填充内容均可手动修改**，AI 只做辅助不做决策

### 1.3 非目标

- 不实现真实的工作流引擎（如 Activiti、Camunda）
- 不实现审批人配置、多级审批、会签/或签等高级工作流功能
- 不实现 AI 模型的自托管或微调

---

## 2. 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    前端 (Next.js App Router)          │
│                                                       │
│  请购单页面          采购单页面         设计文件页面    │
│  ┌─────────┐     ┌──────────┐     ┌──────────┐     │
│  │- 新建    │     │- 新建     │     │- 文件列表  │     │
│  │- 详情    │     │  (AI填充) │     │- 上传     │     │
│  │- 审批按钮 │     │- 详情    │     │          │     │
│  │- AI提取  │     │- 列表    │     │          │     │
│  │- AI建单  │     │          │     │          │     │
│  └────┬────┘     └────┬─────┘     └──────┬───┘     │
│       │               │                   │         │
└───────┼───────────────┼───────────────────┼─────────┘
        │               │                   │
        ▼               ▼                   ▼
┌─────────────────────────────────────────────────────┐
│                API Routes (Next.js)                  │
│                                                       │
│  /api/requisitions          /api/orders              │
│  ┌──────────────────┐     ┌──────────────────┐      │
│  │ POST  创建       │     │ POST  创建       │      │
│  │ GET   详情       │     │       (含status  │      │
│  │ PUT   更新(草稿) │     │        校验)     │      │
│  │ DELETE 删除      │     │ DELETE 删除       │      │
│  └───────┬──────────┘     └────────┬─────────┘      │
│          │                         │                 │
│  /api/requisitions/[id]/approve    │                 │
│  ┌──────────────────┐              │                 │
│  │ PUT  审批通过     │              │                 │
│  │      (模拟/占位)  │              │                 │
│  └──────────────────┘              │                 │
│                                     │                 │
│  /api/ai                            │                 │
│  ┌──────────────────────────────────┘                 │
│  │ POST /extract-materials  从设计文件提取物资         │
│  │ POST /parse-natural-lang 自然语言解析建单           │
│  │ POST /fill-order         采购单智能填充             │
│  └──────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────┘
        │               │                   │
        ▼               ▼                   ▼
┌─────────────────────────────────────────────────────┐
│                   Prisma ORM                         │
│                                                       │
│  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │ Purchase   │  │ Procurement│  │ DesignDocument │  │
│  │ Requisition│  │ Order      │  │ (设计文件)     │  │
│  │            │  │            │  │               │  │
│  │ status     │  │ status     │  │ fileName      │  │
│  │ discipline │  │ supplier   │  │ filePath      │  │
│  │ items[]    │  │ items[]    │  │ fileType      │  │
│  └─────┬──────┘  └─────┬──────┘  └───────┬───────┘  │
│        │               │                  │          │
│        ▼               ▼                  ▼          │
│              PostgreSQL (epc_mvp)                    │
└─────────────────────────────────────────────────────┘
```

---

## 3. 模块一：审批状态校验与模拟审批

### 3.1 采购单 API 新增 status 校验

**文件**: `src/app/api/orders/route.ts` — POST 方法

在创建采购单前，校验关联请购单的状态：

```
请求 → 查询请购单是否存在 → 校验 status === '已审批' → 通过 → 创建采购单
                                                      → 拒绝 → 返回 400 错误
```

**错误响应**:
```json
{
  "error": "只有已审批的请购单才能创建采购订单",
  "requisitionId": "xxx",
  "currentStatus": "草稿"
}
```

### 3.2 新增模拟审批 API

**文件**: `src/app/api/requisitions/[id]/approve/route.ts` — PUT 方法

**功能**:
- 将请购单 status 从当前值变为 `已审批`
- 同时生成一条操作日志（写入 remark 或未来扩展的 audit log 表）
- 仅开发/测试/预发布环境可用（通过环境变量控制）

**环境变量配置** (`.env`):
```
# 开启模拟审批（开发/测试环境）
MOCK_APPROVE_ENABLED=true
```

生产环境不设置此变量，或显式设为 `false`。approve API 启动时检查：
```
if (process.env.MOCK_APPROVE_ENABLED !== 'true' && process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: '模拟审批仅在非生产环境可用' }, { status: 403 })
}
```

**行为**:
| 当前状态 | 结果 |
|---------|------|
| 草稿 | → 已审批 |
| 已提交 | → 已审批 |
| 已审批 | 无变化（幂等） |
| 部分采购 | 拒绝（400） |
| 已关闭 | 拒绝（400） |

**请求/响应**:
```
PUT /api/requisitions/{id}/approve

Response 200:
{
  "id": "xxx",
  "status": "已审批",
  "approved": true
}

Response 400:
{
  "error": "当前状态不允许审批",
  "currentStatus": "已关闭"
}
```

### 3.3 前端改动

#### 请购单详情页
- 在 status 为 `草稿` 或 `已提交` 时，显示"审批通过"按钮
- 点击后调用 approve API，成功后刷新页面状态

#### 采购单新建页（选择请购单时）
- 请购单下拉/选择列表只列出 status 为 `已审批` 的记录
- 若无可选请购单，给出提示"暂无已审批的请购单"

### 3.4 未来迁移路径

```
现在:               将来（真实工作流）:
                                    
审批按钮 → approve API    审批按钮 → 调用工作流引擎
   ↓                           ↓
直接改 status            工作流回调 approve API
   ↓                           ↓
采购单 API 校验 ←────── 完全不变 ──────→
```

核心设计原则：**approve API 保持接口不变，只变内部实现**。采购单 API 的 status 校验永远不需要改。

---

## 4. 模块二：AI 从设计文件提取物资

### 4.1 用户操作流程

```
新建请购单页面
  │
  ├── 方式一：手动填写（现有方式）
  │
  ├── 方式二：一句话 AI 快速建单
  │     └── 输入自然语言 → AI 解析 → 填充明细
  │
  └── 方式三：从设计文件提取 ← 新增
        │
        1. 弹窗显示当前项目的设计文件列表（可筛选专业/分类）
        2. 用户选择一个或多个设计文件
        3. 调用 AI 提取 API
        4. 展示提取结果预览（物资明细表格）
        5. 用户核对：勾选/修改/增删
        6. 确认后填充到请购单明细
```

### 4.2 AI 提取 API

**文件**: `src/app/api/ai/extract-materials/route.ts` — POST

```
请求:
{
  "fileIds": ["uuid1", "uuid2"]    // DesignDocument 的 ID 列表
}

响应:
{
  "items": [
    {
      "materialName": "钢管",
      "specification": "DN150",
      "material": "碳钢",
      "materialGrade": "Q235B",
      "applicableStandard": "GB/T 3091",
      "quantity": 100,
      "unit": "米",
      "sourceFile": "配管材料表.xlsx"   // 来源文件，供追溯
    }
  ],
  "unparsedFiles": []  // 解析失败的文件列表
}
```

### 4.3 解析策略

| 文件类型 | 处理方式 |
|---------|---------|
| Excel (.xlsx/.xls) | 用 `xlsx` 库读取为结构化数据 → AI 识别列名映射关系 |
| PDF | 用 AI 视觉能力解析表格/文本 → 提取结构化物资数据 |
| Word (.docx) | 提取文本 → AI 识别物资清单段落 |
| 其他（图纸等） | 返回提示"暂不支持此文件格式的物资提取" |

**Excel vs AI 的分工**:
- Excel 解析：纯代码读取单元格数据（不需要 AI 读格子）
- AI 只做**语义映射**：识别哪列是"物料名称"、哪列是"规格"、哪列是"数量"
- 这样即使不同项目的 Excel 模板格式不同，AI 也能自适应

### 4.4 前端提取结果预览组件

```
┌──────────────────────────────────────────────────┐
│  已从以下文件提取到 N 条物资明细：                  │
│  📄 配管材料表.xlsx                               │
│  📄 管道图纸材料表.pdf                            │
│                                                   │
│  ┌────┬──────────┬────────┬──────┬──────┬──────┐  │
│  │ ☑  │ 物料名称 │ 规格   │ 材质 │ 数量 │ 单位 │  │
│  ├────┼──────────┼────────┼──────┼──────┼──────┤  │
│  │ ☑  │ 钢管     │ DN150  │ Q235B│ 100  │ 米   │  │
│  │ ☑  │ 法兰     │ DN150  │ 20#  │ 50   │ 个   │  │
│  │ ☑  │ 弯头     │ DN150  │ Q235B│ 30   │ 个   │  │
│  │ ☐  │ 异常数据 │ ...    │ ...  │ ...  │ ...  │  │← 可疑数据默认不勾选
│  └────┴──────────┴────────┴──────┴──────┴──────┘  │
│                                                   │
│  所有字段均可双击编辑                                │
│                   [取消]  [确认填充到请购单]          │
└──────────────────────────────────────────────────┘
```

**设计要点**:
- 每条明细可单独勾选（用户排除不需要的项）
- AI 认为置信度低的条目默认不勾选并标注提醒
- 所有字段支持双击编辑
- 显示来源文件，方便用户追溯

---

## 5. 模块三：AI 自然语言快速建单

### 5.1 用户操作流程

```
在新建请购单页面，顶部显示快速输入区域：

┌────────────────────────────────────────────┐
│ 💬 快速输入                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ 买50米DN150钢管Q235B，30个法兰DN150      │ │
│ │ 一批弯头20个，月底前交货                  │ │
│ └─────────────────────────────────────────┘ │
│                 [解析并填充]                  │
└────────────────────────────────────────────┘
```

### 5.2 AI 解析 API

**文件**: `src/app/api/ai/parse-natural-lang/route.ts` — POST

```
请求:
{
  "text": "买50米DN150钢管Q235B，30个法兰DN150，一批弯头20个，月底前交货",
  "projectId": "xxx"
}

响应:
{
  "items": [
    {
      "materialName": "钢管",
      "specification": "DN150",
      "materialGrade": "Q235B",
      "quantity": 50,
      "unit": "米",
      "requiredDate": "2026-06-30"
    },
    {
      "materialName": "法兰",
      "specification": "DN150",
      "quantity": 30,
      "unit": "个",
      "requiredDate": "2026-06-30"
    },
    {
      "materialName": "弯头",
      "specification": "DN150",
      "quantity": 20,
      "unit": "个",
      "requiredDate": "2026-06-30"
    }
  ],
  "unresolvedText": "一批"   // AI 无法解析的部分
}
```

### 5.3 设计要点

- 解析结果填充到明细表格后，用户可自由编辑
- 未解析的文本片段单独展示，提示用户手动补充
- AI 可结合项目上下文（如项目类型、已有物料库）推荐更完整的规格

---

## 6. 模块四：AI 采购单智能填充

### 6.1 用户操作流程

```
新建采购单页面
  │
  1. 选择已审批的请购单
  2. 勾选本次需要采购的明细（用户决策分几个单）
  3. 点击"AI 智能填充"
     │
     AI 根据历史数据分析：
     ├── 供应商 → 从该物料的采购历史中推荐
     ├── 单价   → 从历史订单取最近价格
     ├── 品牌   → 从物料库或历史订单获取
     └── 交货期 → 按项目工期推算
     │
  4. 用户核对所有 AI 填充的字段
  5. 手动修改不满意的部分
  6. 提交创建采购单
```

### 6.2 AI 填充 API

**文件**: `src/app/api/ai/fill-order/route.ts` — POST

```
请求:
{
  "projectId": "xxx",
  "items": [
    {
      "requisitionItemId": "xxx",
      "materialName": "钢管",
      "specification": "DN150",
      "quantity": 60,
      "unit": "米"
    }
  ]
}

响应:
{
  "items": [
    {
      "requisitionItemId": "xxx",
      "supplier": "测试供应商A",
      "supplierId": "xxx",
      "unitPrice": 85.5,
      "brand": "宝钢",
      "totalAmount": 5130,
      "deliveryDate": "2026-06-30",
      "confidence": {           // 置信度标记
        "supplier": "high",     // high: 有历史数据
        "unitPrice": "high",    // medium: 类似物料参考
        "brand": "high",        // low: 无参考数据
        "deliveryDate": "medium"
      }
    }
  ]
}
```

### 6.3 数据来源优先级

| 填充字段 | 数据来源（按优先级） |
|---------|-------------------|
| 供应商 | ① 该物料历史采购单 → ② 同类物料历史采购单 → ③ 留空 |
| 单价 | ① 该物料最近订单价 → ② 同类物料平均价 → ③ 留空 |
| 品牌 | ① MaterialMaster 物料库默认品牌 → ② 历史订单品牌 → ③ 留空 |
| 交货期 | ① 请购明细的 requiredDate → ② 项目工期推算 → ③ 留空 |

### 6.4 前端交互

- AI 填充的字段用**特殊背景色**标记（如浅蓝色），区别于用户手动输入
- 每个字段旁边显示置信度图标：🟢 高 / 🟡 中 / ⚪ 低
- 用户修改后背景色恢复正常，表示"已人工确认"
- 所有字段均可编辑，AI 不做任何锁定

---

## 7. AI 模型接入方案

### 7.1 模型选择

采用大语言模型 API 调用方式，不自行部署模型：

| 场景 | 推荐模型 | 原因 |
|------|---------|------|
| 设计文件提取（Excel） | Claude / GPT-4o | 需要理解表格结构和语义映射 |
| 设计文件提取（PDF） | GPT-4o / Claude Sonnet | 需要视觉理解能力解析图纸表格 |
| 自然语言建单 | Claude / GPT-4o | 需要语义解析和结构化输出 |
| 采购单填充 | Claude / GPT-4o | 需要理解数据关联和推荐 |

### 7.2 模型配置管理

#### 7.2.1 数据模型

在 Prisma 中新增 `AiModelConfig` 表：

```prisma
model AiModelConfig {
  id           String   @id @default(uuid())
  provider     String   @default("openai")   // 提供商: openai / anthropic / azure / custom
  label        String                        // 显示名称，如 "GPT-4o 主模型"
  apiEndpoint  String   @default("")         // API 端点
  apiKey       String   @default("")         // API 密钥（加密存储）
  modelName    String   @default("")         // 模型名称，如 gpt-4o / claude-sonnet-4
  capabilities String   @default("extract,nlp,fill") // 能力标签，逗号分隔
  isActive     Boolean  @default(false)      // 是否激活，同一时刻只有一个激活
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

字段说明：

| 字段 | 说明 |
|------|------|
| `provider` | 提供商类型，用于构造不同的 API 请求格式 |
| `label` | 用户自定义的显示名称，便于识别 |
| `apiEndpoint` | API 地址，支持自定义中转地址 |
| `apiKey` | 密钥，存储时做对称加密 |
| `modelName` | 模型名，如 `gpt-4o`、`claude-sonnet-4-20250514` |
| `capabilities` | 该模型用于哪些场景，可选值: `extract`(文件提取)、`nlp`(自然语言建单)、`fill`(采购单填充) |
| `isActive` | 是否当前激活的配置，AI 客户端运行时读取此配置 |

#### 7.2.2 API 路由

| 方法 | 路由 | 功能 |
|------|------|------|
| GET | `/api/settings/ai-models` | 获取所有模型配置列表 |
| POST | `/api/settings/ai-models` | 新增模型配置 |
| PUT | `/api/settings/ai-models/[id]` | 编辑模型配置 |
| DELETE | `/api/settings/ai-models/[id]` | 删除模型配置 |
| POST | `/api/settings/ai-models/[id]/test` | 测试连接（发送简单请求验证连通性） |
| POST | `/api/settings/ai-models/activate` | 切换激活的模型配置 |

#### 7.2.3 前端设置页面

在系统设置中新增"AI 模型配置"页面，入口放在侧边栏或系统设置菜单下：

```
系统设置
  ├── 通用设置
  ├── AI 模型配置  ← 新增
  └── ...
```

页面布局：

```
┌─ AI 模型配置 ────────────────────────────────────┐
│                                                    │
│  [新增配置]                                         │
│                                                    │
│  ┌────────────────────────────────────────────────┐│
│  │ 已激活 → GPT-4o 主模型                  [...]  ││
│  │  提供商: OpenAI  |  模型: gpt-4o               ││
│  │  能力: 文件提取 · 自然语言建单 · 采购单填充      ││
│  │                                    [测试] [编辑] ││
│  ├────────────────────────────────────────────────┤│
│  │ Claude 辅助模型                        [...]  ││
│  │  提供商: Anthropic  |  模型: claude-sonnet-4   ││
│  │  能力: 文件提取 · 自然语言建单                  ││
│  │                              [激活] [测试] [编辑]││
│  └────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────┘
```

新增/编辑表单：

```
┌─ 编辑模型配置 ──────────────────────────────┐
│                                              │
│  显示名称 *  [GPT-4o 主模型                ] │
│  提供商    [OpenAI        ▾]                │
│  API 端点  [https://api.openai.com/v1      ] │
│  API 密钥  [sk-********************        ] │
│  模型名称  [gpt-4o                        ] │
│  能力       ☑ 设计文件提取                   │
│             ☑ 自然语言建单                   │
│             ☑ 采购单填充                     │
│                                              │
│               [取消]  [保存并激活]            │
└──────────────────────────────────────────────┘
```

#### 7.2.4 AI 客户端读取配置

```typescript
// src/lib/ai/client.ts
async function getActiveAIClient(): Promise<AIClient> {
  // 从数据库读取激活的模型配置
  const config = await db.aiModelConfig.findFirst({
    where: { isActive: true },
  })

  if (!config) {
    throw new Error('未配置 AI 模型，请在系统设置中配置')
  }

  // 根据 provider 返回对应的客户端实现
  switch (config.provider) {
    case 'openai':
      return new OpenAIClient(config)
    case 'anthropic':
      return new AnthropicClient(config)
    case 'azure':
      return new AzureClient(config)
    default:
      return new OpenAIClient(config) // 兼容 OpenAI API 的自定义端点
  }
}
```

**API 密钥加密存储**：使用系统级密钥对 API Key 做 AES 加密后再存入数据库，前端展示时只显示掩码（`sk-****...****`）。

#### 7.2.5 测试连接

点击"测试连接"时，用当前配置向模型发送一个最简单的请求（如 `"Say 'ok'"`），验证：
1. API 端点是否可达
2. API Key 是否有效
3. 模型名是否存在

测试结果即时显示：🟢 连接成功 / 🔴 连接失败（显示错误详情）

### 7.3 API 接入层设计

**文件**: `src/lib/ai/client.ts`

抽象一个 AI 客户端层，统一管理 API 调用：

```typescript
// 统一 AI 调用接口
interface AIClient {
  parseMaterialsFromFile(fileBuffer: Buffer, fileName: string): Promise<MaterialItem[]>
  parseNaturalLanguage(text: string, context?: ProjectContext): Promise<MaterialItem[]>
  suggestOrderFill(items: OrderItem[], context?: ProjectContext): Promise<FillSuggestion[]>
}
```

**设计要点**:
- 抽象接口，运行时从数据库读取活跃配置来实例化具体客户端
- 所有调用超时控制（30s），避免请求卡死
- 文件上传到 AI 时做大小限制（Excel < 10MB, PDF < 20MB）
- 支持流式输出（SSE）给前端展示实时解析进度

### 7.4 错误处理

| 异常情况 | 处理方式 |
|---------|---------|
| AI 服务不可用 | 降级为手动填写，提示"AI 服务暂不可用" |
| 解析超时 | 返回超时错误，建议手动或稍后重试 |
| 部分解析成功 | 返回成功部分 + 失败的文件列表 |
| 内容不完整 | 标注置信度低的字段，由用户补充 |

---

## 8. 安全性考虑

| 关注点 | 措施 |
|-------|------|
| 模拟审批环境限制 | approve API 仅在非生产环境可用（`NODE_ENV !== 'production'` 或 `MOCK_APPROVE_ENABLED=true`） |
| AI 数据外泄 | 明确不使用用户数据训练模型，API 调用不做数据持久化 |
| 文件访问控制 | AI 提取时只能访问当前项目下的设计文件，校验 projectId |
| 用户确认机制 | AI 填充的所有数据必须经用户确认才能提交 |

---

## 9. 实现优先级

| 阶段 | 内容 | 依赖 |
|-----|------|------|
| **P0** | 审批状态校验 + 模拟审批 API + 前端审批按钮 | 无 |
| **P0** | 采购单新建页过滤请购单（仅显示已审批） | P0 |
| **P0** | AI 模型配置管理（数据模型 + API + 前端设置页） | 无 |
| **P1** | AI 设计文件提取（先支持 Excel，后支持 PDF） | P0 模型配置 |
| **P1** | AI 采购单智能填充 | P0 审批 + P0 模型配置 |
| **P2** | AI 自然语言快速建单 | P0 模型配置 |

---

## 10. 测试策略

### 10.1 审批流程测试
```
创建请购单（草稿）→ 调用 approve API → 验证 status = '已审批'
→ 创建采购单 → 验证成功
→ 尝试用草稿状态的请购单创建采购单 → 验证被拒绝
```

### 10.2 AI 功能测试
- Excel 提取：准备不同模板的测试 Excel 文件，验证提取准确率
- 自然语言：准备典型的工程采购用语，验证解析正确性
- 采购单填充：准备历史订单数据，验证推荐合理性

### 10.3 降级测试
- AI 服务不可用时，手动填写功能不影响
- approve API 在生产环境返回 403
