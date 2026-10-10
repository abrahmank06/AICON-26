import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ContagionNetwork } from '../../charts/ContagionNetwork'
import { ShapChart } from '../../charts/ShapChart'
import { SpilloverHeatmap } from '../../charts/SpilloverHeatmap'
import { Segmented } from '../../components/Controls'
import { InfoTip } from '../../components/InfoTip'
import { ErrorState, PanelSkeleton, Updating } from '../../components/States'
import { Tag } from '../../components/Tag'
import { useAnalytics } from '../../hooks/queries'
import { useFilters } from '../../hooks/useFilters'
import { cropPlural, cropSingular, formatDate } from '../../lib/format'
import { fade } from '../../lib/motion'
import type { Analytics, Filters } from '../../types'

type View = 'markets' | 'crops' | 'drivers'

function marketsLine(a: Analytics, f: Filters) {
  const top = a.contagion.find((e) => e.from === f.market || e.to === f.market) ?? a.contagion[0]
  if (!top) return `No market clearly leads the others for ${cropPlural(f.crop)}.`
  return `${top.from} tends to move first. ${top.to} follows about ${top.lagDays} day${top.lagDays === 1 ? '' : 's'} later.`
}

function cropsLine(a: Analytics, f: Filters) {
  const { crops, matrix } = a.spillover
  let best = { i: 0, j: 1, r: -2 }
  for (let i = 0; i < crops.length; i++) for (let j = i + 1; j < crops.length; j++) if (matrix[i][j] > best.r) best = { i, j, r: matrix[i][j] }
  return best.r < 0.1
    ? `In ${f.market}, crop prices mostly move on their own.`
    : `In ${f.market}, ${cropSingular(crops[best.i])} and ${cropSingular(crops[best.j])} prices move together most.`
}

function driversLine(a: Analytics) {
  const top = a.shap[0]
  if (!top) return 'No single factor stands out today.'
  return `${top.label} ${top.contribution >= 0 ? 'is pushing spike risk up' : 'is keeping spike risk down'} the most.`
}

export default function AnalyticsPage() {
  const { filters } = useFilters()
  const { data, error, isPending, isFetching, refetch } = useAnalytics(filters)
  const [view, setView] = useState<View>('markets')

  if (error && !data) return <ErrorState error={error} onRetry={() => refetch()} />

  const line = !data ? '' : view === 'markets' ? marketsLine(data, filters) : view === 'crops' ? cropsLine(data, filters) : driversLine(data)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[clamp(1.6rem,3vw,2.3rem)] font-semibold text-ink">Why prices move</h1>
          <p className="text-[15px] text-ink-2">
            {filters.market} {cropPlural(filters.crop)}, as of {formatDate(filters.date)}.
          </p>
        </div>
        <Segmented
          label="Analysis"
          value={view}
          onChange={setView}
          options={[
            { value: 'markets', label: 'Between markets' },
            { value: 'crops', label: 'Between crops' },
            { value: 'drivers', label: "Today's drivers" },
          ]}
        />
      </div>

      <Tag className="px-5 pt-7 pb-7 sm:px-8" label="Analysis">
        {isPending || !data ? (
          <PanelSkeleton />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} className="flex flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="max-w-[48ch] text-[clamp(1.2rem,2vw,1.5rem)] font-semibold text-ink">
                  {line}{' '}
                  <InfoTip label="this analysis">
                    {view === 'markets' &&
                      'Contagion: for each pair of markets we check whether price changes in one show up in the other a few days later. Arrows point from the market that moves first; thicker arrows are stronger links.'}
                    {view === 'crops' &&
                      'Spillover: correlation of weekly price changes over the last two years. Close to 1 means two crops rise and fall together; below 0 means one tends to rise when the other falls.'}
                    {view === 'drivers' &&
                      'SHAP-style attribution: how much each input pushes today’s spike score up (red) or down (navy) compared with a typical day.'}
                  </InfoTip>
                </h2>
                <Updating active={isFetching} />
              </div>
              {view === 'markets' && (
                <div className="mx-auto w-full max-w-[680px]">
                  <ContagionNetwork edges={data.contagion} focus={filters.market} />
                </div>
              )}
              {view === 'crops' && <SpilloverHeatmap data={data.spillover} />}
              {view === 'drivers' && <ShapChart features={data.shap} />}
            </motion.div>
          </AnimatePresence>
        )}
      </Tag>
    </div>
  )
}
