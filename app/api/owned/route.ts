import { NextRequest, NextResponse } from 'next/server'
import { getOwner } from '@/lib/db'
import { getValue } from '@/lib/card-values'

export const runtime = 'nodejs'

// GET /api/owned?owner_did=xxx — returns all subjects currently owned by this DID
// Reads directly from ownerships.json (source of truth)
export async function GET(req: NextRequest) {
  const owner_did = req.nextUrl.searchParams.get('owner_did')
  if (!owner_did) return NextResponse.json({ error: 'missing owner_did' }, { status: 400 })

  // Read all ownerships and filter by owner
  const fs = await import('fs')
  const path = await import('path')
  const file = path.join(process.cwd(), 'data', 'ownerships.json')
  let store: Record<string, any> = {}
  try {
    if (fs.existsSync(file)) store = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {}

  const owned = Object.values(store)
    .filter((o: any) => o.owner_did === owner_did)
    .map((o: any) => ({ subject_did: o.subject_did, purchased_at: o.purchased_at, value: getValue(o.subject_did) }))

  return NextResponse.json({ owned })
}
