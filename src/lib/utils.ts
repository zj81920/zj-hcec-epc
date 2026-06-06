import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const PROJECT_STATUS_MAP: Record<string, string> = {
  '前期': '前期阶段',
  '在建': '在建中',
  '暂停': '已暂停',
  '竣工': '已竣工',
  '结算': '结算中',
}

export const MILESTONE_STATUS_MAP: Record<string, string> = {
  '未开始': '未开始',
  '进行中': '进行中',
  '已完成': '已完成',
  '延期': '已延期',
}

export const LIAISON_STATUS_MAP: Record<string, string> = {
  '待回复': '待回复',
  '已回复': '已回复',
  '已关闭': '已关闭',
}

export const REQUISITION_STATUS_MAP: Record<string, string> = {
  '草稿': '草稿',
  '审批中': '审批中',
  '已批准': '已批准',
  '已驳回': '已驳回',
  '部分采购': '部分采购',
  '已关闭': '已关闭',
}

export const ORDER_STATUS_MAP: Record<string, string> = {
  '草稿': '草稿',
  '审批中': '审批中',
  '已批准': '已批准',
  '已驳回': '已驳回',
  '询价中': '询价中',
  '待发货': '待发货',
  '已发货': '已发货',
  '已完成': '已完成',
}

export const CONSTRUCTION_STATUS_MAP: Record<string, string> = {
  '待施工': '待施工',
  '施工中': '施工中',
  '已完工': '已完工',
  '验收中': '验收中',
}

export const HSE_INCIDENT_SEVERITY_MAP: Record<string, string> = {
  '轻微': '轻微',
  '一般': '一般',
  '严重': '严重',
  '重大': '重大',
}

export const HSE_INCIDENT_TYPE_MAP: Record<string, string> = {
  '人员伤害': '人员伤害',
  '财产损失': '财产损失',
  '环境事件': '环境事件',
  '未遂事件': '未遂事件',
  '其他': '其他',
}

export const HSE_INSPECTION_STATUS_MAP: Record<string, string> = {
  '待整改': '待整改',
  '整改中': '整改中',
  '已关闭': '已关闭',
}

export const DESIGN_DISCIPLINE_MAP: Record<string, string> = {
  '工艺': '工艺',
  '配管': '配管',
  '设备': '设备',
  '仪表': '仪表',
  '电气': '电气',
  '结构': '结构',
  '建筑': '建筑',
  '给排水': '给排水',
  '暖通': '暖通',
  '其他': '其他',
}

export const DESIGN_CATEGORY_MAP: Record<string, string> = {
  '设计图纸': '设计图纸',
  '计算书': '计算书',
  '规格书': '规格书',
  '变更单': '变更单',
  '其他': '其他',
}

export const CONSTRUCTION_DOC_CATEGORY_MAP: Record<string, string> = {
  '施工日志': '施工日志',
  '施工方案': '施工方案',
  '验收记录': '验收记录',
  '检测报告': '检测报告',
  '其他': '其他',
}
