import { NextRequest, NextResponse } from 'next/server'
import { getAllOwnerships } from '@/lib/db'
import { getAllCardValues } from '@/lib/card-values'
import { filterBlacklisted } from '@/lib/blacklist'
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { redis } from '@/lib/redis'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(req: NextRequest) {
  if (!await rateLimit(`pub:${getClientIP(req)}`, 120, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const [ownerships, cardValues, stealsHash] = await Promise.all([
    getAllOwnerships(), getAllCardValues(),
    redis.hgetall('steals:all').then(h => {
      if (!h) return {} as Record<string, number>
      return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, Number(v)]))
    }),
  ])

  const byOwner: Record<string, { subject_dids: string[] }> = {}
  for (const o of Object.values(ownerships)) {
    if (!byOwner[o.owner_did]) byOwner[o.owner_did] = { subject_dids: [] }
    byOwner[o.owner_did].subject_dids.push(o.subject_did)
  }

  const ownerStats = Object.entries(byOwner).map(([did, { subject_dids }]) => ({
    did, cards: subject_dids.length,
    portfolio: subject_dids.reduce((sum, d) => sum + (cardValues[d] ?? 600), 0),
    steals: stealsHash[did] ?? 0,
  }))

  ownerStats.sort((a, b) => b.portfolio - a.portfolio)
  const filtered = (await filterBlacklisted(ownerStats.slice(0, 20))).slice(0, 20)
  if (!filtered.length) return NextResponse.json({ players: [] })

  const profileMap: Record<string, any> = {}
  for (let i = 0; i < filtered.length; i += 25) {
    const batch = filtered.slice(i, i + 25)
    try {
      const params = batch.map(o => `actors=${encodeURIComponent(o.did)}`).join('&')
      const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`)
      for (const p of ((await r.json()).profiles ?? [])) profileMap[p.did] = p
    } catch {}
  }

  const players = filtered.map((o, i) => {
    const p = profileMap[o.did]
    return {
      rank: i + 1, did: o.did,
      handle: p?.handle ?? o.did,
      displayName: p?.displayName || p?.handle || o.did,
      avatar: p?.avatar ?? null,
      cards: o.cards, portfolio: o.portfolio, steals: o.steals,
    }
  })

  return NextResponse.json({ players })
}
