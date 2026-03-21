export async function batchProfiles(
  dids: string[]
): Promise<Record<string, { handle: string; avatar: string | null; verified: boolean }>> {
  const unique = [...new Set(dids.filter(Boolean))]
  const result: Record<string, { handle: string; avatar: string | null; verified: boolean }> = {}
  for (let i = 0; i < unique.length; i += 25) {
    const batch = unique.slice(i, i + 25)
    const params = batch.map(d => `actors=${encodeURIComponent(d)}`).join('&')
    try {
      const res = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`,
        { cache: 'no-store', signal: AbortSignal.timeout(5000) }
      )
      const { profiles = [] } = await res.json()
      for (const p of profiles) result[p.did] = {
        handle: p.handle,
        avatar: p.avatar ?? null,
        verified: p.verification?.verifiedStatus === 'valid' || p.verification?.trustedVerifierStatus === 'valid',
      }
    } catch {}
  }
  return result
}
