import type { ShapFeature } from '../types'
import { Plot } from './Plot'
import { INK, baseLayout, plotConfig } from './theme'

/** Horizontal SHAP-style bars: red pushes spike risk up, navy pulls it down. */
export function ShapChart({ features }: { features: ShapFeature[] }) {
  const ordered = [...features].reverse()
  const height = 70 + ordered.length * 52
  return (
    <div
      role="img"
      aria-label={features.map((f) => `${f.label} ${f.contribution >= 0 ? 'raises' : 'lowers'} risk by ${Math.abs(f.contribution).toFixed(2)}`).join('. ')}
    >
      <Plot
        data={[
          {
            type: 'bar',
            orientation: 'h',
            y: ordered.map((f) => f.label),
            x: ordered.map((f) => f.contribution),
            customdata: ordered.map((f) => f.feature),
            marker: { color: ordered.map((f) => (f.contribution >= 0 ? INK.spike : INK.navy2)) },
            text: ordered.map((f) => `${f.contribution >= 0 ? '+' : '−'}${Math.abs(f.contribution).toFixed(2)}`),
            textposition: 'outside',
            cliponaxis: false,
            textfont: { color: INK.ink, size: 13 },
            hovertemplate: '%{customdata}: %{x:+.3f}<extra></extra>',
          },
        ]}
        layout={baseLayout({
          height,
          margin: { l: 190, r: 56, t: 8, b: 40 },
          hovermode: 'closest',
          bargap: 0.38,
          xaxis: {
            zeroline: true,
            zerolinecolor: INK.ink3,
            zerolinewidth: 1.5,
            gridcolor: INK.grid,
            fixedrange: true,
            title: { text: '← lowers spike risk      raises spike risk →', font: { size: 12.5, color: INK.ink2 } },
          },
          yaxis: { fixedrange: true, ticksuffix: '   ', tickfont: { size: 14, color: INK.ink } },
        })}
        config={plotConfig}
        useResizeHandler
        style={{ width: '100%', height }}
      />
    </div>
  )
}
