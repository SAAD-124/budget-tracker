import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH is set by the GitHub Pages workflow ('/budget-tracker/').
// Locally and on hosts that serve from the domain root it stays '/'.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
  server: { port: 3000 },
})
