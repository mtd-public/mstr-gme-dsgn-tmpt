# tools/

Headless smoke tests (Playwright + Chromium, SwiftShader WebGL). Serve the game first, then:

```
# React starter
(cd starters/react-board-game && npm run build && python3 -m http.server 4173 --directory dist) &
BASE=http://localhost:4173/ CHROMIUM=/opt/pw-browsers/chromium node tools/smoke-react-starter.mjs

# vanilla starter
(cd starters/vanilla-three-toy && python3 -m http.server 4174) &
BASE=http://localhost:4174/ CHROMIUM=/opt/pw-browsers/chromium node tools/smoke-vanilla-starter.mjs
```

Each run prints console errors and page scroll (scrollHeight/innerHeight) per device profile, and writes
screenshots to `$OUT` (default `./shots`). Adapt the `play` actions for your own game. Leave out
`CHROMIUM` to use Playwright's own browser.
