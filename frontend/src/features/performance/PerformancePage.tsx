import { InfoTip } from '../../components/InfoTip'
import { ErrorState, PanelSkeleton } from '../../components/States'
import { Reading, Tag } from '../../components/Tag'
import { usePerformance } from '../../hooks/queries'
import { formatCompactPkr, formatDate, formatPkr } from '../../lib/format'

const pct = (v: number) => `${v.toFixed(0)}%`

export default function PerformancePage() {
  const { data: p, error, isPending, refetch } = usePerformance()

  if (error && !p) return <ErrorState error={error} onRetry={() => refetch()} />
  if (isPending || !p) return <PanelSkeleton />

  return (
    <div className="flex flex-col gap-10">
      <Tag eyelet className="px-6 pt-14 pb-8 sm:px-10 sm:pb-10" label="Forecast accuracy">
        <div className="grid items-end gap-8 md:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-3">
            <h1 className="max-w-[24ch] text-[clamp(1.6rem,3vw,2.3rem)] font-semibold text-ink">
              Daily forecasts land within {p.mapePct.toFixed(0)}% of the real price, on average.
            </h1>
            <p className="text-[15px] text-ink-2">
              Backtest from {formatDate(p.windowStart)} to {formatDate(p.windowEnd)} across all 4 markets and 4 crops.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end md:text-right">
            <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink-2">
              Average error (MAPE)
              <InfoTip label="MAPE" align="end">
                Mean absolute percentage error: the average gap between each daily forecast and the real price, as a share
                of the real price. Lower is better. This is the primary accuracy measure.
              </InfoTip>
            </span>
            <span className="figure tnum text-[clamp(2.8rem,5.5vw,4rem)] font-semibold text-ink">{p.mapePct.toFixed(1)}%</span>
            <dl className="tnum flex gap-6 text-[14px] text-ink-2">
              <div className="flex items-center gap-1.5">
                <dt>RMSE</dt>
                <dd className="font-semibold text-ink">{formatPkr(p.rmse)}</dd>
                <InfoTip label="RMSE" align="end">
                  Root mean squared error in rupees. Like the average error, but big misses count extra.
                </InfoTip>
              </div>
              <div className="flex items-center gap-1.5">
                <dt>MAE</dt>
                <dd className="font-semibold text-ink">{formatPkr(p.mae)}</dd>
                <InfoTip label="MAE" align="end">
                  Mean absolute error: the typical miss in rupees per forecast day.
                </InfoTip>
              </div>
            </dl>
          </div>
        </div>
      </Tag>

      <section aria-labelledby="alert-quality" className="flex flex-col gap-6 px-1">
        <h2 id="alert-quality" className="text-[19px] font-semibold text-ink">
          How good are the alerts? <span className="font-normal text-ink-2">({p.alertsEvaluated} alerts checked)</span>
        </h2>
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-field-line">
          <div className="lg:pr-8">
            <Reading label="Precision" value={pct(p.precisionPct)} explain="Of all alerts Maahir raised, the share followed by a real spike (10%+ rise within 7 days)." />
          </div>
          <div className="lg:px-8">
            <Reading label="Recall" value={pct(p.recallPct)} explain="Of all real spikes, the share Maahir warned about up to 3 days before they began." />
          </div>
          <div className="lg:px-8">
            <Reading label="False alarm rate" value={pct(p.falseAlarmRatePct)} explain="Of all alerts, the share where prices did not spike. The flip side of precision." />
          </div>
          <div className="lg:pl-8">
            <Reading
              label="Average lead time"
              value={`${p.avgLeadTimeDays.toFixed(1)} days`}
              align="end"
              explain="For correct alerts, how many days passed between the alert and prices crossing the 10% line: time a buyer had to act."
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="impact" className="relative overflow-hidden rounded-[20px] bg-navy px-6 py-8 text-card sm:px-10 sm:py-10">
        <div className="grid items-end gap-8 md:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-3">
            <h2 id="impact" className="text-[15px] font-semibold text-navy-soft">
              Procurement cost savings
            </h2>
            <span className="figure tnum text-[clamp(2.5rem,5vw,3.6rem)] font-semibold">{formatCompactPkr(p.costSavingsPkr)}</span>
            <p className="max-w-[52ch] text-[14px] leading-relaxed text-navy-soft">
              Illustrative: a buyer purchasing 10 tonnes at the alert-day price ahead of every correctly flagged spike,
              instead of at the peak. Assumes AMIS prices are quoted per 100 kg.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end md:text-right">
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-navy-soft">
              Alert coverage
              <InfoTip label="alert coverage" align="end" inverse>
                Share of real spikes that Maahir flagged at least 2 days before prices crossed the 10% line.
              </InfoTip>
            </span>
            <span className="figure tnum text-[clamp(2.2rem,4.5vw,3rem)] font-semibold">{pct(p.alertCoveragePct)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
