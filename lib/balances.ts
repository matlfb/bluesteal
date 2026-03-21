import { redis } from './redis'

export const STARTING_BALANCE = 25000

export async function getBalance(did: string): Promise<number> {
  const val = await redis.get(`balance:${did}`)
  if (!val) {
    await redis.set(`balance:${did}`, JSON.stringify({ balance: STARTING_BALANCE }))
    return STARTING_BALANCE
  }
  const b = typeof val === 'string' ? JSON.parse(val) : val as { balance: number }
  return b.balance ?? STARTING_BALANCE
}

export async function creditBalance(did: string, amount: number): Promise<void> {
  const current = await getBalance(did)
  await redis.set(`balance:${did}`, JSON.stringify({ balance: current + amount }))
}

export async function debitBalance(did: string, amount: number): Promise<boolean> {
  const current = await getBalance(did)
  if (current < amount) return false
  await redis.set(`balance:${did}`, JSON.stringify({ balance: current - amount }))
  return true
}
