'use client'

import { useState } from 'react'
import { InquiryDialog } from '@/components/inquiry-dialog'

interface InquiryDialogWrapperProps {
  orderId: string
  procurementMethod: string
  businessStatus: string
}

export function InquiryDialogWrapper({
  orderId,
  procurementMethod,
  businessStatus,
}: InquiryDialogWrapperProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  // 仅询价采购模式 + 非询价中状态时显示「发起询价」按钮
  const canStartInquiry =
    procurementMethod === 'inquiry' && businessStatus !== '询价中'

  if (!canStartInquiry) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
      >
        发起询价
      </button>
      <InquiryDialog
        orderId={orderId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onComplete={() => window.location.reload()}
      />
    </>
  )
}
