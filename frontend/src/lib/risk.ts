import type { AlertSeverity, RiskLevel } from '../types'

// Layer 1, the stress regime: both gates sit near the 80th percentile of the AMIS feature set
// (yield_features_final.csv). Mirrored in backend/views.py.
export const VOLATILITY_30D_STRESS = 0.148
export const PANIC_STRESS = 1

// Layers 2 and 3: the model's day-7 forecast change confirms and tiers the alert.
export const TIER_WATCH = 0.05
export const TIER_WARNING = 0.1
export const TIER_CRITICAL = 0.15

export const isStressed = (volatility30d: number | null, panicIndex7d: number | null) =>
  (volatility30d ?? 0) >= VOLATILITY_30D_STRESS && (panicIndex7d ?? 0) >= PANIC_STRESS

/** Three-layer verdict: stress regime gate, then the day-7 forecast change sets the tier. */
export function riskLevel(
  volatility30d: number | null,
  panicIndex7d: number | null,
  predictedChange: number | null,
): RiskLevel {
  if (predictedChange === null || !isStressed(volatility30d, panicIndex7d)) return 'stable'
  if (predictedChange >= TIER_CRITICAL) return 'critical'
  if (predictedChange >= TIER_WARNING) return 'warning'
  if (predictedChange >= TIER_WATCH) return 'watch'
  return 'stable'
}

/** WARNING and CRITICAL are fired alerts; WATCH is a monitor-only signal. */
export const isAlert = (risk: RiskLevel): risk is AlertSeverity => risk === 'warning' || risk === 'critical'

export const RISK_COPY: Record<RiskLevel, { stamp: string; label: string }> = {
  stable: { stamp: 'Stable', label: 'Stable' },
  watch: { stamp: 'Watch', label: 'Early signal, monitor' },
  warning: { stamp: 'Warning', label: 'Prepare response' },
  critical: { stamp: 'Critical', label: 'Act immediately' },
}

export const RISK_TONE: Record<RiskLevel, { ink: string; soft: string; text: string }> = {
  stable: { ink: 'var(--color-stable)', soft: 'var(--color-stable-soft)', text: 'text-stable' },
  watch: { ink: 'var(--color-watch-ink)', soft: 'var(--color-watch-soft)', text: 'text-watch' },
  warning: { ink: 'var(--color-spike)', soft: 'var(--color-spike-soft)', text: 'text-spike' },
  critical: { ink: 'var(--color-spike)', soft: 'var(--color-spike-soft)', text: 'text-spike' },
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
