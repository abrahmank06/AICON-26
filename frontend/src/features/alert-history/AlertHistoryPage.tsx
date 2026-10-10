import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button, Segmented, Select } from '../../components/Controls'
import { ErrorState, PanelSkeleton } from '../../components/States'
import { Tag } from '../../components/Tag'
import { useAlerts } from '../../hooks/queries'
import { formatDate, formatMonthYear, formatSignedPct } from '../../lib/format'
import { CROPS, MARKETS } from '../../types'
import type { Alert, AlertVerdict } from '../../types'

const col = createColumnHelper<Alert>()
const exact = (row: { getValue: (id: string) => unknown }, id: string, value: string) => value === 'all' || row.getValue(id) === value

function VerdictBadge({ verdict }: { verdict: AlertVerdict }) {
  return verdict === 'correct' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-stable-soft px-2.5 py-0.5 text-[13px] font-semibold text-stable">
      <Check className="size-3.5" aria-hidden strokeWidth={2.6} />
      Correct
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-watch-soft px-2.5 py-0.5 text-[13px] font-semibold text-watch">
      <X className="size-3.5" aria-hidden strokeWidth={2.6} />
      False alarm
    </span>
  )
}

const columns = [
  col.accessor('dateFired', { header: 'Date fired', cell: (c) => formatDate(c.getValue()) }),
  col.accessor('market', { header: 'Market', filterFn: exact }),
  col.accessor('crop', { header: 'Crop', filterFn: exact }),
  col.accessor('predictedSpikePct', {
    header: 'Predicted spike',
    cell: (c) => formatSignedPct(c.getValue()),
    meta: { numeric: true },
  }),
  col.accessor('actualSpikePct', {
    header: 'Actual spike',
    cell: (c) => formatSignedPct(c.getValue()),
    meta: { numeric: true },
  }),
  col.accessor('leadTimeDays', {
    header: 'Lead time',
    cell: (c) => {
      const v = c.getValue()
      return v === null ? <span className="text-ink-3">n/a</span> : `${v} day${v === 1 ? '' : 's'}`
    },
    sortUndefined: 'last',
    meta: { numeric: true },
  }),
  col.accessor('verdict', { header: 'Verdict', cell: (c) => <VerdictBadge verdict={c.getValue()} />, filterFn: exact }),
]

type Choice<T extends string> = T | 'all'

export default function AlertHistoryPage() {
  const { data, error, isPending, refetch } = useAlerts()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dateFired', desc: true }])
  const [market, setMarket] = useState<Choice<(typeof MARKETS)[number]>>('all')
  const [crop, setCrop] = useState<Choice<(typeof CROPS)[number]>>('all')
  const [verdict, setVerdict] = useState<Choice<AlertVerdict>>('all')

  const columnFilters = useMemo<ColumnFiltersState>(
    () => [
      { id: 'market', value: market },
      { id: 'crop', value: crop },
      { id: 'verdict', value: verdict },
    ],
    [market, crop, verdict],
  )

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
    initialState: { pagination: { pageSize: 12 } },
  })

  if (error && !data) return <ErrorState error={error} onRetry={() => refetch()} />
  if (isPending || !data) return <PanelSkeleton />

  const rows = table.getFilteredRowModel().rows
  const right = rows.filter((r) => r.original.verdict === 'correct').length
  const { pageIndex, pageSize } = table.getState().pagination
  const first = rows.length ? pageIndex * pageSize + 1 : 0
  const last = Math.min(rows.length, (pageIndex + 1) * pageSize)
  const oldest = data.reduce((min, a) => (a.dateFired < min ? a.dateFired : min), data[0]?.dateFired ?? '')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(1.6rem,3vw,2.3rem)] font-semibold text-ink">
          <span className="tnum">{right}</span> of <span className="tnum">{rows.length}</span> alerts were right
          {rows.length > 0 && <span className="text-ink-2"> ({Math.round((right / rows.length) * 100)}%)</span>}
        </h1>
        <p className="text-[15px] text-ink-2">
          Every spike alert since {oldest ? formatMonthYear(oldest) : 'the start'}. An alert counts as right when prices
          rose at least 10% within 7 days.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Market"
          value={market}
          options={[{ value: 'all', label: 'All markets' }, ...MARKETS.map((m) => ({ value: m, label: m }))]}
          onChange={setMarket}
        />
        <Select
          label="Crop"
          value={crop}
          options={[{ value: 'all', label: 'All crops' }, ...CROPS.map((c) => ({ value: c, label: c }))]}
          onChange={setCrop}
        />
        <Segmented
          label="Verdict"
          value={verdict}
          onChange={setVerdict}
          options={[
            { value: 'all', label: 'All' },
            { value: 'correct', label: 'Correct' },
            { value: 'false_alarm', label: 'False alarms' },
          ]}
        />
      </div>

      <Tag className="overflow-hidden" label="Alert log">
        <div className="overflow-x-auto">
          <table className="tnum w-full min-w-[760px] text-left text-[14.5px]">
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b border-line">
                  {group.headers.map((h) => {
                    const sorted = h.column.getIsSorted()
                    const numeric = (h.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric
                    const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
                    return (
                      <th
                        key={h.id}
                        scope="col"
                        aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                        className={`px-5 py-3 text-[12.5px] font-semibold text-ink-2 ${numeric ? 'text-right' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className={`press inline-flex items-center gap-1 rounded-[6px] hover:text-ink ${sorted ? 'text-ink' : ''} ${numeric ? 'flex-row-reverse' : ''}`}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <Icon className={`size-3.5 ${sorted ? 'text-navy' : 'opacity-40'}`} aria-hidden />
                        </button>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-line">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-field/35">
                  {row.getVisibleCells().map((cell) => {
                    const numeric = (cell.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric
                    return (
                      <td key={cell.id} className={`px-5 py-3 whitespace-nowrap ${numeric ? 'text-right' : ''}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <p className="font-semibold text-ink">No alerts match these filters</p>
              <Button
                variant="quiet"
                onClick={() => {
                  setMarket('all')
                  setCrop('all')
                  setVerdict('all')
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
        {rows.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13.5px] text-ink-2">
            <span className="tnum">
              {first}–{last} of {rows.length}
            </span>
            <div className="flex gap-1">
              <Button variant="quiet" aria-label="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <Button variant="quiet" aria-label="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </Tag>
    </div>
  )
}
