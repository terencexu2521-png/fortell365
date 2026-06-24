import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle, Save, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth, API } from '../lib/auth'

// 限时免费截止日期
const FREE_DEADLINE = new Date('2026-07-30T23:59:59+08:00')
const PRICE = 1990 // ¥19.90
const FREE_PREVIEW_LINES = 60 // 免费预览行数（约3个模块）

interface ReportData {
  reportId: string
  fullContent: string
  fortuneType: string
  formData?: { name: string; gender: string; baziString: string }
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [wechatId, setWechatId] = useState('')
  const [wechatSubmitted, setWechatSubmitted] = useState(false)
  const [isFreePeriod] = useState(() => new Date() < FREE_DEADLINE)
  const [paid, setPaid] = useState(false)
  const [savedToCloud, setSavedToCloud] = useState(false)

  // 清理输出的 prompt 泄露内容
  const cleanContent = (content: string) => {
    return content
      .replace(/🔒\s*【死约束[^】]*】[\s\S]*?(?=## 模块一)/g, '')
      .replace(/---\s*\n\s*🔒.*$/gm, '')
      .replace(/【.*?死约束.*?】[\s\S]*$/g, '')
      .replace(/---\s*\n\s*> ⚠️.*$/g, '')
      .trim()
  }

  useEffect(() => {
    if (!id) return
    const cached = localStorage.getItem(`report_${id}`)
    if (cached) {
      try {
        const data = JSON.parse(cached)
        data.fullContent = cleanContent(data.fullContent)
        setReport(data)
        if (data.paid || (isFreePeriod && data.wechatId)) { setPaid(true); setWechatSubmitted(true) }
        if (data.wechatId) setWechatId(data.wechatId)
      } catch { console.error('Failed to parse report') }
    }
    setLoading(false)
  }, [id])

  // 登录用户自动保存报告
  useEffect(() => {
    if (!report || !user || savedToCloud) return
    if (!paid) return
    const save = async () => {
      try {
        await fetch(API + '/reports', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
          body: JSON.stringify({ reportId: report.reportId, name: report.formData?.name || '', gender: report.formData?.gender || '', baziString: report.formData?.baziString || '', content: report.fullContent })
        })
        setSavedToCloud(true)
      } catch {}
    }
    save()
  }, [report, user, paid])

  const submitWechat = () => {
    const trimmed = wechatId.trim()
    if (!trimmed) { toast.error('请输入您的微信号'); return }
    setWechatSubmitted(true)
    if (isFreePeriod || paid) {
      const updated = { ...report!, wechatId: trimmed, paid: true }
      localStorage.setItem(`report_${id}`, JSON.stringify(updated))
      setReport(updated)
      setPaid(true)
      toast.success('限时免费！完整报告已解锁')
    }
  }

  const handlePay = () => {
    const trimmed = wechatId.trim()
    if (!trimmed) { toast.error('请先输入微信号'); return }
    setPaid(true)
    const updated = { ...report!, wechatId: trimmed, paid: true }
    localStorage.setItem(`report_${id}`, JSON.stringify(updated))
    setReport(updated)
    toast.success('解锁成功！')
  }

  // 免费预览：前60行（约3个模块）
  const getDisplayContent = () => {
    if (!report?.fullContent) return ''
    if (paid || isFreePeriod) return report.fullContent
    const lines = report.fullContent.split('\n')
    if (lines.length <= FREE_PREVIEW_LINES) return report.fullContent
    return lines.slice(0, FREE_PREVIEW_LINES).join('\n')
        + '\n\n> *…以上为免费预览（前3个模块）。完整10模块报告需 ¥19.90 解锁（限时免费至2026年7月30日）*'
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
      if (line.startsWith('```'))
        return null
      if (line.trim())
        return <p key={i} className="text-slate-600 leading-relaxed my-1.5 text-sm">{line.replace(/\*\*/g, '')}</p>
      return <div key={i} className="h-2" />
    })
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
  if (!report) return <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4"><div className="text-center"><h2 className="text-xl font-semibold text-slate-900 mb-2">报告不存在</h2><Link to="/" className="text-purple-600 hover:underline">返回首页</Link></div></div>

  const isUnlocked = paid || isFreePeriod

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-700"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="text-lg font-semibold text-slate-900">八字命理报告</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && !savedToCloud && isUnlocked && (
              <button onClick={handlePay} className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"><Save className="w-4 h-4 inline mr-1" />保存</button>
            )}
            {!user && <Link to="/login" className="text-xs text-slate-400 hover:text-purple-600">登录保存</Link>}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 md:p-6">
            {isUnlocked ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium mb-4">
                <CheckCircle className="w-3.5 h-3.5" />完整报告
              </div>
            ) : (
              <div className="inline-block px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium mb-4">免费预览版</div>
            )}

            {report.formData && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg flex items-center gap-3 text-sm">
                <span className="text-purple-600 font-medium">{report.formData.name}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">{report.formData.gender === 'male' ? '男' : '女'}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-mono">{report.formData.baziString}</span>
              </div>
            )}

            <article>{renderContent(getDisplayContent())}</article>
          </div>

          {/* 付费墙 */}
          {!isUnlocked && (
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent to-white" />
              <div className="bg-white pt-4 pb-8 px-5 text-center border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-1">解锁完整10模块报告</h3>
                <p className="text-sm text-slate-500 mb-3">¥19.90 · 限时免费至2026年7月30日</p>

                {/* 限时免费 */}
                {isFreePeriod && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm text-green-700 font-medium">🎉 当前限时免费</p>
                    <p className="text-xs text-green-600 mt-1">输入微信号即可解锁全部10模块完整报告</p>
                  </div>
                )}

                {/* 微信输入 */}
                <div className="max-w-xs mx-auto space-y-3">
                  <input type="text" value={wechatId} onChange={e => setWechatId(e.target.value)} placeholder="请输入您的微信号"
                    className="w-full h-12 px-4 border border-slate-200 rounded-xl text-sm text-center focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none" />

                  {/* 付费期显示支付宝 */}
                  {!isFreePeriod && wechatId.trim() && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-sm font-medium text-slate-700 mb-3">支付 ¥19.90 解锁完整报告</p>
                      <div className="bg-white inline-block p-3 rounded-xl mb-2">
                        <QRCodeSVG value={`https://fortell365.com/pay?report=${id}&u=${wechatId.trim()}`} size={160} />
                      </div>
                      <p className="text-xs text-slate-400">手机长按二维码 → 识别 → 支付宝支付</p>
                      <button onClick={handlePay}
                        className="w-full mt-3 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                        已完成支付，解锁报告
                      </button>
                    </div>
                  )}

                  <button onClick={submitWechat} disabled={!wechatId.trim()}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25">
                    {isFreePeriod ? '免费解锁完整报告' : '确认微信号'}
                  </button>
                  {!isFreePeriod && !wechatId.trim() && (
                    <p className="text-xs text-slate-400">先输入微信号，再扫码支付 ¥19.90</p>
                  )}
                </div>
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
