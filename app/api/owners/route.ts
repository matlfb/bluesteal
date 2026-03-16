import { NextRequest, NextResponse } from 'next/server'
import { getOwner } from '@/lib/db'
import { getValue } from '@/lib/card-values'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const subjects = (req.nextUrl.searchParams.get('subjects') ?? '').split(',').filter(Boolean)
  const result: Record<string, { owner: string | null; value: number }> = {}
  for (const did of subjects) {
    const o = getOwner(did)
    result[did] = { owner: o ? o.owner_handle : null, value: getValue(did) }
  }
  return NextResponse.json(result)
}
