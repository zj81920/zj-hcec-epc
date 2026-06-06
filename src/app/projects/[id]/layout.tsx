import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { Topbar } from '@/components/layout/topbar'
import { Sidebar } from '@/components/layout/sidebar'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const project = await db.project.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!project) {
    notFound()
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Topbar projectName={project.name} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projectId={project.id} />
        <main className="flex-1 overflow-auto p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  )
}
