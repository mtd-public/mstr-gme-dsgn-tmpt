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
const base = process.env.BASE || 'http://localhost:4173/'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
async function run(name, ctxOpts, url, act) {
  const ctx = await browser.newContext(ctxOpts)
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(url)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/${name}-title.png` })
  if (act) await act(page)
  await page.screenshot({ path: `${OUT}/${name}-play.png` })
  const scroll = await page.evaluate(() => [document.documentElement.scrollHeight, innerHeight, document.documentElement.scrollWidth, innerWidth])
  console.log(name, 'errors:', errors.length ? errors : 'none', 'scrollH/innerH/scrollW/innerW', scroll)
  await ctx.close()
}
const play = async (page) => {
  await page.getByRole('button', { name: 'Start' }).click()
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight')
    await page.keyboard.press('Space')
    await page.waitForTimeout(350)
  }
}
await run('phone', { ...devices['iPhone 13'] }, base, async (page) => {
  await page.getByRole('button', { name: 'Start' }).tap()
  const box = await page.locator('.board-shell').boundingBox()
  for (let i = 0; i < 6; i++) {
    await page.touchscreen.tap(box.x + (i % 2 ? box.width * 0.2 : box.width * 0.8), box.y + box.height * 0.4)
    await page.locator('.action-tap').tap()
    await page.waitForTimeout(400)
  }
})
await run('desktop', { viewport: { width: 1280, height: 800 } }, base, play)
await run('desktop3d', { viewport: { width: 1280, height: 800 } }, base + '?renderer=3d', play)
await run('tablet-land', { ...devices['iPad (gen 7) landscape'] }, base, null)
await run('phone-land', { ...devices['iPhone 13 landscape'] }, base, null)
await browser.close()
