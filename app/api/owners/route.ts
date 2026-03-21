import { NextRequest, NextResponse } from 'next/server'
import { getOwner } from '@/lib/db'
import { getValue } from '@/lib/card-values'

export const runtime = 'nodejs'
const DID_RE = /^did:[a-z]+:[a-zA-Z0-9._:%-]+$/

export async function GET(req: NextRequest) {
  const subjects = (req.nextUrl.searchParams.get('subjects') ?? '')
    .split(',').map(s => s.trim()).filter(s => s && DID_RE.test(s)).slice(0, 25)

  const entries = await Promise.all(
    subjects.map(async did => {
      const [o, value] = await Promise.all([getOwner(did), getValue(did)])
      return [did, { owner: o ? o.owner_handle : null, value }] as const
    })
  )
  return NextResponse.json(Object.fromEntries(entries))
}
