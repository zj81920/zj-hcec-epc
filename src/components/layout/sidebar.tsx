'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PencilRuler, ShoppingCart, HardHat, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  projectId: string
}

const navItems = [
  { href: '', label: '概览', icon: LayoutDashboard, exact: true },
  { href: '/design', label: '设计管理', icon: PencilRuler },
  { href: '/procurement', label: '采购管理', icon: ShoppingCart },
  { href: '/construction', label: '施工管理', icon: HardHat },
  { href: '/hse', label: 'HSE管理', icon: ShieldCheck },
]

export function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname()
  const basePath = `/projects/${projectId}`

  return (
    <nav
      className="w-52 shrink-0 flex flex-col"
      style={{ backgroundColor: 'var(--sidebar-bg)' }}
    >
      <div className="px-4 py-3.5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sidebar-fg)', opacity: 0.6 }}>
          项目导航
        </p>
      </div>
      <div className="flex-1 p-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const fullHref = `${basePath}${href}`
          const isActive = exact
            ? pathname === basePath
            : pathname.startsWith(fullHref)
          return (
            <Link
              key={href}
              href={fullHref}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all',
              )}
              style={{
                color: isActive ? '#ffffff' : 'var(--sidebar-fg)',
                backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'
                  e.currentTarget.style.color = '#ffffff'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--sidebar-fg)'
                }
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </div>
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <p className="text-[10px]" style={{ color: 'var(--sidebar-fg)', opacity: 0.4 }}>
          HCEC-EPC v1.0
        </p>
      </div>
    </nav>
  )
}
