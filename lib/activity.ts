import { redis } from './redis'

export interface ActivityEvent {
  buyer_did: string
  buyer_handle: string
  subject_did: string
  subject_handle: string
  prev_owner_handle?: string
  price: number
  at: string
}

function parse(item: unknown): ActivityEvent {
  return typeof item === 'string' ? JSON.parse(item) : item as ActivityEvent
}

export async function addActivity(event: ActivityEvent): Promise<void> {
  const pipe = redis.pipeline()
  pipe.lpush('activity:global', JSON.stringify(event))
  pipe.ltrim('activity:global', 0, 499)
  await pipe.exec()
}

export async function getGlobalActivity(limit = 50): Promise<ActivityEvent[]> {
  const items = await redis.lrange('activity:global', 0, limit - 1)
  return items.map(parse)
}

export async function getFriendsActivity(dids: string[], limit = 50): Promise<ActivityEvent[]> {
  const set = new Set(dids)
  const all = await redis.lrange('activity:global', 0, 499)
  return all
    .map(parse)
    .filter(e => set.has(e.buyer_did) || set.has(e.subject_did))
    .slice(0, limit)
}

export async function getUserActivity(did: string, handle: string, limit = 50): Promise<ActivityEvent[]> {
  const all = await redis.lrange('activity:global', 0, 499)
  return all
    .map(parse)
    .filter(e => e.buyer_did === did || e.prev_owner_handle === handle)
    .slice(0, limit)
}
