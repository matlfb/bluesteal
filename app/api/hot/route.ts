import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getOwner } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const valFile = path.join(process.cwd(), 'data', 'card_values.json')
  let values: Record<string, number> = {}
  try { values = JSON.parse(fs.readFileSync(valFile, 'utf-8')) } catch {}

  // Sort by value desc, take top 12
  const top = Object.entries(values)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([did, value]) => ({ did, value }))

  if (top.length === 0) return NextResponse.json({ cards: [] })

  // Batch-fetch profiles from Bluesky
  const profileMap: Record<string, any> = {}
  for (let i = 0; i < top.length; i += 25) {
    const batch = top.slice(i, i + 25)
    try {
      const params = batch.map(c => `actors=${encodeURIComponent(c.did)}`).join('&')
      const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`)
      const data = await r.json()
      for (const p of (data.profiles ?? [])) profileMap[p.did] = p
    } catch {}
  }

  const cards = top.map(({ did, value }) => {
    const p = profileMap[did]
    const owner = getOwner(did)
    return {
      did,
      handle:        p?.handle        ?? did,
      displayName:   p?.displayName   ?? did,
      avatar:        p?.avatar        ?? null,
      followersCount: p?.followersCount ?? 0,
      owner_handle:  owner?.owner_handle ?? null,
      value,
    }
  }).filter(c => c.handle !== c.did)  // skip unresolved

  return NextResponse.json({ cards })
}
