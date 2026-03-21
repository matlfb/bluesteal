import { redis } from './redis'

export async function isBlacklisted(did: string): Promise<boolean> {
  const [inManual, inAuto] = await Promise.all([
    redis.sismember('blacklist:manual', did),
    redis.sismember('blacklist:auto', did),
  ])
  return Boolean(inManual) || Boolean(inAuto)
}

export async function filterBlacklisted<T extends { did?: string; subject_did?: string; buyer_did?: string }>(items: T[]): Promise<T[]> {
  const [manual, auto] = await Promise.all([
    redis.smembers('blacklist:manual'),
    redis.smembers('blacklist:auto'),
  ])
  const set = new Set([...manual, ...auto])
  return items.filter(i => {
    const dids = [i.did, i.subject_did, i.buyer_did].filter(Boolean) as string[]
    return !dids.some(d => set.has(d))
  })
}

export async function addToBlacklist(did: string): Promise<void> {
  await redis.sadd('blacklist:manual', did)
}

export async function removeFromBlacklist(did: string): Promise<void> {
  await redis.srem('blacklist:manual', did)
}

export async function getBlacklist(): Promise<{ manual: string[]; auto: string[] }> {
  const [manual, auto] = await Promise.all([
    redis.smembers('blacklist:manual'),
    redis.smembers('blacklist:auto'),
  ])
  return { manual, auto }
}

export async function syncFromClearsky(handle = 'bluesteal.app'): Promise<{ added: number; removed: number }> {
  const countRes = await fetch(
    `https://public.api.clearsky.services/api/v1/anon/single-blocklist/total/${handle}`,
    { signal: AbortSignal.timeout(10_000) }
  )
  if (!countRes.ok) throw new Error(`ClearSky total failed: ${countRes.status}`)
  const countData = await countRes.json()
  const total: number = countData.data?.count ?? 0

  const newAutoSet = new Set<string>()
  if (total > 0) {
    const pages = Math.ceil(total / 100)
    for (let page = 1; page <= pages; page++) {
      const res = await fetch(
        `https://public.api.clearsky.services/api/v1/anon/single-blocklist/${handle}/${page}`,
        { signal: AbortSignal.timeout(10_000) }
      )
      if (!res.ok) continue
      const data = await res.json()
      for (const item of (data.data?.blocklist ?? [])) {
        if (item.did) newAutoSet.add(item.did)
      }
      if (page < pages) await new Promise(r => setTimeout(r, 220))
    }
  }

  const prevAuto = await redis.smembers('blacklist:auto')
  const prevSet = new Set(prevAuto)
  const newAuto = [...newAutoSet]
  const added = newAuto.filter(d => !prevSet.has(d)).length
  const removed = prevAuto.filter(d => !newAutoSet.has(d)).length

  const pipe = redis.pipeline()
  pipe.del('blacklist:auto')
  if (newAuto.length) { for (const d of newAuto) pipe.sadd('blacklist:auto', d) }
  await pipe.exec()

  return { added, removed }
}
