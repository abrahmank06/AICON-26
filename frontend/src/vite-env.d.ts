/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'plotly.js-basic-dist-min' {
  import Plotly from 'plotly.js'
  export default Plotly
}
