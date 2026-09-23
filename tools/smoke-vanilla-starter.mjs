// Headless smoke test: loads the game at several device profiles, plays a few
// seconds, screenshots, and reports console errors + page-scroll (must be none).
// Usage: serve the game first, then  BASE=http://localhost:4173/ node tools/<this>.mjs
// Needs playwright (npm i -g playwright, or the preinstalled one) and Chromium.
// On cloud containers Chromium is at /opt/pw-browsers/chromium (CHROMIUM env var).
import { execSync } from 'node:child_process'
import { join } from 'node:path'
// Local install first, then the global one (ESM ignores NODE_PATH).
const pw = await import('playwright').catch(() =>
  import(join(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs')),
)
const { chromium, devices } = pw
import { mkdirSync } from 'node:fs'
const OUT = process.env.OUT || 'shots'
mkdirSync(OUT, { recursive: true })
const base = process.env.BASE || 'http://localhost:4174/'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
async function run(name, ctxOpts, act) {
  const ctx = await browser.newContext(ctxOpts)
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(base)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/v-${name}-title.png` })
  await act(page)
  await page.screenshot({ path: `${OUT}/v-${name}-play.png` })
  const st = await page.evaluate(() => ({ mode: GAME.state.mode, gems: GAME.state.gems, time: GAME.state.time.toFixed(1), x: GAME.P.x.toFixed(1), z: GAME.P.z.toFixed(1) }))
  console.log(name, 'errors:', errors.length ? errors : 'none', st)
  await ctx.close()
}
await run('desktop', { viewport: { width: 1280, height: 800 } }, async (page) => {
  await page.click('#start-btn')
  await page.keyboard.down('w'); await page.keyboard.down('Shift')
  await page.waitForTimeout(1200)
  await page.keyboard.up('w'); await page.keyboard.down('d')
  await page.waitForTimeout(900)
  await page.keyboard.up('d'); await page.keyboard.up('Shift')
  // drag the floating stick with the mouse (pointer events cover mouse + touch)
  await page.mouse.move(200, 600); await page.mouse.down(); await page.mouse.move(200, 520, { steps: 5 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/v-desktop-stick.png` })
  await page.mouse.up()
})
await run('phone', { ...devices['iPhone 13'] }, async (page) => {
  await page.tap('#start-btn')
  await page.waitForTimeout(1500)
  await page.tap('#pause-btn')
  await page.waitForTimeout(300)
})
await browser.close()
