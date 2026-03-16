import { NextResponse } from 'next/server'

// AT Protocol OAuth client metadata
// Must be publicly accessible at this exact URL
export async function GET() {
  const metadata = {
    client_id: 'https://bluesteal.matlfb.com/client-metadata.json',
    client_name: 'BlueSTEAL',
    client_uri: 'https://bluesteal.matlfb.com',
    logo_uri: 'https://bluesteal.matlfb.com/logo.png',
    tos_uri: 'https://bluesteal.matlfb.com',
    policy_uri: 'https://bluesteal.matlfb.com',
    redirect_uris: ['https://bluesteal.matlfb.com/callback'],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: 'atproto transition:generic',
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
