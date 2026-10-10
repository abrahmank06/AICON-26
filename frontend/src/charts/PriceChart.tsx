import type { Data, Layout } from 'plotly.js'
import type { ForecastPoint, PricePoint } from '../types'
import { Plot } from './Plot'
import { INK, baseLayout, markerSymbols, plotConfig } from './theme'

interface PriceChartProps {
  history: PricePoint[]
  forecast: ForecastPoint[]
  /** What actually happened after the forecast date (Time Machine). */
  actual?: PricePoint[]
  alert?: boolean
  markerLabel: string
  height?: number
  ariaLabel: string
}

const hover = (name: string) => `PKR %{y:,.0f}<extra>${name}</extra>`

/** Actual prices (solid), forecast (dashed) and its likely range (shaded). Hollow dots are filled-in days. */
export function PriceChart({ history, forecast, actual, alert, markerLabel, height = 360, ariaLabel }: PriceChartProps) {
  const last = history[history.length - 1]
  const fx = [last.date, ...forecast.map((p) => p.date)]
  const forecastInk = alert ? INK.spike : INK.navy2
  const past = actual ? INK.ink3 : INK.navy

  const traces: Data[] = [
    {
      x: fx,
      y: [last.price, ...forecast.map((p) => p.upper)],
      mode: 'lines',
      line: { width: 0 },
      hoverinfo: 'skip',
    },
    {
      x: fx,
      y: [last.price, ...forecast.map((p) => p.lower)],
      mode: 'lines',
      line: { width: 0 },
      fill: 'tonexty',
      fillcolor: alert ? 'rgba(179,38,30,0.10)' : 'rgba(59,74,146,0.13)',
      hoverinfo: 'skip',
    },
    {
      x: history.map((p) => p.date),
      y: history.map((p) => p.price),
      mode: 'lines+markers',
      line: { color: past, width: 2.25, shape: 'linear' },
      marker: { color: past, size: 6.5, symbol: markerSymbols(history.map((p) => p.isImputed)), line: { width: 1.6, color: past } },
      hovertemplate: hover('Actual'),
    },
    {
      x: fx,
      y: [last.price, ...forecast.map((p) => p.predicted)],
      mode: 'lines+markers',
      line: { color: forecastInk, width: 2.5, dash: 'dash' },
      marker: { color: forecastInk, size: 5 },
      hovertemplate: hover('Forecast'),
    },
  ]

  if (actual?.length) {
    traces.push({
      x: [last.date, ...actual.map((p) => p.date)],
      y: [last.price, ...actual.map((p) => p.price)],
      mode: 'lines+markers',
      line: { color: INK.ink, width: 3 },
      marker: {
        color: INK.ink,
        size: 7.5,
        symbol: markerSymbols([last.isImputed, ...actual.map((p) => p.isImputed)]),
        line: { width: 1.8, color: INK.ink },
      },
      hovertemplate: hover('What happened'),
    })
  }

  const shapes: Layout['shapes'] = [
    {
      type: 'line',
      x0: last.date,
      x1: last.date,
      yref: 'paper',
      y0: 0,
      y1: 1,
      line: { color: INK.axis, width: 1.5, dash: 'dot' },
    },
  ]
  const annotations: Layout['annotations'] = [
    {
      x: last.date,
      yref: 'paper',
      y: 1,
      text: markerLabel,
      showarrow: false,
      xanchor: 'right',
      yanchor: 'top',
      xshift: -6,
      font: { size: 12, color: INK.ink2 },
    },
  ]

  return (
    <div role="img" aria-label={ariaLabel}>
      <Plot
        data={traces}
        layout={baseLayout({ shapes, annotations, height })}
        config={plotConfig}
        useResizeHandler
        style={{ width: '100%', height }}
      />
    </div>
  )
}

export function ChartKey({ withActual, alert }: { withActual?: boolean; alert?: boolean }) {
  const line = (color: string, dashed = false, thick = false) => (
    <svg aria-hidden width="26" height="10" viewBox="0 0 26 10">
      <line x1="1" y1="5" x2="25" y2="5" stroke={color} strokeWidth={thick ? 3 : 2.25} strokeDasharray={dashed ? '5 3' : undefined} strokeLinecap="round" />
    </svg>
  )
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-2">
      <li className="flex items-center gap-2">{line(withActual ? INK.ink3 : INK.navy)}Actual price</li>
      <li className="flex items-center gap-2">{line(alert ? INK.spike : INK.navy2, true)}Forecast</li>
      <li className="flex items-center gap-2">
        <span aria-hidden className={`h-3 w-6 rounded-[3px] ${alert ? 'bg-spike/15' : 'bg-navy-2/20'}`} />
        Likely range (80%)
      </li>
      {withActual && <li className="flex items-center gap-2">{line(INK.ink, false, true)}What actually happened</li>}
      <li className="flex items-center gap-2">
        <span aria-hidden className="size-2.5 rounded-full border-[1.6px] border-ink-2" />
        Filled-in day (no market report)
      </li>
    </ul>
  )
}
