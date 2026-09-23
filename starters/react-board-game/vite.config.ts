import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' makes the build work at any path: a GitHub Pages project site
// (/<repo>/), a subdirectory, or opened straight off disk. (The older games
// hard-coded base: '/<repo-name>/' and broke whenever a repo was renamed.)
export default defineConfig({
  base: './',
  plugins: [react()],
})
