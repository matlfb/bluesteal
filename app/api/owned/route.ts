import { NextRequest, NextResponse } from 'next/server'
import { getOwnedByOwner } from '@/lib/db'
import { BASE_VALUE } from '@/lib/card-values'
import { filterBlacklisted } from '@/lib/blacklist'
import { redis } from '@/lib/redis'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const owner_did = req.nextUrl.searchParams.get('owner_did')
  if (!owner_did) return NextResponse.json({ error: 'missing owner_did' }, { status: 400 })

  const owned = await getOwnedByOwner(owner_did)
  const filtered = await filterBlacklisted(owned.map(o => ({ ...o, did: o.subject_did })))
  if (!filtered.length) return NextResponse.json({ owned: [] })

  const dids = filtered.map(o => o.subject_did)
  const rawValues = (await redis.hmget('card_values:all', ...dids)) as (string | null)[] ?? []
  const withValues = filtered.map((o, i) => ({
    ...o,
    value: rawValues[i] ? Number(rawValues[i]) : BASE_VALUE,
  }))
  return NextResponse.json({ owned: withValues })
}
