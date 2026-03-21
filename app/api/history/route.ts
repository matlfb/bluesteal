import { NextRequest, NextResponse } from 'next/server'
import { getUserActivity, getCardActivity, LedgerEvent } from '@/lib/activity'
import { batchProfiles } from '@/lib/profiles'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

export const runtime = 'nodejs'

async function toHistoryEvents(events: LedgerEvent[], viewerDid: string | null, isCardView: boolean) {
  const dids = [...new Set(events.flatMap(e =>
    [e.buyer_did, e.subject_did, e.prev_owner_did].filter(Boolean) as string[]
  ))]
  const profiles = await batchProfiles(dids)

  return events.map(e => {
    const isBought = isCardView || e.buyer_did === viewerDid
    // For user history: buyer_did === viewerDid → 'bought', prev_owner_did === viewerDid → 'lost'
    // For card history: always 'bought' (shows who acquired the card)
    const type = isBought ? 'bought' : 'lost'

    // actor = the one performing the action
    // - bought: the buyer
    // - lost: the previous owner (viewer)
    const actor_did = isBought ? e.buyer_did : (e.prev_owner_did ?? viewerDid ?? e.buyer_did)
    // counterpart = the other party
    // - bought: who it was stolen from (prev owner)
    // - lost: who stole it (buyer)
    const counterpart_did = isBought ? e.prev_owner_did : e.buyer_did

    return {
      type,
      actor_did,
      actor_handle: profiles[actor_did]?.handle ?? actor_did,
      actor_avatar: profiles[actor_did]?.avatar ?? null,
      subject_did: e.subject_did,
      subject_handle: profiles[e.subject_did]?.handle ?? e.subject_did,
      subject_avatar: profiles[e.subject_did]?.avatar ?? null,
      counterpart_did,
      counterpart_handle: counterpart_did ? (profiles[counterpart_did]?.handle ?? counterpart_did) : null,
      counterpart_avatar: counterpart_did ? (profiles[counterpart_did]?.avatar ?? null) : null,
      price: e.price,
      at: e.at,
    }
  })
}

export async function GET(req: NextRequest) {
  if (!await rateLimit(`pub:${getClientIP(req)}`, 120, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const did = req.nextUrl.searchParams.get('did')
  const subject = req.nextUrl.searchParams.get('subject')
  if (!did && !subject) return NextResponse.json({ events: [] })

  const raw = subject ? await getCardActivity(subject) : await getUserActivity(did!)
  if (!raw.length) return NextResponse.json({ events: [] })

  const events = await toHistoryEvents(raw, did, !!subject)
  return NextResponse.json({ events })
}
