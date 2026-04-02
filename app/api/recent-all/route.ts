import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { filterBlacklisted } from '@/lib/blacklist'
import { BASE_VALUE } from '@/lib/card-values'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(req: NextRequest) {
  if (!await rateLimit(`pub:${getClientIP(req)}`, 30, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const raw = await redis.lrange('activity:global', 0, 1999)
  const events = raw.map((e: any) => typeof e === 'string' ? JSON.parse(e) : e) as Array<{
    buyer_did: string; subject_did: string; prev_owner_did: string | null; price: number; at: string
  }>

  // Deduplicate by subject_did (keep most recent transaction per card)
  const seen = new Set<string>()
  const unique = events.filter(e => {
    if (seen.has(e.subject_did)) return false
    seen.add(e.subject_did)
    return true
  })

  const filtered = await filterBlacklisted(unique.map(e => ({ ...e, did: e.subject_did })))

  const pipe = redis.pipeline()
  filtered.forEach(e => pipe.hget('card_values:all', e.subject_did))
  const values = (await pipe.exec()) as (string | number | null)[]

  const cards = filtered.map((e, i) => ({
    subject_did: e.subject_did,
    owner_did: e.buyer_did,
    purchased_at: e.at,
    value: values[i] != null ? Number(values[i]) : BASE_VALUE,
  }))

  return NextResponse.json({ cards, total: cards.length })
}
