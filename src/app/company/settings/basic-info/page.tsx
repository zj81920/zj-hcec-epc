'use client'

import Link from 'next/link'
import { BookOpen, Bot, Building2 } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function BasicInfoPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        <div className="text-sm text-muted-foreground">
          <Link href="/company/partners" className="hover:text-foreground transition-colors">公司管理</Link> &gt; 系统设置 &gt; 基础信息
        </div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <div className="grid grid-cols-3 gap-4">
          <Card className="hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold text-base">基础信息</span>
              </div>
              <p className="text-sm text-muted-foreground">管理和维护专业编码及名称数据</p>
              <Link href="/company/settings/basic-info/disciplines" className="self-start">
                <Button variant="outline" size="sm">进入</Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="hover:ring-2 hover:ring-green-500/20 transition-all cursor-pointer">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50">
                  <Bot className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-semibold text-base">AI 模型配置</span>
              </div>
              <p className="text-sm text-muted-foreground">配置 AI 接口提供商、API Key、模型参数等</p>
              <Link href="/company/settings/ai-models" className="self-start">
                <Button variant="outline" size="sm">进入</Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="hover:ring-2 hover:ring-blue-500/20 transition-all cursor-pointer">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-semibold text-base">执行单位管理</span>
              </div>
              <p className="text-sm text-muted-foreground">管理执行单位（合同甲方）信息，包括银行账号、联系方式等</p>
              <Link href="/company/settings/basic-info/executing-units" className="self-start">
                <Button variant="outline" size="sm">进入</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
