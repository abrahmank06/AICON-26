import { lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './app/Layout'
import { SnapshotPage } from './features/snapshot/SnapshotPage'

const ForecastPage = lazy(() => import('./features/forecast/ForecastPage'))
const TimeMachinePage = lazy(() => import('./features/time-machine/TimeMachinePage'))
const AlertHistoryPage = lazy(() => import('./features/alert-history/AlertHistoryPage'))
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'))
const PerformancePage = lazy(() => import('./features/performance/PerformancePage'))

function KeepSearch({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={{ pathname: to, search }} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<KeepSearch to="/snapshot" />} />
        <Route path="snapshot" element={<SnapshotPage />} />
        <Route path="forecast" element={<ForecastPage />} />
        <Route path="time-machine" element={<TimeMachinePage />} />
        <Route path="alerts" element={<AlertHistoryPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="*" element={<KeepSearch to="/snapshot" />} />
      </Route>
    </Routes>
  )
}
