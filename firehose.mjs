import { setDefaultResultOrder } from 'dns'
setDefaultResultOrder('ipv4first')

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN')
  process.exit(1)
}

const BASE_VALUE              = 1500
const MIN_VALUE               = 600
const STARTING_BALANCE        = 25000
const INCOME_RATE             = 0.015
const OWNED_DEPRECIATION_RATE = 0.005
const DID_RE                  = /^did:[a-z]+:[a-zA-Z0-9._:%-]+$/

// ── Redis helpers ─────────────────────────────────────────────────────────────

async function redis(cmd, ...args) {
  const res = await fetch(`${REDIS_URL}/${cmd}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  })
  const data = await res.json()
  return data.result
}

async function redisPipeline(commands) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  return res.json()
}

// ── Data helpers ──────────────────────────────────────────────────────────────

async function getBalance(did) {
  const val = await redis('get', `balance:${did}`)
  if (!val) {
    await setBalance(did, STARTING_BALANCE)
    return STARTING_BALANCE
  }
  return (typeof val === 'string' ? JSON.parse(val) : val).balance ?? STARTING_BALANCE
}

async function setBalance(did, balance) {
  await redis('set', `balance:${did}`, JSON.stringify({ balance }))
}

async function debitBalance(did, amount) {
  const current = await getBalance(did)
  if (current < amount) return false
  await setBalance(did, current - amount)
  return true
}

async function creditBalance(did, amount) {
  const current = await getBalance(did)
  await setBalance(did, current + amount)
}

async function getValue(did) {
  const val = await redis('hget', 'card_values:all', did)
  return val ? Number(val) : BASE_VALUE
}

async function setValue(did, value) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['hset', 'card_values:all', did, String(value)],
      ['zadd', 'cards:by_value', String(value), did],
    ]),
  })
  await res.json()
}

async function setOwnership(o) {
  const record = { subject_did: o.subject_did, owner_did: o.owner_did, purchased_at: o.purchased_at }
  const json = JSON.stringify(record)
  const prev = await redis('get', `ownership:${o.subject_did}`)
  const prevOwner = prev ? (typeof prev === 'string' ? JSON.parse(prev) : prev) : null

  // Skip if already owned by same owner (dedup duplicate firehose events)
  if (prevOwner && prevOwner.owner_did === o.owner_did) return null

  const cmds = [
    ['set', `ownership:${o.subject_did}`, json],
    ['hset', 'ownerships:all', o.subject_did, json],
    ['sadd', `owner:${o.owner_did}:cards`, o.subject_did],
    ['lpush', 'ownerships:recent', json],
    ['ltrim', 'ownerships:recent', '0', '49'],
  ]
  if (prevOwner) {
    cmds.push(['srem', `owner:${prevOwner.owner_did}:cards`, o.subject_did])
  }

  await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  })
  return prevOwner
}

async function getAllOwnerships() {
  const hash = await redis('hgetall', 'ownerships:all')
  if (!hash || !Array.isArray(hash)) return {}
  const result = {}
  for (let i = 0; i < hash.length; i += 2) {
    result[hash[i]] = typeof hash[i+1] === 'string' ? JSON.parse(hash[i+1]) : hash[i+1]
  }
  return result
}

async function resolveHandle(did) {
  try {
    const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`, { signal: AbortSignal.timeout(5000) })
    if (res.ok) { const d = await res.json(); return d.handle || did }
  } catch {}
  return did
}

// ── Hourly cron ───────────────────────────────────────────────────────────────

async function runHourly() {
  console.log('[cron] hourly run starting...')
  const ownerships = await getAllOwnerships()

  for (const [subject_did, o] of Object.entries(ownerships)) {
    const oldVal = await getValue(subject_did)
    const newVal = Math.max(MIN_VALUE, Math.round(oldVal * (1 - OWNED_DEPRECIATION_RATE)))
    if (newVal !== oldVal) {
      await setValue(subject_did, newVal)
      console.log(`[cron] depreciate ${subject_did}: ${oldVal}J → ${newVal}J`)
    }
    if (newVal <= MIN_VALUE) continue
    const income = Math.round(newVal * INCOME_RATE)
    await creditBalance(o.owner_did, income)
    console.log(`[cron] +${income}J → ${o.owner_did}`)
  }

  console.log('[cron] done')
}

setTimeout(runHourly, 3000)
setInterval(runHourly, 60 * 60 * 1000)

// Sync blacklist every 5 minutes via Vercel cron endpoint
async function syncBlacklist() {
  const url = process.env.VERCEL_APP_URL
  const secret = process.env.CRON_SECRET
  if (!url || !secret) return
  try {
    const res = await fetch(`${url}/api/cron/sync-blacklist`, {
      headers: { 'x-cron-secret': secret }
    })
    const data = await res.json()
    console.log('[blacklist] sync:', data)
  } catch (err) {
    console.error('[blacklist] sync failed:', err.message)
  }
}

setInterval(syncBlacklist, 5 * 60 * 1000)
