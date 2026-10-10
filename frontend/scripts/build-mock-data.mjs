// Converts ../yield_features_final.csv into compact per-series JSON files for the mock API.
// Usage: node scripts/build-mock-data.mjs [path/to/yield_features_final.csv]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const csvPath = resolve(process.argv[2] ?? join(root, '..', 'yield_features_final.csv'))
const outDir = join(root, 'public', 'mock-data')

const lines = readFileSync(csvPath, 'utf8').trim().split(/\r?\n/)
const header = lines[0].split(',')
const col = (name) => header.indexOf(name)
const idx = {
  date: col('date'),
  price: col('price'),
  imputed: col('is_imputed_date'),
  market: col('market'),
  crop: col('crop'),
  v7: col('volatility_7d'),
  v30: col('volatility_30d'),
  panic: col('panic_index_7d'),
  roc7: col('roc_7d'),
}

const num = (s, digits) => (s === '' || s === undefined ? null : Number(Number(s).toFixed(digits)))
const series = new Map()

for (const line of lines.slice(1)) {
  const c = line.split(',')
  const key = `${c[idx.market]}|${c[idx.crop]}`
  if (!series.has(key)) series.set(key, [])
  series.get(key).push(c)
}

mkdirSync(outDir, { recursive: true })
const slug = (s) => s.toLowerCase().replace(/\s+/g, '-')

for (const [key, rows] of series) {
  rows.sort((a, b) => a[idx.date].localeCompare(b[idx.date]))
  const [market, crop] = key.split('|')
  const out = {
    market,
    crop,
    start: rows[0][idx.date],
    end: rows[rows.length - 1][idx.date],
    price: rows.map((r) => num(r[idx.price], 0)),
    imputed: rows.map((r) => r[idx.imputed]).join(''),
    v7: rows.map((r) => num(r[idx.v7], 4)),
    v30: rows.map((r) => num(r[idx.v30], 4)),
    panic: rows.map((r) => num(r[idx.panic], 3)),
    roc7: rows.map((r) => num(r[idx.roc7], 4)),
  }
  const file = join(outDir, `${slug(market)}--${slug(crop)}.json`)
  writeFileSync(file, JSON.stringify(out))
  console.log(`wrote ${file} (${rows.length} days)`)
}
