import fs from 'fs'
import path from 'path'

export const BASE_VALUE = 1500
const FILE = path.join(process.cwd(), 'data', 'card_values.json')

function read(): Record<string, number> {
  try {
    if (!fs.existsSync(FILE)) return {}
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'))
  } catch { return {} }
}

function write(s: Record<string, number>) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2))
}

export function getValue(did: string): number {
  return read()[did] ?? BASE_VALUE
}

export function appreciateValue(did: string): number {
  const next = Math.round((read()[did] ?? BASE_VALUE) * 1.2)
  const s = read(); s[did] = next; write(s)
  return next
}

export function depreciateValue(did: string): number {
  const next = Math.max(600, Math.round((read()[did] ?? BASE_VALUE) * 0.98))
  const s = read(); s[did] = next; write(s)
  return next
}
