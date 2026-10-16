import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), {
    name: 'isolate-middleware-cache',
    config(config) {
      // UI test servers must not overwrite the app's cache or another test worker's cache.
      if (config.server?.middlewareMode) {
        return { cacheDir: `node_modules/.vite-tests/${process.pid}` }
      }
    },
  }],
})
