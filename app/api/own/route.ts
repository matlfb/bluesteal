import { NextRequest, NextResponse } from 'next/server'
import { getOwner, setOwner } from '@/lib/db'
import { debitBalance, creditBalance, getBalance } from '@/lib/balances'
import { appreciateValue, getValue } from '@/lib/card-values'
import { addActivity } from '@/lib/activity'
import { verifySession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { batchProfiles } from '@/lib/profiles'

export const runtime = 'nodejs'

const DID_RE = /^did:[a-z]+:[a-zA-Z0-9._:%-]+$/

export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get('subject')
  if (!subject) return NextResponse.json(null)
  const [owner, value] = await Promise.all([getOwner(subject), getValue(subject)])
  if (!owner) return NextResponse.json({ value })
  const profiles = await batchProfiles([owner.owner_did])
  const owner_handle = profiles[owner.owner_did]?.handle ?? owner.owner_did
  return NextResponse.json({ ...owner, owner_handle, value })
}

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get('bs_session')?.value
  const owner_did = sessionToken ? verifySession(sessionToken) : null
  if (!owner_did) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!await rateLimit(`own:${owner_did}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json()
  const { subject_did } = body
  if (!subject_did) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!DID_RE.test(subject_did)) return NextResponse.json({ error: 'Invalid subject' }, { status: 400 })
  if (subject_did === owner_did) return NextResponse.json({ error: 'Cannot buy your own card' }, { status: 400 })

  const [price, prevOwner] = await Promise.all([getValue(subject_did), getOwner(subject_did)])
  if (price < 1) return NextResponse.json({ error: 'Invalid card value' }, { status: 500 })
  const ok = await debitBalance(owner_did, price)
  if (!ok) {
    return NextResponse.json({ error: 'Insufficient balance', balance: await getBalance(owner_did) }, { status: 402 })
  }

  const now = new Date().toISOString()

  const [newValue] = await Promise.all([
    appreciateValue(subject_did),
    setOwner({ subject_did, owner_did, purchased_at: now }),
    addActivity({
      buyer_did: owner_did,
      subject_did,
      prev_owner_did: prevOwner?.owner_did ?? null,
      price,
      at: now,
    }),
    prevOwner?.owner_did ? creditBalance(prevOwner.owner_did, price) : Promise.resolve(),
  ])

  return NextResponse.json({ ok: true, newValue, balance: await getBalance(owner_did) })
}
