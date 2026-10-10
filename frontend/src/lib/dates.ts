const DAY_MS = 86_400_000

export const DATA_START = '2020-11-08'
export const DATA_END = '2024-12-31'
export const EARLIEST_AS_OF = '2020-12-08'
export const LATEST_TRAVEL = '2024-12-24'

export const toUtc = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
export const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export const addDays = (iso: string, days: number) => toIso(toUtc(iso) + days * DAY_MS)
export const daysBetween = (from: string, to: string) => Math.round((toUtc(to) - toUtc(from)) / DAY_MS)

export const isIsoDate = (s: string | null): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUtc(s))

export const clampDate = (iso: string, min: string, max: string) =>
  iso < min ? min : iso > max ? max : iso
