import { BrowserOAuthClient } from '@atproto/oauth-client-browser'

let _client: BrowserOAuthClient | null = null

export function getOAuthClient(): BrowserOAuthClient {
  if (!_client) {
    _client = new BrowserOAuthClient({
      clientMetadata: {
        client_id: 'https://bluesteal.app/client-metadata.json',
        client_name: 'BlueSTEAL',
        client_uri: 'https://bluesteal.app',
        redirect_uris: ['https://bluesteal.app/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        scope: 'atproto transition:generic',
        token_endpoint_auth_method: 'none',
        application_type: 'web',
        dpop_bound_access_tokens: true,
      },
      handleResolver: 'https://bsky.social',
    })
  }
  return _client
}
