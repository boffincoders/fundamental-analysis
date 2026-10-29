import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { seoPages } from './seo-pages'

// Package version for the footer, read from the library's package.json.
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  base: '/fundamental-analysis/',
  plugins: [react(), tailwindcss(), seoPages()],
  define: { __PKG_VERSION__: JSON.stringify(version) },
})
