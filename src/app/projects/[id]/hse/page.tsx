import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ClipboardCheck, GraduationCap, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HSEOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [incidentCount, inspectionCount, trainingCount] = await Promise.all([
    db.hSEIncident.count({ where: { projectId: id } }),
    db.hSEInspection.count({ where: { projectId: id } }),
    db.hSETraining.count({ where: { projectId: id } }),
  ])

  const stats = [
    { label: '事故事件', count: incidentCount, href: `/projects/${id}/hse/incidents`, icon: AlertTriangle, color: 'text-red-500' },
    { label: '安全检查', count: inspectionCount, href: `/projects/${id}/hse/inspections`, icon: ClipboardCheck, color: 'text-blue-500' },
    { label: '培训记录', count: trainingCount, href: `/projects/${id}/hse/trainings`, icon: GraduationCap, color: 'text-green-500' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">HSE 管理</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <stat.icon className={`h-10 w-10 ${stat.color}`} />
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.count}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href={`/projects/${id}/hse/incidents/new`} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors text-sm">
              记录事故事件
            </Link>
            <Link href={`/projects/${id}/hse/inspections/new`} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors text-sm">
              新增检查记录
            </Link>
            <Link href={`/projects/${id}/hse/trainings/new`} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors text-sm">
              新增培训记录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
