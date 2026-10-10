// Screenshots every view at desktop and mobile widths using the locally installed Chrome.
// Usage: node scripts/capture.mjs [base-url]   (dev server must be running)
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const OUT = '.impeccable/review'
mkdirSync(OUT, { recursive: true })

const spike = 'market=Lahore&crop=Green%20Chilli&date=2024-12-14'
const shots = [
  ['snapshot', '/snapshot'],
  ['snapshot-watch', `/snapshot?${spike}`],
  ['forecast', '/forecast'],
  ['forecast-alert', `/forecast?${spike}`],
  ['time-machine', '/time-machine'],
  ['time-machine-result', `/time-machine?${spike}&travel=2024-12-14`],
  ['alerts', '/alerts'],
  ['analytics', '/analytics'],
  ['analytics-crops', '/analytics', 'Between crops'],
  ['analytics-drivers', '/analytics', "Today's drivers"],
  ['performance', '/performance'],
]
const viewports = { d: { width: 1440, height: 900 }, m: { width: 390, height: 844, isMobile: true, hasTouch: true } }

const browser = await chromium.launch({ channel: 'chrome' })
const errors = []
for (const [prefix, viewport] of Object.entries(viewports)) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`))
  for (const [name, path, tab] of shots) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    if (tab) await page.getByRole('radio', { name: tab }).click()
    await page.waitForFunction(() => !document.querySelector('[role="status"]'), null, { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT}/${prefix}-${name}.png`, fullPage: true })
    if (name === 'snapshot') await page.screenshot({ path: `${OUT}/${prefix === 'd' ? 'desktop' : 'mobile'}.png`, fullPage: true })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 0) errors.push(`${prefix}-${name}: horizontal overflow ${overflow}px`)
  }
  await context.close()
}
await browser.close()
console.log(errors.length ? errors.join('\n') : 'no errors, no overflow')
