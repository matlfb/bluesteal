import { NextRequest, NextResponse } from 'next/server'
import { getOwner, setOwner } from '@/lib/db'
import { debitBalance, getBalance } from '@/lib/balances'
import { appreciateValue, getValue } from '@/lib/card-values'
import { addEvent } from '@/lib/history'
import { addActivity } from '@/lib/activity'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get('subject')
  if (!subject) return NextResponse.json(null)
  const owner = getOwner(subject)
  const value = getValue(subject)
  return NextResponse.json(owner ? { ...owner, value } : { value })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { subject_did, subject_handle, owner_did, owner_handle, purchased_at } = body

  if (!subject_did || !owner_did || !owner_handle) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const price = getValue(subject_did)
  const ok = debitBalance(owner_did, owner_handle, price)
  if (!ok) {
    return NextResponse.json({ error: 'Insufficient balance', balance: getBalance(owner_did) }, { status: 402 })
  }

  const prevOwner = getOwner(subject_did)
  const now = new Date().toISOString()

  if (prevOwner && prevOwner.owner_did !== owner_did) {
    addEvent({
      type: 'lost',
      actor_did: prevOwner.owner_did,
      subject_did,
      subject_handle: subject_handle ?? subject_did,
      price,
      at: now,
      counterpart_handle: owner_handle,
    })
  }

  const newValue = appreciateValue(subject_did)
  setOwner({ subject_did, owner_did, owner_handle, purchased_at: purchased_at ?? now })

  addEvent({
    type: 'bought',
    actor_did: owner_did,
    subject_did,
    subject_handle: subject_handle ?? subject_did,
    price,
    at: now,
    counterpart_handle: prevOwner?.owner_handle,
  })

  addActivity({
    buyer_did: owner_did,
    buyer_handle: owner_handle,
    subject_did,
    subject_handle: subject_handle ?? subject_did,
    prev_owner_handle: prevOwner?.owner_handle,
    price,
    at: now,
  })

  return NextResponse.json({ ok: true, newValue, balance: getBalance(owner_did) })
}
