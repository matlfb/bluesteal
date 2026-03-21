const BSKY_API = 'https://public.api.bsky.app/xrpc'
const CONSTELLATION = 'https://constellation.microcosm.blue'

export interface BskyProfile {
  did: string
  handle: string
  displayName: string
  avatar: string | null
  description: string | null
  followersCount: number
  followsCount: number
  postsCount: number
  verified: boolean
}

export interface CardProfile extends BskyProfile {
  price: number
  priceChange: number
  owner: string | null
  networkLinks: number | null
}

export const BASE_PRICE = 1500

/** Calcule un prix fictif basé sur les vrais followers */
export function calcPrice(followersCount: number): number {
  if (followersCount <= 0) return 1500
  // log10(followers) * 3000, arrondi à 100
  const raw = Math.log10(followersCount + 1) * 3000
  return Math.round(raw / 100) * 100
}

/** Pricechange mock pour l'instant */
export function calcPriceChange(): number {
  const changes = [-5, -3, -1, 0, 2, 4, 6, 8, 10, 15]
  return changes[Math.floor(Math.random() * changes.length)]
}

/** Fetch jusqu'à 25 profils Bluesky en une requête */
export async function fetchProfiles(handles: string[]): Promise<BskyProfile[]> {
  const params = handles.map(h => `actors=${encodeURIComponent(h)}`).join('&')
  const res = await fetch(`${BSKY_API}/app.bsky.actor.getProfiles?${params}`, {
    next: { revalidate: 300 }, // cache 5 min
  })
  if (!res.ok) throw new Error(`Bsky API error: ${res.status}`)
  const data = await res.json()
  return (data.profiles || []).map((p: any) => ({
    did: p.did,
    handle: p.handle,
    displayName: p.displayName || p.handle,
    avatar: p.avatar || null,
    description: p.description || null,
    followersCount: p.followersCount || 0,
    followsCount: p.followsCount || 0,
    postsCount: p.postsCount || 0,
    verified: p.verification?.verifiedStatus === 'valid',
  }))
}

/** Fetch les network links depuis Constellation (nb d'interactions cross-app) */
export async function fetchNetworkLinks(did: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${CONSTELLATION}/links/count/distinct-dids?target=${encodeURIComponent(did)}&collection=app.bsky.graph.follow&path=.subject`,
      { next: { revalidate: 600 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.total ?? null
  } catch {
    return null
  }
}

/** Liste des comptes à afficher sur la home (populaires sur Bluesky) */
export const FEATURED_HANDLES = [
  'pfrazee.com',
  'jay.bsky.team',
  'why.bsky.social',
  'atproto.com',
  'bnewbold.net',
  'dholms.bsky.social',
  'haileysum.bsky.social',
  'annh.bsky.social',
  'matlfb.com',
  'samad.bsky.social',
]

export const TRENDING_HANDLES = [
  'pfrazee.com',
  'jay.bsky.team',
  'why.bsky.social',
  'bnewbold.net',
  'dholms.bsky.social',
  'haileysum.bsky.social',
  'annh.bsky.social',
  'matlfb.com',
]

/** Résout l'URL du PDS d'un DID */
export async function resolvePds(did: string): Promise<string> {
  try {
    if (did.startsWith('did:plc:')) {
      const res = await fetch(`https://plc.directory/${did}`)
      const doc = await res.json()
      const svc = (doc.service || []).find((s: any) => s.id === '#atproto_pds')
      return svc?.serviceEndpoint || 'https://bsky.social'
    } else if (did.startsWith('did:web:')) {
      const host = did.slice(8)
      const res = await fetch(`https://${host}/.well-known/did.json`)
      const doc = await res.json()
      const svc = (doc.service || []).find((s: any) => s.id === '#atproto_pds')
      return svc?.serviceEndpoint || 'https://bsky.social'
    }
  } catch {}
  return 'https://bsky.social'
}
