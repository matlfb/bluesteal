import { NextRequest, NextResponse } from 'next/server'
import { filterBlacklisted } from '@/lib/blacklist'
import { getValue } from '@/lib/card-values'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ actors: [] })

  const res = await fetch(
    `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(q)}&limit=7`,
    { signal: AbortSignal.timeout(5_000) }
  )
  if (!res.ok) return NextResponse.json({ actors: [] })

  const data = await res.json()
  const raw = (data.actors ?? []).map((a: any) => ({
    did: a.did,
    handle: a.handle,
    displayName: a.displayName || a.handle,
    avatar: a.avatar || null,
    followersCount: a.followersCount || 0,
    verified: a.verification?.verifiedStatus === 'valid' || a.verification?.trustedVerifierStatus === 'valid',
  }))

  const visible = await filterBlacklisted(raw)
  const values = await Promise.all(visible.map(a => getValue(a.did)))
  const actors = visible.map((a, i) => ({ ...a, value: values[i] }))

  return NextResponse.json({ actors })
}
