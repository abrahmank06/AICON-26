import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DATA_END, EARLIEST_AS_OF, clampDate, isIsoDate } from '../lib/dates'
import { CROPS, MARKETS } from '../types'
import type { Crop, Filters, Market } from '../types'

const pick = <T extends string>(options: readonly T[], value: string | null, fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback

/** Global filters live in the URL so every view is shareable and survives a refresh. */
export function useFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<Filters>(() => {
    const date = params.get('date')
    return {
      market: pick<Market>(MARKETS, params.get('market'), 'Lahore'),
      crop: pick<Crop>(CROPS, params.get('crop'), 'Onion'),
      date: isIsoDate(date) ? clampDate(date, EARLIEST_AS_OF, DATA_END) : DATA_END,
    }
  }, [params])

  const setFilters = useCallback(
    (patch: Partial<Filters> & { travel?: string }) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) if (v) next.set(k, v)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  return { filters, setFilters, search: params.toString() }
}
