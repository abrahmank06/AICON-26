import { useMemo } from 'react'
import { CalendarDays, History } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { ChartKey, PriceChart } from '../../charts/PriceChart'
import { InfoTip } from '../../components/InfoTip'
import { Stamp } from '../../components/Stamp'
import { ErrorState } from '../../components/States'
import { Tag } from '../../components/Tag'
import { useAlerts, useTravel } from '../../hooks/queries'
import { useFilters } from '../../hooks/useFilters'
import { DATA_END, EARLIEST_AS_OF, LATEST_TRAVEL, daysBetween } from '../../lib/dates'
import { cropPlural, formatDate, formatSignedPct } from '../../lib/format'
import { fade, uiSpring } from '../../lib/motion'
import type { TravelQuery } from '../../services/api'
import type { Alert, TimeMachineResult, TravelVerdict } from '../../types'

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

const EVENT_COUNT = 3
/** Alerts closer than this belong to the same price episode, so only one of them is offered. */
const EPISODE_GAP_DAYS = 60

/** Up to three past alerts with a full week of real prices after them: the biggest caught spikes and a false alarm. */
function pickEvents(alerts: Alert[], market: string, crop: string) {
  const own = alerts.filter(
    (a) => a.market === market && a.crop === crop && a.dateFired >= EARLIEST_AS_OF && a.dateFired <= LATEST_TRAVEL,
  )
  const picked: Alert[] = []
  const take = (pool: Alert[], max: number) => {
    for (const a of pool) {
      if (picked.length >= EVENT_COUNT || max <= 0) return
      if (picked.some((p) => Math.abs(daysBetween(p.dateFired, a.dateFired)) < EPISODE_GAP_DAYS)) continue
      picked.push(a)
      max--
    }
  }
  const hits = own.filter((a) => a.verdict === 'correct').sort((a, b) => b.actualSpikePct - a.actualSpikePct)
  const misses = own.filter((a) => a.verdict === 'false_alarm').sort((a, b) => b.predictedSpikePct - a.predictedSpikePct)
  take(hits, EVENT_COUNT - 1)
  take(misses, 1)
  take([...hits, ...misses], EVENT_COUNT)
  return picked.sort((a, b) => a.dateFired.localeCompare(b.dateFired))
}

function EventCard({ alert, active, onSelect }: { alert: Alert; active: boolean; onSelect: () => void }) {
  const caught = alert.verdict === 'correct'
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`card-hover flex min-w-0 flex-col items-start gap-1.5 rounded-[14px] border px-4 py-3 text-left ${
        active ? 'border-navy bg-navy-soft/60' : 'border-field-line bg-card hover:border-navy/40'
      }`}
    >
      <span className="tnum text-[15px] font-semibold text-ink">{formatDate(alert.dateFired)}</span>
      <span className="flex items-center gap-2 text-[13px] text-ink-2">
        <span aria-hidden className={`size-2 rounded-full ${caught ? 'bg-stable' : 'bg-watch-ink'}`} />
        {caught ? `Spike caught · ${formatSignedPct(alert.actualSpikePct)}` : `False alarm · predicted ${formatSignedPct(alert.predictedSpikePct)}`}
      </span>
    </button>
  )
}

export default function TimeMachinePage() {
  const { filters, setFilters } = useFilters()
  const date = filters.date
  const canTravel = date >= EARLIEST_AS_OF && date <= LATEST_TRAVEL
  const query: TravelQuery | null = canTravel ? { market: filters.market, crop: filters.crop, date } : null
  const travel = useTravel(query)
  const alerts = useAlerts()

  const events = useMemo(
    () => pickEvents(alerts.data ?? [], filters.market, filters.crop),
    [alerts.data, filters.market, filters.crop],
  )

  const place = `${filters.market} ${cropPlural(filters.crop)}`
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
        <p className="flex items-center gap-2 text-[15px] text-ink-2">
          <CalendarDays className="size-4 text-navy" aria-hidden />
          {canTravel ? 'Travelling to' : 'Selected date'} <span className="tnum font-semibold text-ink">{formatDate(date)}</span>
          <span className="hidden sm:inline">· change it with the date filter above</span>
        </p>
        {events.length > 0 && (
          <section aria-labelledby="past-events" className="flex flex-col gap-2.5">
            <h2 id="past-events" className="text-[13.5px] font-medium text-ink-2">
              Or replay a past event for {place}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {events.map((a) => (
                <EventCard key={a.id} alert={a} active={a.dateFired === date} onSelect={() => setFilters({ date: a.dateFired })} />
              ))}
            </div>
          </section>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!query ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            className="flex flex-col items-center gap-3 rounded-[20px] border-2 border-dashed border-field-line px-6 py-16 text-center"
          >
            <History className="size-8 text-navy" aria-hidden />
            <p className="text-[18px] font-semibold text-ink">Not enough data after {formatDate(date)} yet</p>
            <p className="max-w-md text-[14px] text-ink-2">
              The Time Machine checks a forecast against the 7 days that followed it, and prices are recorded up to{' '}
              {formatDate(DATA_END)}. Choose a date up to {formatDate(LATEST_TRAVEL)} in the date filter above
              {events.length > 0 ? ', or replay one of the past events.' : '.'}
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
