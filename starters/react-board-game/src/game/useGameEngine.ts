import { useCallback, useEffect, useRef, useState } from 'react'
import { autopilot, blast, createWorld, levelProgress, moveLane, score, step, TUNING, type World } from './physics'
import type { GamePhase, GameState, Toast, ToastTone } from './types'

const BEST_KEY = 'board-game-starter.best' // namespace per game: '<game>.best'
/** HUD refresh period. The sim runs every frame; React re-renders ~12×/s. */
const HUD_INTERVAL = 0.08

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0 // private mode / blocked storage — best just won't persist
  }
}

function saveBest(best: number) {
  try {
    localStorage.setItem(BEST_KEY, String(best))
  } catch {
    /* storage is a convenience only */
  }
}

function snapshot(w: World, phase: GamePhase, best: number): GameState {
  return {
    phase,
    score: score(w),
    best,
    coins: w.coins,
    dist: w.dist,
    hp: w.hp,
    level: w.level,
    levelProgress: levelProgress(w),
    toNextLevel: Math.max(0, TUNING.levelDistance - (w.dist % TUNING.levelDistance)),
  }
}

/**
 * Owns the simulation clock.
 *
 * - The World lives in a ref and is mutated in place 60×/s; React never sees
 *   per-frame values. Renderers (GameCanvas) read `world.current` directly.
 * - React state is a throttled snapshot for the HUD (HUD_INTERVAL).
 * - `phase` is mirrored into a ref so callbacks and the rAF loop read the
 *   current value without re-subscribing (stale-closure trap).
 * - Physics reports what happened via `world.fx` counters; this hook turns
 *   them into toasts / haptics / sfx. Physics never touches the UI.
 */
export function useGameEngine() {
  const world = useRef<World>(createWorld())
  const phase = useRef<GamePhase>('ready')
  const [state, setState] = useState<GameState>(() => snapshot(world.current, 'ready', loadBest()))
  const [toast, setToast] = useState<Toast | null>(null)
  const toastKey = useRef(0)
  const hudTimer = useRef(0)

  const pushToast = useCallback((text: string, tone: ToastTone) => {
    toastKey.current += 1
    setToast({ key: toastKey.current, text, tone })
  }, [])

  const setPhase = useCallback((next: GamePhase) => {
    phase.current = next
    setState((s) => ({ ...s, phase: next }))
  }, [])

  const start = useCallback(() => {
    // The attract-mode demo has been mutating the world: start clean.
    world.current = createWorld()
    phase.current = 'playing'
    setToast(null)
    setState((s) => snapshot(world.current, 'playing', s.best))
  }, [])

  const togglePause = useCallback(() => {
    if (phase.current === 'playing') setPhase('paused')
    else if (phase.current === 'paused') setPhase('playing')
  }, [setPhase])

  const moveLeft = useCallback(() => {
    if (phase.current === 'playing') moveLane(world.current, -1)
  }, [])
  const moveRight = useCallback(() => {
    if (phase.current === 'playing') moveLane(world.current, 1)
  }, [])
  const action = useCallback(() => {
    if (phase.current === 'playing') blast(world.current)
    else if (phase.current === 'ready' || phase.current === 'over') start()
  }, [start])

  // ------------------------------------------------------------ the loop
  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      // Clamp BOTH ends: >1/30 so a background tab doesn't teleport the world,
      // <0 because StrictMode double-mount / tab resume can hand rAF an older
      // timestamp — a negative dt once walked dive-depths' depth negative.
      const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 30))
      last = now
      const w = world.current

      if (phase.current === 'playing') {
        step(w, dt)
        const fx = w.fx
        if (fx.perfect) pushToast(`PERFECT ×${w.combo}`, 'gold')
        else if (fx.blast) pushToast('BLAST', 'good')
        if (fx.hit) pushToast('OUCH', 'hazard')
        if (fx.heart) pushToast('+HP', 'good')
        if (fx.levelUp) pushToast(`LEVEL ${w.level}`, 'gold')
        if (fx.hit) navigator.vibrate?.([30, 40, 30])

        hudTimer.current -= dt
        if (hudTimer.current <= 0 || w.over) {
          hudTimer.current = HUD_INTERVAL
          setState((s) => ({ ...snapshot(w, 'playing', s.best) }))
        }
        if (w.over) {
          phase.current = 'over'
          const final = score(w)
          setState((s) => {
            const best = Math.max(s.best, final)
            if (best > s.best) saveBest(best)
            return { ...snapshot(w, 'over', best), best }
          })
        }
      } else if (phase.current === 'ready') {
        // Attract mode: the title card sits over a self-playing demo.
        autopilot(w)
        step(w, dt)
        if (w.over) world.current = createWorld()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [pushToast])

  // ------------------------------------------------------------ auto-pause
  // Leaving the tab/app mid-run never delivers pointerup and the rAF clock
  // stops; resume into a paused state instead of a surprise death.
  useEffect(() => {
    const pause = () => {
      if (phase.current === 'playing') setPhase('paused')
    }
    const onVis = () => {
      if (document.hidden) pause()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', pause)
    // iOS double-tap / pinch zoom that slipped past the guard: pause, let the
    // player pinch back out (kits/touch-zoom-guard).
    window.TouchZoomGuard?.init({ onZoomChange: (zoomed) => zoomed && pause() })
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', pause)
    }
  }, [setPhase])

  // ------------------------------------------------------------ keyboard
  // One discrete action per keydown; e.repeat is ignored so holding a key
  // doesn't machine-gun lane changes.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return
      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          event.preventDefault()
          moveLeft()
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          event.preventDefault()
          moveRight()
          break
        case ' ':
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault()
          action()
          break
        case 'p':
        case 'P':
        case 'Escape':
          togglePause()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [moveLeft, moveRight, action, togglePause])

  return { state, world, toast, start, togglePause, moveLeft, moveRight, action }
}
