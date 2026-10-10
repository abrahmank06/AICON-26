// Placeholder model used until the SARIMAX / XGBoost / SHAP API is live.
// Prices are real AMIS history; forecasts, alerts and attributions are computed heuristics.
import { addDays, daysBetween } from '../../lib/dates'
import { cropPlural, formatMonthYear, formatSignedPct } from '../../lib/format'
import { riskLevel } from '../../lib/risk'
import type {
  Alert,
  ContagionEdge,
  ForecastPoint,
  Performance,
  PricePoint,
  ShapFeature,
  Snapshot,
  SpikeAlert,
  Spillover,
  TimeMachineResult,
  TravelVerdict,
} from '../../types'
import type { Series } from './series'

export const HORIZON = 7
export const HISTORY_DAYS = 30
export const ALERT_THRESHOLD = 0.12
export const SPIKE_THRESHOLD = 0.1
const ALERT_COOLDOWN = 14
const TONNES_PER_ALERT = 10

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round = (v: number) => Math.round(v)

export const indexOf = (s: Series, iso: string) => clamp(daysBetween(s.start, iso), 0, s.price.length - 1)
export const dateAt = (s: Series, i: number) => addDays(s.start, i)
export const pointAt = (s: Series, i: number): PricePoint => ({
  date: dateAt(s, i),
  price: s.price[i],
  isImputed: s.imputed[i] === '1',
})
const range = (s: Series, from: number, to: number) => {
  const out: PricePoint[] = []
  for (let i = Math.max(0, from); i <= Math.min(to, s.price.length - 1); i++) out.push(pointAt(s, i))
  return out
}
const priceVsMean30 = (s: Series, i: number) => s.price[i] / mean(s.price.slice(Math.max(0, i - 29), i + 1)) - 1

export function snapshotAt(s: Series, i: number): Snapshot {
  const spikeAlert = spikeAlertFor(s, i, forecastAt(s, i))
  return {
    date: dateAt(s, i),
    market: s.market,
    crop: s.crop,
    price: s.price[i],
    isImputed: s.imputed[i] === '1',
    change7dPct: i >= 7 ? s.price[i] / s.price[i - 7] - 1 : null,
    volatility7d: s.v7[i],
    volatility30d: s.v30[i],
    panicIndex7d: s.panic[i],
    risk: spikeAlert ? 'spike' : riskLevel(s.v7[i], s.panic[i]),
    spikeAlert,
  }
}

export function forecastAt(s: Series, i: number): ForecastPoint[] {
  const p0 = s.price[i]
  const m30 = mean(s.price.slice(Math.max(0, i - 29), i + 1))
  const momentum = clamp(s.roc7[i] ?? 0, -0.5, 0.5)
  const vol = Math.max(s.v30[i] ?? 0.12, 0.05)
  return Array.from({ length: HORIZON }, (_, n) => {
    const k = n + 1
    const drift = p0 * 0.35 * momentum * (1 - Math.exp(-k / 3))
    const reversion = (m30 - p0) * 0.3 * (1 - Math.exp(-k / 4))
    const predicted = Math.max(p0 + drift + reversion, 1)
    const spread = 1.28 * vol * Math.sqrt(k) * 0.55
    return {
      date: dateAt(s, i + k),
      predicted: round(predicted),
      lower: round(predicted * Math.exp(-spread)),
      upper: round(predicted * Math.exp(spread)),
    }
  })
}

export function spikeAlertFor(s: Series, i: number, forecast: ForecastPoint[]): SpikeAlert | null {
  const peak = forecast.reduce((best, p) => (p.predicted > best.predicted ? p : best), forecast[0])
  const change = peak.predicted / s.price[i] - 1
  const risk = riskLevel(s.v7[i], s.panic[i])
  if (change >= ALERT_THRESHOLD || (risk === 'spike' && change > 0.03)) {
    return { expectedChangePct: change, peakDate: peak.date }
  }
  return null
}

/** Largest rise over the next `HORIZON` days and when the 10% line was first crossed. */
export function outcomeAfter(s: Series, i: number) {
  const p0 = s.price[i]
  let maxChange = -Infinity
  let peakOffset = 0
  let firstCross: number | null = null
  for (let k = 1; k <= HORIZON && i + k < s.price.length; k++) {
    const change = s.price[i + k] / p0 - 1
    if (change > maxChange) {
      maxChange = change
      peakOffset = k
    }
    if (firstCross === null && change >= SPIKE_THRESHOLD) firstCross = k
  }
  return { maxChange, peakOffset, firstCross, peakPrice: p0 * (1 + maxChange) }
}

function analogueFor(s: Series, i: number): string {
  const v7 = s.v7[i] ?? 0
  const panic = s.panic[i] ?? 0
  const roc = s.roc7[i] ?? 0
  const pvm = priceVsMean30(s, i)
  const candidates: { j: number; d: number }[] = []
  for (let j = 30; j < i - HORIZON - 30; j++) {
    if (s.v7[j] === null || s.panic[j] === null || s.roc7[j] === null) continue
    const d =
      ((s.v7[j]! - v7) / 0.08) ** 2 +
      ((s.panic[j]! - panic) / 0.8) ** 2 +
      ((s.roc7[j]! - roc) / 0.2) ** 2 +
      ((priceVsMean30(s, j) - pvm) / 0.2) ** 2
    candidates.push({ j, d })
  }
  const place = `${s.market} ${cropPlural(s.crop)}`
  if (!candidates.length) return `There is not enough earlier history for ${place} to find a similar moment.`

  candidates.sort((a, b) => a.d - b.d)
  const picked: number[] = []
  for (const c of candidates) {
    if (picked.every((p) => Math.abs(p - c.j) > 30)) picked.push(c.j)
    if (picked.length === 5) break
  }
  const j = Math.max(...picked)
  const when = formatMonthYear(dateAt(s, j))
  const { maxChange, peakOffset } = outcomeAfter(s, j)
  const weekChange = s.price[Math.min(j + HORIZON, s.price.length - 1)] / s.price[j] - 1

  if (maxChange >= SPIKE_THRESHOLD)
    return `The last time ${place} looked like this was ${when}. Prices jumped ${formatSignedPct(maxChange)} within ${peakOffset} day${peakOffset === 1 ? '' : 's'}.`
  if (weekChange <= -0.05)
    return `The last time ${place} looked like this was ${when}. Prices fell ${formatSignedPct(weekChange).replace('−', '')} over the next week.`
  if (weekChange >= 0.05)
    return `The last time ${place} looked like this was ${when}. Prices rose ${formatSignedPct(weekChange).replace('+', '')} over the next week, short of a spike.`
  return `The last time ${place} looked like this was ${when}. Prices held steady over the next week (${formatSignedPct(weekChange)}).`
}

export function travelAt(s: Series, i: number): TimeMachineResult {
  const forecast = forecastAt(s, i)
  const spikeAlert = spikeAlertFor(s, i, forecast)
  const actual = range(s, i + 1, i + HORIZON)
  const { maxChange } = outcomeAfter(s, i)
  const spiked = maxChange >= SPIKE_THRESHOLD
  const verdict: TravelVerdict = spikeAlert
    ? spiked
      ? 'correct_alert'
      : 'false_alarm'
    : spiked
      ? 'missed'
      : 'correct_calm'
  const errors = actual.map((a, k) => Math.abs(forecast[k].predicted - a.price) / a.price)
  return {
    asOf: dateAt(s, i),
    history: range(s, i - HISTORY_DAYS + 1, i),
    forecast,
    spikeAlert,
    actual,
    actualChangePct: maxChange,
    mapePct: mean(errors) * 100,
    verdict,
    analogue: analogueFor(s, i),
  }
}

export function scanAlerts(s: Series, from = HISTORY_DAYS, to = s.price.length - 1 - HORIZON): Alert[] {
  const alerts: Alert[] = []
  let lastFired = -Infinity
  for (let i = from; i <= to; i++) {
    if (i - lastFired < ALERT_COOLDOWN) continue
    const alert = spikeAlertFor(s, i, forecastAt(s, i))
    if (!alert) continue
    lastFired = i
    const outcome = outcomeAfter(s, i)
    const correct = outcome.maxChange >= SPIKE_THRESHOLD
    alerts.push({
      id: `${s.market}-${s.crop}-${i}`,
      dateFired: dateAt(s, i),
      market: s.market,
      crop: s.crop,
      predictedSpikePct: alert.expectedChangePct,
      actualSpikePct: outcome.maxChange,
      leadTimeDays: correct ? (outcome.firstCross ?? outcome.peakOffset) : null,
      verdict: correct ? 'correct' : 'false_alarm',
    })
  }
  return alerts
}

export function performanceOf(all: Series[], windowStart: string, windowEnd: string): Performance {
  let absPct = 0
  let abs = 0
  let sq = 0
  let n = 0
  let alertsTotal = 0
  let correct = 0
  let leadSum = 0
  let savings = 0
  let events = 0
  let caught = 0
  let caughtEarly = 0

  for (const s of all) {
    const from = indexOf(s, windowStart)
    const to = Math.min(indexOf(s, windowEnd), s.price.length - 1 - HORIZON)

    for (let i = from; i <= to; i += 7) {
      forecastAt(s, i).forEach((p, k) => {
        const actual = s.price[i + k + 1]
        absPct += Math.abs(p.predicted - actual) / actual
        abs += Math.abs(p.predicted - actual)
        sq += (p.predicted - actual) ** 2
        n++
      })
    }

    const alerts = scanAlerts(s, from, to)
    const firedAt = new Set(alerts.map((a) => indexOf(s, a.dateFired)))
    alertsTotal += alerts.length
    for (const a of alerts) {
      if (a.verdict !== 'correct') continue
      correct++
      leadSum += a.leadTimeDays ?? 0
      const i = indexOf(s, a.dateFired)
      savings += (outcomeAfter(s, i).peakPrice - s.price[i]) * 10 * TONNES_PER_ALERT
    }

    let lastEvent = -Infinity
    for (let i = from; i <= to; i++) {
      const outcome = outcomeAfter(s, i)
      if (outcome.maxChange < SPIKE_THRESHOLD || i - lastEvent < ALERT_COOLDOWN) continue
      lastEvent = i
      events++
      const warnedAt = [0, 1, 2, 3].find((back) => firedAt.has(i - back))
      if (warnedAt !== undefined) {
        caught++
        if (warnedAt + (outcome.firstCross ?? 0) >= 2) caughtEarly++
      }
    }
  }

  const precision = alertsTotal ? correct / alertsTotal : 0
  return {
    mapePct: (absPct / n) * 100,
    rmse: Math.sqrt(sq / n),
    mae: abs / n,
    precisionPct: precision * 100,
    recallPct: events ? (caught / events) * 100 : 0,
    falseAlarmRatePct: alertsTotal ? (1 - precision) * 100 : 0,
    avgLeadTimeDays: correct ? leadSum / correct : 0,
    costSavingsPkr: savings,
    alertCoveragePct: events ? (caughtEarly / events) * 100 : 0,
    alertsEvaluated: alertsTotal,
    windowStart,
    windowEnd,
  }
}

const logReturns = (s: Series, from: number, to: number, step = 1) => {
  const out: number[] = []
  for (let i = from + step; i <= to; i += step) out.push(Math.log(s.price[i] / s.price[i - step]))
  return out
}

function correlation(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length)
  if (n < 3) return 0
  const ma = mean(a.slice(0, n))
  const mb = mean(b.slice(0, n))
  let num = 0
  let da = 0
  let db = 0
  for (let k = 0; k < n; k++) {
    num += (a[k] - ma) * (b[k] - mb)
    da += (a[k] - ma) ** 2
    db += (b[k] - mb) ** 2
  }
  return da && db ? num / Math.sqrt(da * db) : 0
}

/** Lead-lag between markets for one crop: corr(returns of A today, returns of B `lag` days later). */
export function contagionFor(series: Series[], asOf: string, lookbackDays = 540): ContagionEdge[] {
  const returns = series.map((s) => {
    const to = indexOf(s, asOf)
    return logReturns(s, Math.max(0, to - lookbackDays), to)
  })
  const best = (a: number, b: number) => {
    let top = { lag: 1, corr: -Infinity }
    for (let lag = 1; lag <= 5; lag++) {
      const corr = correlation(returns[a].slice(0, -lag), returns[b].slice(lag))
      if (corr > top.corr) top = { lag, corr }
    }
    return top
  }
  const edges: ContagionEdge[] = []
  for (let a = 0; a < series.length; a++) {
    for (let b = a + 1; b < series.length; b++) {
      const ab = best(a, b)
      const ba = best(b, a)
      const [from, to, link] = ab.corr >= ba.corr ? [a, b, ab] : [b, a, ba]
      if (link.corr > 0.02)
        edges.push({ from: series[from].market, to: series[to].market, lagDays: link.lag, strength: link.corr })
    }
  }
  return edges.sort((x, y) => y.strength - x.strength)
}

/** Weekly-return correlation between crops in one market. */
export function spilloverFor(series: Series[], asOf: string, lookbackDays = 730): Spillover {
  const returns = series.map((s) => {
    const to = indexOf(s, asOf)
    return logReturns(s, Math.max(0, to - lookbackDays), to, 7)
  })
  return {
    crops: series.map((s) => s.crop),
    matrix: returns.map((a) => returns.map((b) => Number(correlation(a, b).toFixed(2)))),
  }
}

const SHAP_SPEC = [
  { feature: 'volatility_7d', label: 'Swings this week', median: 0.049, weight: 2.2 },
  { feature: 'volatility_30d', label: 'Swings this month', median: 0.127, weight: 3.5 },
  { feature: 'panic_index_7d', label: 'Rising streak', median: 0, weight: 0.28 },
  { feature: 'roc_7d', label: 'Change over 7 days', median: -0.014, weight: 0.6 },
  { feature: 'price_vs_mean_30d', label: 'Price vs 30-day average', median: 0, weight: -0.45 },
] as const

/** Stand-in for SHAP values: signed contribution of each feature to the spike score. */
export function shapAt(s: Series, i: number): ShapFeature[] {
  const values: Record<string, number> = {
    volatility_7d: s.v7[i] ?? 0.049,
    volatility_30d: s.v30[i] ?? 0.127,
    panic_index_7d: s.panic[i] ?? 0,
    roc_7d: s.roc7[i] ?? 0,
    price_vs_mean_30d: priceVsMean30(s, i),
  }
  return SHAP_SPEC.map(({ feature, label, median, weight }) => ({
    feature,
    label,
    contribution: Number(((values[feature] - median) * weight).toFixed(3)),
  })).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
}
