import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

// 天干和地支选项
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const API_URL = 'https://fortell365-api.terencexu2521.workers.dev/generate'

// 四柱名称
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
  const [step, setStep] = useState<'input' | 'loading'>('input')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [pillars, setPillars] = useState<FormData>({
    year: { gan: '', zhi: '' },
    month: { gan: '', zhi: '' },
    day: { gan: '', zhi: '' },
    hour: { gan: '', zhi: '' },
  })

  // 更新四柱
  const updatePillar = (pillar: PillarKey, field: 'gan' | 'zhi', value: string) => {
    setPillars((prev) => ({
      ...prev,
      [pillar]: { ...prev[pillar], [field]: value },
    }))
  }

  // 校验所有八字是否填写完整
  const isBaziComplete = () => {
    return Object.values(pillars).every((p) => p.gan && p.zhi)
  }

  // 将四柱拼接为字符串
  const buildBaziString = () => {
    return PILLARS.map((p) => `${pillars[p.key].gan}${pillars[p.key].zhi}`).join(' ')
  }

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
      // 构建请求体
      const body = {
        fortuneType: 'bazi',
        productType: 'main',
        name: name.trim(),
        gender,
        baziString: buildBaziString(),
        pillars,
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('API error:', response.status, errText)
        throw new Error(`生成失败 (${response.status})`)
      }

      const data = await response.json()
      const reportId = data?.data?.reportId

      if (reportId) {
        // 缓存报告数据到 localStorage
        localStorage.setItem(
          `report_${reportId}`,
          JSON.stringify({
            fullContent: data.data.fullContent || data.data.freeContent || '',
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

  // 加载页面
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
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            AI 正在解析你的八字
          </h2>
          <p className="text-slate-500 text-sm">
            正在分析五行格局、十神天赋、大运走势...
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            命理分析中...
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
            <strong>📋 需要先有八字？</strong> 去「小巫排盘」或其他八字 App
            输入你的出生年月日时，获取<strong>四柱八字</strong>（年柱、月柱、日柱、时柱，每柱各一个天干+地支），然后填到下方表单即可。
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-sm mb-5">
            请填写你的八字信息（不需要出生日期，直接填八字即可）
          </p>

          <div className="space-y-4">
            {/* 姓名 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                姓名/昵称 *
              </label>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                性别 *
              </label>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                四柱八字 *
              </label>
              <div className="space-y-3">
                {PILLARS.map((pillar) => (
                  <div
                    key={pillar.key}
                    className="flex items-center gap-2 bg-slate-50 rounded-xl p-3"
                  >
                    {/* 柱名标签 */}
                    <div className="w-14 shrink-0 text-center">
                      <div className="text-sm font-semibold text-slate-700">
                        {pillar.label}
                      </div>
                      <div className="text-xs text-slate-400">{pillar.hint}</div>
                    </div>

                    {/* 天干下拉 */}
                    <select
                      value={pillars[pillar.key].gan}
                      onChange={(e) =>
                        updatePillar(pillar.key, 'gan', e.target.value)
                      }
                      className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none bg-white"
                    >
                      <option value="">天干</option>
                      {TIAN_GAN.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>

                    {/* 地支下拉 */}
                    <select
                      value={pillars[pillar.key].zhi}
                      onChange={(e) =>
                        updatePillar(pillar.key, 'zhi', e.target.value)
                      }
                      className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none bg-white"
                    >
                      <option value="">地支</option>
                      {DI_ZHI.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
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
            免费生成完整报告
          </button>

          <p className="text-center text-xs text-slate-400 mt-4">
            限时免费查看完整八字专业职业解读
            <br />
            包含：命盘分析 · 性格DNA · 大运回顾 · 专业推荐 · 职业规划 ¥9.90
          </p>
        </div>
      </div>
    </div>
  )
}
