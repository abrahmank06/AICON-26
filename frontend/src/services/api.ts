import type {
  Alert,
  Analytics,
  Crop,
  Filters,
  Forecast,
  Market,
  Performance,
  Snapshot,
  TimeMachineResult,
} from '../types'

export interface TravelQuery {
  market: Market
  crop: Crop
  date: string
}

/** The contract every data source (mock or the Python backend) must satisfy. */
export interface YieldApi {
  readonly isMock: boolean
  getSnapshot(filters: Filters): Promise<Snapshot>
  getForecast(filters: Filters): Promise<Forecast>
  travel(query: TravelQuery): Promise<TimeMachineResult>
  getAlerts(): Promise<Alert[]>
  getAnalytics(filters: Filters): Promise<Analytics>
  getPerformance(): Promise<Performance>
}
