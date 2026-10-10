import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Stamp } from '../../components/Stamp'
import { ErrorState, Skeleton, Updating } from '../../components/States'
import { Reading, Tag } from '../../components/Tag'
import { useSnapshot } from '../../hooks/queries'
import { useFilters } from '../../hooks/useFilters'
import { cropPlural, formatDate, formatNumber, formatShortDate, formatSignedPct, formatWeekday } from '../../lib/format'
import { RAMPS, RISK_COPY, RISK_TONE, magnitude } from '../../lib/risk'
import type { Snapshot } from '../../types'

const headline = (s: Snapshot) => {
  const place = `${s.market} ${cropPlural(s.crop)}`
  if (s.risk === 'critical') return `A sharp price spike is coming for ${place}. Act now.`
  if (s.risk === 'warning') return `A price spike looks likely for ${place}. Prepare a response.`
  if (s.risk === 'watch') return `Early signs of a rise for ${place}. Worth monitoring this week.`
  return `No spike expected for ${place}.`
}

const pct = (v: number | null) => (v === null ? 'n/a' : `${Math.round(v * 100)}%`)

function ChangeLine({ change }: { change: number | null }) {
  if (change === null) return null
  const up = change > 0.005
  const down = change < -0.005
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus
  return (
    <p className="flex items-center gap-1.5 text-[15px] font-medium text-ink-2">
      <Icon className={`size-4 ${up ? 'text-spike' : 'text-ink-2'}`} aria-hidden />
      <span className="tnum font-semibold text-ink">{formatSignedPct(change)}</span> vs a week ago
    </p>
  )
}

export function SnapshotPage() {
  const { filters, search } = useFilters()
  const { data, error, isPending, isFetching, refetch } = useSnapshot(filters)

  if (error && !data) return <ErrorState error={error} onRetry={() => refetch()} />

  return (
    <div className="flex flex-col gap-10">
      <Tag eyelet className="px-6 pt-14 pb-8 sm:px-10 sm:pt-16 sm:pb-10" label="Today's verdict">
        <div className="absolute top-4 right-6">
          <Updating active={isFetching && !isPending} />
        </div>
        {isPending || !data ? (
          <div role="status" aria-label="Loading snapshot" className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
            <div className="flex flex-col gap-5">
              <Skeleton className="h-14 w-56" />
              <Skeleton className="h-9 w-full max-w-lg" />
            </div>
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <div className="grid items-end gap-10 md:grid-cols-[1.3fr_1fr]">
            <div className="flex flex-col gap-6">
              <Stamp
                text={RISK_COPY[data.risk].stamp}
                ink={RISK_TONE[data.risk].ink}
                pressKey={`${data.market}-${data.crop}-${data.date}`}
              />
              <div className="flex flex-col gap-3">
                <h1 className="max-w-[22ch] text-[clamp(1.6rem,3vw,2.3rem)] font-semibold text-ink">{headline(data)}</h1>
                <p className="text-[15px] text-ink-2">
                  {data.spikeAlert && (
                    <>
                      The forecast expects up to{' '}
                      <span className="tnum font-semibold text-spike">{formatSignedPct(data.spikeAlert.expectedChangePct)}</span> by{' '}
                      {formatShortDate(data.spikeAlert.peakDate)}.{' '}
                    </>
                  )}
                  Market reading for {formatWeekday(data.date)}, {formatDate(data.date)}.
                </p>
              </div>
              <Link
                to={{ pathname: '/forecast', search }}
                className="press group inline-flex w-fit items-center gap-1.5 rounded-[8px] text-[15px] font-semibold text-navy hover:underline"
              >
                See the 7-day forecast
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>

            <div className="flex flex-col gap-3 md:items-end md:text-right">
              <span className="text-[13.5px] font-medium text-ink-2">Price today, PKR</span>
              <span className="figure tnum text-[clamp(2.8rem,5.5vw,4rem)] font-semibold text-ink">{formatNumber(data.price)}</span>
              <ChangeLine change={data.change7dPct} />
              {data.isImputed && (
                <p className="flex items-center gap-2 text-[13px] text-ink-2">
                  <span aria-hidden className="size-2.5 rounded-full border-[1.5px] border-ink-2" />
                  No market report today. Last reported price carried forward.
                </p>
              )}
            </div>
          </div>
        )}
      </Tag>

      {data && (
        <section aria-label="Supporting readings" className="grid gap-8 px-1 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-field-line">
          <div className="sm:pr-8">
            <Reading
              label="Swings this week"
              value={pct(data.volatility7d)}
              level={magnitude(data.volatility7d, RAMPS.volatility7d)}
              explain={
                <>
                  How much the price jumps around day to day over the last 7 days (volatility, 7d). Above 18% is unusually
                  unsettled for these markets.
                </>
              }
            />
          </div>
          <div className="sm:px-8">
            <Reading
              label="Swings this month"
              value={pct(data.volatility30d)}
              level={magnitude(data.volatility30d, RAMPS.volatility30d)}
              explain={
                <>
                  Monthly volatility: the 30-day spread of daily log returns (volatility, 30d). At 14.8% or more, together
                  with a rising streak of 1.0 or more, the market is under stress and the forecast decides the alert.
                </>
              }
            />
          </div>
          <div className="sm:pl-8">
            <Reading
              label="Rising Index"
              value={data.panicIndex7d === null ? 'n/a' : (Math.round(data.panicIndex7d * 10) / 10 || 0).toFixed(1)}
              level={magnitude(data.panicIndex7d, RAMPS.panicIndex7d)}
              align="end"
              explain={
                <>
                  Panic index (7d): the 7-day price change times the number of up days in that week, so it grows when
                  prices climb steadily. 1.0 or more alongside monthly swings of 14.8% or more marks a stressed market.
                  A forecast rise of 5% means watch, 10% warning and 15% critical.
                </>
              }
            />
          </div>
        </section>
      )}
    </div>
  )
}
