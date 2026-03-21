import { NextRequest, NextResponse } from 'next/server'
import { getHistory, getCardHistory } from '@/lib/history'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  if (!await rateLimit(`pub:${getClientIP(req)}`, 120, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const did = req.nextUrl.searchParams.get('did')
  const subject = req.nextUrl.searchParams.get('subject')
  if (!did && !subject) return NextResponse.json({ events: [] })

  const events = subject ? await getCardHistory(subject) : await getHistory(did!)
  if (!events.length) return NextResponse.json({ events: [] })

  // For card history: resolve actor handles from DIDs
  const profileById: Record<string, { handle: string; avatar: string | null }> = {}
  if (subject) {
    const actorDids = [...new Set(events.map(e => e.actor_did))].slice(0, 50)
    try {
      for (let i = 0; i < actorDids.length; i += 25) {
        const batch = actorDids.slice(i, i + 25)
        const params = batch.map(d => `actors=${encodeURIComponent(d)}`).join('&')
        const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`, { cache: 'no-store' })
        const { profiles = [] } = await res.json()
        for (const p of profiles) profileById[p.did] = { handle: p.handle, avatar: p.avatar ?? null }
      }
    } catch {}
  }

  // Collect unique handles to fetch avatars
  const handles = [...new Set(
    events.flatMap(e => [e.subject_handle, e.counterpart_handle].filter(Boolean) as string[])
  )].slice(0, 50)

  const avatars: Record<string, string | null> = {}
  try {
    for (let i = 0; i < handles.length; i += 25) {
      const batch = handles.slice(i, i + 25)
      const params = batch.map(h => `actors=${encodeURIComponent(h)}`).join('&')
      const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`, { cache: 'no-store' })
      const { profiles = [] } = await res.json()
      for (const p of profiles) avatars[p.handle] = p.avatar ?? null
    }
  } catch {}

  return NextResponse.json({
    events: events.map(e => ({
      ...e,
      actor_handle: profileById[e.actor_did]?.handle ?? null,
      actor_avatar: profileById[e.actor_did]?.avatar ?? null,
      subject_avatar: avatars[e.subject_handle] ?? null,
      counterpart_avatar: e.counterpart_handle ? (avatars[e.counterpart_handle] ?? null) : null,
    }))
  })
}
