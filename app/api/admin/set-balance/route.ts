import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { did, balance } = await req.json()
  if (!did || typeof balance !== 'number' || balance < 0)
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  await redis.set(`balance:${did}`, JSON.stringify({ balance }))
  return NextResponse.json({ ok: true, did, balance })
}
