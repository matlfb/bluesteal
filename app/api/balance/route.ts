import { NextRequest, NextResponse } from 'next/server'
import { getBalance } from '@/lib/balances'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const did = req.nextUrl.searchParams.get('did')
  if (!did) return NextResponse.json({ error: 'missing did' }, { status: 400 })
  return NextResponse.json({ balance: getBalance(did) })
}
