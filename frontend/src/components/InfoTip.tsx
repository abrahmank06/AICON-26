import { useId } from 'react'
import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

interface InfoTipProps {
  label: string
  children: ReactNode
  align?: 'start' | 'end'
  inverse?: boolean
}

/** Plain-language explanation of a term, one tap away instead of on the page. */
export function InfoTip({ label, children, align = 'start', inverse = false }: InfoTipProps) {
  const id = useId()

  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-describedby={id}
        aria-label={`What is ${label}?`}
        className={`-m-1 inline-flex rounded-full p-1 transition-colors ${
          inverse ? 'text-navy-soft hover:text-card' : 'text-ink-3 hover:text-navy focus-visible:text-navy'
        }`}
      >
        <Info className="size-[15px]" strokeWidth={2.2} />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute top-full z-30 mt-2 hidden w-[min(18rem,80vw)] rounded-[12px] bg-ink p-3.5 text-left text-[13.5px] leading-[1.45] font-normal tracking-normal text-card normal-case shadow-pop group-hover:block group-focus-within:block ${align === 'start' ? '-left-2' : '-right-2'}`}
      >
        {children}
      </span>
    </span>
  )
}
