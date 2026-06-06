import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg text-muted-foreground">项目不存在或已被删除</p>
      <Link href="/projects" className="text-primary hover:underline">
        返回项目列表
      </Link>
    </div>
  )
}
