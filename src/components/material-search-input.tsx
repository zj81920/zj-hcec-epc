'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface MaterialResult {
  id: string
  materialCode: string
  materialName: string
  specification: string
  material: string
  materialGrade: string
  applicableStandard: string
  unit: string
}

interface MaterialSearchInputProps {
  value: string
  onChange: (value: string) => void
  onSelect: (material: MaterialResult) => void
  placeholder?: string
}

export default function MaterialSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = '输入物料名称搜索',
}: MaterialSearchInputProps) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<MaterialResult[]>([])
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInput(val: string) {
    onChange(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/materials/search?q=${encodeURIComponent(val)}`)
        const data: MaterialResult[] = await res.json()
        setResults(data)
        setOpen(data.length > 0)
        setHighlightIdx(-1)
      } catch {
        setResults([])
        setOpen(false)
      }
    }, 300)
  }

  function handleSelect(material: MaterialResult) {
    onSelect(material)
    onChange(material.materialName)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault()
      handleSelect(results[highlightIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true) }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                i === highlightIdx ? 'bg-accent' : ''
              }`}
              onMouseDown={() => handleSelect(m)}
            >
              <span className="font-mono text-xs text-muted-foreground mr-2">{m.materialCode}</span>
              <span className="font-medium">{m.materialName}</span>
              {m.specification && <span className="text-muted-foreground ml-2">{m.specification}</span>}
              {m.materialGrade && <span className="text-muted-foreground ml-1">{m.materialGrade}</span>}
              {m.applicableStandard && <span className="text-muted-foreground ml-1">{m.applicableStandard}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
