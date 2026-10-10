const pkr = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-PK', { notation: 'compact', maximumFractionDigits: 1 })
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' })

const at = (iso: string) => new Date(`${iso}T00:00:00Z`)

export const formatPkr = (n: number) => `PKR ${pkr.format(n)}`
export const formatNumber = (n: number) => pkr.format(n)
export const formatCompactPkr = (n: number) => `PKR ${compact.format(n)}`
export const formatDate = (iso: string) => dateFmt.format(at(iso))
export const formatShortDate = (iso: string) => shortDate.format(at(iso))
export const formatMonthYear = (iso: string) => monthYear.format(at(iso))
export const formatWeekday = (iso: string) => weekday.format(at(iso))

export const formatPct = (fraction: number, digits = 0) => `${(fraction * 100).toFixed(digits)}%`
export const formatSignedPct = (fraction: number, digits = 0) => {
  const v = Number((fraction * 100).toFixed(digits))
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}%`
}

const cropNoun: Record<string, string> = {
  Onion: 'onions',
  Tomato: 'tomatoes',
  'Potato Fresh': 'fresh potatoes',
  'Green Chilli': 'green chillies',
}
export const cropPlural = (crop: string) => cropNoun[crop] ?? crop.toLowerCase()
export const cropSingular = (crop: string) => (crop === 'Potato Fresh' ? 'fresh potato' : crop.toLowerCase())
