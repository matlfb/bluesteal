import { redis } from './redis'

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const k = `rl:${key}`
  const count = await redis.incr(k)
  if (count === 1) await redis.pexpire(k, windowMs)
  return count <= limit
}
