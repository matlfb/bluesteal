import { setDefaultResultOrder } from 'dns'
setDefaultResultOrder('ipv4first')
import WebSocket from 'ws'

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN')
  process.exit(1)
}

const JETSTREAM = 'wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=blue.steal.card'
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
  if (!val) return STARTING_BALANCE
  return (typeof val === 'string' ? JSON.parse(val) : val).balance ?? STARTING_BALANCE
}

async function setBalance(did, handle, balance) {
  await redis('set', `balance:${did}`, JSON.stringify({ handle, balance }))
}

async function debitBalance(did, handle, amount) {
  const current = await getBalance(did)
  if (current < amount) return false
  await setBalance(did, handle, current - amount)
  return true
}

async function creditBalance(did, handle, amount) {
  const current = await getBalance(did)
  await setBalance(did, handle, current + amount)
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
  const json = JSON.stringify(o)
  const prev = await redis('get', `ownership:${o.subject_did}`)
  const prevOwner = prev ? (typeof prev === 'string' ? JSON.parse(prev) : prev) : null

  const cmds = [
    ['set', `ownership:${o.subject_did}`, json],
    ['hset', 'ownerships:all', o.subject_did, json],
    ['sadd', `owner:${o.owner_did}:cards`, o.subject_did],
    ['lpush', 'ownerships:recent', json],
    ['ltrim', 'ownerships:recent', '0', '49'],
  ]
  if (prevOwner && prevOwner.owner_did !== o.owner_did) {
    cmds.push(['srem', `owner:${prevOwner.owner_did}:cards`, o.subject_did])
  }

  await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  })
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
    await creditBalance(o.owner_did, o.owner_handle, income)
    console.log(`[cron] +${income}J → ${o.owner_handle}`)
  }

  console.log('[cron] done')
}

// ── Firehose ──────────────────────────────────────────────────────────────────

function connect() {
  console.log('[firehose] connecting...')
  const ws = new WebSocket(JETSTREAM)

  ws.on('open', () => console.log('[firehose] connected'))

  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString())
      if (event.kind !== 'commit') return
      if (event.commit?.operation !== 'create') return
      const record = event.commit.record
      if (!record?.subject?.did) return

      const owner_did   = event.did
      const subject_did = record.subject.did
      if (!DID_RE.test(owner_did) || !DID_RE.test(subject_did)) return
      if (owner_did === subject_did) return

      resolveHandle(owner_did).then(async owner_handle => {
        const price = await getValue(subject_did)
        const ok = await debitBalance(owner_did, owner_handle, price)
        if (!ok) {
          console.log(`[firehose] rejected: ${owner_handle} insufficient balance (price=${price})`)
          return
        }
        const newValue = Math.round((await getValue(subject_did)) * 1.2)
        await setValue(subject_did, newValue)
        const now = new Date().toISOString()
        await setOwnership({ subject_did, owner_did, owner_handle, purchased_at: now })
        console.log(`[firehose] ${owner_handle} acquired ${subject_did} for ${price}J`)
      }).catch(console.error)
    } catch {}
  })

  ws.on('close', () => { console.log('[firehose] disconnected — reconnect in 5s'); setTimeout(connect, 5000) })
  ws.on('error', err => console.error('[firehose] error:', err.message))
}

connect()
setTimeout(runHourly, 3000)
setInterval(runHourly, 60 * 60 * 1000)
