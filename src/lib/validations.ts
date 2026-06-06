import { z } from 'zod'

export const projectSchema = z.object({
  name: z.string().min(1, '请输入项目名称'),
  code: z.string().min(1, '请输入项目编码'),
  type: z.string().default('EPC'),
  location: z.string().default(''),
  startDate: z.coerce.date({ message: '请选择开始日期' }),
  endDate: z.coerce.date({ message: '请选择结束日期' }),
  budget: z.coerce.number().min(0).default(0),
  status: z.string().default('前期'),
  description: z.string().default(''),
})

export type ProjectFormValues = z.infer<typeof projectSchema>

export const designDocSchema = z.object({
  projectId: z.string(),
  fileName: z.string().min(1, '请输入文件名'),
  filePath: z.string(),
  fileSize: z.number(),
  fileType: z.string().default('pdf'),
  discipline: z.string().default('其他'),
  category: z.string().default('设计图纸'),
  version: z.number().default(1),
  uploadedBy: z.string().default(''),
})

export type DesignDocFormValues = z.infer<typeof designDocSchema>

export const liaisonSchema = z.object({
  projectId: z.string(),
  liaisonNo: z.string().min(1, '请输入联络单编号'),
  title: z.string().min(1, '请输入标题'),
  sender: z.string().default(''),
  receiver: z.string().default(''),
  content: z.string().default(''),
  replyContent: z.string().default(''),
  status: z.string().default('待回复'),
})

export type LiaisonFormValues = z.infer<typeof liaisonSchema>

export const reviewSchema = z.object({
  projectId: z.string(),
  reviewNo: z.string().min(1, '请输入会审编号'),
  title: z.string().min(1, '请输入标题'),
  reviewDate: z.coerce.date({ message: '请选择会审日期' }),
  participants: z.string().default(''),
  conclusions: z.string().default(''),
})

export type ReviewFormValues = z.infer<typeof reviewSchema>

export const requisitionItemSchema = z.object({
  materialCode: z.string().optional(),
  materialName: z.string().min(1, '请输入物料名称'),
  specification: z.string().default(''),
  material: z.string().default(''),
  materialGrade: z.string().default(''),
  applicableStandard: z.string().default(''),
  quantity: z.coerce.number().min(0.01, '数量必须大于0'),
  unit: z.string().min(1, '请选择单位'),
  purpose: z.string().default(''),
  requiredDate: z.coerce.date().nullable().optional(),
  status: z.string().default('待采购'),
})

export type RequisitionItemFormValues = z.infer<typeof requisitionItemSchema>

export const requisitionSchema = z.object({
  projectId: z.string(),
  reqNo: z.string().optional(),
  reqDate: z.coerce.date({ message: '请选择请购日期' }),
  requester: z.string().default(''),
  procurementCategory: z.string().default('设备'),
  demandType: z.string().default('正常采购'),
  discipline: z.string().default(''),
  status: z.string().default('草稿'),
  remark: z.string().default(''),
  attachments: z.array(z.object({
    fileName: z.string(),
    filePath: z.string(),
    fileSize: z.number(),
    fileType: z.string(),
  })).default([]),
  items: z.array(requisitionItemSchema).min(1, '请至少添加一个采购明细'),
})

export type RequisitionFormValues = z.infer<typeof requisitionSchema>

export const disciplineSchema = z.object({
  name: z.string().min(1, '请输入专业名称'),
  code: z.string().default(''),
  sortOrder: z.coerce.number().default(0),
  status: z.string().default('启用'),
})

export type DisciplineFormValues = z.infer<typeof disciplineSchema>

export const partnerSchema = z.object({
  name: z.string().min(1, '请输入合作方名称'),
  type: z.string().min(1, '请选择类型'),
  taxId: z.string().default(''),
  contactPerson: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().default(''),
  address: z.string().default(''),
  qualification: z.string().default(''),
  bankName: z.string().default(''),
  bankAccount: z.string().default(''),
  rating: z.coerce.number().min(1).max(5).default(3),
  attachments: z.array(z.object({
    fileName: z.string(),
    filePath: z.string(),
    fileSize: z.number(),
    fileType: z.string(),
  })).default([]),
  status: z.string().default('启用'),
  remark: z.string().default(''),
})

export type PartnerFormValues = z.infer<typeof partnerSchema>

export const orderItemSchema = z.object({
  requisitionItemId: z.string(),
  materialName: z.string().min(1, '请输入物料名称'),
  specification: z.string().default(''),
  materialCode: z.string().default(''),
  material: z.string().default(''),
  materialGrade: z.string().default(''),
  applicableStandard: z.string().default(''),
  brand: z.string().default(''),
  purpose: z.string().default(''),
  quantity: z.coerce.number().min(0.01, '数量必须大于0'),
  unit: z.string().default(''),
  unitPrice: z.coerce.number().min(0, '单价必须大于等于0'),
  totalAmount: z.coerce.number().min(0).default(0),
  requiredDate: z.coerce.date().nullable().optional(),
})

export type OrderItemFormValues = z.infer<typeof orderItemSchema>

export const orderSchema = z.object({
  projectId: z.string(),
  orderNo: z.string().min(1, '请输入订单编号'),
  requisitionId: z.string().min(1, '请选择关联请购单'),
  purchaser: z.string().default(''),
  deliveryAddress: z.string().default(''),
  attachments: z.array(z.object({
    fileName: z.string(),
    filePath: z.string(),
    fileSize: z.number(),
    fileType: z.string(),
  })).default([]),
  supplierId: z.string().nullable().optional(),
  supplier: z.string().default(''),
  supplierContact: z.string().default(''),
  supplierPhone: z.string().default(''),
  discipline: z.string().default(''),
  orderDate: z.coerce.date({ message: '请选择订单日期' }),
  deliveryDate: z.coerce.date({ message: '请选择交货日期' }),
  totalAmount: z.coerce.number().min(0).default(0),
  status: z.string().default('草稿'),
  remark: z.string().default(''),
  procurementMethod: z.string().default('direct'),
  purchaserPhone: z.string().min(1, '请输入采购人电话'),
  purchaserEmail: z.string().default(''),
  items: z.array(orderItemSchema).min(1, '请至少添加一个采购明细'),
})

export type OrderFormValues = z.infer<typeof orderSchema>

export const constructionTaskSchema = z.object({
  projectId: z.string(),
  taskName: z.string().min(1, '请输入任务名称'),
  workArea: z.string().default(''),
  planStartDate: z.coerce.date({ message: '请选择计划开始日期' }),
  planEndDate: z.coerce.date({ message: '请选择计划结束日期' }),
  actualEndDate: z.coerce.date().nullable().optional(),
  progress: z.coerce.number().min(0).max(100).default(0),
  contractor: z.string().default(''),
  status: z.string().default('待施工'),
  remark: z.string().default(''),
})

export type ConstructionTaskFormValues = z.infer<typeof constructionTaskSchema>

export const constructionDocSchema = z.object({
  projectId: z.string(),
  docNo: z.string().min(1, '请输入资料编号'),
  docName: z.string().min(1, '请输入资料名称'),
  category: z.string().default('施工日志'),
  relatedTask: z.string().default(''),
  filePath: z.string(),
  fileSize: z.number(),
  uploadedBy: z.string().default(''),
})

export type ConstructionDocFormValues = z.infer<typeof constructionDocSchema>

export const hseIncidentSchema = z.object({
  projectId: z.string(),
  incidentNo: z.string().min(1, '请输入事件编号'),
  incidentDate: z.coerce.date({ message: '请选择发生日期' }),
  location: z.string().default(''),
  type: z.string().default('其他'),
  severity: z.string().default('轻微'),
  description: z.string().default(''),
  cause: z.string().default(''),
  correctiveAction: z.string().default(''),
  status: z.string().default('处理中'),
})

export type HseIncidentFormValues = z.infer<typeof hseIncidentSchema>

export const hseInspectionSchema = z.object({
  projectId: z.string(),
  inspectionDate: z.coerce.date({ message: '请选择检查日期' }),
  inspector: z.string().default(''),
  area: z.string().default(''),
  findings: z.string().default(''),
  rectification: z.string().default(''),
  deadline: z.coerce.date({ message: '请选择整改期限' }),
  status: z.string().default('待整改'),
})

export type HseInspectionFormValues = z.infer<typeof hseInspectionSchema>

export const hseTrainingSchema = z.object({
  projectId: z.string(),
  trainingDate: z.coerce.date({ message: '请选择培训日期' }),
  topic: z.string().min(1, '请输入培训主题'),
  trainer: z.string().default(''),
  location: z.string().default(''),
  participantCount: z.coerce.number().min(0).default(0),
  participants: z.string().default(''),
  content: z.string().default(''),
})

export type HseTrainingFormValues = z.infer<typeof hseTrainingSchema>

export const milestoneSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, '请输入里程碑名称'),
  plannedDate: z.coerce.date({ message: '请选择计划日期' }),
  actualDate: z.coerce.date().nullable().optional(),
  weight: z.coerce.number().min(0).max(100).default(0),
  status: z.string().default('未开始'),
  sortOrder: z.coerce.number().default(0),
})

export type MilestoneFormValues = z.infer<typeof milestoneSchema>

// ---------- AI 模型配置 ----------
export const aiModelConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'azure', 'custom']).default('openai'),
  label: z.string().min(1, '请输入显示名称'),
  apiEndpoint: z.string().default(''),
  apiKey: z.string().default(''),
  modelName: z.string().default(''),
  capabilities: z.string().default('extract,nlp,fill'),
  isActive: z.boolean().default(false),
})

export type AiModelConfigFormValues = z.infer<typeof aiModelConfigSchema>

// 执行单位校验
export const executingUnitSchema = z.object({
  name: z.string().min(1, '请输入单位名称'),
  address: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  bankName: z.string().optional().default(''),
  bankAccount: z.string().optional().default(''),
  taxId: z.string().optional().default(''),
  status: z.string().optional().default('启用'),
})

export const executingUnitUpdateSchema = executingUnitSchema.partial()

export type ExecutingUnitFormValues = z.infer<typeof executingUnitSchema>
