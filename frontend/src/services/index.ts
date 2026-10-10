import type { YieldApi } from './api'
import { httpApi } from './httpApi'
import { mockApi } from './mock/mockApi'

// Set VITE_USE_MOCK=false and VITE_API_URL=<backend> to switch to the live backend.
export const api: YieldApi = import.meta.env.VITE_USE_MOCK === 'false' ? httpApi : mockApi
