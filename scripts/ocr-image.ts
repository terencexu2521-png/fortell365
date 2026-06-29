import { createWorker } from 'tesseract.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { extractZhisFromLabels, inferGansFromShiShenRow, extractGansFromLineAboveZhi, extractGansFromLabels, extractShiShenRow, pillarsFromGansZhi } from '../src/lib/ocr.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const img = path.join(root, 'IMG_0954.PNG')

async function main() {
  const worker = await createWorker('chi_sim', 1, {
    workerPath: path.join(root, 'public/tesseract/worker.min.js'),
    corePath: path.join(root, 'public/tesseract/tesseract-core-simd-lstm.wasm.js'),
    langPath: path.join(root, 'public/tesseract'),
  })
  const { data: { text } } = await worker.recognize(img)
  await worker.terminate()
  console.log('=== OCR TEXT ===')
  console.log(text)
  const zhi = extractZhisFromLabels(text)
  const row = extractShiShenRow(text)
  const above = extractGansFromLineAboveZhi(text)
  const labels = extractGansFromLabels(text)
  const gans = inferGansFromShiShenRow(text, zhi)
  const bazi = zhi && gans ? pillarsFromGansZhi(gans, zhi) : null
  console.log('zhi:', zhi?.join(''))
  console.log('row:', row)
  console.log('aboveZhi:', above?.join(''))
  console.log('labelGans:', labels?.join(''))
  console.log('gans:', gans?.join(''))
  console.log('bazi:', bazi ? Object.values(bazi).map(p => p.gan + p.zhi).join(' ') : 'FAIL')
}
main()
