import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves project sites from /<repo-name>/
export default defineConfig({
  base: '/word-drop/',
  plugins: [react()],
})
