import Link from 'next/link'
import { db } from '@/lib/db'
import { Plus, Building2, Construction, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Topbar } from '@/components/layout/topbar'
import { ProjectCard } from '@/components/projects/project-card'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: { milestones: { select: { weight: true, status: true } } },
  })

  const totalCount = projects.length
  const inProgressCount = projects.filter((p) => p.status === '在建').length
  const completedCount = projects.filter((p) => p.status === '竣工').length

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">项目列表</h1>
          <Link href="/projects/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              新建项目
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card shadow-sm p-4 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary/70" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{totalCount}</p>
              <p className="text-xs text-muted-foreground">项目总数</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card shadow-sm p-4 flex items-center gap-3">
            <Construction className="h-8 w-8 text-blue-500/70" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">在建项目</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card shadow-sm p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500/70" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{completedCount}</p>
              <p className="text-xs text-muted-foreground">已竣工</p>
            </div>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg mb-2">暂无项目</p>
            <p className="text-sm">点击"新建项目"开始创建您的第一个项目</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => {
              const completedWeight = project.milestones
                .filter((m) => m.status === '已完成')
                .reduce((sum, m) => sum + m.weight, 0)
              const inProgressWeight = project.milestones
                .filter((m) => m.status === '进行中')
                .reduce((sum, m) => sum + m.weight * 0.5, 0)
              const completedCount = project.milestones.filter(
                (m) => m.status === '已完成'
              ).length

              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  progress={completedWeight + Math.round(inProgressWeight)}
                  milestonesTotal={project.milestones.length}
                  milestonesCompleted={completedCount}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
