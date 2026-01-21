import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { Lock, ArrowLeft, Loader2, Share2, CheckCircle, X, Bell, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

const fortuneNames: Record<string, string> = {
  ziwei: '紫微斗数',
  bazi: '八字命理',
  tarot: '塔罗占卜',
  jiugong: '九宫命理'
}

const fortunePrices: Record<string, number> = {
  ziwei: 3990,
  bazi: 3990,
  tarot: 990,
  jiugong: 990
}

interface ReportData {
  reportId: string
  freeContent: string
  paidContent?: string
  price: number
  fortuneType: string
  isPaid?: boolean
}

const SUPABASE_URL = 'https://rkqutqsdnlbuhgvondrh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrcXV0cXNkbmxidWhndm9uZHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzE0NDQsImV4cCI6MjA4MzAwNzQ0NH0._-Jn-WxsSwauwhxhg35Z1B3Im_VxAMSQ4YBvEic3QWM'

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBetaModal, setShowBetaModal] = useState(false)
  const [contactInput, setContactInput] = useState('')
  const [contactSubmitted, setContactSubmitted] = useState(false)

  useEffect(() => {
    const loadReport = async () => {
      if (!id) return

      const isPaidParam = searchParams.get('paid') === '1'
      const isMockPay = searchParams.get('mock_pay') === '1'
      const isTestUnlock = searchParams.get('test_unlock') === '1'
      
      if (isPaidParam || isMockPay || isTestUnlock) {
        toast.success('解锁成功！正在加载完整报告...')
        localStorage.removeItem(`report_${id}`)
        
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/fortune_reports?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_paid: true })
          })
        } catch (err) {
          console.error('Failed to update status')
        }
      }

      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/fortune_reports?id=eq.${id}&select=*`, {
          headers: { 'apikey': SUPABASE_ANON_KEY }
        })
        const data = await response.json()
        if (data?.[0]) {
          const fortuneType = data[0].fortune_type
          setReport({
            reportId: data[0].id,
            freeContent: data[0].free_content,
            paidContent: data[0].paid_content,
            price: fortunePrices[fortuneType] || data[0].price,
            fortuneType,
            isPaid: data[0].is_paid
          })
        }
      } catch (err) {
        console.error('Failed to load report')
        const cached = localStorage.getItem(`report_${id}`)
        if (cached) {
          setReport(JSON.parse(cached))
        }
      }
      setLoading(false)
    }

    loadReport()
  }, [id, searchParams])

  // 记录付费意愿点击
  const recordPaymentIntent = async () => {
    if (!report) return
    
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/payment_intent_clicks`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          fortune_type: report.fortuneType,
          report_type: 'main_report',
          page_source: 'report_page',
          is_logged_in: false,
          price: report.price,
          report_id: report.reportId,
          user_agent: navigator.userAgent
        })
      })
    } catch (err) {
      console.error('Failed to record click')
    }
  }

  // 提交联系方式
  const submitContact = async () => {
    if (!contactInput.trim() || !report) return
    
    const isEmail = contactInput.includes('@')
    
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/payment_intent_clicks`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          fortune_type: report.fortuneType,
          report_type: 'contact_submit',
          page_source: 'report_page',
          is_logged_in: false,
          price: report.price,
          report_id: report.reportId,
          contact_type: isEmail ? 'email' : 'wechat',
          contact_value: contactInput.trim(),
          user_agent: navigator.userAgent
        })
      })
      setContactSubmitted(true)
      toast.success('已记录，开放后将第一时间通知您')
    } catch (err) {
      toast.error('提交失败，请重试')
    }
  }

  // 点击解锁按钮
  const handleUnlockClick = async () => {
    await recordPaymentIntent()
    setShowBetaModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">报告不存在</h2>
          <Link to="/" className="text-purple-600 hover:underline">返回首页</Link>
        </div>
      </div>
    )
  }

  const typeName = fortuneNames[report.fortuneType] || '命理分析'
  const priceYuan = (report.price / 100).toFixed(1)
  const displayContent = report.isPaid ? report.paidContent : report.freeContent

  const renderContent = (content: string | undefined) => {
    if (!content) return null
    return content.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-bold text-slate-900 mt-6 mb-3 first:mt-0 border-l-4 border-purple-500 pl-3">{line.replace('## ', '')}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-semibold text-slate-800 mt-5 mb-2">{line.replace('### ', '')}</h3>
      }
      if (line.startsWith('#### ')) {
        return <h4 key={i} className="text-base font-semibold text-slate-700 mt-4 mb-2">{line.replace('#### ', '')}</h4>
      }
      if (line.startsWith('**【') && line.includes('】**')) {
        return <h4 key={i} className="text-base font-bold text-purple-700 mt-5 mb-2">{line.replace(/\*\*/g, '')}</h4>
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="text-slate-600 ml-4 my-1">{line.replace('- ', '')}</li>
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-slate-800 my-2">{line.replace(/\*\*/g, '')}</p>
      }
      if (line.match(/^\d+\.\s\*\*/)) {
        return <p key={i} className="font-medium text-slate-700 mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>
      }
      if (line.trim()) {
        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        return (
          <p key={i} className="text-slate-600 leading-relaxed my-2">
            {parts.map((part, j) => 
              part.startsWith('**') && part.endsWith('**') 
                ? <strong key={j} className="text-slate-800">{part.replace(/\*\*/g, '')}</strong>
                : part
            )}
          </p>
        )
      }
      return null
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">{typeName}</h1>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 md:p-6">
            {report.isPaid ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium mb-4">
                <CheckCircle className="w-3.5 h-3.5" />
                完整版
              </div>
            ) : (
              <div className="inline-block px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium mb-4">
                预览版 · 免费
              </div>
            )}

            <article className="prose prose-slate max-w-none">
              {renderContent(displayContent)}
            </article>
          </div>

          {/* Paywall - only show if not paid */}
          {!report.isPaid && (
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent to-white" />
              <div className="bg-white pt-6 pb-8 px-5 text-center border-t border-slate-100">
                <div className="inline-block p-3 bg-purple-100 rounded-full mb-4">
                  <Lock className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">解锁完整命理分析报告</h3>
                <div className="text-slate-500 text-sm mb-4 space-y-1">
                  <p>• 命理结构完整拆解</p>
                  <p>• 事业 / 感情 / 财运多维分析</p>
                  <p>• 趋势判断与决策建议</p>
                </div>
                <div className="text-3xl font-bold text-purple-600 mb-1">¥{priceYuan}</div>
                <p className="text-xs text-slate-400 mb-5">一次购买，永久可查看</p>
                
                <div className="max-w-xs mx-auto">
                  <button
                    onClick={handleUnlockClick}
                    className="w-full px-8 py-3.5 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold hover:opacity-90 transition shadow-lg shadow-purple-500/25"
                  >
                    解锁完整报告
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Try again */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-purple-600 text-sm hover:underline">
            再测一次
          </Link>
        </div>
      </div>

      {/* Beta Modal */}
      {showBetaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowBetaModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <div className="inline-block p-3 bg-purple-100 rounded-full mb-4">
                <Bell className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">完整报告即将开放</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                当前完整报告功能仍在内测阶段，我们正在根据用户反馈完善系统稳定性。
              </p>
              <p className="text-slate-500 text-sm mb-5">
                你刚才的点击已经被记录，这将帮助我们优先开放你感兴趣的内容。
              </p>

              {!contactSubmitted ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={contactInput}
                      onChange={(e) => setContactInput(e.target.value)}
                      placeholder="邮箱或微信号（选填）"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    onClick={submitContact}
                    disabled={!contactInput.trim()}
                    className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    通知我开放
                  </button>
                  <button
                    onClick={() => setShowBetaModal(false)}
                    className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-sm"
                  >
                    我知道了
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">已记录，感谢支持！</span>
                  </div>
                  <button
                    onClick={() => setShowBetaModal(false)}
                    className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
                  >
                    我知道了
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
