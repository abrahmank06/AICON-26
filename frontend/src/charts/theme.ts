import type { Config, Layout } from 'plotly.js'

export const INK = {
  navy: '#182744',
  navy2: '#29466b',
  ink: '#182744',
  ink2: '#52605b',
  ink3: '#758078',
  grid: '#e4ebe0',
  axis: '#cad8c4',
  spike: '#b3261e',
  card: '#fffefa',
}

const FONT = 'Sora Variable, ui-sans-serif, system-ui, sans-serif'

export const plotConfig: Partial<Config> = { displayModeBar: false, responsive: true }

export function baseLayout(overrides: Partial<Layout> = {}): Partial<Layout> {
  return {
    autosize: true,
    margin: { l: 64, r: 20, t: 16, b: 44 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: FONT, size: 12.5, color: INK.ink2 },
    showlegend: false,
    hovermode: 'x unified',
    hoverlabel: { bgcolor: INK.ink, bordercolor: INK.ink, font: { family: FONT, color: INK.card, size: 13 } },
    xaxis: {
      type: 'date',
      gridcolor: INK.grid,
      linecolor: INK.axis,
      tickformat: '%d %b',
      zeroline: false,
      fixedrange: true,
      ticks: 'outside',
      tickcolor: INK.axis,
      ticklen: 4,
      hoverformat: '%a %d %b %Y',
    },
    yaxis: {
      gridcolor: INK.grid,
      zeroline: false,
      fixedrange: true,
      separatethousands: true,
      tickformat: ',.0f',
      ticksuffix: '  ',
    },
    ...overrides,
  }
}

export const markerSymbols = (imputed: boolean[]) => imputed.map((i) => (i ? 'circle-open' : 'circle'))
