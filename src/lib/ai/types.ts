export interface MaterialItem {
  materialName: string
  specification: string
  material: string
  materialGrade: string
  applicableStandard: string
  quantity: number
  unit: string
  sourceFile?: string
}

export interface FillSuggestion {
  requisitionItemId: string
  supplier: string
  supplierId: string | null
  unitPrice: number
  brand: string
  totalAmount: number
  deliveryDate: string | null
  confidence: {
    supplier: 'high' | 'medium' | 'low'
    unitPrice: 'high' | 'medium' | 'low'
    brand: 'high' | 'medium' | 'low'
    deliveryDate: 'high' | 'medium' | 'low'
  }
}

export interface ProjectContext {
  projectId: string
  projectType?: string
}

export interface ContractItemData {
  materialName: string
  specification: string
  material: string
  materialGrade: string
  brand: string
  quantity: number
  unit: string
  unitPrice: number
  totalAmount: number
}

export interface ContractVariables {
  taxRate: string
  totalAmount: number
  taxAmount: number
  totalAmountCN: string
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

export interface ContractGenerationParams {
  contractName: string
  buyerName: string
  buyerAddress: string
  buyerContact: string
  buyerPhone: string
  buyerBank: string
  buyerAccount: string
  buyerTaxId: string
  supplierName: string
  supplierAddress: string
  supplierContact: string
  supplierPhone: string
  supplierBank: string
  supplierAccount: string
  supplierTaxId: string
  items: ContractItemData[]
  variables: ContractVariables
}

export interface ContractSection {
  title: string
  content: string
}

export interface ContractContent {
  sections: ContractSection[]
}

export interface AIClient {
  parseMaterialsFromFile(fileBuffer: Buffer, fileName: string): Promise<MaterialItem[]>
  parseNaturalLanguage(text: string, context?: ProjectContext): Promise<MaterialItem[]>
  suggestOrderFill(items: { requisitionItemId: string; materialName: string; specification: string; quantity: number; unit: string }[], context?: ProjectContext): Promise<FillSuggestion[]>
  generateContractContent(params: ContractGenerationParams, template: string): Promise<ContractContent>
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 3) + '****' + key.slice(-4)
}
