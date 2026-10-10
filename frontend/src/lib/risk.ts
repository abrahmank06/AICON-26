import type { RiskLevel } from '../types'

// Thresholds sit near the 80th/90th percentile of the AMIS feature set (yield_features_final.csv).
export const VOLATILITY_7D_HIGH = 0.18
export const PANIC_WATCH = 1
export const PANIC_SPIKE = 1.5

export function riskLevel(volatility7d: number | null, panicIndex7d: number | null): RiskLevel {
  const vol = volatility7d ?? 0
  const panic = panicIndex7d ?? 0
  if (panic >= PANIC_SPIKE && vol >= VOLATILITY_7D_HIGH) return 'spike'
  if (panic >= PANIC_WATCH || vol >= VOLATILITY_7D_HIGH) return 'watch'
  return 'stable'
}

export const RISK_COPY: Record<RiskLevel, { stamp: string; label: string }> = {
  stable: { stamp: 'Stable', label: 'Stable' },
  watch: { stamp: 'Watch', label: 'Elevated volatility' },
  spike: { stamp: 'Spike likely', label: 'Spike imminent' },
}

export const RISK_TONE: Record<RiskLevel, { ink: string; soft: string; text: string }> = {
  stable: { ink: 'var(--color-stable)', soft: 'var(--color-stable-soft)', text: 'text-stable' },
  watch: { ink: 'var(--color-watch-ink)', soft: 'var(--color-watch-soft)', text: 'text-watch' },
  spike: { ink: 'var(--color-spike)', soft: 'var(--color-spike-soft)', text: 'text-spike' },
}

/** Places a reading on a fixed 5-step magnitude ramp so every view ranks it the same way. */
export function magnitude(value: number | null, steps: readonly number[]): number {
  if (value === null) return 0
  return steps.reduce((level, threshold) => (value >= threshold ? level + 1 : level), 0)
}

export const RAMPS = {
  volatility7d: [0.02, 0.08, 0.14, 0.18, 0.24],
  volatility30d: [0.08, 0.11, 0.13, 0.15, 0.17],
  panicIndex7d: [0.25, 0.6, 1, 1.5, 2.2],
} as const
