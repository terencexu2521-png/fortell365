/**
 * Copy / download Tesseract.js offline assets into public/tesseract/.
 * Run automatically via npm postinstall, or manually: node scripts/setup-tesseract.mjs
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWriteStream } from 'node:fs'
import { get } from 'node:https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dest = join(root, 'public/tesseract')
const nm = join(root, 'node_modules')

mkdirSync(dest, { recursive: true })

function copyIfExists(src, name) {
  if (!existsSync(src)) return false
  cpSync(src, join(dest, name))
  console.log('[tesseract] copied', name)
  return true
}

// Prefer local node_modules after npm install
copyIfExists(join(nm, 'tesseract.js/dist/worker.min.js'), 'worker.min.js')

const coreFiles = [
  'tesseract-core.wasm.js',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core.wasm',
  'tesseract-core-simd.wasm',
  'tesseract-core-lstm.wasm',
  'tesseract-core-simd-lstm.wasm',
]
for (const f of coreFiles) {
  copyIfExists(join(nm, 'tesseract.js-core', f), f)
}

copyIfExists(join(nm, '@tesseract.js-data/chi_sim/4.0.0/chi_sim.traineddata.gz'), 'chi_sim.traineddata.gz')

function download(url, outPath) {
  return new Promise((resolve, reject) => {
    if (existsSync(outPath)) {
      resolve(false)
      return
    }
    const file = createWriteStream(outPath)
    get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        console.log('[tesseract] downloaded', outPath.split('/').pop())
        resolve(true)
      })
    }).on('error', reject)
  })
}

const CDN = 'https://cdn.jsdelivr.net/npm'
const TESSDATA = 'https://tessdata.projectnaptha.com/4.0.0'

const remote = [
  [`${CDN}/tesseract.js@5.1.1/dist/worker.min.js`, 'worker.min.js'],
  [`${CDN}/tesseract.js-core@5.1.1/tesseract-core.wasm.js`, 'tesseract-core.wasm.js'],
  [`${CDN}/tesseract.js-core@5.1.1/tesseract-core-simd.wasm.js`, 'tesseract-core-simd.wasm.js'],
  [`${CDN}/tesseract.js-core@5.1.1/tesseract-core-lstm.wasm.js`, 'tesseract-core-lstm.wasm.js'],
  [`${CDN}/tesseract.js-core@5.1.1/tesseract-core-simd-lstm.wasm.js`, 'tesseract-core-simd-lstm.wasm.js'],
  [`${CDN}/tesseract.js-core@5.1.1/tesseract-core.wasm`, 'tesseract-core.wasm'],
  [`${CDN}/tesseract.js-core@5.1.1/tesseract-core-simd.wasm`, 'tesseract-core-simd.wasm'],
  [`${CDN}/tesseract.js-core@5.1.1/tesseract-core-lstm.wasm`, 'tesseract-core-lstm.wasm'],
  [`${CDN}/tesseract.js-core@5.1.1/tesseract-core-simd-lstm.wasm`, 'tesseract-core-simd-lstm.wasm'],
  [`${TESSDATA}/chi_sim.traineddata.gz`, 'chi_sim.traineddata.gz'],
]

for (const [url, name] of remote) {
  await download(url, join(dest, name))
}

console.log('[tesseract] setup complete → public/tesseract/')
