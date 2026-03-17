import { setDefaultResultOrder } from 'dns'
setDefaultResultOrder('ipv4first')
import WebSocket from 'ws'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OWNERSHIPS_FILE  = path.join(__dirname, 'data', 'ownerships.json')
const BALANCES_FILE    = path.join(__dirname, 'data', 'balances.json')
const CARD_VALUES_FILE = path.join(__dirname, 'data', 'card_values.json')
const JETSTREAM = 'wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=blue.steal.card'

const BASE_VALUE        = 1500
const MIN_VALUE         = 600   // cards never go below this
const STARTING_BALANCE  = 25000
const INCOME_RATE       = 0.05   // 5% of card value per hour
const OWNED_DEPRECIATION_RATE = 0.005 // 0.5% per hour for owned cards
const APPRECIATE_FACTOR = 1.2    // +20% on steal

const TRENDING_HANDLES = [
  'pfrazee.com', 'jay.bsky.team', 'why.bsky.social', 'atproto.com',
  'bnewbold.net', 'dholms.bsky.social', 'haileysum.bsky.social',
  'annh.bsky.social', 'matlfb.com', 'samad.bsky.social',
]

// ── Storage helpers ──────────────────────────────────────────────────────────

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return {} }
}
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

function getOwnerships() { return readJSON(OWNERSHIPS_FILE) }
function setOwnership({ subject_did, owner_did, owner_handle, purchased_at }) {
  const s = readJSON(OWNERSHIPS_FILE)
  s[subject_did] = { subject_did, owner_did, owner_handle, purchased_at }
  writeJSON(OWNERSHIPS_FILE, s)
  console.log(`[own] ${owner_handle} → ${subject_did}`)
}

function getValue(did) { return readJSON(CARD_VALUES_FILE)[did] ?? BASE_VALUE }
function setValue(did, val) {
  const s = readJSON(CARD_VALUES_FILE)
  s[did] = Math.max(100, Math.round(val))
  writeJSON(CARD_VALUES_FILE, s)
}

function getBalance(did) { return readJSON(BALANCES_FILE)[did]?.balance ?? STARTING_BALANCE }
function creditBalance(did, handle, amount) {
  const s = readJSON(BALANCES_FILE)
  s[did] = { handle, balance: (s[did]?.balance ?? STARTING_BALANCE) + amount }
  writeJSON(BALANCES_FILE, s)
}

// ── Resolve DID → handle ─────────────────────────────────────────────────────

async function resolveHandle(did) {
  try {
    const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`)
    const data = await res.json()
    return data.handle ?? did
  } catch { return did }
}

// ── Hourly cron ──────────────────────────────────────────────────────────────

async function runHourly() {
  console.log('[cron] hourly run starting...')
  const ownerships = getOwnerships()

  // Depreciate owned card values by 0.5%/h, then credit yield based on new value
  for (const [subject_did, o] of Object.entries(ownerships)) {
    const oldVal = getValue(subject_did)
    const newVal = Math.max(MIN_VALUE, Math.round(oldVal * (1 - OWNED_DEPRECIATION_RATE)))
    if (newVal !== oldVal) {
      setValue(subject_did, newVal)
      console.log(`[cron] depreciate owned ${subject_did}: ${oldVal}J → ${newVal}J`)
    }
    const income = Math.max(1, Math.round(newVal * INCOME_RATE))
    creditBalance(o.owner_did, o.owner_handle, income)
    console.log(`[cron] +${income}J → ${o.owner_handle} (owns ${subject_did}, value=${newVal}J)`)
  }

  console.log('[cron] done')
}

// ── Firehose ─────────────────────────────────────────────────────────────────

function connect() {
  console.log('[firehose] connecting to Jetstream...')
  const ws = new WebSocket(JETSTREAM)

  ws.on('open', () => console.log('[firehose] connected'))

  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString())
      if (event.kind !== 'commit') return
      if (event.commit?.operation !== 'create') return
      const record = event.commit.record
      if (!record?.subject?.did) return

      resolveHandle(event.did).then(owner_handle => {
        setOwnership({
          subject_did:  record.subject.did,
          owner_did:    event.did,
          owner_handle,
          purchased_at: record.purchasedAt ?? new Date().toISOString(),
        })
      })
    } catch { /* ignore */ }
  })

  ws.on('close', () => {
    console.log('[firehose] disconnected — reconnect in 5s')
    setTimeout(connect, 5000)
  })
  ws.on('error', (err) => console.error('[firehose] error:', err.message))
}

connect()

// Run cron now (after 3s) then every hour
setTimeout(runHourly, 3000)
setInterval(runHourly, 60 * 60 * 1000)
