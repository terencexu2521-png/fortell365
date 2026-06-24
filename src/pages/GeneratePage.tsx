import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Loader2, ArrowLeft, Upload, Camera, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import Tesseract from 'tesseract.js'

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const API_URL = 'https://fortell365-api.terencexu2521.workers.dev'

// 标准排盘表格格式：天干一行、地支一行，按列配对提取
function extractBaziFromTable(rawText: string): string | null {
  const G = '甲乙丙丁戊己庚辛壬癸', Z = '子丑寅卯辰巳午未申酉戌亥'
  // 方法1: 标准格式 "甲子 丙寅 戊辰 壬戌"
  const m1 = rawText.match(new RegExp(`([${G}][${Z}])\\s+([${G}][${Z}])\\s+([${G}][${Z}])\\s+([${G}][${Z}])`))
  if (m1) return [m1[1], m1[2], m1[3], m1[4]].join(' ')
  // 方法2: 无分隔 "甲子丙寅戊辰壬戌"
  const m2 = rawText.match(new RegExp(`([${G}][${Z}])([${G}][${Z}])([${G}][${Z}])([${G}][${Z}])`))
  if (m2) return [m2[1], m2[2], m2[3], m2[4]].join(' ')
  // 方法3: 表格模式——天干行和地支行分别提取后按列配对
  const compact = rawText.replace(/\s+/g, '')
  const gans: string[] = []
  const zhis: string[] = []
  for (const ch of compact) {
    if (G.includes(ch) && gans.length < 4) gans.push(ch)
    else if (Z.includes(ch) && zhis.length < 4) zhis.push(ch)
  }
  if (gans.length === 4 && zhis.length === 4) {
    return `${gans[0]}${zhis[0]} ${gans[1]}${zhis[1]} ${gans[2]}${zhis[2]} ${gans[3]}${zhis[3]}`
  }
  return null
}

// 从排盘图的OCR文本中提取姓名（"坤造 张三"或"乾造 李四"模式）
function extractNameFromText(rawText: string): string {
  // 排盘工具常见模式: "坤造 唐琦" / "乾造 张三"
  const m = rawText.match(/(?:坤造|乾造)\s*(\S{2,4})/)
  if (m) return m[1]
  // 备用: "姓名：张三" "命主：张三"
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

// 裁剪+拆分成天干行/地支行，分别OCR识别
async function cropAndSplitBaziTable(file: File): Promise<{ ganBlob: Blob; zhiBlob: Blob }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // 1. 先裁剪到表格大区（20%~55%）
      const cropY = Math.round(img.height * 0.20)
      const cropH = Math.round(img.height * 0.35)
      const fullW = img.width
      canvas.width = fullW
      canvas.height = cropH
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, cropY, fullW, cropH, 0, 0, fullW, cropH)

      // 2. 从裁剪区切出上半张（天干行）和下半张（地支行）
      // 表格第一行是表头(日期/年柱/月柱/日柱/时柱)、第二行是主星、第三行天干、第四行地支
      // 天干行大约在裁剪区的55%~72%，地支行大约在72%~90%
      const topY = Math.round(cropH * 0.50)  // 跳过表头行
      const rowH = Math.round(cropH * 0.25)  // 每行高度

      // 天干行 canvas
      const ganCanvas = document.createElement('canvas')
      ganCanvas.width = fullW
      ganCanvas.height = rowH
      const ganCtx = ganCanvas.getContext('2d')!
      ganCtx.drawImage(canvas, 0, topY, fullW, rowH, 0, 0, fullW, rowH)

      // 地支行 canvas
      const zhiCanvas = document.createElement('canvas')
      zhiCanvas.width = fullW
      zhiCanvas.height = rowH
      const zhiCtx = zhiCanvas.getContext('2d')!
      zhiCtx.drawImage(canvas, 0, topY + rowH, fullW, rowH, 0, 0, fullW, rowH)

      // 同时输出两个blob
      ganCanvas.toBlob((ganBlob) => {
        if (!ganBlob) { reject(new Error('天干行裁剪失败')); return }
        zhiCanvas.toBlob((zhiBlob) => {
          if (!zhiBlob) { reject(new Error('地支行裁剪失败')); return }
          resolve({ ganBlob, zhiBlob })
        }, 'image/png')
      }, 'image/png')
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

// 从OCR文本中提取字符（只保留合法天干或地支，去重取前4个）
function extractChars(text: string, charSet: string[]): string[] {
  const result: string[] = []
  const compact = text.replace(/\s+/g, '')
  for (const ch of compact) {
    if (charSet.includes(ch) && !result.includes(ch)) {
      result.push(ch)
      if (result.length === 4) break
    }
  }
  // 如果去重不够4个（有重复字符），允许重复
  if (result.length < 4) {
    result.length = 0
    for (const ch of compact) {
      if (charSet.includes(ch)) {
        result.push(ch)
        if (result.length === 4) break
      }
    }
  }
  return result
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
  const [step, setStep] = useState<'input' | 'ocr' | 'loading'>('input')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [pillars, setPillars] = useState<FormData>({
    year: { gan: '', zhi: '' },
    month: { gan: '', zhi: '' },
    day: { gan: '', zhi: '' },
    hour: { gan: '', zhi: '' },
  })
  // 图片上传/OCR 状态
  const [showUpload, setShowUpload] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [ocrProcessing, setOcrProcessing] = useState(false)

  const updatePillar = (pillar: PillarKey, field: 'gan' | 'zhi', value: string) => {
    setPillars((prev) => ({
      ...prev,
      [pillar]: { ...prev[pillar], [field]: value },
    }))
  }

  const isBaziComplete = () => Object.values(pillars).every((p) => p.gan && p.zhi)

  const buildBaziString = () => PILLARS.map((p) => `${pillars[p.key].gan}${pillars[p.key].zhi}`).join(' ')

  // ====== 图片上传 + OCR 识别 ======
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 文件大小限制 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片不能超过10MB')
      return
    }

    // 预览
    const reader = new FileReader()
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // OCR识别
    doOcr(file)
  }

  const doOcr = async (file: File) => {
    setOcrProcessing(true)
    setStep('ocr')
    const loadingToastId = 'ocr-loading'
    toast.loading('正在加载识别引擎...', { id: loadingToastId })

    try {
      const foundItems: string[] = []
      // 第一步：裁剪到表格区并分离天干行/地支行
      const { ganBlob, zhiBlob } = await cropAndSplitBaziTable(file)
      console.log('[OCR] 裁剪完成: ganBlob', ganBlob.size, 'zhiBlob', zhiBlob.size)

      // 第二步：分别OCR天干行和地支行（每行只含一种字符，杜绝混排）
      toast.loading('识别天干行...', { id: loadingToastId })
      const { data: { text: ganText } } = await Tesseract.recognize(ganBlob, 'chi_sim', {
        workerPath: '/tesseract/worker.min.js',
        langPath: '/tesseract',
      })
      console.log('[OCR] 天干行:', ganText)

      toast.loading('识别地支行...', { id: loadingToastId })
      const { data: { text: zhiText } } = await Tesseract.recognize(zhiBlob, 'chi_sim', {
        workerPath: '/tesseract/worker.min.js',
        langPath: '/tesseract',
      })
      console.log('[OCR] 地支行:', zhiText)
      toast.dismiss(loadingToastId)

      // 第三步：从各行提取合法字符
      const gans = extractChars(ganText, TIAN_GAN)
      const zhis = extractChars(zhiText, DI_ZHI)
      console.log('[OCR] 提取天干:', gans, '地支:', zhis)

      if (gans.length === 4 && zhis.length === 4) {
        setPillars({
          year: { gan: gans[0], zhi: zhis[0] },
          month: { gan: gans[1], zhi: zhis[1] },
          day: { gan: gans[2], zhi: zhis[2] },
          hour: { gan: gans[3], zhi: zhis[3] },
        })
        const baziStr = `${gans[0]}${zhis[0]} ${gans[1]}${zhis[1]} ${gans[2]}${zhis[2]} ${gans[3]}${zhis[3]}`
        foundItems.push('八字：' + baziStr)
        console.log('[OCR] ✅ 八字已填入:', baziStr)
      } else {
        console.warn('[OCR] ⚠️ 提取不全, 天干:', gans.length, '地支:', zhis.length)
        // 兜底：用旧的全文提取法
        const allText = ganText + ' ' + zhiText
        const fallbackBazi = extractBaziFromTable(allText)
        if (fallbackBazi) {
          const pairs = fallbackBazi.split(' ')
          if (pairs.length === 4) {
            // 手动拆分每个pair
            const parsed = pairs.map(p => {
              const chars = [...p.trim()]
              if (chars.length >= 2 && TIAN_GAN.includes(chars[0]) && DI_ZHI.includes(chars[1])) {
                return { gan: chars[0], zhi: chars[1] }
              }
              return null
            })
            if (parsed.every(p => p !== null)) {
              setPillars({
                year: { gan: parsed[0]!.gan, zhi: parsed[0]!.zhi },
                month: { gan: parsed[1]!.gan, zhi: parsed[1]!.zhi },
                day: { gan: parsed[2]!.gan, zhi: parsed[2]!.zhi },
                hour: { gan: parsed[3]!.gan, zhi: parsed[3]!.zhi },
              })
              foundItems.push('八字：' + fallbackBazi)
              console.log('[OCR] ⚠️ 兜底八字:', fallbackBazi, '(请核对)')
            }
          }
        }
        if (!foundItems.some(f => f.startsWith('八字'))) {
          toast.error('未识别到完整八字，请手动填写', { duration: 4000 })
        }
      }

      // 2. 始终用原图全文OCR提取名字和性别（这些在截图顶部，不在裁剪区）
      const { data: { text: fullText } } = await Tesseract.recognize(file, 'chi_sim', {
        workerPath: '/tesseract/worker.min.js',
        langPath: '/tesseract',
      })
      console.log('[OCR] 全文识别(姓名/性别):', fullText.substring(0, 200))

      const gender = extractGenderFromText(fullText)
      if (gender) {
        setGender(gender)
        foundItems.push('性别：' + (gender === 'male' ? '男' : '女'))
      }

      const ocrName = extractNameFromText(fullText)
      if (ocrName) {
        setName(ocrName)
        foundItems.push('姓名：' + ocrName)
      }

      // 3. 裁剪区提取失败才用全文兜底（全文有"(乙酉)属猪"等污染，仅作最后手段）
      if (!baziStr) {
        console.log('[OCR] ⚠️ 裁剪区未识别到八字，尝试全文...')
        // 全文OCR已在上一步完成，直接复用 fullText
        const fallbackBazi = extractBaziFromTable(fullText)
        if (fallbackBazi) {
          const pairs = fallbackBazi.split(' ')
          if (pairs.length === 4) {
            const parsed = pairs.map(splitBaziPair)
            if (parsed.every((p): p is {gan:string;zhi:string} => p !== null)) {
              setPillars({
                year: { gan: parsed[0].gan, zhi: parsed[0].zhi },
                month: { gan: parsed[1].gan, zhi: parsed[1].zhi },
                day: { gan: parsed[2].gan, zhi: parsed[2].zhi },
                hour: { gan: parsed[3].gan, zhi: parsed[3].zhi },
              })
              foundItems.push('八字：' + fallbackBazi)
              console.log('[OCR] ⚠️ 使用全文兜底八字(请人工核对):', fallbackBazi)
              toast.error('八字识别可能不准确，请核对', { duration: 4000 })
            }
          }
        }
        if (!foundItems.some(f => f.startsWith('八字'))) {
          toast.error('未识别到八字，请手动填写', { duration: 4000 })
        }
      }

      // 汇总
      if (foundItems.length > 0) {
        toast.success('已自动填入：' + foundItems.join('、'), { duration: 3000 })
      } else {
        toast.error('未识别到八字信息，请手动填写', { duration: 4000 })
      }

    } catch (err: any) {
      console.error('[OCR] 异常:', err)
      toast.dismiss(loadingToastId)
      const msg = err?.message || String(err)
      if (msg.includes('NetworkError') || msg.includes('Failed to fetch') || msg.includes('timeout')) {
        toast.error('识别引擎加载失败（网络问题），请手动填写', { duration: 5000 })
      } else {
        toast.error('OCR识别失败，请手动填写', { duration: 4000 })
      }
    } finally {
      setOcrProcessing(false)
      setStep('input')
    }
  }

  // ====== 生成报告 ======
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请填写您的姓名或昵称')
      return
    }
    if (!gender) {
      toast.error('请选择性别')
      return
    }
    if (!isBaziComplete()) {
      toast.error('请完整填写四柱八字（每个柱选天干+地支）')
      return
    }

    setStep('loading')

    try {
      const body = {
        fortuneType: 'bazi',
        productType: 'main',
        name: name.trim(),
        gender,
        baziString: buildBaziString(),
        pillars,
      }

      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`生成失败 (${response.status})`)
      }

      const data = await response.json()
      const reportId = data?.data?.reportId

      if (reportId) {
        localStorage.setItem(
          `report_${reportId}`,
          JSON.stringify({
            fullContent: data.data.fullContent || '',
            reportId,
            fortuneType: 'bazi',
            formData: { name: name.trim(), gender, baziString: buildBaziString() },
            timestamp: Date.now(),
          })
        )
        navigate(`/report/${reportId}`)
      } else {
        throw new Error('生成失败：未获取到报告ID')
      }
    } catch (err: any) {
      console.error('Submit error:', err)
      toast.error(err.message || '生成失败，请重试')
      setStep('input')
    }
  }

  // ====== 渲染 ======
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
            <Loader2 className="w-3 h-3 animate-spin" />
            命理分析中，预计20-30秒...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">八字专业职业解读</h1>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-xl mx-auto px-4 py-6">
        {/* 使用说明 */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5">
          <p className="text-sm text-indigo-700 leading-relaxed">
            <strong>两种方式填入八字：</strong><br />
            ① 上传「小巫排盘」等工具的排盘截图，AI 自动识别 👇<br />
            ② 或直接在下方表单手动填写四柱八字
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          {/* ====== 图片上传区域 ====== */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowUpload(!showUpload)}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed rounded-xl transition ${
                showUpload
                  ? 'border-purple-400 bg-purple-50 text-purple-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span className="text-sm font-medium">
                {showUpload ? '收起上传区' : '📸 上传排盘截图（AI自动识别）'}
              </span>
            </button>

            {showUpload && (
              <div className="mt-3 space-y-3">
                {/* 文件选择 */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                    ocrProcessing
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {ocrProcessing ? (
                    <div className="flex flex-col items-center gap-2">
                      <ScanLine className="w-8 h-8 text-purple-500 animate-pulse" />
                      <span className="text-sm text-purple-600 font-medium">AI 正在识别排盘内容...</span>
                      <span className="text-xs text-slate-400">正在提取姓名、八字四柱</span>
                    </div>
                  ) : uploadPreview ? (
                    <div>
                      <img
                        src={uploadPreview}
                        alt="排盘截图预览"
                        className="max-h-48 mx-auto rounded-lg mb-2"
                      />
                      <span className="text-xs text-slate-400">点击重新上传</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-slate-300" />
                      <span className="text-sm text-slate-500">点击上传排盘截图</span>
                      <span className="text-xs text-slate-400">
                        支持小巫排盘、问真八字等工具的截图
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 text-center">
                  上传后 AI 会自动识别姓名和八字，填入下方表单。请核对后再生成报告。
                </p>
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">八字信息</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <p className="text-slate-500 text-sm mb-5">
            请填写你的八字信息（不需要出生日期，直接填八字即可）
          </p>

          <div className="space-y-4">
            {/* 姓名 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">姓名/昵称 *</label>
              <input
                type="text"
                placeholder="如何称呼您"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
              />
            </div>

            {/* 性别 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">性别 *</label>
              <div className="flex gap-3">
                {[
                  { value: 'male', label: '男' },
                  { value: 'female', label: '女' },
                ].map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`flex-1 h-12 rounded-xl border transition ${
                      gender === g.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 四柱八字 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">四柱八字 *</label>
              <div className="space-y-3">
                {PILLARS.map((pillar) => (
                  <div key={pillar.key} className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                    <div className="w-14 shrink-0 text-center">
                      <div className="text-sm font-semibold text-slate-700">{pillar.label}</div>
                      <div className="text-xs text-slate-400">{pillar.hint}</div>
                    </div>
                    <select
                      value={pillars[pillar.key].gan}
                      onChange={(e) => updatePillar(pillar.key, 'gan', e.target.value)}
                      className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none bg-white"
                    >
                      <option value="">天干</option>
                      {TIAN_GAN.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <select
                      value={pillars[pillar.key].zhi}
                      onChange={(e) => updatePillar(pillar.key, 'zhi', e.target.value)}
                      className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none bg-white"
                    >
                      <option value="">地支</option>
                      {DI_ZHI.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={!isBaziComplete() || !name.trim() || !gender}
            className="w-full mt-6 h-14 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            免费生成完整命理报告
          </button>

          <p className="text-center text-xs text-slate-400 mt-4">
            免费查看10大模块完整命理解读
            <br />
            含：命盘分析 · 性格DNA · 五行格局 · 人生各阶段详解 · 当前运势
            <br />
            <span className="text-purple-500">专业推荐 & 职业规划 需解锁完整版</span>
          </p>
        </div>
      </div>
    </div>
  )
}
