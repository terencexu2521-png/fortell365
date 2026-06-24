import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Loader2, ArrowLeft, Upload, Camera, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import Tesseract from 'tesseract.js'

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const API_URL = 'https://fortell365-api.terencexu2521.workers.dev'
const TESSERACT_OPTIONS = {
  workerPath: '/tesseract/worker.min.js',
  corePath: '/tesseract',
  langPath: '/tesseract',
}

// 从排盘图的OCR文本中提取姓名（"坤造 张三"或"乾造 李四"模式）
function extractNameFromText(rawText: string): string {
  const m = rawText.match(/(?:坤造|乾造)\s*(\S{2,4})/)
  if (m) return m[1]
  for (const p of [/姓名[：:]\s*(\S{2,4})/, /命主[：:]\s*(\S{2,4})/]) {
    const mm = rawText.match(p)
    if (mm) return mm[1]
  }
  return ''
}

// 从排盘图OCR文本识别性别（"坤造"=女, "乾造"=男）
function extractGenderFromText(rawText: string): 'male' | 'female' | null {
  if (/坤造/.test(rawText)) return 'female'
  if (/乾造/.test(rawText)) return 'male'
  if (/女|female|♀/.test(rawText)) return 'female'
  if (/男|male|♂/.test(rawText)) return 'male'
  return null
}

// 从裁剪区OCR文本中，找"含最多天干的行"和"含最多地支行"，分别提取后按列配对
function extractBaziFromCroppedText(text: string): string | null {
  const G = '甲乙丙丁戊己庚辛壬癸', Z = '子丑寅卯辰巳午未申酉戌亥'
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  // 找天干最多的一行（天干数据行）和地支最多的一行（地支数据行）
  let bestGan = '', bestZhi = '', maxG = 0, maxZ = 0
  for (const line of lines) {
    let gc = 0, zc = 0
    const compact = line.replace(/\s+/g, '')
    for (const ch of compact) { if (G.includes(ch)) gc++; if (Z.includes(ch)) zc++ }
    if (gc > maxG) { maxG = gc; bestGan = line }
    if (zc > maxZ) { maxZ = zc; bestZhi = line }
  }

  if (maxG < 2 || maxZ < 2) return null

  // 从这两行分别提取字符
  const gans: string[] = [], zhis: string[] = []
  const gc = bestGan.replace(/\s+/g, ''), zc = bestZhi.replace(/\s+/g, '')
  for (const ch of gc) { if (G.includes(ch) && gans.length < 4) gans.push(ch) }
  for (const ch of zc) { if (Z.includes(ch) && zhis.length < 4) zhis.push(ch) }

  if (gans.length === 4 && zhis.length === 4) {
    return `${gans[0]}${zhis[0]} ${gans[1]}${zhis[1]} ${gans[2]}${zhis[2]} ${gans[3]}${zhis[3]}`
  }
  return null
}

// Canvas裁剪：从图片切出八字表格区（25%~55%），转Blob供Tesseract识别
async function cropTableArea(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const W = img.width, H = img.height
      const cropY = Math.round(H * 0.25), cropH = Math.round(H * 0.30)
      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = cropH
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, cropY, W, cropH, 0, 0, W, cropH)
      canvas.toBlob(b => { if (b) resolve(b); else reject(new Error('裁剪失败')) }, 'image/png')
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
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

    try {
      // 步骤1：裁剪到表格区(25%~55%)，Tesseract识别 → 按行提取天干地支
      toast.loading('正在裁剪表格区域...', { id: tid })
      const cropped = await cropTableArea(file)
      console.log('[OCR] 裁剪完成, size:', cropped.size)

      toast.loading('正在识别八字表格...', { id: tid })
      const { data: { text: tableText } } = await Tesseract.recognize(cropped, 'chi_sim', {
        ...TESSERACT_OPTIONS,
        logger: (info) => {
          if (info.status === 'recognizing text') {
            toast.loading(`识别中 ${Math.round((info.progress||0)*100)}%...`, { id: tid })
          }
        },
      })
      console.log('[OCR] 表格区文本:\n', tableText)

      const baziStr = extractBaziFromCroppedText(tableText)
      if (baziStr) {
        const parts = baziStr.split(' ')
        if (parts.length === 4) {
          setPillars({
            year: { gan: parts[0][0], zhi: parts[0][1] },
            month: { gan: parts[1][0], zhi: parts[1][1] },
            day: { gan: parts[2][0], zhi: parts[2][1] },
            hour: { gan: parts[3][0], zhi: parts[3][1] },
          })
          foundItems.push('八字：' + baziStr)
          console.log('[OCR] ✅ 八字:', baziStr)
        }
      }

      // 步骤2：全文OCR提取姓名和性别
      toast.loading('提取姓名性别...', { id: tid })
      const { data: { text: fullText } } = await Tesseract.recognize(file, 'chi_sim', {
        ...TESSERACT_OPTIONS,
      })
      const g = extractGenderFromText(fullText)
      if (g) { setGender(g); foundItems.push('性别：' + (g === 'male' ? '男' : '女')) }
      const n = extractNameFromText(fullText)
      if (n) { setName(n); foundItems.push('姓名：' + n) }

      // 步骤3：Tesseract失败则DeepSeek Vision兜底
      if (!baziStr) {
        console.log('[OCR] Tesseract失败，DeepSeek兜底...')
        toast.loading('AI 复核中...', { id: tid })
        const base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file) })
        const resp = await fetch(API_URL + '/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64 }) })
        const data = await resp.json()
        if (resp.ok && data.success && data.data?.pillars?.length === 4) {
          const p = data.data.pillars
          setPillars({ year: p[0], month: p[1], day: p[2], hour: p[3] })
          foundItems.push('八字：' + data.data.baziString)
          console.log('[OCR] DeepSeek兜底:', data.data.baziString)
        }
      }

      toast.dismiss(tid)
      if (foundItems.length > 0) {
        toast.success('已自动填入：' + foundItems.join('、'), { duration: 3000 })
      } else {
        toast.error('未识别到八字信息，请手动填写', { duration: 4000 })
      }
    } catch (err: any) {
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
      const response = await fetch(API_URL + '/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
            免费生成完整命理报告
          </button>

          <p className="text-center text-xs text-slate-400 mt-4">
            免费查看10大模块完整命理解读<br />
            含：命盘分析 · 性格DNA · 五行格局 · 人生各阶段详解 · 当前运势<br />
            <span className="text-purple-500">专业推荐 & 职业规划 需解锁完整版</span>
          </p>
        </div>
      </div>
    </div>
  )
}
