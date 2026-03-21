import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.SESSION_SECRET!
if (!SECRET) throw new Error('SESSION_SECRET env var is required')

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function signSession(did: string): string {
  const exp = Date.now() + SESSION_TTL_MS
  const payload = Buffer.from(JSON.stringify({ did, exp })).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifySession(token: string): string | null {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!payload || !sig) return null
  const expected = createHmac('sha256', SECRET).update(payload).digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url'))) return null
  } catch { return null }
  try {
    const { did, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (!did || !exp || Date.now() > exp) return null
    return did as string
  } catch { return null }
}
