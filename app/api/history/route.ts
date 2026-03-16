import { NextRequest, NextResponse } from 'next/server'
import { getHistory } from '@/lib/history'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const did = req.nextUrl.searchParams.get('did')
  if (!did) return NextResponse.json({ events: [] })
  return NextResponse.json({ events: getHistory(did) })
}
