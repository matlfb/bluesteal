import { NextRequest, NextResponse } from 'next/server'
import { getGlobalActivity, getFriendsActivity } from '@/lib/activity'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const type  = req.nextUrl.searchParams.get('type') ?? 'global'
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '60'), 100)

  if (type === 'friends') {
    const raw  = req.nextUrl.searchParams.get('dids') ?? ''
    const dids = raw.split(',').map(d => d.trim()).filter(Boolean)
    return NextResponse.json({ events: getFriendsActivity(dids, limit) })
  }

  return NextResponse.json({ events: getGlobalActivity(limit) })
}
