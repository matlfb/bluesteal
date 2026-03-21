import { NextResponse } from 'next/server'

// Required by AT Protocol OAuth spec
export async function GET() {
  return NextResponse.json({
    resource: 'https://bluesteal.app',
    authorization_servers: ['https://bsky.social'],
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  })
}
