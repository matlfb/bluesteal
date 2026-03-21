import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export const runtime = 'nodejs'

// Finds ownership records whose acquisition is missing from activity:global,
// and inserts them as best-effort ledger entries.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Load full ledger, ownerships:all hash, and ownerships:recent list
  const [ledgerRaw, ownershipsHash, recentRaw] = await Promise.all([
    redis.lrange('activity:global', 0, -1),
    redis.hgetall('ownerships:all'),
    redis.lrange('ownerships:recent', 0, -1),
  ])

  const ledger = ledgerRaw.map(i => typeof i === 'string' ? JSON.parse(i) : i) as Array<{
    buyer_did: string; subject_did: string; prev_owner_did: string | null; price: number; at: string
  }>

  // Merge ownerships:all and ownerships:recent, deduplicated by subject_did (most recent wins)
  const ownershipMap = new Map<string, { subject_did: string; owner_did: string; purchased_at: string }>()

  if (ownershipsHash) {
    for (const v of Object.values(ownershipsHash)) {
      const o = typeof v === 'string' ? JSON.parse(v) : v
      ownershipMap.set(o.subject_did, o)
    }
  }
  // ownerships:recent may contain entries not in ownerships:all (Pi migration gap)
  for (const raw of recentRaw) {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!o.subject_did) continue
    const existing = ownershipMap.get(o.subject_did)
    // Keep the most recent purchased_at
    if (!existing || o.purchased_at > existing.purchased_at) {
      ownershipMap.set(o.subject_did, o)
    }
  }

  const ownerships = [...ownershipMap.values()]

  // Build a set of (buyer_did + subject_did + at) already in ledger for dedup
  const ledgerKeys = new Set(ledger.map(e => `${e.buyer_did}:${e.subject_did}:${e.at}`))

  // For each ownership, check if their acquisition event is in the ledger
  const missing: Array<{ buyer_did: string; subject_did: string; prev_owner_did: string | null; price: number; at: string }> = []

  for (const o of ownerships) {
    // Find all ledger entries for this card to get the last known price and prev_owner
    const cardEntries = ledger
      .filter(e => e.subject_did === o.subject_did)
      .sort((a, b) => b.at.localeCompare(a.at))

    const key = `${o.owner_did}:${o.subject_did}`
    const alreadyInLedger = ledger.some(e => e.buyer_did === o.owner_did && e.subject_did === o.subject_did)

    if (alreadyInLedger) continue

    // This ownership has no corresponding ledger entry — reconstruct it
    const lastEntry = cardEntries[0] ?? null
    const price = lastEntry?.price ?? 1500 // best-effort: last known price

    // prev_owner = whoever owned it just before (buyer of the most recent ledger entry)
    const prev_owner_did = lastEntry?.buyer_did ?? null

    missing.push({
      buyer_did: o.owner_did,
      subject_did: o.subject_did,
      prev_owner_did,
      price,
      at: o.purchased_at,
    })
  }

  if (!missing.length) return NextResponse.json({ patched: 0 })

  // Insert missing entries into ledger (rebuild sorted by at desc)
  const combined = [...ledger, ...missing].sort((a, b) => b.at.localeCompare(a.at))

  const pipe = redis.pipeline()
  pipe.del('activity:global')
  for (const e of [...combined].reverse()) {
    pipe.lpush('activity:global', JSON.stringify(e))
  }
  // Increment steals:all for each missing buyer
  for (const e of missing) {
    pipe.hincrby('steals:all', e.buyer_did, 1)
  }
  await pipe.exec()

  return NextResponse.json({ patched: missing.length, entries: missing })
}
