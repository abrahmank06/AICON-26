import type { Crop, Market } from '../../types'

export interface Series {
  market: Market
  crop: Crop
  start: string
  end: string
  price: number[]
  imputed: string
  v7: (number | null)[]
  v30: (number | null)[]
  panic: (number | null)[]
  roc7: (number | null)[]
}

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-')
const cache = new Map<string, Promise<Series>>()

export function loadSeries(market: Market, crop: Crop): Promise<Series> {
  const key = `${market}|${crop}`
  let pending = cache.get(key)
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}mock-data/${slug(market)}--${slug(crop)}.json`).then((res) => {
      if (!res.ok) throw new Error(`Could not load price history for ${market} ${crop} (${res.status}).`)
      return res.json() as Promise<Series>
    })
    pending.catch(() => cache.delete(key))
    cache.set(key, pending)
  }
  return pending
}
