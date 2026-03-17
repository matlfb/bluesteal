import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'activity.json')
const MAX_EVENTS = 500

export interface ActivityEvent {
  buyer_did: string
  buyer_handle: string
  subject_did: string
  subject_handle: string
  prev_owner_handle?: string
  price: number
  at: string
}

function read(): ActivityEvent[] {
  try {
    if (!fs.existsSync(FILE)) return []
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'))
  } catch { return [] }
}

function write(events: ActivityEvent[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(events, null, 2))
}

export function addActivity(event: ActivityEvent) {
  const events = read()
  events.unshift(event)
  write(events.slice(0, MAX_EVENTS))
}

export function getGlobalActivity(limit = 50): ActivityEvent[] {
  return read().slice(0, limit)
}

export function getFriendsActivity(dids: string[], limit = 50): ActivityEvent[] {
  const set = new Set(dids)
  return read()
    .filter(e => set.has(e.buyer_did) || set.has(e.subject_did))
    .slice(0, limit)
}

export function getUserActivity(did: string, handle: string, limit = 50): ActivityEvent[] {
  return read()
    .filter(e => e.buyer_did === did || e.prev_owner_handle === handle)
    .slice(0, limit)
}
