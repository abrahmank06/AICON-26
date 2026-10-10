import { RotateCw, TriangleAlert } from 'lucide-react'
import { Button } from './Controls'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-[10px] bg-field-deep/70 ${className}`} />
}

export function PanelSkeleton({ height = 340 }: { height?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4">
      <Skeleton className="h-7 w-2/3 max-w-md" />
      <Skeleton className="w-full" />
      <div style={{ height }} className="rounded-[14px] bg-field/40" />
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong while loading this view.'
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[16px] bg-spike-soft/60 p-6 text-ink">
      <div className="flex items-center gap-2 font-semibold text-spike">
        <TriangleAlert className="size-5" aria-hidden />
        Couldn't load this view
      </div>
      <p className="text-[15px] text-ink-2">{message} Check that the Maahir service is running, then try again.</p>
      <Button variant="quiet" onClick={onRetry}>
        <RotateCw className="size-4" aria-hidden />
        Try again
      </Button>
    </div>
  )
}

export function Updating({ active }: { active: boolean }) {
  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-2 text-[13px] font-medium text-ink-2 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className="size-1.5 animate-pulse rounded-full bg-navy" />
      {active ? 'Updating' : ''}
    </span>
  )
}
