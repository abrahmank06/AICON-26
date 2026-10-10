import { Suspense, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { DateField, Select } from '../components/Controls'
import { FieldBackdrop } from '../components/FieldBackdrop'
import { InfoTip } from '../components/InfoTip'
import logo from '../assets/maahir-logo-mark.png'
import { PanelSkeleton } from '../components/States'
import { ViewBoundary } from './ViewBoundary'
import { useFilters } from '../hooks/useFilters'
import { DATA_END, EARLIEST_AS_OF } from '../lib/dates'
import { quickSpring } from '../lib/motion'
import { api } from '../services'
import { CROPS, MARKETS } from '../types'

const TABS = [
  { to: '/snapshot', label: 'Snapshot' },
  { to: '/forecast', label: '7-day forecast' },
  { to: '/time-machine', label: 'Time Machine' },
  { to: '/alerts', label: 'Alert history' },
  { to: '/performance', label: 'Performance' },
]

function FilterBar() {
  const { filters, setFilters } = useFilters()
  return (
    <form
      aria-label="Market, crop and date"
      onSubmit={(e) => e.preventDefault()}
      className="grid grid-cols-2 gap-2 sm:flex sm:items-end"
    >
      <Select label="Market" value={filters.market} options={MARKETS} onChange={(market) => setFilters({ market })} />
      <Select label="Crop" value={filters.crop} options={CROPS} onChange={(crop) => setFilters({ crop })} />
      <div className="col-span-2 sm:col-span-1">
        <DateField
          label="Date"
          value={filters.date}
          min={EARLIEST_AS_OF}
          max={DATA_END}
          onChange={(date) => setFilters({ date })}
        />
      </div>
    </form>
  )
}

export function Layout() {
  const { search } = useFilters()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <FieldBackdrop />
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-navy px-3 py-2 text-card focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-field-line/70 bg-field/85 backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(1px))]:bg-field">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 pt-4 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3 pb-1">
            <NavLink
              to={{ pathname: '/snapshot', search }}
              className="flex shrink-0 items-center"
              aria-label="Maahir home"
            >
              <img src={logo} alt="Maahir" className="h-11 w-auto sm:h-12" />
            </NavLink>
            <div className="flex flex-col text-[12.5px] leading-tight text-ink-2">
              <span>Price spike early warning</span>
              <span>Punjab wholesale markets</span>
            </div>
            {api.isMock && (
              <span className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full whitespace-nowrap border border-watch-ink/40 bg-watch-soft/70 py-0.5 pr-2 pl-2.5 text-[12px] font-semibold text-watch">
                Demo data
                <InfoTip label="demo data">
                  Prices are real AMIS.pk wholesale history (Nov 2020 to Dec 2024). Forecasts, alerts, accuracy figures
                  and explanations come from a placeholder model until the Maahir prediction service is connected.
                </InfoTip>
              </span>
            )}
          </div>
          <FilterBar />
        </div>
        <nav
          aria-label="Views"
          className="mx-auto max-w-[1180px] overflow-x-auto px-3 [mask-image:linear-gradient(90deg,#000_85%,transparent)] sm:px-6 lg:[mask-image:none]"
        >
          <ul className="flex min-w-max gap-1 pt-3 pr-12 lg:pr-0">
            {TABS.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={{ pathname: tab.to, search }}
                  className={({ isActive }) =>
                    `press relative block rounded-t-[8px] px-3 pt-1.5 pb-3 text-[15px] font-semibold ${isActive ? 'text-navy' : 'text-ink-2 hover:text-ink'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {tab.label}
                      {isActive && (
                        <motion.span
                          layoutId="tab-ink"
                          transition={quickSpring}
                          className="absolute right-3 bottom-0 left-3 h-[3px] rounded-full bg-navy"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1180px] flex-1 px-5 pt-8 pb-16 sm:px-8 sm:pt-10">
        <ViewBoundary key={pathname}>
          <Suspense fallback={<PanelSkeleton />}>
            <Outlet />
          </Suspense>
        </ViewBoundary>
      </main>

      <footer className="border-t border-field-line/70">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-1 px-5 py-6 text-[13px] text-ink-2 sm:flex-row sm:justify-between sm:px-8">
          <span>Maahir by Null Pointerz · AICON'26</span>
          <span>Prices from AMIS.pk, in PKR</span>
        </div>
      </footer>
    </div>
  )
}
