import { setDefaultResultOrder } from 'dns'
setDefaultResultOrder('ipv4first')
import WebSocket from 'ws'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OWNERSHIPS_FILE  = path.join(__dirname, 'data', 'ownerships.json')
const OWNERSHIPS_LOCK  = OWNERSHIPS_FILE + '.lock'
const BALANCES_FILE    = path.join(__dirname, 'data', 'balances.json')
const BALANCES_LOCK    = BALANCES_FILE + '.lock'
const CARD_VALUES_FILE = path.join(__dirname, 'data', 'card_values.json')
const JETSTREAM = 'wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=blue.steal.card'

const BASE_VALUE              = 1500
const MIN_VALUE               = 600
const STARTING_BALANCE        = 25000
const INCOME_RATE             = 0.03
const OWNED_DEPRECIATION_RATE = 0.005
const APPRECIATE_FACTOR       = 1.2

// ── File lock helpers ────────────────────────────────────────────────────────

function acquireLock(lockFile, timeout = 5000) {
  const start = Date.now()
  while (true) {
    try {
      const fd = fs.openSync(lockFile, 'wx')
      return fd
    } catch {
      if (Date.now() - start > timeout) throw new Error(`lock timeout: ${lockFile}`)
      const until = Date.now() + 5
      while (Date.now() < until) {}
    }
  }
}

function releaseLock(fd, lockFile) {
  try { fs.closeSync(fd) } catch {}
  try { fs.unlinkSync(lockFile) } catch {}
}

// ── Storage helpers ──────────────────────────────────────────────────────────

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return {} }
}

function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, file)
}

function getOwnerships() { return readJSON(OWNERSHIPS_FILE) }

function setOwnership({ subject_did, owner_did, owner_handle, purchased_at }) {
  const fd = acquireLock(OWNERSHIPS_LOCK)
  try {
    const s = readJSON(OWNERSHIPS_FILE)
    s[subject_did] = { subject_did, owner_did, owner_handle, purchased_at }
    writeAtomic(OWNERSHIPS_FILE, s)
    console.log(`[own] ${owner_handle} → ${subject_did}`)
  } finally {
    releaseLock(fd, OWNERSHIPS_LOCK)
  }
}

function getValue(did) { return readJSON(CARD_VALUES_FILE)[did] ?? BASE_VALUE }

function setValue(did, val) {
  const s = readJSON(CARD_VALUES_FILE)
  s[did] = Math.max(100, Math.round(val))
  writeAtomic(CARD_VALUES_FILE, s)
}

function getBalance(did) { return readJSON(BALANCES_FILE)[did]?.balance ?? STARTING_BALANCE }

function creditBalance(did, handle, amount) {
  const fd = acquireLock(BALANCES_LOCK)
  try {
    const s = readJSON(BALANCES_FILE)
    s[did] = { handle, balance: (s[did]?.balance ?? STARTING_BALANCE) + amount }
    writeAtomic(BALANCES_FILE, s)
  } finally {
    releaseLock(fd, BALANCES_LOCK)
  }
}

function debitBalance(did, handle, amount) {
  const fd = acquireLock(BALANCES_LOCK)
  try {
    const s = readJSON(BALANCES_FILE)
    const current = s[did]?.balance ?? STARTING_BALANCE
    if (current < amount) return false
    s[did] = { handle, balance: current - amount }
    writeAtomic(BALANCES_FILE, s)
    return true
  } finally {
    releaseLock(fd, BALANCES_LOCK)
  }
}

// ── Resolve DID → handle ─────────────────────────────────────────────────────

const DID_RE = /^did:[a-z]+:[a-zA-Z0-9._:%-]+$/

async function resolveHandle(did) {
  try {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    return data.handle ?? did
  } catch { return did }
}

// ── Hourly cron ──────────────────────────────────────────────────────────────

async function runHourly() {
  console.log('[cron] hourly run starting...')
  const ownerships = getOwnerships()

  for (const [subject_did, o] of Object.entries(ownerships)) {
    const oldVal = getValue(subject_did)
    const newVal = Math.max(MIN_VALUE, Math.round(oldVal * (1 - OWNED_DEPRECIATION_RATE)))
    if (newVal !== oldVal) {
      setValue(subject_did, newVal)
      console.log(`[cron] depreciate owned ${subject_did}: ${oldVal}J → ${newVal}J`)
    }
    if (newVal <= MIN_VALUE) continue
    const income = Math.round(newVal * INCOME_RATE)
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

      // Validate DIDs from external source
      const owner_did   = event.did
      const subject_did = record.subject.did
      if (!DID_RE.test(owner_did) || !DID_RE.test(subject_did)) return

      // Prevent self-ownership
      if (owner_did === subject_did) return

      resolveHandle(owner_did).then(owner_handle => {
        const price = getValue(subject_did)

        // Check and deduct balance — reject event if insufficient funds
        const ok = debitBalance(owner_did, owner_handle, price)
        if (!ok) {
          console.log(`[firehose] rejected: ${owner_handle} has insufficient balance for ${subject_did} (price=${price})`)
          return
        }

        // Appreciate card value on steal
        const newValue = Math.round(getValue(subject_did) * APPRECIATE_FACTOR)
        setValue(subject_did, newValue)

        // Always use server time — never trust purchasedAt from the external record
        const now = new Date().toISOString()
        setOwnership({ subject_did, owner_did, owner_handle, purchased_at: now })
      })
    } catch { /* ignore malformed events */ }
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
