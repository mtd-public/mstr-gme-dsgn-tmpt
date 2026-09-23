import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// Order matters: the guard's CSS first so the game's CSS can override it.
import './lib/touch-zoom-guard.css'
import './lib/touch-zoom-guard.js'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
