import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth, API } from '../lib/auth'
import { computePaipan } from '@/lib/paipan'
import {
  provinces,
  getProvince,
  getCity,
  getDistrict,
  getLongitude,
  formatBirthPlace,
} from '@/lib/regions'

const FORM_STORAGE_KEY = 'fortell365_generate_form'

type Step = 'form' | 'confirm' | 'loading'

export default function GeneratePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar')
  const [date, setDate] = useState('1990-01-01')
  const [time, setTime] = useState('08:30')
  const [provinceIndex, setProvinceIndex] = useState(4)
  const [cityIndex, setCityIndex] = useState(0)
  const [districtIndex, setDistrictIndex] = useState(0)
  const [paipanResult, setPaipanResult] = useState<ReturnType<typeof computePaipan> | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(FORM_STORAGE_KEY)
    if (!raw) return
    try {
      const saved = JSON.parse(raw)
      if (saved.name) setName(saved.name)
      if (saved.gender) setGender(saved.gender)
      if (saved.calendarType) setCalendarType(saved.calendarType)
      if (saved.date) setDate(saved.date)
      if (saved.time) setTime(saved.time)
      if (typeof saved.provinceIndex === 'number') setProvinceIndex(saved.provinceIndex)
      if (typeof saved.cityIndex === 'number') setCityIndex(saved.cityIndex)
      if (typeof saved.districtIndex === 'number') setDistrictIndex(saved.districtIndex)
      if (saved.paipanResult) {
        setPaipanResult(saved.paipanResult)
        setStep('confirm')
      }
      sessionStorage.removeItem(FORM_STORAGE_KEY)
    } catch { /* ignore */ }
  }, [])

  const saveFormForLogin = () => {
    sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({
      name, gender, calendarType, date, time,
      provinceIndex, cityIndex, districtIndex, paipanResult,
    }))
  }

  const cities = getProvince(provinceIndex).cities
  const districts = getCity(provinceIndex, cityIndex).districts

  const syncRegion = (pIdx: number, cIdx: number, dIdx: number) => {
    setProvinceIndex(pIdx)
    setCityIndex(cIdx)
    setDistrictIndex(dIdx)
  }

  const handlePaipan = () => {
    if (!name.trim()) {
      toast.error('请填写姓名')
      return
    }
    if (!gender) {
      toast.error('请选择性别')
      return
    }
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    const longitude = getLongitude(provinceIndex, cityIndex, districtIndex)
    try {
      const result = computePaipan({
        calendarType,
        year,
        month,
        day,
        hour,
        minute,
        longitude,
      })
      setPaipanResult(result)
      setStep('confirm')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '排盘失败')
    }
  }

  const handleGenerate = async () => {
    if (!paipanResult) return
    if (!user) {
      saveFormForLogin()
      toast('请先登录后再生成报告', { icon: '🔐' })
      navigate('/login?redirect=/generate')
      return
    }
    setStep('loading')
    try {
      const body = {
        fortuneType: 'bazi',
        productType: 'main',
        name: name.trim(),
        gender,
        baziString: paipanResult.baziString,
        channel: 'web',
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + user.token,
      }
      const response = await fetch(API + '/generate', { method: 'POST', headers, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok || !data?.success) throw new Error(data?.error || `生成失败 (${response.status})`)
      const reportId = data.data.reportId
      localStorage.setItem(
        `report_${reportId}`,
        JSON.stringify({
          fullContent: data.data.fullContent || '',
          reportId,
          fortuneType: 'bazi',
          formData: { name: name.trim(), gender, baziString: paipanResult.baziString },
          isUnlocked: false,
          timestamp: Date.now(),
        }),
      )
      await fetch(`${API}/reports/${reportId}/claim`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + user.token },
      }).catch(() => {})
      navigate(`/report/${reportId}`)
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : '生成失败，请重试')
      setStep('confirm')
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
          <h2 className="text-xl font-bold text-slate-900 mb-2">AI 正在生成探索报告</h2>
          <p className="text-slate-500 text-sm">预计 20–30 秒，请稍候…</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" />分析中
          </div>
        </div>
      </div>
    )
  }

  if (step === 'confirm' && paipanResult) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
            <button type="button" onClick={() => setStep('form')} className="p-2 -ml-2 text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900">确认四柱信息</h1>
          </div>
        </header>
        <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">姓名 · 性别</p>
            <p className="text-lg font-semibold text-slate-900">{name} · {gender === 'female' ? '女' : '男'}</p>
            <p className="text-sm text-slate-500 mt-4 mb-1">出生时间 · 地点</p>
            <p className="text-slate-800">{date} {time}</p>
            <p className="text-slate-600 text-sm">{formatBirthPlace(provinceIndex, cityIndex, districtIndex)}</p>
            <p className="text-xs text-purple-600 mt-2">{paipanResult.solarTimeNote}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
            <p className="text-sm font-medium text-indigo-800 mb-3">四柱信息</p>
            <p className="text-2xl font-bold text-center tracking-widest text-indigo-900">{paipanResult.baziString}</p>
            <div className="grid grid-cols-4 gap-2 mt-4 text-center text-sm">
              {paipanResult.pillars.map((p) => (
                <div key={p.name} className="bg-white/80 rounded-lg py-2">
                  <div className="text-xs text-slate-500">{p.name}</div>
                  <div className="font-semibold">{p.label}</div>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold text-lg"
          >
            {user ? '确认并生成报告' : '登录后生成报告'}
          </button>
          {!user && (
            <p className="text-center text-sm text-slate-500">
              需先 <Link to="/login?redirect=/generate" onClick={saveFormForLogin} className="text-purple-600 hover:underline">登录</Link>
              {' '}或{' '}
              <Link to="/register?redirect=/generate" onClick={saveFormForLogin} className="text-purple-600 hover:underline">注册</Link>
              ，报告将保存到账户
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">填写出生信息</h1>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5">
          <p className="text-sm text-indigo-700 leading-relaxed">
            请填写个人信息，系统根据数据库自动排盘生成四柱
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">姓名 *</label>
            <input
              type="text"
              placeholder="请输入姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
            />
          </div>

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
                    gender === g.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">历法</label>
            <div className="flex gap-3">
              {[
                { value: 'solar', label: '公历' },
                { value: 'lunar', label: '农历' },
              ].map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCalendarType(c.value as 'solar' | 'lunar')}
                  className={`flex-1 h-11 rounded-xl border text-sm ${
                    calendarType === c.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">出生日期 *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-12 px-3 border border-slate-200 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">出生时间 *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-12 px-3 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">出生地点 *</label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={provinceIndex}
                onChange={(e) => syncRegion(Number(e.target.value), 0, 0)}
                className="h-11 px-2 border border-slate-200 rounded-lg text-sm"
              >
                {provinces.map((p, i) => (
                  <option key={p.name} value={i}>{p.name}</option>
                ))}
              </select>
              <select
                value={cityIndex}
                onChange={(e) => syncRegion(provinceIndex, Number(e.target.value), 0)}
                className="h-11 px-2 border border-slate-200 rounded-lg text-sm"
              >
                {cities.map((c, i) => (
                  <option key={c.name} value={i}>{c.name}</option>
                ))}
              </select>
              <select
                value={districtIndex}
                onChange={(e) => setDistrictIndex(Number(e.target.value))}
                className="h-11 px-2 border border-slate-200 rounded-lg text-sm"
              >
                {districts.map((d, i) => (
                  <option key={d.name} value={i}>{d.name}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400 mt-2">经度 {getLongitude(provinceIndex, cityIndex, districtIndex)}°（用于真太阳时）</p>
          </div>

          <button
            type="button"
            onClick={handlePaipan}
            className="w-full mt-2 h-14 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold text-lg"
          >
            计算四柱
          </button>

          <p className="text-center text-xs text-slate-400">
            免费预览前 5 模块 · 后 5 模块付费解锁 · 登录后自动保存
          </p>
        </div>
      </div>
    </div>
  )
}
