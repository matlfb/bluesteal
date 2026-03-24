import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch all ledger events
  const raw = await redis.lrange('activity:global', 0, -1)
  const events = raw.map(i => typeof i === 'string' ? JSON.parse(i) : i) as Array<{
    buyer_did: string; subject_did: string; prev_owner_did: string | null; price: number; at: string
  }>

  // Sum what each prev_owner should have received
  const credits = new Map<string, number>()
  for (const e of events) {
    if (!e.prev_owner_did) continue
    credits.set(e.prev_owner_did, (credits.get(e.prev_owner_did) ?? 0) + e.price)
  }

  if (credits.size === 0) return NextResponse.json({ fixed: 0, details: [] })

  // Fetch current balances and credit
  const results: Array<{ did: string; credited: number; old_balance: number; new_balance: number }> = []

  for (const [did, amount] of credits) {
    const raw = await redis.get(`balance:${did}`)
    const old_balance = raw
      ? (typeof raw === 'string' ? JSON.parse(raw) : raw).balance ?? 25000
      : 25000
    const new_balance = old_balance + amount
    await redis.set(`balance:${did}`, JSON.stringify({ balance: new_balance }))
    results.push({ did, credited: amount, old_balance, new_balance })
  }

  return NextResponse.json({ fixed: results.length, details: results })
}
