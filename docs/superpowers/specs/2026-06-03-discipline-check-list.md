# 专业字典 checklist

- [x] 1. Prisma Schema：Discipline 模型已加，PurchaseRequisition + ProcurementOrder 已加 discipline 字段
- [x] 2. 校验层：disciplineSchema 已加，requisitionSchema + orderSchema 已加 discipline
- [x] 3. pinyin 库已安装，discipline-utils.ts 编码生成工具函数已创建
- [x] 4. Discipline API 路由（route.ts / [id]/route.ts / list/route.ts）已完成并自动编码
- [x] 5. 数据库 Migration 执行成功（20260603045748_add_discipline）
- [x] 6. 基础信息首页 `/company/settings/basic-info/page.tsx` 已创建
- [x] 7. 专业字典管理页 `/company/settings/basic-info/disciplines/page.tsx` 已创建
- [x] 8. Topbar 导航：公司管理变为下拉菜单，含"合作方管理"和"系统设置"
- [x] 9. 请购单新建页加"专业"下拉
- [x] 10. 请购单编辑页加"专业"下拉
- [x] 11. 请购单列表页/详情页显示专业
- [x] 12. 采购订单新建页从请购单继承专业（自动）
- [x] 13. 采购订单详情页显示专业
- [x] 14. TypeScript 编译零错误
- [x] 15. 回归测试全部通过（3 文件 / 29 用例）
