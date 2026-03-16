import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE  = path.join(DATA_DIR, 'ownerships.json')

export interface Ownership {
  subject_did:  string
  owner_did:    string
  owner_handle: string
  purchased_at: string
}

type Store = Record<string, Ownership>

function read(): Store {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!fs.existsSync(DB_FILE)) return {}
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function write(store: Store): void {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

export function getOwner(subjectDid: string): Ownership | null {
  return read()[subjectDid] ?? null
}

export function setOwner(o: Ownership): void {
  const store = read()
  store[o.subject_did] = o
  write(store)
}

export function getRecent(limit = 10): Ownership[] {
  const store = read()
  return Object.values(store)
    .sort((a, b) => b.purchased_at.localeCompare(a.purchased_at))
    .slice(0, limit)
}
