import { redis } from './redis'
import { NextRequest } from 'next/server'

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const k = `rl:${key}`
  const count = await redis.incr(k)
  if (count === 1) await redis.pexpire(k, windowMs)
  return count <= limit
}

export function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}
