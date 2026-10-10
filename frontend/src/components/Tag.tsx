import type { ReactNode } from 'react'
import { InfoTip } from './InfoTip'

interface TagProps {
  children: ReactNode
  className?: string
  eyelet?: boolean
  as?: 'section' | 'div' | 'article'
  label?: string
}

/** A white produce tag. The punched eyelet marks the one verdict tag per view. */
export function Tag({ children, className = '', eyelet = false, as: As = 'section', label }: TagProps) {
  return (
    <As aria-label={label} className={`relative rounded-[20px] bg-card shadow-card ring-1 ring-[rgb(60_50_20/0.06)] ${className}`}>
      {eyelet && <span aria-hidden className="absolute top-0 left-8 h-1 w-14 rounded-b-full bg-stable/65" />}
      {children}
    </As>
  )
}

interface RampProps {
  level: number
  label: string
}

/** Fixed five-step magnitude ramp: the same reading always draws the same way. */
export function Ramp({ level, label }: RampProps) {
  const ink = level >= 4 ? 'bg-spike' : level === 3 ? 'bg-watch-ink' : 'bg-navy/70'
  return (
    <span role="img" aria-label={`${label}: level ${level} of 5`} className="flex items-end gap-[3px]">
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          className={`w-[7px] rounded-[2px] ${step <= level ? ink : 'bg-field-deep'}`}
          style={{ height: 6 + step * 3 }}
        />
      ))}
    </span>
  )
}

interface ReadingProps {
  label: string
  value: ReactNode
  explain: ReactNode
  level?: number
  note?: ReactNode
  align?: 'start' | 'end'
}

export function Reading({ label, value, explain, level, note, align }: ReadingProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink-2">
        {label}
        <InfoTip label={label} align={align}>
          {explain}
        </InfoTip>
      </div>
      <div className="flex items-end gap-3">
        <span className="figure tnum text-[1.75rem] leading-none text-ink">{value}</span>
        {level !== undefined && <Ramp level={level} label={label} />}
      </div>
      {note && <p className="text-[13px] text-ink-2">{note}</p>}
    </div>
  )
}
