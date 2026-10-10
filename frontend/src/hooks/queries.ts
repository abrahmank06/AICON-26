import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../services'
import type { TravelQuery } from '../services/api'
import type { Filters } from '../types'

export const useSnapshot = (f: Filters) =>
  useQuery({ queryKey: ['snapshot', f], queryFn: () => api.getSnapshot(f), placeholderData: keepPreviousData })

export const useForecast = (f: Filters) =>
  useQuery({ queryKey: ['forecast', f], queryFn: () => api.getForecast(f), placeholderData: keepPreviousData })

export const useTravel = (q: TravelQuery | null) =>
  useQuery({ queryKey: ['travel', q], queryFn: () => api.travel(q!), enabled: !!q })

export const useAlerts = () => useQuery({ queryKey: ['alerts'], queryFn: () => api.getAlerts(), staleTime: Infinity })

export const useAnalytics = (f: Filters) =>
  useQuery({ queryKey: ['analytics', f], queryFn: () => api.getAnalytics(f), placeholderData: keepPreviousData })

export const usePerformance = () =>
  useQuery({ queryKey: ['performance'], queryFn: () => api.getPerformance(), staleTime: Infinity })
