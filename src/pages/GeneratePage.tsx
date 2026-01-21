import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Sparkles, Loader2, ArrowLeft, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const fortuneConfig: Record<string, { name: string; needsBirth: boolean; needsQuestion: boolean; isTarot: boolean; price: number }> = {
  bazi: { name: '八字命理', needsBirth: true, needsQuestion: false, isTarot: false, price: 3990 },
  ziwei: { name: '紫微斗数', needsBirth: true, needsQuestion: false, isTarot: false, price: 3990 },
  tarot: { name: '塔罗占卜', needsBirth: false, needsQuestion: true, isTarot: true, price: 990 },
  jiugong: { name: '九宫命理', needsBirth: true, needsQuestion: true, isTarot: false, price: 990 },
}

const timeOptions = [
  { value: '', label: '不确定' },
  { value: '子时', label: '子时 (23:00-01:00)' },
  { value: '丑时', label: '丑时 (01:00-03:00)' },
  { value: '寅时', label: '寅时 (03:00-05:00)' },
  { value: '卯时', label: '卯时 (05:00-07:00)' },
  { value: '辰时', label: '辰时 (07:00-09:00)' },
  { value: '巳时', label: '巳时 (09:00-11:00)' },
  { value: '午时', label: '午时 (11:00-13:00)' },
  { value: '未时', label: '未时 (13:00-15:00)' },
  { value: '申时', label: '申时 (15:00-17:00)' },
  { value: '酉时', label: '酉时 (17:00-19:00)' },
  { value: '戌时', label: '戌时 (19:00-21:00)' },
  { value: '亥时', label: '亥时 (21:00-23:00)' },
]

const tarotExamples = [
  { category: '感情', examples: ['正在暧昧期，不确定对方心意', '刚分手想知道是否能复合', '已婚但感情遇到问题'] },
  { category: '事业', examples: ['考虑跳槽但不确定时机', '想创业但有顾虑', '升职机会该不该争取'] },
  { category: '财运', examples: ['投资决策需要指引', '副业是否值得投入', '债务问题如何解决'] },
]

export default function GeneratePage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const config = fortuneConfig[type || 'bazi']

  const [step, setStep] = useState<'input' | 'loading'>('input')
  const [showExamples, setShowExamples] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    birthTime: '',
    gender: '',
    question: '',
    background: ''
  })

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请填写您的姓名或昵称')
      return
    }
    if (config.needsBirth && !formData.birthDate) {
      toast.error('请填写出生日期')
      return
    }
    if (config.needsQuestion && !formData.question) {
      toast.error('请输入您的核心问题')
      return
    }

    setStep('loading')

    try {
      const response = await fetch('https://rkqutqsdnlbuhgvondrh.supabase.co/functions/v1/generate-fortune', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrcXV0cXNkbmxidWhndm9uZHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzE0NDQsImV4cCI6MjA4MzAwNzQ0NH0._-Jn-WxsSwauwhxhg35Z1B3Im_VxAMSQ4YBvEic3QWM'
        },
        body: JSON.stringify({
          fortuneType: type,
          productType: config.needsBirth ? 'main' : 'instant',
          ...formData
        })
      })

      if (!response.ok) throw new Error('生成失败')
      const data = await response.json()
      const reportId = data?.data?.reportId

      if (reportId) {
        localStorage.setItem(`report_${reportId}`, JSON.stringify({
          ...data.data,
          type,
          formData,
          timestamp: Date.now()
        }))
        navigate(`/report/${reportId}`)
      } else {
        throw new Error('生成失败')
      }
    } catch (err: any) {
      toast.error(err.message || '生成失败，请重试')
      setStep('input')
    }
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
          <h2 className="text-xl font-bold text-slate-900 mb-2">AI 正在解析</h2>
          <p className="text-slate-500 text-sm">请稍候，正在生成专属报告...</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            {config.isTarot ? '抽牌解读中...' : '排盘计算中...'}
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
          <h1 className="text-lg font-semibold text-slate-900">{config.name}</h1>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-sm mb-5">请填写测算所需信息</p>

          <div className="space-y-4">
            {/* 姓名 - 所有类型都需要 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">姓名/昵称 *</label>
              <input
                type="text"
                placeholder="如何称呼您"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
              />
            </div>

            {config.needsBirth && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">出生日期 *</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">出生时辰</label>
                  <select
                    value={formData.birthTime}
                    onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
                    className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none bg-white"
                  >
                    {timeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">性别</label>
                  <div className="flex gap-3">
                    {['male', 'female'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: g })}
                        className={`flex-1 h-12 rounded-xl border transition ${
                          formData.gender === g
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {g === 'male' ? '男' : '女'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 塔罗占卜特殊表单 */}
            {config.isTarot && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">核心问题 *</label>
                    <button 
                      type="button"
                      onClick={() => setShowExamples(!showExamples)}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      {showExamples ? '收起示例' : '查看示例'}
                    </button>
                  </div>
                  <textarea
                    placeholder="例如：我和他/她现在是暧昧关系，想知道能否发展成正式恋人..."
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none resize-none"
                  />
                  
                  {showExamples && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-2">问题示例（点击可快速填入）：</p>
                      {tarotExamples.map((cat) => (
                        <div key={cat.category} className="mb-2">
                          <span className="text-xs font-medium text-slate-600">{cat.category}：</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {cat.examples.map((ex, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setFormData({ ...formData, question: ex })}
                                className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-full hover:border-purple-300 hover:text-purple-600 transition"
                              >
                                {ex}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">当前事件背景</label>
                  <textarea
                    placeholder="补充说明当前的具体情况，帮助更精准解读（选填）&#10;例如：认识3个月，对方最近联系变少了..."
                    value={formData.background}
                    onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none resize-none"
                  />
                </div>
              </>
            )}

            {/* 非塔罗的问题输入 */}
            {config.needsQuestion && !config.isTarot && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">想问的问题</label>
                <textarea
                  placeholder="请描述您想要咨询的问题..."
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none resize-none"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full mt-6 h-14 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition"
          >
            免费生成预览报告
          </button>

          <p className="text-center text-xs text-slate-400 mt-4">
            免费生成预览报告，了解核心趋势
          </p>
        </div>
      </div>
    </div>
  )
}
