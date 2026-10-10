import { CROPS, MARKETS } from '../../types'
import type { Alert, Performance } from '../../types'
import type { YieldApi } from '../api'
import {
  HISTORY_DAYS,
  contagionFor,
  forecastAt,
  indexOf,
  performanceOf,
  pointAt,
  scanAlerts,
  shapAt,
  snapshotAt,
  spikeAlertFor,
  spilloverFor,
  travelAt,
} from './model'
import { loadSeries } from './series'

// Simulated inference latency so loading states get exercised like the real backend.
const latency = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const loadAll = () => Promise.all(MARKETS.flatMap((m) => CROPS.map((c) => loadSeries(m, c))))

let alertsMemo: Promise<Alert[]> | null = null
let performanceMemo: Promise<Performance> | null = null

export const mockApi: YieldApi = {
  isMock: true,

  async getSnapshot({ market, crop, date }) {
    const [s] = await Promise.all([loadSeries(market, crop), latency(250)])
    return snapshotAt(s, indexOf(s, date))
  },

  async getForecast({ market, crop, date }) {
    const [s] = await Promise.all([loadSeries(market, crop), latency(600)])
    const i = indexOf(s, date)
    const forecast = forecastAt(s, i)
    const history = []
    for (let k = Math.max(0, i - HISTORY_DAYS + 1); k <= i; k++) history.push(pointAt(s, k))
    return { asOf: s.end < date ? s.end : date, history, forecast, spikeAlert: spikeAlertFor(s, i, forecast) }
  },

  async travel({ market, crop, date }) {
    const [s] = await Promise.all([loadSeries(market, crop), latency(1400)])
    return travelAt(s, indexOf(s, date))
  },

  async getAlerts() {
    alertsMemo ??= loadAll().then((all) =>
      all.flatMap((s) => scanAlerts(s)).sort((a, b) => b.dateFired.localeCompare(a.dateFired)),
    )
    alertsMemo.catch(() => (alertsMemo = null))
    const [alerts] = await Promise.all([alertsMemo, latency(300)])
    return alerts
  },

  async getAnalytics({ market, crop, date }) {
    const [byMarket, byCrop, s] = await Promise.all([
      Promise.all(MARKETS.map((m) => loadSeries(m, crop))),
      Promise.all(CROPS.map((c) => loadSeries(market, c))),
      loadSeries(market, crop),
      latency(900),
    ])
    return {
      contagion: contagionFor(byMarket, date),
      spillover: spilloverFor(byCrop, date),
      shap: shapAt(s, indexOf(s, date)),
    }
  },

  async getPerformance() {
    performanceMemo ??= loadAll().then((all) => performanceOf(all, '2023-01-01', '2024-12-24'))
    performanceMemo.catch(() => (performanceMemo = null))
    const [perf] = await Promise.all([performanceMemo, latency(400)])
    return perf
  },
}
