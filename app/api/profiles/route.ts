import { NextRequest, NextResponse } from 'next/server'
import { fetchProfiles, calcPrice, calcPriceChange } from '@/lib/bsky'
import { filterBlacklisted } from '@/lib/blacklist'

export async function GET(req: NextRequest) {
  const handles = req.nextUrl.searchParams.getAll('actors')
  if (!handles.length) {
    return NextResponse.json({ error: 'No actors provided' }, { status: 400 })
  }

  try {
    const profiles = await fetchProfiles(handles.slice(0, 25))
    const visible = await filterBlacklisted(profiles.map(p => ({ ...p, did: p.did })))
    const cards = visible
      .map(p => ({
        ...p,
        price: calcPrice(p.followersCount),
        priceChange: calcPriceChange(),
      }))
    return NextResponse.json({ cards }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
