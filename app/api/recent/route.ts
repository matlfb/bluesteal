import { NextRequest, NextResponse } from 'next/server'
import { getRecent } from '@/lib/db'
import { getValue } from '@/lib/card-values'
import { filterBlacklisted } from '@/lib/blacklist'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(req: NextRequest) {
  if (!await rateLimit(`pub:${getClientIP(req)}`, 120, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '6'), 20)
  const recent = (await filterBlacklisted(await getRecent(limit * 2))).slice(0, limit)
  if (!recent.length) return NextResponse.json({ cards: [] })

  const allDids = [...new Set([...recent.map(r => r.subject_did), ...recent.map(r => r.owner_did)])]
  const params = allDids.map(d => `actors=${encodeURIComponent(d)}`).join('&')

  try {
    const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`, { cache: 'no-store' })
    const profileMap = new Map(((await res.json()).profiles ?? []).map((p: any) => [p.did, p]))
    const cards = await Promise.all(recent.map(async r => {
      const p = profileMap.get(r.subject_did) as any
      if (!p) return null
      const owner = profileMap.get(r.owner_did) as any
      return {
        subject_did: r.subject_did, handle: p.handle,
        displayName: p.displayName || p.handle, avatar: p.avatar ?? null,
        followersCount: p.followersCount ?? 0,
        owner_handle: owner?.handle ?? r.owner_did,
        purchased_at: r.purchased_at, value: await getValue(r.subject_did),
        verified: p.verification?.verifiedStatus === 'valid',
      }
    }))
    return NextResponse.json({ cards: cards.filter(Boolean) })
  } catch {
    return NextResponse.json({ cards: [] })
  }
}
