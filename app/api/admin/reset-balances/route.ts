import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let cursor = 0
  const keys: string[] = []
  do {
    const [next, batch] = await redis.scan(cursor, { match: 'balance:*', count: 200 })
    cursor = Number(next)
    keys.push(...(batch as string[]))
  } while (cursor !== 0)

  if (!keys.length) return NextResponse.json({ reset: 0 })

  const pipe = redis.pipeline()
  for (const key of keys) {
    pipe.set(key, JSON.stringify({ balance: 30000 }))
  }
  await pipe.exec()

  return NextResponse.json({ reset: keys.length })
}
