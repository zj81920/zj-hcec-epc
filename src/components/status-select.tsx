'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface StatusSelectProps {
  value: string
  options: readonly string[]
  apiUrl: string
  field: 'status' | 'businessStatus'
  disabled?: boolean
}

export function StatusSelect({ value, options, apiUrl, field, disabled }: StatusSelectProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleChange = async (newStatus: string) => {
    if (newStatus === value || loading) return
    setLoading(true)
    try {
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newStatus, _statusOnly: true }),
      })
      if (res.ok) {
        router.refresh()
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      disabled={disabled || loading}
      className="text-xs border rounded px-2 py-1 bg-background hover:bg-muted/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}
