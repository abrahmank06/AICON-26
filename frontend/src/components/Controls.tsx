import { useId } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import { quickSpring } from '../lib/motion'

const field =
  'press h-10 rounded-[10px] border border-field-line bg-card text-[15px] font-medium text-ink shadow-[0_1px_0_rgb(60_50_20/0.04)] hover:border-ink-3 focus-visible:outline-2 disabled:opacity-50'

interface SelectProps<T extends string> {
  label: string
  value: T
  options: readonly T[] | readonly { value: T; label: string }[]
  onChange: (value: T) => void
  hideLabel?: boolean
}

export function Select<T extends string>({ label, value, options, onChange, hideLabel }: SelectProps<T>) {
  const id = useId()
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-xs font-medium text-ink-2'}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={`${field} w-full appearance-none pr-9 pl-3`}
        >
          {items.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-2" />
      </div>
    </div>
  )
}

interface DateFieldProps {
  label: string
  value: string
  min: string
  max: string
  onChange: (value: string) => void
  hideLabel?: boolean
}

export function DateField({ label, value, min, max, onChange, hideLabel }: DateFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-xs font-medium text-ink-2'}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        required
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className={`${field} tnum px-3`}
      />
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' }

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  const look =
    variant === 'primary'
      ? 'bg-navy text-card hover:bg-navy-2 shadow-[0_1px_2px_rgb(34_48_110/0.3)]'
      : 'bg-transparent text-navy hover:bg-navy-soft'
  return (
    <button
      type="button"
      {...rest}
      className={`press inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`}
    />
  )
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  const group = useId()
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[12px] bg-field-deep/70 p-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`press relative h-9 rounded-[9px] px-3.5 text-sm font-semibold ${active ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${group}`}
                transition={quickSpring}
                className="absolute inset-0 rounded-[9px] bg-card shadow-[0_1px_3px_rgb(28_32_48/0.12)]"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
