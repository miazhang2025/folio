import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/extension/manifest.json'

// Two build modes:
//   VITE_TARGET=extension  → builds the Chrome extension via CRXJS
//   (default)              → builds the standalone web app
const isExtension = process.env.VITE_TARGET === 'extension'

export default defineConfig({
  plugins: isExtension
    ? [react(), crx({ manifest })]
    : [react()],
  build: {
    rollupOptions: isExtension
      ? {}
      : { input: { main: 'index.html' } },
  },
})
