import { NextResponse } from 'next/server'

// AT Protocol OAuth client metadata
// Must be publicly accessible at this exact URL
export async function GET() {
  const metadata = {
    client_id: 'https://bluesteal.app/client-metadata.json',
    client_name: 'BlueSTEAL',
    client_uri: 'https://bluesteal.app',
    logo_uri: 'https://bluesteal.app/logo.png',
    tos_uri: 'https://bluesteal.app',
    policy_uri: 'https://bluesteal.app',
    redirect_uris: ['https://bluesteal.app/callback'],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: 'atproto repo:blue.steal.card?action=create repo:app.bsky.feed.post?action=create',
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    dpop_bound_access_tokens: true,
  }

  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  })
}
