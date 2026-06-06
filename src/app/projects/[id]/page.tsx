import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  DollarSign, TrendingUp, CheckCircle2, FileText,
  PencilRuler, ShoppingCart, HardHat, ShieldCheck,
  Circle, Clock, Pencil, FileSpreadsheet
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProjectDashboard({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await db.project.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { sortOrder: 'asc' } },
      _count: {
        select: {
          designDocuments: true,
          designLiaisons: true,
          designReviews: true,
          purchaseRequisitions: true,
          procurementOrders: true,
          constructionTasks: true,
          constructionDocs: true,
          hseIncidents: true,
          hseInspections: true,
          hseTrainings: true,
        },
      },
    },
  })

  if (!project) return null

  const completedWeight = project.milestones
    .filter((m) => m.status === '已完成')
    .reduce((sum, m) => sum + m.weight, 0)
  const inProgressWeight = project.milestones
    .filter((m) => m.status === '进行中')
    .reduce((sum, m) => sum + m.weight * 0.5, 0)
  const totalProgress = completedWeight + Math.round(inProgressWeight)

  const milestonesCompleted = project.milestones.filter((m) => m.status === '已完成').length
  const c = project._count

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              编号：{project.code}
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {project.status}
          </Badge>
        </div>
        <Link
          href={`/projects/${id}/edit`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          编辑
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={DollarSign}
          value={formatCurrency(project.budget)}
          label="总预算"
        />
        <StatCard
          icon={TrendingUp}
          value={`${totalProgress}%`}
          label="整体进度"
        />
        <StatCard
          icon={CheckCircle2}
          value={`${milestonesCompleted}/${project.milestones.length}`}
          label="已完成里程碑"
        />
        <StatCard
          icon={FileText}
          value={`${c.designDocuments}`}
          label="设计文件"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <RingProgress progress={totalProgress} size={200} strokeWidth={14} />
            <p className="text-sm text-muted-foreground mt-3">基于里程碑权重</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">里程碑进度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pt-4">
              <div className="flex items-start justify-between">
                {project.milestones.map((m, i) => {
                  const isCompleted = m.status === '已完成'
                  const isInProgress = m.status === '进行中'
                  const isActive = isCompleted || isInProgress

                  return (
                    <div key={m.id} className="flex flex-col items-center flex-1 min-w-0">
                      <div className="relative flex items-center justify-center">
                        <div
                          className={`h-1 w-full absolute top-3 -left-1/2 -z-0 ${
                            i === 0 ? 'hidden' : ''
                          }`}
                          style={{
                            backgroundColor: isActive ? 'var(--primary)' : 'var(--border)',
                            width: 'calc(100% - 20px)',
                            left: 'calc(-50% + 10px)',
                          }}
                        />
                        <div
                          className="relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2"
                          style={{
                            backgroundColor: isCompleted
                              ? 'var(--primary)'
                              : isInProgress
                              ? 'white'
                              : 'white',
                            borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          ) : isInProgress ? (
                            <Clock className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
                          ) : (
                            <Circle className="h-3 w-3 text-muted-foreground/30" />
                          )}
                        </div>
                      </div>
                      <div className="mt-2.5 text-center px-1">
                        <p className="text-xs font-medium leading-tight line-clamp-2 min-h-[2rem]">
                          {m.name}
                        </p>
                        <p
                          className="text-[10px] mt-0.5 font-medium"
                          style={{
                            color: isCompleted
                              ? 'var(--primary)'
                              : isInProgress
                              ? 'var(--secondary)'
                              : undefined,
                          }}
                        >
                          {m.status === '已完成'
                            ? `✓ ${m.weight}%`
                            : m.status === '进行中'
                            ? `▶ ${m.weight}%`
                            : `${m.weight}%`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">快捷入口</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <QuickLink
              href={`/projects/${id}/design`}
              icon={PencilRuler}
              label="设计管理"
              count={c.designDocuments + c.designLiaisons + c.designReviews}
            />
            <QuickLink
              href={`/projects/${id}/procurement/requisitions`}
              icon={FileSpreadsheet}
              label="请购单"
              count={c.purchaseRequisitions}
            />
            <QuickLink
              href={`/projects/${id}/procurement/orders`}
              icon={ShoppingCart}
              label="采购订单"
              count={c.procurementOrders}
            />
            <QuickLink
              href={`/projects/${id}/construction`}
              icon={HardHat}
              label="施工管理"
              count={c.constructionTasks + c.constructionDocs}
            />
            <QuickLink
              href={`/projects/${id}/hse`}
              icon={ShieldCheck}
              label="HSE管理"
              count={c.hseIncidents + c.hseInspections + c.hseTrainings}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoItem label="项目编号" value={project.code} />
            <InfoItem label="项目类型" value={project.type} />
            <InfoItem label="项目地点" value={project.location || '-'} />
            <InfoItem label="项目周期" value={`${formatDate(project.startDate)} ~ ${formatDate(project.endDate)}`} />
          </div>
          {project.description && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-0.5">项目描述</p>
              <p className="text-sm text-muted-foreground/80">{project.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RingProgress({
  progress,
  size,
  strokeWidth,
}: {
  progress: number
  size: number
  strokeWidth: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference
  const center = size / 2

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: size * 0.18, color: 'var(--primary)' }}
        >
          {progress}%
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">整体进度</span>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: string
  label: string
}) {
  return (
    <div className="rounded-lg border bg-card shadow-sm p-3.5 flex items-center gap-3">
      <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md" style={{ backgroundColor: 'var(--muted)' }}>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold tabular-nums truncate">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function QuickLink({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 py-4 px-3 rounded-lg border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="relative">
        <Icon className="h-6 w-6 text-primary" />
        {count > 0 && (
          <span
            className="absolute -top-2 -right-2 flex items-center justify-center h-4 min-w-4 rounded-full text-[10px] font-medium text-white px-1"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {count}
          </span>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  )
}
