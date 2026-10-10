import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { riskLevel } from '../../lib/risk'
import { CROPS, MARKETS } from '../../types'
import {
  HORIZON,
  contagionFor,
  forecastAt,
  indexOf,
  performanceOf,
  scanAlerts,
  shapAt,
  snapshotAt,
  spilloverFor,
  travelAt,
} from './model'
import type { Series } from './series'

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-')
const load = (m: string, c: string): Series =>
  JSON.parse(readFileSync(join(process.cwd(), 'public', 'mock-data', `${slug(m)}--${slug(c)}.json`), 'utf8'))

const lahoreOnion = load('Lahore', 'Onion')
const all = MARKETS.flatMap((m) => CROPS.map((c) => load(m, c)))

describe('riskLevel', () => {
  it('combines volatility and panic into three levels', () => {
    expect(riskLevel(0.05, 0)).toBe('stable')
    expect(riskLevel(0.2, 0)).toBe('watch')
    expect(riskLevel(0.05, 1.2)).toBe('watch')
    expect(riskLevel(0.2, 1.6)).toBe('spike')
    expect(riskLevel(null, null)).toBe('stable')
  })
})

describe('placeholder model on real AMIS history', () => {
  it('forecasts 7 ordered days with bounds around the prediction', () => {
    const i = indexOf(lahoreOnion, '2024-06-01')
    const fc = forecastAt(lahoreOnion, i)
    expect(fc).toHaveLength(HORIZON)
    expect(fc[0].date).toBe('2024-06-02')
    for (const p of fc) expect(p.lower).toBeLessThanOrEqual(p.predicted)
    for (const p of fc) expect(p.upper).toBeGreaterThanOrEqual(p.predicted)
  })

  it('travels back with 30 days of history, 7 actuals and an analogue', () => {
    const r = travelAt(lahoreOnion, indexOf(lahoreOnion, '2023-07-10'))
    expect(r.history).toHaveLength(30)
    expect(r.actual).toHaveLength(7)
    expect(r.analogue).toMatch(/Lahore onions/)
    expect(r.mapePct).toBeGreaterThanOrEqual(0)
  })

  it('marks the snapshot as a spike whenever the forecast raises an alert', () => {
    const chilli = load('Lahore', 'Green Chilli')
    const snap = snapshotAt(chilli, indexOf(chilli, '2024-12-14'))
    expect(snap.spikeAlert).not.toBeNull()
    expect(snap.risk).toBe('spike')
  })

  it('fires alerts at a plausible rate', () => {
    const counts = all.map((s) => scanAlerts(s).length)
    const total = counts.reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(50)
    expect(total).toBeLessThan(1500)
  })

  it('computes performance metrics in sane ranges', () => {
    const p = performanceOf(all, '2023-01-01', '2024-12-24')
    expect(p.mapePct).toBeGreaterThan(0)
    expect(p.mapePct).toBeLessThan(60)
    expect(p.precisionPct).toBeGreaterThanOrEqual(0)
    expect(p.precisionPct).toBeLessThanOrEqual(100)
  })

  it('derives contagion edges, a symmetric spillover matrix and attributions', () => {
    const edges = contagionFor(MARKETS.map((m) => load(m, 'Onion')), '2024-12-31')
    for (const e of edges) expect(e.from).not.toBe(e.to)
    const sp = spilloverFor(CROPS.map((c) => load('Lahore', c)), '2024-12-31')
    expect(sp.matrix[0][0]).toBe(1)
    expect(sp.matrix[1][2]).toBe(sp.matrix[2][1])
    expect(shapAt(lahoreOnion, indexOf(lahoreOnion, '2024-12-31'))).toHaveLength(5)
  })
})
