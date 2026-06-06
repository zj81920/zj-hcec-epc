'use client'

import { useState, useEffect, useCallback } from 'react'

interface HistoricalItem {
  id: string
  seq: number | null
  materialName: string
  specification: string
  materialGrade: string
  standardCode: string
  brand: string
  unit: string
  quantity: number
  unitPrice: number
  totalAmount: number
  purchaseDate: string | null
  supplierName: string
  supplierContact: string
  supplierPhone: string
}

export default function HistoricalOrdersPage() {
  const [list, setList] = useState<HistoricalItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<HistoricalItem>>({})
  const [keyword, setKeyword] = useState('')

  const pageSize = 50

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (keyword) params.set('keyword', keyword)
      const res = await fetch(`/api/historical-orders?${params}`)
      const data = await res.json()
      setList(data.list || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }, [page, keyword])

  useEffect(() => { fetchList() }, [fetchList])

  // 上传文件
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/historical-orders/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      alert(`成功导入 ${data.count} 条数据`)
      fetchList()
    } catch (e: any) {
      alert(e.message || '上传失败')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // 编辑
  const startEdit = (item: HistoricalItem) => {
    setEditingId(item.id)
    setEditForm(item)
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      const res = await fetch(`/api/historical-orders/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error()
      setEditingId(null)
      fetchList()
    } catch {
      alert('保存失败')
    }
  }

  // 删除
  const deleteItem = async (id: string) => {
    if (!confirm('确认删除该条记录？')) return
    try {
      await fetch(`/api/historical-orders/${id}`, { method: 'DELETE' })
      fetchList()
    } catch {
      alert('删除失败')
    }
  }

  // 下载模板
  const downloadTemplate = () => {
    window.open('/api/historical-orders/template')
  }

  return (
    <div className="p-6 max-w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">历史采购数据管理</h1>
        <div className="flex gap-3">
          <button onClick={downloadTemplate} className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            下载模板
          </button>
          <label className={`px-3 py-2 bg-[#1e3a5f] text-white rounded-md text-sm cursor-pointer hover:bg-[#152e4d] ${uploading ? 'opacity-50' : ''}`}>
            {uploading ? '上传中...' : '上传 Excel'}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      {/* 搜索 */}
      <div className="mb-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
          placeholder="搜索物资名称、规格、供应商..."
          className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64"
        />
      </div>

      {/* 表格 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b">序号</th>
              <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b">物资名称</th>
              <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b">规格型号</th>
              <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b">材料牌号</th>
              <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b">品牌</th>
              <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b">单位</th>
              <th className="text-right p-2.5 text-xs font-semibold text-gray-500 border-b">数量</th>
              <th className="text-right p-2.5 text-xs font-semibold text-gray-500 border-b">单价</th>
              <th className="text-right p-2.5 text-xs font-semibold text-gray-500 border-b">总价</th>
              <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b">采购日期</th>
              <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b">供应商</th>
              <th className="text-left p-2.5 text-xs font-semibold text-gray-500 border-b">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="p-5 text-center text-gray-400">加载中...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={12} className="p-5 text-center text-gray-400">暂无数据，请上传 Excel</td></tr>
            ) : (
              list.map(item => (
                editingId === item.id ? (
                  <tr key={item.id} className="border-b border-gray-100 bg-yellow-50">
                    <td className="p-1.5"><input className="w-12 px-1 py-0.5 border rounded text-xs" value={editForm.seq ?? ''} onChange={e => setEditForm({...editForm, seq: parseInt(e.target.value) || null})} /></td>
                    <td className="p-1.5"><input className="w-28 px-1 py-0.5 border rounded text-xs" value={editForm.materialName || ''} onChange={e => setEditForm({...editForm, materialName: e.target.value})} /></td>
                    <td className="p-1.5"><input className="w-24 px-1 py-0.5 border rounded text-xs" value={editForm.specification || ''} onChange={e => setEditForm({...editForm, specification: e.target.value})} /></td>
                    <td className="p-1.5"><input className="w-16 px-1 py-0.5 border rounded text-xs" value={editForm.materialGrade || ''} onChange={e => setEditForm({...editForm, materialGrade: e.target.value})} /></td>
                    <td className="p-1.5"><input className="w-16 px-1 py-0.5 border rounded text-xs" value={editForm.brand || ''} onChange={e => setEditForm({...editForm, brand: e.target.value})} /></td>
                    <td className="p-1.5"><input className="w-10 px-1 py-0.5 border rounded text-xs" value={editForm.unit || ''} onChange={e => setEditForm({...editForm, unit: e.target.value})} /></td>
                    <td className="p-1.5"><input className="w-14 px-1 py-0.5 border rounded text-xs text-right" type="number" value={editForm.quantity || 0} onChange={e => setEditForm({...editForm, quantity: parseFloat(e.target.value) || 0})} /></td>
                    <td className="p-1.5"><input className="w-18 px-1 py-0.5 border rounded text-xs text-right" type="number" value={editForm.unitPrice || 0} onChange={e => setEditForm({...editForm, unitPrice: parseFloat(e.target.value) || 0})} /></td>
                    <td className="p-1.5 text-right text-xs">¥{(editForm.totalAmount || 0).toLocaleString()}</td>
                    <td className="p-1.5"><input className="w-20 px-1 py-0.5 border rounded text-xs" type="date" value={editForm.purchaseDate?.toString().slice(0, 10) || ''} onChange={e => setEditForm({...editForm, purchaseDate: e.target.value})} /></td>
                    <td className="p-1.5"><input className="w-24 px-1 py-0.5 border rounded text-xs" value={editForm.supplierName || ''} onChange={e => setEditForm({...editForm, supplierName: e.target.value})} /></td>
                    <td className="p-1.5 flex gap-1">
                      <button onClick={saveEdit} className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">保存</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-0.5 bg-gray-300 text-xs rounded">取消</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2.5 text-xs">{item.seq || '-'}</td>
                    <td className="p-2.5">{item.materialName}</td>
                    <td className="p-2.5">{item.specification}</td>
                    <td className="p-2.5">{item.materialGrade}</td>
                    <td className="p-2.5">{item.brand}</td>
                    <td className="p-2.5">{item.unit}</td>
                    <td className="p-2.5 text-right">{item.quantity}</td>
                    <td className="p-2.5 text-right">¥{item.unitPrice.toLocaleString()}</td>
                    <td className="p-2.5 text-right">¥{item.totalAmount.toLocaleString()}</td>
                    <td className="p-2.5 text-xs">{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '-'}</td>
                    <td className="p-2.5">{item.supplierName}</td>
                    <td className="p-2.5 flex gap-1">
                      <button onClick={() => startEdit(item)} className="px-2 py-0.5 bg-[#1e3a5f] text-white text-xs rounded">编辑</button>
                      <button onClick={() => deleteItem(item.id)} className="px-2 py-0.5 bg-red-500 text-white text-xs rounded">删除</button>
                    </td>
                  </tr>
                )
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>共 {total} 条</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-30"
            >
              上一页
            </button>
            <span className="px-3 py-1">第 {page} 页</span>
            <button
              disabled={page * pageSize >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-30"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
