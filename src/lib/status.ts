/**
 * 请购单和订购单的状态定义
 *
 * 流程状态（status）：控制编辑/删除权限，草稿 → 已批准
 * 业务状态（businessStatus）：展示业务进度
 */

// 请购单流程状态
export const REQ_FLOW_STATUSES = ['草稿', '已批准'] as const

// 请购单业务状态（系统自动计算，但也可手动设置）
export const REQ_BUSINESS_STATUSES = ['正常', '部分采购', '关闭'] as const

// 订购单流程状态
export const ORDER_FLOW_STATUSES = ['草稿', '审批中', '已批准', '已驳回'] as const

// 订购单业务状态（手动设置）
export const ORDER_BUSINESS_STATUSES = ['询价中', '待发货', '已发货', '已完成'] as const

// 合同流程状态
export const CONTRACT_FLOW_STATUSES = ['草稿', '审批中', '已批准', '已驳回'] as const
export type ContractFlowStatus = typeof CONTRACT_FLOW_STATUSES[number]
