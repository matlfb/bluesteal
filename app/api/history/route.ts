import { NextRequest, NextResponse } from 'next/server'
import { getHistory } from '@/lib/history'
import { verifySession } from '@/lib/session'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get('bs_session')?.value
  const session_did = sessionToken ? verifySession(sessionToken) : null
  if (!session_did) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const did = req.nextUrl.searchParams.get('did')
  if (!did) return NextResponse.json({ events: [] })
  if (did !== session_did) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ events: getHistory(did) })
}
