import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  plugins: [
    react(),
    wasm()
  ],
  server: {
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  worker: {
    plugins: () => [wasm()],
    format: 'es',
  },
})
