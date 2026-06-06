import { redirect } from 'next/navigation'

export default async function ProcurementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return redirect(`/projects/${id}/procurement/requisitions`)
}
