'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Building2, ChevronRight, Briefcase, ChevronDown, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopbarProps {
  projectName?: string
}

export function Topbar({ projectName }: TopbarProps) {
  const [time, setTime] = useState<string>('')
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCompanyMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isCompanyPage = pathname.startsWith('/company')

  return (
    <header className="sticky top-0 z-50 h-14 bg-white border-b flex items-center px-5 gap-3 shrink-0">
      <Link href="/projects" className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: 'var(--primary)' }}>
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight" style={{ color: 'var(--primary)' }}>
            HCEC-EPC
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">项目管理系统</span>
        </div>
      </Link>

      <div className="flex items-center gap-1 ml-4">
        <Link
          href="/projects"
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            !isCompanyPage ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          项目管理
        </Link>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
              isCompanyPage ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Briefcase className="h-3.5 w-3.5" />
            公司管理
            <ChevronDown className={cn('h-3 w-3 transition-transform', companyMenuOpen && 'rotate-180')} />
          </button>
          {companyMenuOpen && (
            <div className="absolute top-full mt-1 left-0 bg-white border rounded-md shadow-lg py-1 min-w-[160px] z-50">
              <Link
                href="/company/partners"
                onClick={() => setCompanyMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors',
                  pathname === '/company/partners' && 'bg-muted text-primary'
                )}
              >
                <Users className="h-3.5 w-3.5" />
                合作方管理
              </Link>
              <Link
                href="/company/settings/basic-info"
                onClick={() => setCompanyMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors',
                  pathname.startsWith('/company/settings') && 'bg-muted text-primary'
                )}
              >
                <Settings className="h-3.5 w-3.5" />
                系统设置
              </Link>
            </div>
          )}
        </div>
      </div>

      {projectName && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          <span className="text-sm font-medium truncate max-w-[240px] text-foreground">
            {projectName}
          </span>
        </>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums font-mono bg-muted/50 px-2.5 py-1 rounded-md">
          {time}
        </span>
      </div>
    </header>
  )
}
