import { NextRequest, NextResponse } from 'next/server'
import { getHistory } from '@/lib/history'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  if (!await rateLimit(`pub:${getClientIP(req)}`, 120, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const did = req.nextUrl.searchParams.get('did')
  if (!did) return NextResponse.json({ events: [] })

  return NextResponse.json({ events: await getHistory(did) })
}
