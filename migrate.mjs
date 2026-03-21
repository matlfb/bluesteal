// Migration script: JSON files → Upstash Redis
// Run once from the Pi: node migrate.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, 'data')

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (!REDIS_URL || !REDIS_TOKEN) { console.error('Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'); process.exit(1) }

async function r(cmd, ...args) {
  const res = await fetch(`${REDIS_URL}/${cmd}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  })
  return (await res.json()).result
}

async function pipe(cmds) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds)
  })
  return res.json()
}

function read(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf-8')) } catch { return fallback }
}

async function migrate() {
  console.log('Starting migration...')

  // Ownerships
  const ownerships = read('ownerships.json', {})
  const oEntries = Object.entries(ownerships)
  if (oEntries.length) {
    const hsetArgs = oEntries.flatMap(([k, v]) => [k, JSON.stringify(v)])
    const cmds = [['hset', 'ownerships:all', ...hsetArgs]]
    for (const [subject_did, o] of oEntries) {
      cmds.push(['set', `ownership:${subject_did}`, JSON.stringify(o)])
      cmds.push(['sadd', `owner:${o.owner_did}:cards`, subject_did])
    }
    const sorted = oEntries.sort((a, b) => b[1].purchased_at.localeCompare(a[1].purchased_at)).slice(0, 50)
    for (const [, o] of sorted) cmds.push(['lpush', 'ownerships:recent', JSON.stringify(o)])
    await pipe(cmds)
    console.log(`✓ ${oEntries.length} ownerships`)
  }

  // Balances
  const balances = read('balances.json', {})
  const bEntries = Object.entries(balances)
  if (bEntries.length) {
    const cmds = bEntries.map(([did, b]) => ['set', `balance:${did}`, JSON.stringify(b)])
    await pipe(cmds)
    console.log(`✓ ${bEntries.length} balances`)
  }

  // Card values
  const cardValues = read('card_values.json', {})
  const cvEntries = Object.entries(cardValues)
  if (cvEntries.length) {
    const hsetArgs = cvEntries.flatMap(([k, v]) => [k, String(v)])
    const zaddArgs = cvEntries.flatMap(([k, v]) => [String(v), k])
    await pipe([
      ['hset', 'card_values:all', ...hsetArgs],
      ['zadd', 'cards:by_value', ...zaddArgs],
    ])
    console.log(`✓ ${cvEntries.length} card values`)
  }

  // History
  const history = read('history.json', {})
  for (const [did, events] of Object.entries(history)) {
    if (!events.length) continue
    const cmds = [
      ...events.slice(0, 500).reverse().map(e => ['lpush', `history:${did}`, JSON.stringify(e)]),
      ['ltrim', `history:${did}`, '0', '499'],
    ]
    await pipe(cmds)
  }
  const totalHistory = Object.values(history).reduce((s, e) => s + e.length, 0)
  console.log(`✓ ${totalHistory} history events`)

  // Steal counts from history
  const steals = {}
  for (const events of Object.values(history)) {
    for (const e of events) {
      if (e.type === 'bought') steals[e.actor_did] = (steals[e.actor_did] ?? 0) + 1
    }
  }
  if (Object.keys(steals).length) {
    const hsetArgs = Object.entries(steals).flatMap(([k, v]) => [k, String(v)])
    await pipe([['hset', 'steals:all', ...hsetArgs]])
    console.log(`✓ steal counts for ${Object.keys(steals).length} users`)
  }

  // Activity
  const activity = read('activity.json', [])
  if (activity.length) {
    const cmds = [
      ...activity.slice(0, 500).reverse().map(e => ['lpush', 'activity:global', JSON.stringify(e)]),
      ['ltrim', 'activity:global', '0', '499'],
    ]
    await pipe(cmds)
    console.log(`✓ ${activity.length} activity events`)
  }

  // Blacklists
  const manual = read('blacklist_manual.json', [])
  const auto   = read('blacklist_auto.json', [])
  if (manual.length) await pipe([['sadd', 'blacklist:manual', ...manual]])
  if (auto.length) await pipe([['sadd', 'blacklist:auto', ...auto]])
  console.log(`✓ blacklists (${manual.length} manual, ${auto.length} auto)`)

  console.log('\n✅ Migration complete!')
}

migrate().catch(console.error)
