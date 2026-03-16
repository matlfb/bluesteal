import { NextRequest, NextResponse } from 'next/server'
import { getRecent } from '@/lib/db'
import { getValue } from '@/lib/card-values'

export const runtime = 'nodejs'
export const revalidate = 0

// GET /api/recent?limit=6
// Returns last N purchased cards with subject profiles
export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '6'), 20)
  const recent = getRecent(limit)

  if (recent.length === 0) return NextResponse.json({ cards: [] })

  // Batch-fetch subject profiles from Bluesky
  const dids = recent.map(r => r.subject_did)
  const params = dids.map(d => `actors=${encodeURIComponent(d)}`).join('&')

  try {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    const profileMap = new Map((data.profiles ?? []).map((p: any) => [p.did, p]))

    const cards = recent
      .map(r => {
        const p = profileMap.get(r.subject_did) as any
        if (!p) return null
        return {
          subject_did:  r.subject_did,
          handle:       p.handle,
          displayName:  p.displayName || p.handle,
          avatar:       p.avatar ?? null,
          followersCount: p.followersCount ?? 0,
          owner_handle: r.owner_handle,
          purchased_at: r.purchased_at,
          value:        getValue(r.subject_did),
        }
      })
      .filter(Boolean)

    return NextResponse.json({ cards })
  } catch {
    return NextResponse.json({ cards: [] })
  }
}
