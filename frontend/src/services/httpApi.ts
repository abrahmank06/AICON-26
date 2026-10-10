import type { YieldApi } from './api'

// Backend contract: the six GET endpoints in backend/views.py, shapes in src/types.ts.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}${path}${query ? `?${query}` : ''}`)
  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = `: ${body.detail}`
    } catch {
      // Non-JSON error body; fall back to the status-only message.
    }
    throw new Error(`The Maahir service answered ${res.status} for ${path}${detail}.`)
  }
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
