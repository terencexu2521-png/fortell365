import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const cases = [
  { file: 'IMG_0948.PNG', expect: '乙丑 己卯 甲寅 辛未', name: '张煜' },
  { file: '22060.PNG', expect: '辛丑 辛卯 壬申 丁未', name: '许为杰' },
  { file: 'IMG_0950.PNG', expect: '戊午 丙辰 丙寅 甲午', name: '樊博' },
]

async function runCase(page, { file, expect, name }) {
  await page.goto('https://fortell365.com/generate?e2e=1', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /上传排盘截图/ }).click()
  await page.locator('input[type="file"]').setInputFiles(path.join(root, file))

  await page.waitForFunction(() => {
    const sels = [...document.querySelectorAll('select')]
    return sels.length >= 8 && sels.every((s) => s.value && s.value !== '天干' && s.value !== '地支')
  }, { timeout: 120000 })

  const vals = await page.locator('select').evaluateAll((els) => els.map((e) => e.value))
  const gans = [vals[0], vals[2], vals[4], vals[6]]
  const zhis = [vals[1], vals[3], vals[5], vals[7]]
  const got = gans.map((g, i) => g + zhis[i]).join(' ')
  const ok = got === expect
  console.log(`${name}: ${ok ? '✅' : '❌'} ${got}${ok ? '' : ` (expected ${expect})`}`)
  return ok
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.on('console', (msg) => {
  if (msg.text().includes('[OCR]')) console.log('  log:', msg.text())
})

let allOk = true
for (const c of cases) {
  if (!(await runCase(page, c))) allOk = false
}
await browser.close()
process.exit(allOk ? 0 : 1)
