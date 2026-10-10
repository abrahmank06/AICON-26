import { useState } from 'react'
import { ChevronDown, TriangleAlert } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { ChartKey, PriceChart } from '../../charts/PriceChart'
import { ErrorState, PanelSkeleton, Updating } from '../../components/States'
import { Tag } from '../../components/Tag'
import { useForecast } from '../../hooks/queries'
import { useFilters } from '../../hooks/useFilters'
import { cropPlural, formatDate, formatPkr, formatShortDate, formatSignedPct } from '../../lib/format'
import { uiSpring } from '../../lib/motion'
import type { Forecast } from '../../types'

const outlook = (f: Forecast) => {
  const now = f.history[f.history.length - 1].price
  const end = f.forecast[f.forecast.length - 1]
  const change = end.predicted / now - 1
  const verb = change > 0.03 ? 'rise' : change < -0.03 ? 'ease' : 'hold'
  return verb === 'hold'
    ? `Expected to hold near ${formatPkr(end.predicted)} through ${formatShortDate(end.date)}.`
    : `Expected to ${verb} to about ${formatPkr(end.predicted)} by ${formatShortDate(end.date)}.`
}

export default function ForecastPage() {
  const { filters } = useFilters()
  const { data, error, isPending, isFetching, refetch } = useForecast(filters)
  const [showDays, setShowDays] = useState(false)

  if (error && !data) return <ErrorState error={error} onRetry={() => refetch()} />
  const place = `${filters.market} ${cropPlural(filters.crop)}`

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence initial={false}>
        {data?.spikeAlert && (
          <motion.div
            key="alert"
            role="alert"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={uiSpring}
            className="flex items-center gap-3 rounded-[14px] bg-spike px-5 py-4 text-card shadow-[0_8px_24px_-12px_rgb(179_38_30/0.6)]"
          >
            <TriangleAlert className="size-6 shrink-0" aria-hidden />
            <p className="text-[16px] font-semibold">
              Spike alert: {place} could rise{' '}
              <span className="tnum">{formatSignedPct(data.spikeAlert.expectedChangePct)}</span> by{' '}
              {formatShortDate(data.spikeAlert.peakDate)}.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <Tag className="px-5 pt-7 pb-6 sm:px-8 sm:pt-8" label="Seven-day forecast">
        {isPending || !data ? (
          <PanelSkeleton />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <h1 className="text-[clamp(1.45rem,2.6vw,2rem)] font-semibold text-ink">{outlook(data)}</h1>
                <p className="text-[15px] text-ink-2">
                  {place}, forecast made on {formatDate(data.asOf)} with the 30 days before it.
                </p>
              </div>
              <Updating active={isFetching} />
            </div>
            <PriceChart
              history={data.history}
              forecast={data.forecast}
              alert={!!data.spikeAlert}
              markerLabel="Today"
              ariaLabel={`Price for the last 30 days and forecast for the next 7 days for ${place}. ${outlook(data)}`}
            />
            <div className="flex flex-col gap-4 border-t border-line pt-5">
              <ChartKey alert={!!data.spikeAlert} />
              <button
                type="button"
                aria-expanded={showDays}
                onClick={() => setShowDays((s) => !s)}
                className="press inline-flex w-fit items-center gap-1.5 rounded-[8px] text-[14px] font-semibold text-navy"
              >
                {showDays ? 'Hide' : 'Show'} day-by-day numbers
                <ChevronDown className={`size-4 transition-transform ${showDays ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              <AnimatePresence initial={false}>
                {showDays && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={uiSpring}
                    className="overflow-hidden"
                  >
                    <table className="tnum w-full max-w-xl text-left text-[14px]">
                      <thead className="text-[12.5px] text-ink-2">
                        <tr>
                          <th className="py-2 font-medium">Day</th>
                          <th className="py-2 text-right font-medium">Forecast</th>
                          <th className="py-2 text-right font-medium">Likely range</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {data.forecast.map((p) => (
                          <tr key={p.date}>
                            <td className="py-2">{formatShortDate(p.date)}</td>
                            <td className="py-2 text-right font-semibold">{formatPkr(p.predicted)}</td>
                            <td className="py-2 text-right text-ink-2">
                              {formatPkr(p.lower)} to {formatPkr(p.upper)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </Tag>
    </div>
  )
}
