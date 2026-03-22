import { NextRequest, NextResponse } from 'next/server'
import { signSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { isBlacklisted } from '@/lib/blacklist'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { did, handle } = await req.json()
  if (!did || typeof did !== 'string' || !did.startsWith('did:')) {
    return NextResponse.json({ error: 'Invalid DID' }, { status: 400 })
  }

  // Rate limit by DID — not by IP, which is spoofable via X-Forwarded-For
  if (!rateLimit(`session:${did}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Verify handle resolves to this DID (unless handle is the DID itself as fallback)
  if (handle && !handle.startsWith('did:')) {
    try {
      const res = await fetch(
        `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (res.ok) {
        const data = await res.json()
        if (data.did !== did) {
          return NextResponse.json({ error: 'DID mismatch' }, { status: 401 })
        }
      }
      // If Bluesky is unreachable we let it pass — OAuth already verified ownership
    } catch { /* network error — trust OAuth */ }
  }

  if (await isBlacklisted(did)) {
    return NextResponse.json({ error: 'blocked' }, { status: 403 })
  }

  const token = signSession(did)
  const response = NextResponse.json({ ok: true })
  response.cookies.set('bs_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('bs_session')
  return response
}
