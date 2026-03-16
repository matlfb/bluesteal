import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'history.json')

export interface HistoryEvent {
  type: 'bought' | 'lost'
  actor_did: string
  subject_did: string
  subject_handle: string
  price: number
  at: string
  counterpart_handle?: string
}

type Store = Record<string, HistoryEvent[]>

function read(): Store {
  try {
    if (!fs.existsSync(FILE)) return {}
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'))
  } catch { return {} }
}

function write(s: Store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2))
}

export function addEvent(event: HistoryEvent) {
  const s = read()
  if (!s[event.actor_did]) s[event.actor_did] = []
  s[event.actor_did].unshift(event)
  write(s)
}

export function getHistory(did: string): HistoryEvent[] {
  return read()[did] ?? []
}
