import { NextRequest, NextResponse } from 'next/server'
import { getOwnedByOwner } from '@/lib/db'
import { getValue } from '@/lib/card-values'
import { filterBlacklisted } from '@/lib/blacklist'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const owner_did = req.nextUrl.searchParams.get('owner_did')
  if (!owner_did) return NextResponse.json({ error: 'missing owner_did' }, { status: 400 })

  const owned = await getOwnedByOwner(owner_did)
  const filtered = await filterBlacklisted(owned.map(o => ({ ...o, did: o.subject_did })))
  const withValues = await Promise.all(
    filtered.map(async o => ({ ...o, value: await getValue(o.subject_did) }))
  )
  return NextResponse.json({ owned: withValues })
}
