import { motion } from 'motion/react'
import { uiSpring } from '../lib/motion'
import type { ContagionEdge, Market } from '../types'

// Stylised positions roughly following the map of Punjab.
const NODES: Record<Market, { x: number; y: number; anchor: 'start' | 'end' | 'middle'; dx: number; dy: number }> = {
  Rawalpindi: { x: 300, y: 64, anchor: 'middle', dx: 0, dy: -22 },
  Gujranwala: { x: 470, y: 168, anchor: 'start', dx: 22, dy: 5 },
  Lahore: { x: 450, y: 300, anchor: 'start', dx: 22, dy: 5 },
  Multan: { x: 120, y: 316, anchor: 'end', dx: -22, dy: 5 },
}

const R = 12

function curve(from: Market, to: Market) {
  const a = NODES[from]
  const b = NODES[to]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const sx = a.x + ux * (R + 4)
  const sy = a.y + uy * (R + 4)
  const ex = b.x - ux * (R + 9)
  const ey = b.y - uy * (R + 9)
  const bend = Math.min(60, len * 0.18)
  const cx = (sx + ex) / 2 - uy * bend
  const cy = (sy + ey) / 2 + ux * bend
  return { d: `M${sx},${sy} Q${cx},${cy} ${ex},${ey}`, mx: (sx + 2 * cx + ex) / 4, my: (sy + 2 * cy + ey) / 4 }
}

interface Props {
  edges: ContagionEdge[]
  focus: Market
}

export function ContagionNetwork({ edges, focus }: Props) {
  const max = Math.max(...edges.map((e) => e.strength), 0.01)
  return (
    <svg viewBox="0 0 620 380" className="h-auto w-full" role="img" aria-labelledby="contagion-title">
      <title id="contagion-title">
        {edges.length
          ? edges.map((e) => `${e.from} leads ${e.to} by ${e.lagDays} day${e.lagDays === 1 ? '' : 's'}`).join('. ')
          : 'No clear lead-lag links between markets.'}
      </title>
      <defs>
        {['focus', 'rest'].map((k) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={k === 'focus' ? '#182744' : '#9aa595'} />
          </marker>
        ))}
      </defs>

      {edges.map((e, n) => {
        const { d, mx, my } = curve(e.from, e.to)
        const touches = e.from === focus || e.to === focus
        const w = 1.5 + (e.strength / max) * 5
        return (
          <g key={`${e.from}-${e.to}`}>
            <motion.path
              d={d}
              fill="none"
              stroke={touches ? '#182744' : '#9aa595'}
              strokeWidth={w}
              strokeLinecap="round"
              markerEnd={`url(#arrow-${touches ? 'focus' : 'rest'})`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: touches ? 0.95 : 0.6 }}
              transition={{ ...uiSpring, delay: n * 0.06 }}
            />
            {touches && (
              <g transform={`translate(${mx},${my})`}>
                <rect x={-24} y={-12} width={48} height={24} rx={12} fill="#fffefa" stroke="#182744" strokeWidth={1.2} />
                <text textAnchor="middle" dy={4.5} fontSize={12.5} fontWeight={600} fill="#182744" className="tnum">
                  {e.lagDays} day{e.lagDays === 1 ? '' : 's'}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {(Object.keys(NODES) as Market[]).map((m) => {
        const n = NODES[m]
        const isFocus = m === focus
        return (
          <g key={m}>
            <circle cx={n.x} cy={n.y} r={R} fill={isFocus ? '#182744' : '#fffefa'} stroke="#182744" strokeWidth={2.5} />
            <text x={n.x + n.dx} y={n.y + n.dy} textAnchor={n.anchor} fontSize={15} fontWeight={isFocus ? 700 : 600} fill="#182744">
              {m}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
