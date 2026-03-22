import { NextRequest, NextResponse } from 'next/server'
import { addToBlacklist, removeFromBlacklist, getBlacklist } from '@/lib/blacklist'

export const runtime = 'nodejs'

function auth(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  return secret === process.env.ADMIN_SECRET
}

async function resolveHandle(handle: string): Promise<string> {
  const res = await fetch(
    `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
    { signal: AbortSignal.timeout(8_000) }
  )
  if (!res.ok) throw new Error(`Could not resolve handle: ${handle}`)
  const data = await res.json()
  return data.did
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(await getBlacklist())
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { handle, did: rawDid } = await req.json()
  const did = rawDid ?? (handle ? await resolveHandle(handle) : null)
  if (!did) return NextResponse.json({ error: 'Provide did or handle' }, { status: 400 })
  await addToBlacklist(did)
  return NextResponse.json({ ok: true, did })
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { handle, did: rawDid } = await req.json()
  const did = rawDid ?? (handle ? await resolveHandle(handle) : null)
  if (!did) return NextResponse.json({ error: 'Provide did or handle' }, { status: 400 })
  await removeFromBlacklist(did)
  return NextResponse.json({ ok: true, did })
}
