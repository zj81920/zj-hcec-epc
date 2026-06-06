'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

interface MaterialItem {
  requisitionItemId: string
  materialName: string
  specification: string
  material: string
  materialGrade: string
  unit: string
  quantity: number
  requiredDate: string | null
  brand: string
  unitPrice: number | null
  totalAmount: number | null
  remark: string
}

interface QuoteData {
  orderNo: string
  projectName: string
  supplierName: string
  currentRound: number
  deadline: string | null
  purchaser: string
  purchaserPhone: string
  purchaserEmail: string
  attachments: any[]
  quoteAttachments?: any[]
  materials: MaterialItem[]
  status: string
}

export default function QuotePage() {
  const params = useParams()
  const token = params?.token as string

  const [step, setStep] = useState<'verify' | 'quote' | 'expired'>('verify')
  const [companyName, setCompanyName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null)
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; path: string; size: number }>>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 公司名称校验
  const handleVerify = async () => {
    if (!companyName.trim()) return
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/quotes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, companyName: companyName.trim() }),
      })
      const data = await res.json()

      if (res.status === 403) {
        if (data.expired) {
          setStep('expired')
          setQuoteData({ ...data } as any)
        } else {
          setErrorMsg(data.reason || '公司名称不匹配')
        }
        return
      }

      if (!res.ok) throw new Error(data.error)

      // 验证通过，加载报价数据
      const quoteRes = await fetch(`/api/quotes/${token}`)
      if (quoteRes.status === 410) {
        setStep('expired')
        return
      }
      const quoteData = await quoteRes.json()
      setQuoteData(quoteData)
      setMaterials(quoteData.materials)
      if (quoteData.quoteAttachments && Array.isArray(quoteData.quoteAttachments)) {
        setUploadedFiles(quoteData.quoteAttachments)
      }
      setStep('quote')
    } catch (e: any) {
      setErrorMsg(e.message || '验证失败')
    } finally {
      setLoading(false)
    }
  }

  // 更新物料报价
  const updateMaterial = (index: number, field: string, value: any) => {
    const updated = [...materials]
    updated[index] = { ...updated[index], [field]: value }
    // 自动计算小计
    if (field === 'unitPrice') {
      updated[index].totalAmount = (value || 0) * updated[index].quantity
    }
    setMaterials(updated)
  }

  // 暂存草稿
  const saveDraft = async () => {
    setSaving(true)
    try {
      await fetch(`/api/quotes/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: materials, attachments: uploadedFiles }),
      })
    } finally {
      setSaving(false)
    }
  }

  // 上传文件
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/quotes/${token}/upload`, { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '上传失败')
      }
      const uploaded = await res.json()
      setUploadedFiles(prev => [...prev, uploaded])
    } catch (e: any) {
      alert(e.message || '上传失败')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // 提交报价
  const handleSubmit = async () => {
    // 先保存
    await saveDraft()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/quotes/${token}/submit`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '提交失败')
        return
      }
      alert('报价已提交成功！')
      window.location.reload()
    } finally {
      setSubmitting(false)
    }
  }

  // 失效页
  if (step === 'expired') {
    return (
      <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-10 max-w-md text-center shadow-md">
          <div className="text-5xl mb-5">⏰</div>
          <h1 className="text-lg font-bold text-gray-800 mb-2">报价链接已失效</h1>
          <p className="text-sm text-gray-500 mb-6">该询价链接已过期或已被采购方关闭。</p>
          {quoteData && (
            <div className="text-left space-y-2 mb-6 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">询价单号</span><span className="font-medium">{(quoteData as any).orderNo || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">项目名称</span><span className="font-medium">{(quoteData as any).projectName || '-'}</span></div>
              {quoteData.purchaser && quoteData.purchaserPhone && (
                <div className="pt-4 mt-2 border-t text-center text-gray-500">
                  如有疑问，请联系：{quoteData.purchaser} {quoteData.purchaserPhone}
                  {quoteData.purchaserEmail && <> / {quoteData.purchaserEmail}</>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 验证页
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center shadow-md">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="text-lg font-bold text-gray-800 mb-1">供应商身份验证</h1>
          <p className="text-sm text-gray-400 mb-6">请输入贵公司全称以验证报价身份。</p>

          <div className="bg-gray-50 border rounded-lg p-4 text-left text-sm mb-5">
            <div className="flex justify-between py-1"><span className="text-gray-400">项目名称</span><span className="font-medium">-</span></div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 mb-4 text-left">
              {errorMsg}
            </div>
          )}

          <div className="text-left mb-5">
            <label className="block text-sm font-medium text-gray-600 mb-1">公司全称</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder="请输入贵公司完整名称"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 outline-none"
              autoComplete="off"
            />
            <p className="text-xs text-gray-400 mt-1">请与营业执照上的公司全称一致</p>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !companyName.trim()}
            className="w-full bg-[#1e3a5f] text-white py-3 rounded-md font-semibold text-sm hover:bg-[#152e4d] disabled:bg-gray-300 transition"
          >
            {loading ? '验证中...' : '验证并进入报价'}
          </button>
        </div>
      </div>
    )
  }

  // 报价页
  const totalAmount = materials.reduce((sum, m) => sum + (m.totalAmount || 0), 0)

  return (
    <div className="min-h-screen bg-[#f5f0eb] p-6">
      <div className="max-w-6xl mx-auto">
        {/* 项目头部 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-800">{quoteData?.projectName}</h1>
              <p className="text-sm text-gray-500">询价单号：{quoteData?.orderNo} · 供应商：<span className="font-semibold text-[#1e3a5f]">{quoteData?.supplierName}</span></p>
            </div>
            <div className="text-right text-sm">
              <p className="text-gray-500">报价轮次：第 {quoteData?.currentRound} 轮</p>
              {quoteData?.deadline && <p className="text-red-600 font-semibold">截止时间：{new Date(quoteData.deadline).toLocaleString()}</p>}
            </div>
          </div>
        </div>

        {/* 操作提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-sm text-blue-700">
          请在截止时间前完成报价，截止前可多次修改，以最后一次提交为准。
        </div>

        {/* 采购方技术文件 */}
        {quoteData?.attachments && Array.isArray(quoteData.attachments) && quoteData.attachments.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-5 text-sm">
            <span className="font-semibold text-yellow-800">采购方技术文件</span>
            <div className="flex gap-3 mt-2 flex-wrap">
              {quoteData.attachments.map((att: any, i: number) => (
                <a key={i} href={`/api/files/${att.filePath || att.path || att.url}`} target="_blank" className="bg-white px-3 py-1.5 border rounded-md text-[#1e3a5f] underline text-xs">
                  {att.fileName || att.name || `附件${i + 1}`}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 物资明细报价表 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5 overflow-x-auto">
          <h3 className="font-semibold text-gray-800 mb-4">物资报价明细</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b-2">物料名称</th>
                <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b-2">规格型号</th>
                <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b-2">材质</th>
                <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b-2">单位</th>
                <th className="text-right p-2.5 text-xs font-semibold text-gray-500 border-b-2">数量</th>
                <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b-2">要求到货</th>
                <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b-2">品牌</th>
                <th className="text-right p-2.5 text-xs font-semibold text-gray-500 border-b-2">单价(元)</th>
                <th className="text-right p-2.5 text-xs font-semibold text-gray-500 border-b-2">小计</th>
                <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b-2">备注</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="p-2.5">{m.materialName}</td>
                  <td className="p-2.5">{m.specification}</td>
                  <td className="p-2.5">{m.material} {m.materialGrade}</td>
                  <td className="p-2.5">{m.unit}</td>
                  <td className="p-2.5 text-right">{m.quantity}</td>
                  <td className="p-2.5 text-red-600 text-xs">{m.requiredDate ? new Date(m.requiredDate).toLocaleDateString() : '-'}</td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={m.brand}
                      onChange={(e) => updateMaterial(i, 'brand', e.target.value)}
                      className="w-20 px-1.5 py-1 border border-gray-300 rounded text-xs"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      value={m.unitPrice ?? ''}
                      onChange={(e) => updateMaterial(i, 'unitPrice', parseFloat(e.target.value) || null)}
                      className="w-24 px-1.5 py-1 border border-gray-300 rounded text-xs text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="p-2.5 text-right font-semibold">¥{(m.totalAmount || 0).toLocaleString()}</td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={m.remark}
                      onChange={(e) => updateMaterial(i, 'remark', e.target.value)}
                      className="w-24 px-1.5 py-1 border border-gray-200 rounded text-xs"
                      placeholder="选填"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 技术文件上传 */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-5 mb-5">
          <div className="text-sm font-semibold text-gray-600 mb-3">技术文件</div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-md text-sm hover:border-[#1e3a5f] transition disabled:opacity-50"
          >
            {uploading ? '上传中...' : '选择文件上传'}
          </button>
          {uploadedFiles.length > 0 && (
            <div className="mt-3 text-left">
              <p className="text-xs text-gray-500 mb-1">已上传文件：</p>
              {uploadedFiles.map((f: any, i) => (
                <div key={i} className="text-xs text-[#1e3a5f] py-0.5">
                  <a href={`/api/files/${f.path || f.filePath}`} target="_blank" className="underline">{f.name || f.fileName}</a>
                  <span className="text-gray-400 ml-2">({((f.size || f.fileSize || 0) / 1024).toFixed(1)} KB)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 总计 + 操作 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 flex justify-between items-center">
          <div className="text-sm text-gray-500">报价总计</div>
          <div className="text-xl font-bold text-[#1e3a5f]">¥ {totalAmount.toLocaleString()}</div>
          <div className="flex gap-3">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? '保存中...' : '暂存草稿'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-md text-sm font-semibold hover:bg-[#152e4d] disabled:opacity-50"
            >
              {submitting ? '提交中...' : '提交报价'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
