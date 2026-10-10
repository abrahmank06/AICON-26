import type { Spillover } from '../types'

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const WHITE = [255, 254, 251]
const INDIGO = [34, 48, 110]
const BROWN = [140, 122, 82]

function cellColor(r: number) {
  const t = Math.min(Math.abs(r) / 0.7, 1)
  const [cr, cg, cb] = mix(WHITE, r >= 0 ? INDIGO : BROWN, t * 0.9)
  return { fill: `rgb(${cr},${cg},${cb})`, text: t > 0.5 ? '#fffefa' : '#182744' }
}

export function SpilloverHeatmap({ data }: { data: Spillover }) {
  const n = data.crops.length
  return (
    <div className="overflow-x-auto">
      <table className="tnum mx-auto border-separate border-spacing-1.5 text-[14px]">
        <caption className="sr-only">How closely weekly price changes of each pair of crops move together (correlation, -1 to 1).</caption>
        <thead>
          <tr>
            <th aria-hidden />
            {data.crops.map((c) => (
              <th key={c} scope="col" className="px-1 pb-1 text-center text-[13px] font-semibold text-ink-2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.crops.map((row, i) => (
            <tr key={row}>
              <th scope="row" className="pr-3 text-right text-[13px] font-semibold whitespace-nowrap text-ink-2">
                {row}
              </th>
              {Array.from({ length: n }, (_, j) => {
                const r = data.matrix[i][j]
                const self = i === j
                const { fill, text } = cellColor(r)
                return (
                  <td
                    key={j}
                    className="size-[clamp(64px,10vw,96px)] rounded-[10px] text-center font-semibold"
                    style={self ? { background: 'var(--color-field)', color: 'var(--color-ink-3)' } : { background: fill, color: text }}
                  >
                    {self ? '·' : r.toFixed(2)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-center justify-center gap-3 text-[12.5px] text-ink-2">
        <span>Move opposite</span>
        <span aria-hidden className="h-2.5 w-40 rounded-full" style={{ background: 'linear-gradient(90deg, #8c7a52, #fffefa, #182744)' }} />
        <span>Move together</span>
      </div>
    </div>
  )
}
