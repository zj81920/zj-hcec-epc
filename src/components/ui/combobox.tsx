"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  placeholder?: string
  value?: string
  onSelect: (value: string) => void
}

export function Combobox({ options, placeholder = "请选择...", value, onSelect }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  const selectedLabel = options.find((opt) => opt.value === value)?.label

  return (
    <Popover.Root open={open} onOpenChange={(v) => setOpen(v)}>
      <Popover.Trigger
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className={selectedLabel ? "" : "text-muted-foreground"}>
          {selectedLabel || placeholder}
        </span>
        {open ? (
          <ChevronUpIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4}>
          <Popover.Popup className="z-50 rounded-lg border bg-white shadow-lg p-1" style={{ width: "var(--anchor-width)" }}>
            <div className="px-1.5 pt-1 pb-1.5">
              <Input
                placeholder="输入供应商名称搜索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                  未找到匹配的供应商
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm rounded-sm",
                      "hover:bg-gray-100"
                    )}
                    onClick={() => {
                      onSelect(opt.value)
                      setOpen(false)
                      setSearch("")
                    }}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
