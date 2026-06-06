import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/quotes/verify — 公司名称校验
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, companyName } = body as { token: string; companyName: string }

    if (!token || !companyName) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    const quote = await db.orderQuote.findUnique({
      where: { token },
      include: { supplier: true },
    })

    if (!quote) {
      return NextResponse.json({ error: '无效的报价链接' }, { status: 404 })
    }

    // 检查是否过期
    if (quote.tokenExpiresAt && new Date() > quote.tokenExpiresAt) {
      return NextResponse.json({ verified: false, expired: true, reason: '链接已过期' }, { status: 403 })
    }

    // 检查是否截止
    if (quote.deadline && new Date() > quote.deadline) {
      return NextResponse.json({
        verified: false,
        expired: true,
        reason: '报价已截止',
        deadline: quote.deadline.toISOString(),
      }, { status: 403 })
    }

    // 匹配公司名称（不区分大小写，去除首尾空格）
    const supplierName = quote.supplier.name.trim().toLowerCase()
    const inputName = companyName.trim().toLowerCase()

    if (supplierName !== inputName) {
      return NextResponse.json({ verified: false, reason: '公司名称不匹配' }, { status: 403 })
    }

    return NextResponse.json({
      verified: true,
      supplierName: quote.supplier.name,
      orderId: quote.orderId,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '验证失败' }, { status: 500 })
  }
}
