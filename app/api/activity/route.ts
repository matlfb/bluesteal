import { NextRequest, NextResponse } from 'next/server'
import { getGlobalActivity, getFriendsActivity, getUserActivity } from '@/lib/activity'
import { filterBlacklisted } from '@/lib/blacklist'
import { verifySession } from '@/lib/session'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  if (!await rateLimit(`pub:${getClientIP(req)}`, 120, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const type  = req.nextUrl.searchParams.get('type') ?? 'global'
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '60'), 100)

  if (type === 'friends') {
    const dids = (req.nextUrl.searchParams.get('dids') ?? '').split(',').map(d => d.trim()).filter(Boolean)
    return NextResponse.json({ events: await filterBlacklisted(await getFriendsActivity(dids, limit * 2)).then(r => r.slice(0, limit)) })
  }

  if (type === 'mine') {
    const sessionToken = req.cookies.get('bs_session')?.value
    const session_did = sessionToken ? verifySession(sessionToken) : null
    if (!session_did) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const handle = req.nextUrl.searchParams.get('handle') ?? ''
    return NextResponse.json({ events: await getUserActivity(session_did, handle, limit) })
  }

  return NextResponse.json({ events: (await filterBlacklisted(await getGlobalActivity(limit * 2))).slice(0, limit) })
}
