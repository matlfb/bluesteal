import { redis } from './redis'

export interface LedgerEvent {
  buyer_did: string
  subject_did: string
  prev_owner_did: string | null
  price: number
  at: string
}

function parse(item: unknown): LedgerEvent {
  const e = (typeof item === 'string' ? JSON.parse(item) : item) as Record<string, unknown>
  return {
    buyer_did: e.buyer_did as string,
    subject_did: e.subject_did as string,
    prev_owner_did: (e.prev_owner_did as string | null | undefined) ?? null,
    price: e.price as number,
    at: e.at as string,
  }
}

export async function addActivity(event: LedgerEvent): Promise<void> {
  await redis.lpush('activity:global', JSON.stringify(event))
}

export async function getGlobalActivity(limit = 50): Promise<LedgerEvent[]> {
  const items = await redis.lrange('activity:global', 0, limit - 1)
  return items.map(parse)
}

export async function getFriendsActivity(dids: string[], limit = 50): Promise<LedgerEvent[]> {
  const set = new Set(dids)
  const all = await redis.lrange('activity:global', 0, -1)
  return all
    .map(parse)
    .filter(e => set.has(e.buyer_did) || set.has(e.subject_did))
    .slice(0, limit)
}

export async function getUserActivity(did: string, limit = 50): Promise<LedgerEvent[]> {
  const all = await redis.lrange('activity:global', 0, -1)
  return all
    .map(parse)
    .filter(e => e.buyer_did === did || e.prev_owner_did === did)
    .slice(0, limit)
}

export async function getCardActivity(subject_did: string): Promise<LedgerEvent[]> {
  const all = await redis.lrange('activity:global', 0, -1)
  return all.map(parse).filter(e => e.subject_did === subject_did)
}
