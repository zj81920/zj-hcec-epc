import { Topbar } from '@/components/layout/topbar'
import { ProjectForm } from '@/components/projects/project-form'

export default function NewProjectPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">新建项目</h1>
        <ProjectForm />
      </main>
    </div>
  )
}
