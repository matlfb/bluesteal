import { NextRequest, NextResponse } from 'next/server'
import { isBlacklisted } from '@/lib/blacklist'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const did = req.nextUrl.searchParams.get('did') ?? ''
  if (!did) return NextResponse.json({ blacklisted: false })
  return NextResponse.json({ blacklisted: await isBlacklisted(did) })
}
