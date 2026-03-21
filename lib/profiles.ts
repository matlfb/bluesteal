import { redis } from './redis'

type ProfileEntry = { handle: string; avatar: string | null; verified: boolean }
const TTL = 5 * 60 // 5 minutes

export async function batchProfiles(
  dids: string[]
): Promise<Record<string, ProfileEntry>> {
  const unique = [...new Set(dids.filter(Boolean))]
  const result: Record<string, ProfileEntry> = {}
  if (!unique.length) return result

  // Load cached entries in one pipeline
  const cached = await redis.mget<(ProfileEntry | null)[]>(...unique.map(d => `profile:${d}`))
  const missing: string[] = []
  for (let i = 0; i < unique.length; i++) {
    if (cached[i]) result[unique[i]] = cached[i]!
    else missing.push(unique[i])
  }

  if (!missing.length) return result

  // Fetch only uncached DIDs from Bluesky
  for (let i = 0; i < missing.length; i += 25) {
    const batch = missing.slice(i, i + 25)
    const params = batch.map(d => `actors=${encodeURIComponent(d)}`).join('&')
    try {
      const res = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`,
        { cache: 'no-store', signal: AbortSignal.timeout(5000) }
      )
      const { profiles = [] } = await res.json()
      const pipe = redis.pipeline()
      for (const p of profiles) {
        const entry: ProfileEntry = {
          handle: p.handle,
          avatar: p.avatar ?? null,
          verified: p.verification?.verifiedStatus === 'valid' || p.verification?.trustedVerifierStatus === 'valid',
        }
        result[p.did] = entry
        pipe.set(`profile:${p.did}`, entry, { ex: TTL })
      }
      await pipe.exec()
    } catch {}
  }
  return result
}
