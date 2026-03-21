import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export const runtime = 'nodejs'

// One-time migration: converts activity:global entries to DID-only format.
// Resolves prev_owner_handle → prev_owner_did via Bluesky API where possible.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const items = await redis.lrange('activity:global', 0, -1)
  const events = items.map(item => typeof item === 'string' ? JSON.parse(item) : item) as Record<string, unknown>[]

  // Collect handles that need resolving (old format: has prev_owner_handle but no prev_owner_did)
  const handlesToResolve = [...new Set(
    events
      .filter(e => e.prev_owner_handle && !e.prev_owner_did)
      .map(e => e.prev_owner_handle as string)
  )]

  // Resolve handles → DIDs
  const handleToDid: Record<string, string> = {}
  for (let i = 0; i < handlesToResolve.length; i += 25) {
    const batch = handlesToResolve.slice(i, i + 25)
    const params = batch.map(h => `actors=${encodeURIComponent(h)}`).join('&')
    try {
      const res = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`,
        { signal: AbortSignal.timeout(10_000) }
      )
      const { profiles = [] } = await res.json()
      for (const p of profiles) handleToDid[p.handle] = p.did
    } catch {}
    if (i + 25 < handlesToResolve.length) await new Promise(r => setTimeout(r, 200))
  }

  // Convert to new format (DIDs only)
  const converted = events.map(e => ({
    buyer_did: e.buyer_did,
    subject_did: e.subject_did,
    prev_owner_did: e.prev_owner_did
      ?? (e.prev_owner_handle ? (handleToDid[e.prev_owner_handle as string] ?? null) : null),
    price: e.price,
    at: e.at,
  }))

  // Rewrite activity:global (newest first = index 0)
  // events[0] = newest, so we lpush from oldest to newest
  const pipe = redis.pipeline()
  pipe.del('activity:global')
  for (const e of [...converted].reverse()) {
    pipe.lpush('activity:global', JSON.stringify(e))
  }
  await pipe.exec()

  return NextResponse.json({
    migrated: converted.length,
    handlesResolved: Object.keys(handleToDid).length,
    handlesNotFound: handlesToResolve.length - Object.keys(handleToDid).length,
  })
}
