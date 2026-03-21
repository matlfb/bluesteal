import { redis } from './redis'

export interface HistoryEvent {
  type: 'bought' | 'lost'
  actor_did: string
  subject_did: string
  subject_handle: string
  price: number
  at: string
  counterpart_handle?: string
}

export async function addEvent(event: HistoryEvent): Promise<void> {
  const pipe = redis.pipeline()
  pipe.lpush(`history:${event.actor_did}`, JSON.stringify(event))
  if (event.type === 'bought') {
    pipe.hincrby('steals:all', event.actor_did, 1)
    pipe.lpush(`card_history:${event.subject_did}`, JSON.stringify(event))
  }
  await pipe.exec()
}

export async function getHistory(did: string): Promise<HistoryEvent[]> {
  const items = await redis.lrange(`history:${did}`, 0, -1)
  return items.map(item => typeof item === 'string' ? JSON.parse(item) : item as HistoryEvent)
}

export async function getCardHistory(subject_did: string): Promise<HistoryEvent[]> {
  const items = await redis.lrange(`card_history:${subject_did}`, 0, -1)
  return items.map(item => typeof item === 'string' ? JSON.parse(item) : item as HistoryEvent)
}

export async function getAllSteals(): Promise<Record<string, number>> {
  const hash = await redis.hgetall('steals:all')
  if (!hash) return {}
  return Object.fromEntries(Object.entries(hash).map(([k, v]) => [k, Number(v)]))
}
