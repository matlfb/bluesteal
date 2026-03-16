import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'balances.json')
export const STARTING_BALANCE = 25000

export interface Balance { handle: string; balance: number }
type Store = Record<string, Balance>

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

export function getBalance(did: string): number {
  return read()[did]?.balance ?? STARTING_BALANCE
}

export function creditBalance(did: string, handle: string, amount: number) {
  const s = read()
  s[did] = { handle, balance: (s[did]?.balance ?? STARTING_BALANCE) + amount }
  write(s)
}

export function debitBalance(did: string, handle: string, amount: number): boolean {
  const s = read()
  const current = s[did]?.balance ?? STARTING_BALANCE
  if (current < amount) return false
  s[did] = { handle, balance: current - amount }
  write(s)
  return true
}
