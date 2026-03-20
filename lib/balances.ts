import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'balances.json')
const LOCK_FILE = FILE + '.lock'
export const STARTING_BALANCE = 25000

export interface Balance { handle: string; balance: number }
type Store = Record<string, Balance>

function acquireLock(timeout = 5000): number {
  const start = Date.now()
  while (true) {
    try {
      return fs.openSync(LOCK_FILE, 'wx')
    } catch {
      if (Date.now() - start > timeout) throw new Error('balances lock timeout')
      const until = Date.now() + 5
      while (Date.now() < until) {}
    }
  }
}

function releaseLock(fd: number): void {
  try { fs.closeSync(fd) } catch {}
  try { fs.unlinkSync(LOCK_FILE) } catch {}
}

function read(): Store {
  try {
    if (!fs.existsSync(FILE)) return {}
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'))
  } catch { return {} }
}

function write(s: Store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  const tmp = FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2), 'utf-8')
  fs.renameSync(tmp, FILE)
}

export function getBalance(did: string): number {
  return read()[did]?.balance ?? STARTING_BALANCE
}

export function creditBalance(did: string, handle: string, amount: number) {
  const fd = acquireLock()
  try {
    const s = read()
    s[did] = { handle, balance: (s[did]?.balance ?? STARTING_BALANCE) + amount }
    write(s)
  } finally {
    releaseLock(fd)
  }
}

export function debitBalance(did: string, handle: string, amount: number): boolean {
  const fd = acquireLock()
  try {
    const s = read()
    const current = s[did]?.balance ?? STARTING_BALANCE
    if (current < amount) return false
    s[did] = { handle, balance: current - amount }
    write(s)
    return true
  } finally {
    releaseLock(fd)
  }
}
