import type { YieldApi } from './api'

// Endpoint paths are placeholders until the backend team publishes its API contract.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}${path}${query ? `?${query}` : ''}`)
  if (!res.ok) throw new Error(`The Maahir service answered ${res.status} for ${path}.`)
  return res.json() as Promise<T>
}

export const httpApi: YieldApi = {
  isMock: false,
  getSnapshot: (f) => get('/snapshot', { ...f }),
  getForecast: (f) => get('/forecast', { ...f }),
  travel: (q) => get('/time-machine', { ...q }),
  getAlerts: () => get('/alerts'),
  getAnalytics: (f) => get('/analytics', { ...f }),
  getPerformance: () => get('/performance'),
}
