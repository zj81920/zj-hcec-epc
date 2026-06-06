import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { DollarSign } from 'lucide-react'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    code: string
    budget: number
    status: string
  }
  progress: number
  milestonesTotal: number
  milestonesCompleted: number
}

export function ProjectCard({
  project,
  progress,
  milestonesTotal,
  milestonesCompleted,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="rounded-lg border bg-card shadow-sm hover:border-primary hover:-translate-y-0.5 transition-all duration-200 h-full cursor-pointer flex flex-col p-4 gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm leading-snug line-clamp-2 flex-1">
            {project.name}
          </h3>
          <Badge variant="outline" className="rounded-md text-[11px] px-1.5 py-0 h-5 shrink-0">
            {project.status}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">{project.code}</p>

        <div className="flex items-center gap-1 text-sm font-medium">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          {formatCurrency(project.budget)}
        </div>

        <div className="mt-auto space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              里程碑 {milestonesCompleted}/{milestonesTotal}
            </span>
            <span className="font-medium tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
