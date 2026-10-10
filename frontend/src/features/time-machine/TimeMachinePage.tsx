import { useMemo, useState } from 'react'
import { History, Rewind } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { ChartKey, PriceChart } from '../../charts/PriceChart'
import { Button, DateField } from '../../components/Controls'
import { InfoTip } from '../../components/InfoTip'
import { Stamp } from '../../components/Stamp'
import { ErrorState } from '../../components/States'
import { Tag } from '../../components/Tag'
import { useAlerts, useTravel } from '../../hooks/queries'
import { useFilters } from '../../hooks/useFilters'
import { useSearchParams } from 'react-router-dom'
import { EARLIEST_AS_OF, LATEST_TRAVEL, clampDate, isIsoDate } from '../../lib/dates'
import { cropPlural, formatDate, formatShortDate, formatSignedPct } from '../../lib/format'
import { fade, uiSpring } from '../../lib/motion'
import type { TravelQuery } from '../../services/api'
import type { TimeMachineResult, TravelVerdict } from '../../types'

const VERDICT: Record<TravelVerdict, { stamp: string; ink: string }> = {
  correct_alert: { stamp: 'Called it', ink: 'var(--color-stable)' },
  correct_calm: { stamp: 'Calm, correctly', ink: 'var(--color-stable)' },
  false_alarm: { stamp: 'False alarm', ink: 'var(--color-watch-ink)' },
  missed: { stamp: 'Missed it', ink: 'var(--color-spike)' },
}

function story(r: TimeMachineResult) {
  const said = r.spikeAlert
    ? `Maahir would have warned of a ${formatSignedPct(r.spikeAlert.expectedChangePct)} rise.`
    : 'Maahir would not have raised an alert.'
  const did =
    r.actualChangePct >= 0.1
      ? `Prices actually peaked ${formatSignedPct(r.actualChangePct)} within the week.`
      : r.actualChangePct > 0
        ? `Prices rose at most ${formatSignedPct(r.actualChangePct)} that week.`
        : 'Prices did not rise above that day’s level that week.'
  return `${said} ${did}`
}

function Travelling({ date }: { date: string }) {
  return (
    <motion.div
      key="travelling"
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fade}
      className="flex flex-col items-center gap-4 px-6 py-24 text-center"
    >
      <div className="relative h-1 w-56 overflow-hidden rounded-full bg-field-deep">
        <motion.span
          className="absolute inset-y-0 w-1/3 rounded-full bg-navy"
          initial={{ x: '300%' }}
          animate={{ x: '-100%' }}
          transition={{ repeat: Infinity, duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
        />
      </div>
      <p className="text-[18px] font-semibold text-ink">Travelling back to {formatDate(date)}</p>
      <p className="max-w-sm text-[14px] text-ink-2">Re-running the forecast with only the data that existed on that day.</p>
    </motion.div>
  )
}

export default function TimeMachinePage() {
  const { filters, setFilters } = useFilters()
  const [params] = useSearchParams()
  const travelParam = params.get('travel')
  const initial = isIsoDate(travelParam) ? clampDate(travelParam, EARLIEST_AS_OF, LATEST_TRAVEL) : null
  const [date, setDate] = useState(() => initial ?? '2023-07-10')
  const [query, setQuery] = useState<TravelQuery | null>(() =>
    initial ? { market: filters.market, crop: filters.crop, date: initial } : null,
  )
  const travel = useTravel(query)
  const alerts = useAlerts()

  const suggestions = useMemo(() => {
    const own = (alerts.data ?? []).filter(
      (a) => a.market === filters.market && a.crop === filters.crop && a.dateFired <= LATEST_TRAVEL,
    )
    const hits = own.filter((a) => a.verdict === 'correct').sort((a, b) => b.actualSpikePct - a.actualSpikePct).slice(0, 2)
    const miss = own.find((a) => a.verdict === 'false_alarm')
    return [...hits.map((a) => ({ date: a.dateFired, kind: 'spike' })), ...(miss ? [{ date: miss.dateFired, kind: 'false alarm' }] : [])]
  }, [alerts.data, filters.market, filters.crop])

  const go = (d: string) => {
    setDate(d)
    setQuery({ market: filters.market, crop: filters.crop, date: d })
    setFilters({ travel: d })
  }

  const place = `${filters.market} ${cropPlural(filters.crop)}`
  const stale = query && (query.market !== filters.market || query.crop !== filters.crop)
  const r = travel.data

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-[clamp(1.6rem,3vw,2.3rem)] font-semibold text-ink">Go back to any day. See what Maahir would have said.</h1>
          <p className="max-w-[60ch] text-[15px] text-ink-2">
            The forecast only sees data up to the day you pick, then we lay it over what really happened next, for {place}.
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            go(date)
          }}
        >
          <DateField label="Travel to" value={date} min={EARLIEST_AS_OF} max={LATEST_TRAVEL} onChange={setDate} />
          <Button type="submit" disabled={travel.isFetching}>
            <Rewind className="size-4" aria-hidden />
            Travel
          </Button>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pb-1.5 sm:ml-3">
              <span className="text-[13px] text-ink-2">Try</span>
              {suggestions.map((s) => (
                <button
                  key={s.date}
                  type="button"
                  onClick={() => go(s.date)}
                  className="press rounded-full border border-field-line bg-card/60 px-3 py-1 text-[13px] font-medium text-ink hover:border-navy hover:text-navy"
                >
                  {formatShortDate(s.date)} {s.date.slice(0, 4)} <span className="text-ink-2">· {s.kind}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!query ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            className="flex flex-col items-center gap-3 rounded-[20px] border-2 border-dashed border-field-line px-6 py-20 text-center"
          >
            <History className="size-8 text-navy" aria-hidden />
            <p className="text-[18px] font-semibold text-ink">Pick a date and press Travel</p>
            <p className="max-w-sm text-[14px] text-ink-2">
              Or try one of the suggested dates: real spikes Maahir caught, and one it got wrong.
            </p>
          </motion.div>
        ) : travel.isFetching ? (
          <Travelling date={query.date} />
        ) : travel.error ? (
          <ErrorState error={travel.error} onRetry={() => travel.refetch()} />
        ) : r ? (
          <motion.div
            key={`${query.market}-${query.crop}-${query.date}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={uiSpring}
            className="flex flex-col gap-6"
          >
            {stale && (
              <p className="text-[14px] text-ink-2">
                Showing {query.market} {cropPlural(query.crop)}. Press Travel to replay for {place}.
              </p>
            )}
            <Tag eyelet className="px-6 pt-14 pb-8 sm:px-10" label="Time Machine verdict">
              <div className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
                <div className="flex flex-col gap-5">
                  <Stamp text={VERDICT[r.verdict].stamp} ink={VERDICT[r.verdict].ink} pressKey={r.asOf + r.verdict} />
                  <p className="max-w-[46ch] text-[clamp(1.2rem,2vw,1.5rem)] leading-snug font-semibold text-ink">
                    On {formatDate(r.asOf)}, {story(r)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 md:items-end md:text-right">
                  <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink-2">
                    Average forecast miss
                    <InfoTip label="average forecast miss" align="end">
                      Mean absolute percentage error (MAPE) across the 7 forecast days: how far, on average, each daily
                      forecast was from the real price.
                    </InfoTip>
                  </span>
                  <span className="figure tnum text-[clamp(2.5rem,5vw,3.4rem)] font-semibold text-ink">{r.mapePct.toFixed(1)}%</span>
                </div>
              </div>
            </Tag>

            <Tag className="px-5 pt-7 pb-6 sm:px-8" label="Forecast against what happened">
              <h2 className="mb-4 text-[18px] font-semibold text-ink">Forecast against what really happened</h2>
              <PriceChart
                history={r.history}
                forecast={r.forecast}
                actual={r.actual}
                alert={!!r.spikeAlert}
                markerLabel="Travelled to"
                ariaLabel={`Forecast made on ${formatDate(r.asOf)} for ${place}, overlaid with the actual prices of the next 7 days. ${story(r)}`}
              />
              <div className="mt-4 border-t border-line pt-5">
                <ChartKey withActual alert={!!r.spikeAlert} />
              </div>
            </Tag>

            <section aria-label="Historical analogue" className="flex gap-4 px-1">
              <History className="mt-1 size-5 shrink-0 text-navy" aria-hidden />
              <div className="flex flex-col gap-1">
                <h2 className="text-[15px] font-semibold text-ink">Has this happened before?</h2>
                <p className="max-w-[65ch] text-[16px] leading-relaxed text-ink">{r.analogue}</p>
              </div>
            </section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
