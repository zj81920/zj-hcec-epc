'use client'

import { useEffect, useState, useCallback } from 'react'

interface RefItem {
  requisitionItemId: string
  referencePrice: number | null
  referenceSupplier: string | null
  referenceBrand: string | null
  referenceDate: string | null
  confidence: 'high' | 'medium' | 'low' | 'none'
}

/**
 * AI 参考价 Hook — 自动请求参考价数据
 */
export function useAiReferencePrice(
  projectId: string,
  items: { requisitionItemId: string; materialName: string; specification?: string; material?: string; materialGrade?: string }[]
) {
  const [refData, setRefData] = useState<Record<string, RefItem>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId || items.length === 0) return

    let cancelled = false
    setLoading(true)

    fetch('/api/ai/reference-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, items }),
    })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        const map: Record<string, RefItem> = {}
        if (data.items) {
          data.items.forEach((item: RefItem) => {
            map[item.requisitionItemId] = item
          })
        }
        setRefData(map)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [projectId, JSON.stringify(items)])

  const getRef = useCallback((requisitionItemId: string) => {
    return refData[requisitionItemId] || null
  }, [refData])

  return { getRef, loading, refData }
}

export function confidenceTag(confidence: string) {
  switch (confidence) {
    case 'high': return { label: '合理', color: 'bg-green-100 text-green-700' }
    case 'medium': return { label: '参考', color: 'bg-yellow-100 text-yellow-700' }
    case 'low': return { label: '待对比', color: 'bg-gray-100 text-gray-500' }
    default: return { label: '-', color: 'bg-gray-50 text-gray-400' }
  }
}

export type { RefItem }
