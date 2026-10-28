import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { seoPages } from './seo-pages'

// https://vite.dev/config/
export default defineConfig({
  base: '/finance-calculator/',
  plugins: [react(), tailwindcss(), seoPages()],
})
