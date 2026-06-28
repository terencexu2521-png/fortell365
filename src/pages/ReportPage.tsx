import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth, API } from '../lib/auth'
import { cleanReportContent, getDisplayContent } from '../lib/reportContent'

const ALIPAY_QR = '/pay/alipay-qr.png'

interface ReportData {
  reportId: string
  fullContent: string
  fortuneType: string
  formData?: { name: string; gender: string; baziString: string }
  isUnlocked?: boolean
  unlockType?: string | null
}

interface PricingConfig {
  priceYuan: string
  isFreePeriod: boolean
  freeDeadline: string
  alipayQrUrl: string
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pricing, setPricing] = useState<PricingConfig | null>(null)
  const [paying, setPaying] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [showLoginHint, setShowLoginHint] = useState(false)

  const loadReport = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (user) headers.Authorization = 'Bearer ' + user.token

      const endpoint = user ? `${API}/reports/${id}` : `${API}/report/${id}`
      const resp = await fetch(endpoint, { headers })
      const data = await resp.json()

      if (data.success && data.data) {
        const d = data.data
        setPricing({
          priceYuan: d.priceYuan || '19.90',
          isFreePeriod: !!d.isFreePeriod,
          freeDeadline: d.freeDeadline || '',
          alipayQrUrl: d.alipayQrUrl || ALIPAY_QR,
        })
        const full = cleanReportContent(d.fullContent || d.content || '')
        const unlocked = !!d.isUnlocked
        setIsUnlocked(unlocked)
        setReport({
          reportId: d.reportId || id,
          fullContent: full,
          fortuneType: 'bazi',
          formData: {
            name: d.name || '',
            gender: d.gender || '',
            baziString: d.baziString || '',
          },
          isUnlocked: unlocked,
          unlockType: d.unlockType,
        })
        localStorage.setItem(`report_${id}`, JSON.stringify({
          fullContent: full, reportId: id, fortuneType: 'bazi',
          formData: { name: d.name, gender: d.gender, baziString: d.baziString },
          isUnlocked: unlocked, unlockType: d.unlockType, timestamp: Date.now(),
        }))
        return
      }
    } catch { /* fallback to cache */ }

    const cached = localStorage.getItem(`report_${id}`)
    if (cached) {
      try {
        const data = JSON.parse(cached)
        data.fullContent = cleanReportContent(data.fullContent || '')
        setReport(data)
        setIsUnlocked(!!data.isUnlocked)
      } catch { /* ignore */ }
    }
    setLoading(false)
  }, [id, user])

  useEffect(() => { loadReport().finally(() => setLoading(false)) }, [loadReport])

  useEffect(() => {
    if (!user || !id) return
    fetch(`${API}/reports/${id}/claim`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + user.token },
    }).catch(() => {})
  }, [user, id])

  useEffect(() => {
    fetch(API + '/config/pricing')
      .then(r => r.json())
      .then(d => { if (d.success) setPricing(d.data) })
      .catch(() => {})
  }, [])

  const syncUnlockToAccount = async (unlockType: string, oid?: string) => {
    if (!user || !report) return
    try {
      await fetch(API + '/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
        body: JSON.stringify({
          reportId: report.reportId,
          name: report.formData?.name || '',
          gender: report.formData?.gender || '',
          baziString: report.formData?.baziString || '',
          content: report.fullContent,
          isUnlocked: true,
          unlockType,
          orderId: oid || null,
        }),
      })
    } catch { /* silent */ }
  }

  const handleFreeUnlock = async () => {
    if (!id) return
    try {
      const resp = await fetch(`${API}/report/${id}/unlock-free`, { method: 'POST' })
      const data = await resp.json()
      if (!resp.ok || !data.success) throw new Error(data.error || '解锁失败')
      setIsUnlocked(true)
      setReport(r => r ? { ...r, isUnlocked: true, unlockType: 'free_promo' } : r)
      localStorage.setItem(`report_${id}`, JSON.stringify({
        ...JSON.parse(localStorage.getItem(`report_${id}`) || '{}'),
        isUnlocked: true, unlockType: 'free_promo',
      }))
      await syncUnlockToAccount('free_promo')
      if (!user) setShowLoginHint(true)
      toast.success('限时免费！完整报告已解锁')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '解锁失败')
    }
  }

  const handleStartPay = async () => {
    if (!id || !report) return
    setPaying(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (user) headers.Authorization = 'Bearer ' + user.token
      const resp = await fetch(API + '/orders/create', {
        method: 'POST', headers,
        body: JSON.stringify({ reportId: id }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) throw new Error(data.error || '创建订单失败')
      if (data.data.alreadyUnlocked) {
        setIsUnlocked(true)
        toast.success('报告已解锁')
        return
      }
      setOrderId(data.data.orderId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '创建订单失败')
    } finally {
      setPaying(false)
    }
  }

  const handleConfirmPaid = async () => {
    if (!id || !orderId) return
    try {
      const resp = await fetch(`${API}/orders/${orderId}/confirm-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: id }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) throw new Error(data.error || '确认失败')
      setIsUnlocked(true)
      setReport(r => r ? { ...r, isUnlocked: true, unlockType: 'paid' } : r)
      await syncUnlockToAccount('paid', orderId)
      if (!user) setShowLoginHint(true)
      toast.success('解锁成功！')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '确认失败')
    }
  }

  const renderContent = (content: string | undefined) => {
    if (!content) return null
    return content.split('\n').map((line, i) => {
      if (line.match(/^## 模块[一二三四五六七八九十\d]+/))
        return <h2 key={i} className="text-xl font-bold text-slate-900 mt-6 mb-3 border-l-4 border-purple-500 pl-3 py-1">{line.replace(/^## /, '')}</h2>
      if (line.startsWith('### '))
        return <h3 key={i} className={`text-base font-semibold mt-5 mb-2 ${line.includes('专业分析') ? 'text-amber-700' : line.includes('白话解读') ? 'text-purple-700' : 'text-slate-800'}`}>{line.replace('### ', '')}</h3>
      if (line.startsWith('> '))
        return <blockquote key={i} className="border-l-4 border-amber-400 bg-amber-50 px-3 py-2 my-2 text-sm text-slate-500 italic rounded-r-lg">{line.replace(/^> /, '')}</blockquote>
      if (line.startsWith('```')) return null
      if (line.trim())
        return <p key={i} className="text-slate-600 leading-relaxed my-1.5 text-sm">{line.replace(/\*\*/g, '')}</p>
      return <div key={i} className="h-2" />
    })
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
  if (!report) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">报告不存在</h2>
        <Link to="/" className="text-purple-600 hover:underline">返回首页</Link>
      </div>
    </div>
  )

  const displayContent = getDisplayContent(report.fullContent, isUnlocked)
  const isFreePeriod = pricing?.isFreePeriod ?? false
  const qrUrl = pricing?.alipayQrUrl || ALIPAY_QR

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-700"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="text-lg font-semibold text-slate-900">职业探索报告</h1>
          </div>
          {!user && (
            <Link to="/login" className="text-xs text-purple-600 hover:text-purple-700">登录保存</Link>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {showLoginHint && !user && (
          <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
            <p className="text-sm text-indigo-700">报告已解锁！登录后可保存到账户，换设备也能查看。</p>
            <Link to="/login" className="shrink-0 text-sm font-medium text-white bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700">去登录</Link>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 md:p-6">
            {isUnlocked ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium mb-4">
                <CheckCircle className="w-3.5 h-3.5" />完整报告
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium mb-4">
                <Lock className="w-3.5 h-3.5" />免费预览（前5模块）
              </div>
            )}

            {report.formData && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg flex items-center gap-3 text-sm flex-wrap">
                <span className="text-purple-600 font-medium">{report.formData.name}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">{report.formData.gender === 'male' ? '男' : '女'}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-mono">{report.formData.baziString}</span>
              </div>
            )}

            <article>{renderContent(displayContent)}</article>
          </div>

          {!isUnlocked && (
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent to-white pointer-events-none" />
              <div className="bg-white pt-4 pb-8 px-5 text-center border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-1">解锁后 5 模块（模块 6–10）</h3>
                <p className="text-sm text-slate-500 mb-4">
                  ¥{pricing?.priceYuan || '19.90'} · 支付宝扫码支付
                  {isFreePeriod && ' · 或限时免费解锁全部（至2026年7月31日）'}
                </p>

                {isFreePeriod ? (
                  <button onClick={handleFreeUnlock}
                    className="w-full max-w-xs mx-auto py-3 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold hover:opacity-90 shadow-lg shadow-purple-500/25">
                    免费解锁完整报告
                  </button>
                ) : (
                  <div className="max-w-xs mx-auto space-y-3">
                    {!orderId ? (
                      <button onClick={handleStartPay} disabled={paying}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
                        {paying ? '准备中…' : '支付 ¥19.90 解锁'}
                      </button>
                    ) : (
                      <>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <p className="text-sm font-medium text-slate-700 mb-3">请支付宝扫码支付 ¥19.90</p>
                          <img src={qrUrl.startsWith('http') ? qrUrl : ALIPAY_QR} alt="支付宝收款码"
                            className="w-44 h-auto mx-auto rounded-lg mb-2" />
                          <p className="text-xs text-slate-400">打开支付宝 → 扫一扫 → 支付 ¥19.90</p>
                        </div>
                        <button onClick={handleConfirmPaid}
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold hover:opacity-90">
                          我已完成支付，解锁报告
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/generate" className="text-purple-600 text-sm hover:underline">再测一个八字</Link>
          {user && <><span className="text-slate-300 mx-2">|</span><Link to="/reports" className="text-purple-600 text-sm hover:underline">我的报告</Link></>}
        </div>
      </div>
    </div>
  )
}
