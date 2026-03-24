import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const raw = await redis.lrange('activity:global', 0, -1)
  const events = raw.map(i => typeof i === 'string' ? JSON.parse(i) : i) as Array<{
    buyer_did: string; subject_did: string; prev_owner_did: string | null; price: number; at: string
  }>

  const credits = new Map<string, number>()
  for (const e of events) {
    if (!e.prev_owner_did) continue
    credits.set(e.prev_owner_did, (credits.get(e.prev_owner_did) ?? 0) + e.price)
  }

  const results = []
  for (const [did, owed] of credits) {
    const raw = await redis.get(`balance:${did}`)
    const balance = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw).balance ?? 25000 : 25000
    results.push({ did, owed, current_balance: balance })
  }

  results.sort((a, b) => b.owed - a.owed)
  return NextResponse.json({ total: results.length, results })
}
