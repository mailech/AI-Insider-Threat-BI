import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:4173'
const SHOTS = process.env.SHOTS_DIR || new URL('./screenshots/', import.meta.url).pathname
const errors = []

await import('node:fs').then((fs) => fs.mkdirSync(SHOTS, { recursive: true }))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

async function setTheme(mode) {
  await page.evaluate((m) => {
    localStorage.setItem('itbis.theme', m)
    document.documentElement.setAttribute('data-theme', m)
  }, mode)
  await page.waitForTimeout(350)
}

async function shot(name) {
  await setTheme('light')
  await page.screenshot({ path: `${SHOTS}/${name}-light.png`, fullPage: false })
  await setTheme('dark')
  await page.screenshot({ path: `${SHOTS}/${name}-dark.png`, fullPage: false })
  console.log(`  screenshots: ${name} (light + dark)`)
}

async function check(name, testFn) {
  try {
    await testFn()
    console.log(`PASS  ${name}`)
    return true
  } catch (e) {
    console.log(`FAIL  ${name}: ${e.message.split('\n')[0]}`)
    return false
  }
}

let passed = 0, total = 0
async function step(name, fn) { total++; if (await check(name, fn)) passed++ }

await step('login page renders', async () => {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Sign in', { timeout: 10000 })
  await shot('01-login')
})

await step('sign in as analyst', async () => {
  await page.fill('#email', 'analyst@itbis.io')
  await page.fill('#password', 'Analyst@12345')
  await page.click('button[type=submit]')
  await page.waitForSelector('text=Security Analyst Dashboard', { timeout: 20000 })
  await page.waitForTimeout(2500)
  await shot('02-analyst-dashboard')
})

await step('dashboard shows KPI values', async () => {
  const text = await page.textContent('body')
  if (!/Open alerts/i.test(text)) throw new Error('KPI row missing')
  if (!/Highest insider risk/i.test(text)) throw new Error('risk panel missing')
})

const PAGES = [
  ['alerts', '/alerts', 'Threat Alerts', '03-alerts'],
  ['anomalies', '/anomalies', 'Behavioural Anomalies', '04-anomalies'],
  ['investigations', '/investigations', 'Threat Investigations', '05-investigations'],
  ['employees', '/employees', 'Employees', '06-employees'],
  ['activity', '/activity', 'Activity Monitor', '07-activity'],
  ['ueba', '/ueba', 'UEBA Intelligence', '08-ueba'],
  ['analytics', '/analytics', 'Behaviour Analytics', '09-analytics'],
  ['reports', '/reports', 'Reports and Export', '10-reports'],
]

for (const [name, path, heading, file] of PAGES) {
  await step(`${name} page loads`, async () => {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await page.waitForSelector(`h1:has-text("${heading}")`, { timeout: 15000 })
    await page.waitForTimeout(1800)
    await shot(file)
  })
}

await step('open investigation detail', async () => {
  await page.goto(BASE + '/investigations', { waitUntil: 'networkidle' })
  await page.waitForSelector('a[href^="/investigations/"]', { timeout: 15000 })
  await page.click('a[href^="/investigations/"]')
  await page.waitForSelector('text=Threat timeline', { timeout: 15000 })
  await page.waitForTimeout(2000)
  await shot('11-investigation-detail')
})

await step('open employee profile', async () => {
  await page.goto(BASE + '/employees', { waitUntil: 'networkidle' })
  await page.waitForSelector('a[href^="/employees/"]', { timeout: 15000 })
  await page.click('a[href^="/employees/"]')
  await page.waitForSelector('text=Insider risk score', { timeout: 15000 })
  await page.waitForTimeout(2000)
  await shot('12-employee-overview')
  await page.click('button:has-text("Risk breakdown")')
  await page.waitForTimeout(1800)
  await shot('13-risk-breakdown')
  await page.click('button:has-text("Baseline")')
  await page.waitForTimeout(1800)
  await shot('14-baseline')
})

console.log(`\n${passed}/${total} UI checks passed`)
if (errors.length) {
  console.log('\nBrowser errors:')
  ;[...new Set(errors)].slice(0, 15).forEach((e) => console.log('  ' + e))
} else {
  console.log('No browser console errors.')
}
await browser.close()
process.exit(passed === total && errors.length === 0 ? 0 : 1)
