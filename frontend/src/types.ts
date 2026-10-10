export const MARKETS = ['Lahore', 'Multan', 'Gujranwala', 'Rawalpindi'] as const
export const CROPS = ['Onion', 'Tomato', 'Potato Fresh', 'Green Chilli'] as const

export type Market = (typeof MARKETS)[number]
export type Crop = (typeof CROPS)[number]
export type RiskLevel = 'stable' | 'watch' | 'warning' | 'critical'
export type AlertSeverity = Extract<RiskLevel, 'warning' | 'critical'>

export interface Filters {
  date: string
  market: Market
  crop: Crop
}

export interface PricePoint {
  date: string
  price: number
  isImputed: boolean
}

export interface ForecastPoint {
  date: string
  predicted: number
  lower: number
  upper: number
}

export interface SpikeAlert {
  expectedChangePct: number
  peakDate: string
  severity: AlertSeverity
}

export interface Snapshot {
  date: string
  market: Market
  crop: Crop
  price: number
  isImputed: boolean
  change7dPct: number | null
  volatility7d: number | null
  volatility30d: number | null
  panicIndex7d: number | null
  risk: RiskLevel
  spikeAlert: SpikeAlert | null
}

export interface Forecast {
  asOf: string
  history: PricePoint[]
  forecast: ForecastPoint[]
  spikeAlert: SpikeAlert | null
}

export type TravelVerdict = 'correct_alert' | 'false_alarm' | 'missed' | 'correct_calm'

export interface TimeMachineResult extends Forecast {
  actual: PricePoint[]
  actualChangePct: number
  mapePct: number
  verdict: TravelVerdict
  analogue: string
}

export type AlertVerdict = 'correct' | 'false_alarm'

export interface Alert {
  id: string
  dateFired: string
  market: Market
  crop: Crop
  predictedSpikePct: number
  actualSpikePct: number
  leadTimeDays: number | null
  verdict: AlertVerdict
}

export interface ShapFeature {
  feature: string
  label: string
  contribution: number
}

export interface ContagionEdge {
  from: Market
  to: Market
  lagDays: number
  strength: number
}

export interface Spillover {
  crops: Crop[]
  matrix: number[][]
}

export interface Analytics {
  contagion: ContagionEdge[]
  spillover: Spillover
  shap: ShapFeature[]
}

export interface Performance {
  mapePct: number
  rmse: number
  mae: number
  precisionPct: number
  recallPct: number
  falseAlarmRatePct: number
  avgLeadTimeDays: number
  costSavingsPkr: number
  alertCoveragePct: number
  alertsEvaluated: number
  windowStart: string
  windowEnd: string
}
