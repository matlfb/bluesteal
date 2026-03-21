import { NextRequest, NextResponse } from 'next/server'
import { getGlobalActivity, getFriendsActivity, getUserActivity, LedgerEvent } from '@/lib/activity'
import { filterBlacklisted } from '@/lib/blacklist'
import { verifySession } from '@/lib/session'
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { batchProfiles } from '@/lib/profiles'

export const runtime = 'nodejs'

async function enrich(events: LedgerEvent[]) {
  const dids = [...new Set(events.flatMap(e =>
    [e.buyer_did, e.subject_did, e.prev_owner_did].filter(Boolean) as string[]
  ))]
  const profiles = await batchProfiles(dids)
  return events.map(e => ({
    ...e,
    buyer_handle: profiles[e.buyer_did]?.handle ?? e.buyer_did,
    buyer_avatar: profiles[e.buyer_did]?.avatar ?? null,
    subject_handle: profiles[e.subject_did]?.handle ?? e.subject_did,
    subject_avatar: profiles[e.subject_did]?.avatar ?? null,
    subject_verified: profiles[e.subject_did]?.verified ?? false,
    prev_owner_handle: e.prev_owner_did ? (profiles[e.prev_owner_did]?.handle ?? e.prev_owner_did) : null,
    prev_owner_avatar: e.prev_owner_did ? (profiles[e.prev_owner_did]?.avatar ?? null) : null,
  }))
}

export async function GET(req: NextRequest) {
  if (!await rateLimit(`pub:${getClientIP(req)}`, 120, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const type  = req.nextUrl.searchParams.get('type') ?? 'global'
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '60'), 100)

  if (type === 'friends') {
    const dids = (req.nextUrl.searchParams.get('dids') ?? '').split(',').map(d => d.trim()).filter(Boolean)
    const raw = await filterBlacklisted(await getFriendsActivity(dids, limit * 2))
    return NextResponse.json({ events: await enrich(raw.slice(0, limit)) })
  }

  if (type === 'mine') {
    const sessionToken = req.cookies.get('bs_session')?.value
    const session_did = sessionToken ? verifySession(sessionToken) : null
    if (!session_did) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const raw = await getUserActivity(session_did, limit)
    return NextResponse.json({ events: await enrich(raw) })
  }

  const raw = await filterBlacklisted(await getGlobalActivity(limit * 2))
  return NextResponse.json({ events: await enrich(raw.slice(0, limit)) })
}
