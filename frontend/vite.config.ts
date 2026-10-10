/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => {
  const backendUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000'
  const proxy = {
    '^/(snapshot|forecast|time-machine|alerts|analytics|performance|models|predict)(/|$)': {
      target: backendUrl,
      changeOrigin: true,
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    build: {
      chunkSizeWarningLimit: 1200,
    },
    server: { proxy },
    preview: { proxy },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
