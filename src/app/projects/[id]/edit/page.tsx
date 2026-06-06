import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { Topbar } from '@/components/layout/topbar'
import { ProjectEditForm } from '@/components/projects/project-edit-form'

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await db.project.findUnique({ where: { id } })
  if (!project) notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar projectName={project.name} />
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">编辑项目</h1>
        <ProjectEditForm project={project} />
      </main>
    </div>
  )
}
