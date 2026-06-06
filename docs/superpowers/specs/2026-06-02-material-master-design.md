# 物料主数据设计

## 1. 概述

在请购单中引入物料主数据功能，实现物料信息的统一管理和复用。首次录入的物料自动保存到物料库，后续输入相同物料时通过搜索联想自动填充。

## 2. 数据模型

### MaterialMaster（物料主数据表）

```prisma
model MaterialMaster {
  id                 String   @id @default(uuid())
  materialCode       String   @unique
  materialName       String
  specification      String   @default("")
  material           String   @default("")
  materialGrade      String   @default("")
  applicableStandard String   @default("")
  unit               String   @default("")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([materialName])
}
```

- `materialCode` 全局唯一，格式 `MAT-XXXXXX`（复用已有 `generateMaterialCode()`）
- 通过 `materialCode` 与 `RequisitionItem.materialCode` 逻辑关联

## 3. 搜索 API

### GET /api/materials/search?q=xxx

按 `materialName` 模糊搜索，返回前 10 条匹配结果。

```typescript
// 输入: GET /api/materials/search?q=无缝
// 输出:
[
  {
    materialCode: "MAT-000001",
    materialName: "无缝钢管",
    specification: "DN100",
    material: "碳钢",
    materialGrade: "20#",
    applicableStandard: "GB/T 8163",
    unit: "米"
  },
  ...
]
```

搜索逻辑：

```typescript
const results = await db.materialMaster.findMany({
  where: {
    materialName: { contains: q },
  },
  take: 10,
  orderBy: { materialName: 'asc' },
})
```

## 4. 前端交互

### 搜索联想组件

在请购单明细行中，物料名称输入框改为搜索联想组件：

1. **用户输入** → 300ms 防抖后调用搜索 API
2. **有匹配** → 下拉列表展示匹配结果（物料编码 + 名称 + 关键属性）
3. **选中** → 自动填充：物料编码、规格、材质、牌号、标准规范、单位
4. **无匹配** → 用户手动填写所有字段

### 数据流

```
submit 时:
  for each 明细:
    if materialCode 不在 MaterialMaster 中:
      code = await generateMaterialCode()
      await db.materialMaster.create({ materialCode: code, ...字段 })
      item.materialCode = code
    else:
      item.materialCode = 已有的 materialCode
```

## 5. 影响范围

| 文件 | 改动 |
|------|------|
| prisma/schema.prisma | 新增 MaterialMaster 模型 |
| api/materials/search/route.ts | 新增搜索接口 |
| api/requisitions/route.ts | POST 新增物料库写入逻辑 |
| requisitions/new/page.tsx | 明细物料名称改为搜索联想组件 |
