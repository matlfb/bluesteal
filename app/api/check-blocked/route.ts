import { NextRequest, NextResponse } from 'next/server'
import { isBlacklisted } from '@/lib/blacklist'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get('handle')?.trim()
  if (!handle) return NextResponse.json({ blocked: false })

  try {
    const res = await fetch(
      `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
      { signal: AbortSignal.timeout(5_000) }
    )
    if (!res.ok) return NextResponse.json({ blocked: false })
    const { did } = await res.json()
    const blocked = await isBlacklisted(did)
    return NextResponse.json({ blocked })
  } catch {
    return NextResponse.json({ blocked: false })
  }
}
