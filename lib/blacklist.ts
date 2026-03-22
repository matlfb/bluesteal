import { redis } from './redis'

export async function isBlacklisted(did: string): Promise<boolean> {
  const [inManual, inAuto, inOptedOut] = await Promise.all([
    redis.sismember('blacklist:manual', did),
    redis.sismember('blacklist:auto', did),
    redis.sismember('blacklist:opted-out', did),
  ])
  return Boolean(inManual) || Boolean(inAuto) || Boolean(inOptedOut)
}

export async function filterBlacklisted<T extends { did?: string; subject_did?: string; buyer_did?: string }>(items: T[]): Promise<T[]> {
  const [manual, auto, optedOut] = await Promise.all([
    redis.smembers('blacklist:manual'),
    redis.smembers('blacklist:auto'),
    redis.smembers('blacklist:opted-out'),
  ])
  const set = new Set([...manual, ...auto, ...optedOut])
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

export async function getBlacklist(): Promise<{ manual: string[]; auto: string[]; optedOut: string[] }> {
  const [manual, auto, optedOut] = await Promise.all([
    redis.smembers('blacklist:manual'),
    redis.smembers('blacklist:auto'),
    redis.smembers('blacklist:opted-out'),
  ])
  return { manual, auto, optedOut }
}

async function resolvePds(handle: string): Promise<{ did: string; pds: string }> {
  const didRes = await fetch(
    `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
    { signal: AbortSignal.timeout(8_000) }
  )
  if (!didRes.ok) throw new Error(`resolveHandle failed: ${didRes.status}`)
  const { did } = await didRes.json()
  const docRes = await fetch(`https://plc.directory/${did}`, { signal: AbortSignal.timeout(8_000) })
  if (!docRes.ok) throw new Error(`DID doc fetch failed: ${docRes.status}`)
  const doc = await docRes.json()
  const pds: string = doc.service?.find((s: any) => s.type === 'AtprotoPersonalDataServer')?.serviceEndpoint
  if (!pds) throw new Error(`No PDS found for ${handle}`)
  return { did, pds }
}

export async function syncFromClearsky(handle = 'bluesteal.app'): Promise<{ added: number; removed: number; optedOut: number }> {
  // Sync outgoing blocks via AT Protocol (real-time, no ClearSky delay)
  const { did, pds } = await resolvePds(handle)
  const newAutoSet = new Set<string>()
  let cursor: string | undefined
  do {
    const url = `${pds}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(did)}&collection=app.bsky.graph.block&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) break
    const data = await res.json()
    for (const record of (data.records ?? [])) {
      const subject: string = record.value?.subject
      if (subject) newAutoSet.add(subject)
    }
    cursor = data.cursor
  } while (cursor)

  // Sync incoming blocks (they blocked @bluesteal.app = opt-out) via ClearSky
  const newOptedOutSet = new Set<string>()
  let optedOutPage = 1
  while (true) {
    const incomingRes = await fetch(
      `https://public.api.clearsky.services/api/v1/anon/single-blocklist/${handle}?page=${optedOutPage}`,
      { signal: AbortSignal.timeout(10_000) }
    )
    if (!incomingRes.ok) break
    const incomingData = await incomingRes.json()
    const items = incomingData.data?.blocklist ?? []
    for (const item of items) {
      if (item.did) newOptedOutSet.add(item.did)
    }
    if (items.length < 100) break
    optedOutPage++
  }

  const [prevAuto, prevOptedOut] = await Promise.all([
    redis.smembers('blacklist:auto'),
    redis.smembers('blacklist:opted-out'),
  ])
  const prevAutoSet = new Set(prevAuto)
  const newAuto = [...newAutoSet]
  const newOptedOut = [...newOptedOutSet]
  const added = newAuto.filter(d => !prevAutoSet.has(d)).length
  const removed = prevAuto.filter(d => !newAutoSet.has(d)).length
  const optedOut = newOptedOut.filter(d => !new Set(prevOptedOut).has(d)).length

  const pipe = redis.pipeline()
  pipe.del('blacklist:auto')
  if (newAuto.length) { for (const d of newAuto) pipe.sadd('blacklist:auto', d) }
  pipe.del('blacklist:opted-out')
  if (newOptedOut.length) { for (const d of newOptedOut) pipe.sadd('blacklist:opted-out', d) }
  await pipe.exec()

  return { added, removed, optedOut }
}
