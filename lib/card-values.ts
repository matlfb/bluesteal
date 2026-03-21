import { redis } from './redis'

export const BASE_VALUE = 1500
const MIN_VALUE = 600

export async function getValue(did: string): Promise<number> {
  const val = await redis.hget('card_values:all', did)
  return val ? Number(val) : BASE_VALUE
}

export async function setValue(did: string, value: number): Promise<void> {
  const pipe = redis.pipeline()
  pipe.hset('card_values:all', { [did]: String(value) })
  pipe.zadd('cards:by_value', { score: value, member: did })
  await pipe.exec()
}

export async function appreciateValue(did: string): Promise<number> {
  const next = Math.round((await getValue(did)) * 1.2)
  await setValue(did, next)
  return next
}

export async function depreciateValue(did: string): Promise<number> {
  const next = Math.max(MIN_VALUE, Math.round((await getValue(did)) * 0.98))
  await setValue(did, next)
  return next
}

export async function getAllCardValues(): Promise<Record<string, number>> {
  const hash = await redis.hgetall('card_values:all')
  if (!hash) return {}
  return Object.fromEntries(Object.entries(hash).map(([k, v]) => [k, Number(v)]))
}

export async function getTopCardsByValue(limit: number): Promise<{ did: string; value: number }[]> {
  const results = await redis.zrange('cards:by_value', 0, limit - 1, { rev: true, withScores: true })
  const out: { did: string; value: number }[] = []
  for (let i = 0; i < results.length; i += 2) {
    out.push({ did: results[i] as string, value: Number(results[i + 1]) })
  }
  return out
}
