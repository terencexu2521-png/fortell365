import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Loader2, ArrowLeft, Upload, Camera, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../lib/auth'
import { createWorker, type Worker } from 'tesseract.js'
import {
  TIAN_GAN,
  DI_ZHI,
  TESSERACT_OPTS,
  cropTableArea,
  cropColoredGanRowBand,
  compressImageForOcr,
  extractZhisFromLabels,
  resolveGans,
  parseGansFromOcrText,
  extractGansFromCangGan,
  extractGansFromLabels,
  extractBaziFromGanZhiLabels,
  extractBaziFromCroppedText,
  extractBaziFromTable,
  collapseCjkSpaces,
  prepareOcrTextForAi,
  extractGenderFromText,
  extractNameFromText,
  normalizeApiPillars,
  pillarsFromParts,
  pillarsFromGansZhi,
  type Pillars,
} from '@/lib/ocr'

const API_URL = 'https://fortell365-api.terencexu2521.workers.dev'

const CROP_REGIONS: [number, number][] = [[0.20, 0.55], [0.15, 0.50], [0.25, 0.60], [0.10, 0.65]]
const COLORED_GAN_BANDS: [number, number][] = [[0.18, 0.52], [0.15, 0.55], [0.22, 0.58], [0.10, 0.48]]

let ocrWorker: Worker | null = null
let ocrProgressCb: ((pct: number) => void) | null = null

async function getOcrWorker(): Promise<Worker> {
  if (!ocrWorker) {
    ocrWorker = await createWorker('chi_sim', 1, {
      ...TESSERACT_OPTS,
      logger: (info) => {
        if (info.status === 'recognizing text' && ocrProgressCb) {
          ocrProgressCb(Math.round((info.progress || 0) * 100))
        }
      },
    })
  }
  return ocrWorker
}

async function recognizeWithTesseract(input: Blob | File, onProgress?: (pct: number) => void): Promise<string> {
  ocrProgressCb = onProgress || null
  const worker = await getOcrWorker()
  const { data: { text } } = await worker.recognize(input)
  ocrProgressCb = null
  return text
}

function parseBaziString(baziStr: string): Pillars | null {
  return pillarsFromParts(baziStr.trim().split(/\s+/))
}

/** 本地 OCR：cropTableArea → Tesseract → extractBaziFromCroppedText → extractBaziFromTable */
async function tryTesseractBazi(file: Blob, onProgress: (msg: string) => void): Promise<{ bazi: Pillars | null; fullText: string }> {
  let fullText = ''
  const texts: string[] = []

  for (const [yStart, yEnd] of CROP_REGIONS) {
    onProgress(`裁剪表格区 ${Math.round(yStart * 100)}%-${Math.round(yEnd * 100)}%...`)
    const cropped = await cropTableArea(file, yStart, yEnd)
    onProgress('Tesseract 识别表格...')
    const tableText = await recognizeWithTesseract(cropped, (pct) => onProgress(`识别中 ${pct}%...`))
    fullText = tableText
    texts.push(tableText)
    console.log(`[OCR] 裁剪 ${yStart}-${yEnd} 文本:\n`, tableText)

    let baziStr = extractBaziFromGanZhiLabels(tableText)
      || extractBaziFromCroppedText(collapseCjkSpaces(tableText))
      || extractBaziFromTable(collapseCjkSpaces(tableText))
    if (baziStr) {
      const bazi = parseBaziString(baziStr)
      if (bazi) return { bazi, fullText: texts.join('\n---\n') }
    }
  }

  onProgress('Tesseract 识别全文...')
  fullText = await recognizeWithTesseract(file, (pct) => onProgress(`识别中 ${pct}%...`))
  texts.push(fullText)
  console.log('[OCR] 全文文本:\n', fullText)

  const combined = texts.join('\n---\n')
  const baziStr = extractBaziFromGanZhiLabels(fullText)
    || extractBaziFromGanZhiLabels(combined)
    || extractBaziFromCroppedText(collapseCjkSpaces(fullText))
    || extractBaziFromTable(collapseCjkSpaces(combined))
  const bazi = baziStr ? parseBaziString(baziStr) : null
  return { bazi, fullText: combined }
}

async function tryDeepSeekOcr(base64: string, ocrText: string, knownZhi?: string[] | null, knownGans?: string[] | null): Promise<{ pillars: Pillars | null; name: string; gender: 'male' | 'female' | '' }> {
  const resp = await fetch(API_URL + '/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      ocrText,
      knownZhi: knownZhi?.length === 4 ? knownZhi : undefined,
      knownGansHint: knownGans?.length === 4 ? knownGans : undefined,
    }),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    console.warn('[OCR] API 错误:', data)
    return { pillars: null, name: '', gender: '' }
  }
  const pillars = normalizeApiPillars(data.data || {})
  const genderRaw = data.data?.gender
  const gender = genderRaw === 'female' ? 'female' : genderRaw === 'male' ? 'male' : ''
  const name = data.data?.name || ''
  if (!pillars && !data.success) {
    console.warn('[OCR] AI 未解析出八字:', data.data?.raw || data)
  }
  return { pillars, name, gender }
}

const PILLARS = [
  { key: 'year', label: '年柱', hint: '如甲子' },
  { key: 'month', label: '月柱', hint: '如丙寅' },
  { key: 'day', label: '日柱', hint: '如戊辰' },
  { key: 'hour', label: '时柱', hint: '如壬戌' },
] as const

type PillarKey = typeof PILLARS[number]['key']
type FormData = Record<PillarKey, { gan: string; zhi: string }>

export default function GeneratePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 表单记忆：localStorage 自动保存，刷新不丢
  const saveForm = (data: { name?: string; gender?: string; pillars?: FormData }) => {
    try { localStorage.setItem('fortell365_draft', JSON.stringify({ name: data.name ?? name, gender: data.gender ?? gender, pillars: data.pillars ?? pillars })) } catch {}
  }

  const [step, setStep] = useState<'input' | 'ocr' | 'loading'>('input')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [pillars, setPillars] = useState<FormData>({
    year: { gan: '', zhi: '' },
    month: { gan: '', zhi: '' },
    day: { gan: '', zhi: '' },
    hour: { gan: '', zhi: '' },
  })
  const [showUpload, setShowUpload] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [ocrProcessing, setOcrProcessing] = useState(false)

  // 页面加载时恢复上次保存的表单
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fortell365_draft')
      if (saved) {
        const d = JSON.parse(saved)
        if (d.name) setName(d.name)
        if (d.gender) setGender(d.gender)
        if (d.pillars) setPillars(d.pillars)
      }
    } catch {}
  }, [])

  // 姓名/性别变更时自动保存
  const handleNameChange = (v: string) => { setName(v); saveForm({ name: v }) }
  const handleGenderChange = (v: string) => { setGender(v); saveForm({ gender: v }) }

  const updatePillar = (pillar: PillarKey, field: 'gan' | 'zhi', value: string) => {
    setPillars((prev) => {
      const next = { ...prev, [pillar]: { ...prev[pillar], [field]: value } }
      saveForm({ name, gender, pillars: next })
      return next
    })
  }

  const isBaziComplete = () => Object.values(pillars).every((p) => p.gan && p.zhi)
  const buildBaziString = () => PILLARS.map((p) => `${pillars[p.key].gan}${pillars[p.key].zhi}`).join(' ')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('图片不能超过10MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    doOcr(file)
  }

  const doOcr = async (file: File) => {
    setOcrProcessing(true)
    setStep('ocr')
    const tid = 'ocr-toast'
    const foundItems: string[] = []
    const showProgress = (msg: string) => toast.loading(msg, { id: tid })

    try {
      const { blob: compressed, dataUrl } = await compressImageForOcr(file)
      let localBazi: Pillars | null = null
      let localName = ''
      let localGender: 'male' | 'female' | '' = ''
      let ocrText = ''

      // 步骤1-3：cropTableArea → Tesseract → extractBaziFromCroppedText / extractBaziFromTable
      try {
        const local = await tryTesseractBazi(compressed, showProgress)
        ocrText = local.fullText
        localBazi = local.bazi
        localName = extractNameFromText(local.fullText)
        const g = extractGenderFromText(local.fullText)
        localGender = g || ''
        if (localBazi) {
          console.log('[OCR] ✅ 本地 Tesseract 八字:', Object.values(localBazi).map((p) => p.gan + p.zhi).join(' '))
        }
      } catch (localErr) {
        console.warn('[OCR] 本地 Tesseract 不可用（检查 public/tesseract/）:', localErr)
      }

      // 步骤3.5：彩色天干行 OCR（时间局表格第一行大字 = 天干）
      let coloredGans: string[] | null = null
      try {
        for (const [yStart, yEnd] of COLORED_GAN_BANDS) {
          const band = await cropColoredGanRowBand(compressed, yStart, yEnd)
          if (!band) continue
          showProgress('识别彩色天干行...')
          const ganText = await recognizeWithTesseract(band, (pct) => showProgress(`天干行 ${pct}%...`))
          const parsed = parseGansFromOcrText(ganText)
          if (parsed?.length === 4) {
            coloredGans = parsed
            console.log('[OCR] 彩色天干行:', coloredGans.join('、'))
            break
          }
        }
      } catch (e) {
        console.warn('[OCR] 彩色天干行识别失败:', e)
      }

      // 步骤4：提取地支行 → 优先彩色天干 / 结构天干行
      const knownZhi = extractZhisFromLabels(ocrText)
      if (knownZhi) console.log('[OCR] 地支行识别:', knownZhi.join('、'))
      const ruleGans = resolveGans(ocrText, knownZhi, coloredGans)
      const knownGans = ruleGans || extractGansFromCangGan(ocrText) || extractGansFromLabels(ocrText)
      if (knownGans) console.log('[OCR] 天干推断:', knownGans.join('、'))
      const ruleBazi = knownZhi && ruleGans ? pillarsFromGansZhi(ruleGans, knownZhi) : null
      if (ruleBazi) console.log('[OCR] ✅ 天干识别八字:', Object.values(ruleBazi).map((p) => p.gan + p.zhi).join(' '))

      showProgress(ruleBazi ? '天干识别完成...' : 'AI 解析排盘文字...')
      const aiResult = ruleBazi
        ? { pillars: ruleBazi, name: localName, gender: localGender as 'male' | 'female' | '', fromRule: true as const }
        : await tryDeepSeekOcr(dataUrl, prepareOcrTextForAi(ocrText, knownZhi, knownGans), knownZhi, knownGans)

      const finalBazi = aiResult.pillars || (knownZhi ? null : localBazi)
      const finalName = aiResult.name || localName
      const finalGender = aiResult.gender || localGender
      const usedRule = 'fromRule' in aiResult && aiResult.fromRule

      if (finalBazi) {
        setPillars(finalBazi)
        foundItems.push('八字：' + Object.values(finalBazi).map((p) => p.gan + p.zhi).join(' '))
        if (!usedRule && aiResult.pillars) foundItems.push('(AI复核)')
      }
      if (finalName) { setName(finalName); foundItems.push('姓名：' + finalName) }
      if (finalGender) { setGender(finalGender); foundItems.push('性别：' + (finalGender === 'male' ? '男' : '女')) }

      toast.dismiss(tid)
      if (foundItems.length > 0) {
        toast.success('已自动填入：' + foundItems.join('、') + '（请核对后再提交）', { duration: 4000 })
      } else {
        toast.error('未识别到八字信息，请手动填写或换一张更清晰的截图', { duration: 5000 })
      }
    } catch (err: unknown) {
      console.error('[OCR] 异常:', err)
      toast.dismiss(tid)
      toast.error('OCR识别失败，请手动填写', { duration: 4000 })
    } finally {
      setOcrProcessing(false)
      setStep('input')
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('请填写您的姓名或昵称'); return }
    if (!gender) { toast.error('请选择性别'); return }
    if (!isBaziComplete()) { toast.error('请完整填写四柱八字'); return }
    setStep('loading')
    try {
      const body = { fortuneType: 'bazi', productType: 'main', name: name.trim(), gender, baziString: buildBaziString(), pillars }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (user) headers.Authorization = 'Bearer ' + user.token
      const response = await fetch(API_URL + '/generate', { method: 'POST', headers, body: JSON.stringify(body) })
      if (!response.ok) { const errText = await response.text(); throw new Error(`生成失败 (${response.status})`) }
      const data = await response.json()
      const reportId = data?.data?.reportId
      if (reportId) {
        localStorage.setItem(`report_${reportId}`, JSON.stringify({
          fullContent: data.data.fullContent || '', reportId, fortuneType: 'bazi',
          formData: { name: name.trim(), gender, baziString: buildBaziString() }, timestamp: Date.now(),
        }))
        navigate(`/report/${reportId}`)
      } else { throw new Error('生成失败：未获取到报告ID') }
    } catch (err: any) { console.error('Submit error:', err); toast.error(err.message || '生成失败，请重试'); setStep('input') }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-amber-500 rounded-full animate-pulse" />
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-600 animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">AI 正在解析你的八字</h2>
          <p className="text-slate-500 text-sm">正在分析五行格局、十神天赋、大运走势...</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" />命理分析中，预计20-30秒...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-700"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-semibold text-slate-900">八字专业职业解读</h1>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5">
          <p className="text-sm text-indigo-700 leading-relaxed">
            <strong>两种方式填入八字：</strong><br />
            ① 上传「小巫排盘」等工具的排盘截图，AI 自动识别 👇<br />
            ② 或直接在下方表单手动填写四柱八字
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          {/* 上传区 */}
          <div className="mb-6">
            <button type="button" onClick={() => setShowUpload(!showUpload)}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed rounded-xl transition ${
                showUpload ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>
              <Camera className="w-5 h-5" />
              <span className="text-sm font-medium">{showUpload ? '收起上传区' : '📸 上传排盘截图（AI自动识别）'}</span>
            </button>

            {showUpload && (
              <div className="mt-3 space-y-3">
                <div onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                    ocrProcessing ? 'border-purple-300 bg-purple-50' : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  {ocrProcessing ? (
                    <div className="flex flex-col items-center gap-2">
                      <ScanLine className="w-8 h-8 text-purple-500 animate-pulse" />
                      <span className="text-sm text-purple-600 font-medium">AI 正在识别排盘内容...</span>
                    </div>
                  ) : uploadPreview ? (
                    <div>
                      <img src={uploadPreview} alt="排盘截图预览" className="max-h-48 mx-auto rounded-lg mb-2" />
                      <span className="text-xs text-slate-400">点击重新上传</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-slate-300" />
                      <span className="text-sm text-slate-500">点击上传排盘截图</span>
                      <span className="text-xs text-slate-400">支持小巫排盘、问真八字等工具的截图</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 text-center">上传后 AI 会自动识别姓名和八字，填入下方表单。请核对后再生成报告。</p>
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200" /><span className="text-xs text-slate-400">八字信息</span><div className="flex-1 h-px bg-slate-200" />
          </div>

          <p className="text-slate-500 text-sm mb-5">请填写你的八字信息（不需要出生日期，直接填八字即可）</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">姓名/昵称 *</label>
              <input type="text" placeholder="如何称呼您" value={name} onChange={(e) => handleNameChange(e.target.value)}
                className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">性别 *</label>
              <div className="flex gap-3">
                {[{ value: 'male', label: '男' }, { value: 'female', label: '女' }].map((g) => (
                  <button key={g.value} type="button" onClick={() => handleGenderChange(g.value)}
                    className={`flex-1 h-12 rounded-xl border transition ${
                      gender === g.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>{g.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">四柱八字 *</label>
              <div className="space-y-3">
                {PILLARS.map((pillar) => (
                  <div key={pillar.key} className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                    <div className="w-14 shrink-0 text-center">
                      <div className="text-sm font-semibold text-slate-700">{pillar.label}</div>
                      <div className="text-xs text-slate-400">{pillar.hint}</div>
                    </div>
                    <select value={pillars[pillar.key].gan} onChange={(e) => updatePillar(pillar.key, 'gan', e.target.value)}
                      className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none bg-white">
                      <option value="">天干</option>
                      {TIAN_GAN.map((g) => (<option key={g} value={g}>{g}</option>))}
                    </select>
                    <select value={pillars[pillar.key].zhi} onChange={(e) => updatePillar(pillar.key, 'zhi', e.target.value)}
                      className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none bg-white">
                      <option value="">地支</option>
                      {DI_ZHI.map((z) => (<option key={z} value={z}>{z}</option>))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 确认提示 */}
          {isBaziComplete() && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ 请确认八字无误再提交</p>
              <p className="text-xs text-amber-600">识别结果：{buildBaziString()}</p>
              <p className="text-xs text-amber-500 mt-1">一字之差解读可能偏差很大，请核对与排盘工具是否一致</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={!isBaziComplete() || !name.trim() || !gender}
            className="w-full mt-6 h-14 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed">
            生成命理报告
          </button>

          <p className="text-center text-xs text-slate-400 mt-4">
            免费预览前5模块 · 完整10模块 ¥19.90<br />
            限时免费至2026年7月31日 · 登录后可保存到账户
          </p>
        </div>
      </div>
    </div>
  )
}
