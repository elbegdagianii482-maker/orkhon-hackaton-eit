import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localApi } from './server/vite-api.js'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), localApi()],
  build: { outDir: 'dist/client' },
})
