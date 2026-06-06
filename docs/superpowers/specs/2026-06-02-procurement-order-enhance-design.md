# 采购订单增强 + 公司管理模块设计

## 概述

本次改造涉及三大块：公司管理模块（合作方管理）的新建、采购订单新建页的全面改造、以及相关的数据模型扩展和数量回收逻辑。

---

## 一、数据模型变更

### 1.1 新增 `Partner` 模型

统一管理供应商、分包商、服务商等合作方，通过 `type` 字段区分。

```prisma
model Partner {
  id            String   @id @default(uuid())
  name          String                        // 合作方名称
  type          String                        // 类型: supplier | subcontractor | service | other
  taxId         String   @default("")          // 统一社会信用代码
  contactPerson String   @default("")          // 联系人
  phone         String   @default("")          // 电话
  email         String   @default("")          // 邮箱
  address       String   @default("")          // 地址
  qualification String   @default("")          // 资质等级
  bankName      String   @default("")          // 开户行
  bankAccount   String   @default("")          // 银行账号
  rating        Int      @default(3)           // 评级 1-5
  attachments   Json     @default("[]")        // 资质文件
  status        String   @default("启用")       // 启用 / 停用
  remark        String   @default("")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

类型分类：
| 类型 | 标签颜色 | 业务关联 |
|------|---------|---------|
| supplier | 蓝色 | 采购模块引用 |
| subcontractor | 橙色 | 施工模块引用 |
| service | 绿色 | 设计/咨询/监理等 |
| other | 灰色 | 兜底 |

### 1.2 `ProcurementOrder` 扩展字段

| 字段 | 类型 | 说明 |
|------|------|------|
| purchaser | String | 采购人 |
| deliveryAddress | String | 收货地址 |
| attachments | Json | 附件列表，格式同请购单 |
| supplierId | String? | 关联 Partner（可选） |
| supplierContact | String | 供应商联系人（从库带出可编辑） |
| supplierPhone | String | 供应商联系方式（从库带出可编辑） |

`supplier`（供应商名称）字段保留，选择 supplierId 时自动填充。

### 1.3 `OrderItem` 扩展字段

参照 `RequisitionItem` 补全 + 新增品牌：

| 字段 | 类型 | 说明 |
|------|------|------|
| materialCode | String | 物料编码 |
| material | String | 材质 |
| materialGrade | String | 材料等级 |
| applicableStandard | String | 适用标准规范号 |
| brand | String | 品牌（新增） |
| purpose | String | 用途 |
| requiredDate | DateTime? | 需求日期 |

---

## 二、公司管理模块

### 2.1 导航位置

顶层导航新增"公司管理"，与"项目管理"平级，子菜单为"合作方管理"。

### 2.2 合作方列表页

- 筛选栏：类型（全部/供应商/分包商/服务商/其他）、状态（启用/停用）、搜索框（名称/联系人）
- 表格列：名称、类型（彩色 Tag）、统一信用代码、联系人、手机、资质等级、状态、操作
- 类型 Tag 配色：供应商=蓝色、分包商=橙色、服务商=绿色、其他=灰色
- 右上角"新建合作方"按钮

### 2.3 新建/编辑合作方表单

分组排列：
- 基本信息：名称、类型、统一信用代码、资质等级
- 联系方式：联系人、手机、邮箱、地址
- 财务信息：开户行、银行账号、评级（1-5星）
- 其他：状态（启用/停用）、备注、资质文件上传区

---

## 三、采购订单新建页改造

### 3.1 页面布局

#### 区域一：订单头部信息

```
订单编号 * | 采购人 | 订单日期 *
供应商 *   | 供应商联系人 | 供应商联系方式
（下拉选择，数据源= Partner 中 type=supplier 且 status=启用）
收货地址 * | 交货日期 * | 状态
备注
```

供应商选中后自动填充联系人/联系方式，允许手动编辑。

#### 区域二：请购单选择（核心改造）

从下拉单选改为列表展示 + 可展开 + 可勾选：

- 每个请购单为一个卡片行，显示：编号、请购人、日期
- 点击展开箭头查看明细
- 明细行带复选框，字段完整显示（物料编码、名称、规格、材质、等级、标准规范号、数量、单位、用途、需求日期）
- 底部显示"已选 N 项" + "添加到订单明细"按钮
- 支持从多个请购单中挑选物资，支持一个请购单分拆到多个订单

待采购数量公式：`需求量 - 已采购数量`
- 已采购数量 = 所有关联 OrderItem 的 quantity 之和（创建即占用）

#### 区域三：订单明细表

- 完整显示从请购单带入的所有字段
- 新增"品牌"可输入字段
- 单价可编辑，自动计算小计
- 删除按钮移除不需要的行
- 底部合计金额

提交校验：单价 > 0，不允许单价为 0 的明细提交。

#### 区域四：附件上传

复用请购单附件上传的逻辑，支持上传/删除附件文件。

### 3.2 数量回收逻辑

订单创建时 → 立即占用请购单明细的数量
订单删除时 → 自动回收数量到对应请购单明细

删除订单的业务逻辑：
1. 级联删除所有 OrderItem
2. 遍历被删除的 OrderItem，对应 RequisitionItem 的可采购量增加
3. 重新计算该请购单的状态并写入数据库

### 3.3 请购单状态同步

在订单创建 API 和订单删除 API 中，操作完成后自动重新计算关联请购单的状态：

| 条件 | 状态 |
|------|------|
| 所有明细的 orderedQty = 0 | 草稿/已提交（保持原状） |
| 所有明细的 orderedQty >= quantity | 已关闭 |
| 部分明细 orderedQty > 0 且 < quantity | 部分采购 |

数据库 `status` 字段同步更新，确保列表页查询时状态准确。

---

## 四、API 变更

### 4.1 新增接口

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | /api/partners | 合作方列表（支持 type/status 筛选） |
| POST | /api/partners | 新建合作方 |
| GET | /api/partners/[id] | 合作方详情 |
| PUT | /api/partners/[id] | 编辑合作方 |
| DELETE | /api/partners/[id] | 删除合作方 |
| GET | /api/partners/list?type=supplier | 下拉选择用，只返回 id+name |
| DELETE | /api/orders/[id] | 删除订单（含数量回收逻辑） |

### 4.2 改造接口

| 方法 | 路由 | 改动 |
|------|------|------|
| POST | /api/orders | 扩展字段支持 + 创建后同步请购单状态 |

---

## 五、涉及文件清单

### 数据层
- prisma/schema.prisma — 新增 Partner 模型 + 扩展 ProcurementOrder/OrderItem
- prisma/migrations/ — 新增 migration

### API 路由
- src/app/api/partners/route.ts — 列表 + 新建
- src/app/api/partners/[id]/route.ts — 详情 + 编辑 + 删除
- src/app/api/partners/list/route.ts — 下拉选择用
- src/app/api/orders/route.ts — 改造，扩展字段 + 同步请购单状态
- src/app/api/orders/[id]/route.ts — 新增删除接口

### 页面组件
- src/app/company/partners/page.tsx — 合作方列表页
- src/app/company/partners/new/page.tsx — 新建合作方
- src/app/company/partners/[partnerId]/edit/page.tsx — 编辑合作方
- src/app/projects/[id]/procurement/orders/new/page.tsx — 全面改造

### 校验层
- src/lib/validations.ts — 新增 partnerSchema，更新 orderSchema/orderItemSchema

### 工具/共享
- 附件上传组件复用请购单的现有实现

---

## 六、不涉及的变更

- 审批工作流（暂不引入）
- 请购单列表页（不在本次范围）
- 采购订单列表页和详情页（不在本次范围，后续可单独迭代）
- 订单编辑功能（不在本次范围）
