import { redis } from './redis'

export interface Ownership {
  subject_did: string
  owner_did: string
  purchased_at: string
}

function parse<T>(val: unknown): T {
  if (typeof val === 'string') return JSON.parse(val) as T
  return val as T
}

export async function getOwner(subjectDid: string): Promise<Ownership | null> {
  const val = await redis.get(`ownership:${subjectDid}`)
  if (!val) return null
  return parse<Ownership>(val)
}

export async function setOwner(o: Ownership): Promise<void> {
  const prev = await getOwner(o.subject_did)
  const pipe = redis.pipeline()
  const json = JSON.stringify(o)
  pipe.set(`ownership:${o.subject_did}`, json)
  pipe.hset('ownerships:all', { [o.subject_did]: json })
  if (prev && prev.owner_did !== o.owner_did) {
    pipe.srem(`owner:${prev.owner_did}:cards`, o.subject_did)
  }
  pipe.sadd(`owner:${o.owner_did}:cards`, o.subject_did)
  pipe.lpush('ownerships:recent', json)
  pipe.ltrim('ownerships:recent', 0, 49)
  await pipe.exec()
}

export async function getRecent(limit = 10): Promise<Ownership[]> {
  const items = await redis.lrange('ownerships:recent', 0, limit - 1)
  return items.map(item => parse<Ownership>(item))
}

export async function getAllOwnerships(): Promise<Record<string, Ownership>> {
  const hash = await redis.hgetall('ownerships:all')
  if (!hash) return {}
  return Object.fromEntries(
    Object.entries(hash).map(([k, v]) => [k, parse<Ownership>(v)])
  )
}

export async function getOwnedByOwner(ownerDid: string): Promise<{ subject_did: string; purchased_at: string }[]> {
  const dids = await redis.smembers(`owner:${ownerDid}:cards`)
  if (!dids.length) return []
  const ownerships = await Promise.all(dids.map(d => getOwner(d)))
  return ownerships
    .filter((o): o is Ownership => o !== null && o.owner_did === ownerDid)
    .map(o => ({ subject_did: o.subject_did, purchased_at: o.purchased_at }))
}
