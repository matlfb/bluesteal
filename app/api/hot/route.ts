import { NextRequest, NextResponse } from 'next/server'
import { getTopCardsByValue } from '@/lib/card-values'
import { getOwner } from '@/lib/db'
import { filterBlacklisted } from '@/lib/blacklist'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  if (!await rateLimit(`pub:${getClientIP(req)}`, 120, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const top = await filterBlacklisted(
    (await getTopCardsByValue(24)).map(c => ({ ...c }))
  )
  const cards12 = top.slice(0, 12)
  if (!cards12.length) return NextResponse.json({ cards: [] })

  // Fetch owners in parallel, then batch-resolve all profiles (cards + owners)
  const owners = await Promise.all(cards12.map(c => getOwner(c.did)))
  const allDids = [...new Set([
    ...cards12.map(c => c.did),
    ...owners.filter(Boolean).map(o => o!.owner_did),
  ].filter(Boolean))]

  const profileMap: Record<string, any> = {}
  for (let i = 0; i < allDids.length; i += 25) {
    const batch = allDids.slice(i, i + 25)
    try {
      const params = batch.map(d => `actors=${encodeURIComponent(d)}`).join('&')
      const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`)
      for (const p of ((await r.json()).profiles ?? [])) profileMap[p.did] = p
    } catch {}
  }

  const cards = cards12.map(({ did, value }, i) => {
    const p = profileMap[did]
    const owner = owners[i]
    return {
      did, handle: p?.handle ?? did, displayName: p?.displayName ?? did,
      avatar: p?.avatar ?? null, followersCount: p?.followersCount ?? 0,
      owner_handle: owner ? (profileMap[owner.owner_did]?.handle ?? owner.owner_did) : null,
      verified: p?.verification?.verifiedStatus === 'valid' || p?.verification?.trustedVerifierStatus === 'valid', value,
    }
  })

  return NextResponse.json({ cards: cards.filter(c => c.handle !== c.did) })
}
