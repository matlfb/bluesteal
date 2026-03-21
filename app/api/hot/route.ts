import { NextResponse } from 'next/server'
import { getTopCardsByValue } from '@/lib/card-values'
import { getOwner } from '@/lib/db'
import { filterBlacklisted } from '@/lib/blacklist'

export const runtime = 'nodejs'

export async function GET() {
  const top = await filterBlacklisted(
    (await getTopCardsByValue(24)).map(c => ({ ...c }))
  )
  const cards12 = top.slice(0, 12)
  if (!cards12.length) return NextResponse.json({ cards: [] })

  const profileMap: Record<string, any> = {}
  for (let i = 0; i < cards12.length; i += 25) {
    const batch = cards12.slice(i, i + 25)
    try {
      const params = batch.map(c => `actors=${encodeURIComponent(c.did)}`).join('&')
      const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`)
      for (const p of ((await r.json()).profiles ?? [])) profileMap[p.did] = p
    } catch {}
  }

  const cards = await Promise.all(cards12.map(async ({ did, value }) => {
    const p = profileMap[did]
    const owner = await getOwner(did)
    return {
      did, handle: p?.handle ?? did, displayName: p?.displayName ?? did,
      avatar: p?.avatar ?? null, followersCount: p?.followersCount ?? 0,
      owner_handle: owner?.owner_handle ?? null,
      verified: p?.verification?.verifiedStatus === 'valid', value,
    }
  }))

  return NextResponse.json({ cards: cards.filter(c => c.handle !== c.did) })
}
