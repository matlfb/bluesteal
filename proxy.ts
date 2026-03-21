import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limiter — single Pi process, this is shared across all requests
interface Entry { count: number; reset: number }
const store = new Map<string, Entry>()

function check(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const e = store.get(key)
  if (!e || now > e.reset) { store.set(key, { count: 1, reset: now + windowMs }); return true }
  if (e.count >= limit) return false
  e.count++
  return true
}

// Periodically clean up expired entries to prevent unbounded Map growth
let lastClean = Date.now()
function maybePrune() {
  const now = Date.now()
  if (now - lastClean < 60_000) return
  lastClean = now
  for (const [k, v] of store) if (now > v.reset) store.delete(k)
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  maybePrune()

  // /api/own and /api/session have their own stricter per-DID limits
  // applied inside the route handlers — skip here to avoid double counting
  if (pathname === '/api/own' || pathname === '/api/session') return NextResponse.next()

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'

  // Tighter limit on write/sensitive endpoints
  const limit = pathname === '/api/leaderboard' ? 30 : 120
  if (!check(`api:${ip}:${pathname}`, limit, 60_000)) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return NextResponse.next()
}

export const config = { matcher: '/api/:path*' }
