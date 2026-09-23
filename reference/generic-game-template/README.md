# generic-game-template

A reusable UI shell for small browser games: responsive topbar, footer
controls (left/right + rotate, with swipe support on touch), a score/level
sidebar, a start/pause/game-over overlay, and a keyboard-shortcuts helper —
all laid out for phone, tablet, and desktop with no page scroll.

The gameboard and any game-specific state have been stripped out. Plug your
own game into `src/game/useGameEngine.ts` (keep the same return shape —
`state`, `moveLeft`, `moveRight`, `rotate`, `hardDrop`, `start`,
`togglePause`, `newGame`) and render it inside `.board-shell` in
`src/App.tsx`, in place of `.board-shell__placeholder`.

## Develop

```
npm install
npm run dev
```

## Build

```
npm run build
```

Update `base` in `vite.config.ts` to match this repo's name before deploying
to GitHub Pages.
