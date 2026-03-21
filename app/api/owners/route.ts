import { NextRequest, NextResponse } from 'next/server'
import { getOwner } from '@/lib/db'
import { getValue } from '@/lib/card-values'
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { batchProfiles } from '@/lib/profiles'
import { filterBlacklisted } from '@/lib/blacklist'

export const runtime = 'nodejs'
const DID_RE = /^did:[a-z]+:[a-zA-Z0-9._:%-]+$/

export async function GET(req: NextRequest) {
  if (!await rateLimit(`pub:${getClientIP(req)}`, 120, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const rawSubjects = (req.nextUrl.searchParams.get('subjects') ?? '')
    .split(',').map(s => s.trim()).filter(s => s && DID_RE.test(s)).slice(0, 25)
  const allowed = await filterBlacklisted(rawSubjects.map(did => ({ did })))
  const subjects = allowed.map(o => o.did)

  const ownerships = await Promise.all(subjects.map(did => getOwner(did)))
  const ownerDids = [...new Set(ownerships.filter(Boolean).map(o => o!.owner_did))]
  const [values, profiles] = await Promise.all([
    Promise.all(subjects.map(did => getValue(did))),
    batchProfiles(ownerDids),
  ])

  const entries = subjects.map((did, i) => {
    const o = ownerships[i]
    return [did, { owner: o ? (profiles[o.owner_did]?.handle ?? o.owner_did) : null, value: values[i] }] as const
  })
  return NextResponse.json(Object.fromEntries(entries))
}
