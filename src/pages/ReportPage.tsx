import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Share2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const PRICE = 990 // ¥9.90

interface ReportData {
  reportId: string
  fullContent: string
  price: number
  fortuneType: string
  formData?: { name: string; gender: string; baziString: string }
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  // 微信号 + 限时免费状态
  const [wechatId, setWechatId] = useState('')
  const [wechatSubmitted, setWechatSubmitted] = useState(false)
  const [viewingFull, setViewingFull] = useState(false)
  // 只展示前1000字作为预览，提交微信号后看完整
  const PREVIEW_LEN = 1000

  useEffect(() => {
    const loadReport = () => {
      if (!id) return
      const cached = localStorage.getItem(`report_${id}`)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          setReport(data)
          // 如果之前提交过微信号，恢复状态
          if (data.wechatId) {
            setWechatId(data.wechatId)
            setWechatSubmitted(true)
            setViewingFull(true)
          }
        } catch {
          console.error('Failed to parse cached report')
        }
      }
      setLoading(false)
    }
    loadReport()
  }, [id, searchParams])

  // 提交微信号解锁完整报告
  const submitWechat = () => {
    const trimmed = wechatId.trim()
    if (!trimmed) {
      toast.error('请输入您的微信号')
      return
    }
    setWechatSubmitted(true)
    setViewingFull(true)

    // 保存到 localStorage 持久化
    if (report) {
      const updated = { ...report, wechatId: trimmed }
      localStorage.setItem(`report_${id}`, JSON.stringify(updated))
      setReport(updated)
    }
    toast.success('已解锁完整报告！')
  }

  // 获取显示内容：已提交微信号→全部，否则→前半部分预览
  const getDisplayContent = () => {
    if (!report?.fullContent) return ''
    if (viewingFull) return report.fullContent
    return report.fullContent.substring(0, PREVIEW_LEN) + '\n\n> *…以上为预览内容，留下微信号可解锁完整八字专业职业解读（限时免费）*'
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
          <Link to="/" className="text-purple-600 hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const displayContent = getDisplayContent()

  // Markdown 渲染器
  const renderContent = (content: string | undefined) => {
    if (!content) return null
    return content.split('\n').map((line, i) => {
      // 处理引用
      if (line.startsWith('> ')) {
        return (
          <blockquote key={i} className="border-l-4 border-amber-400 bg-amber-50 px-3 py-1 my-2 text-sm text-slate-500 italic">
            {line.replace('> ', '').replace(/\*/g, '')}
          </blockquote>
        )
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={i} className="text-xl font-bold text-slate-900 mt-6 mb-3 first:mt-0 border-l-4 border-purple-500 pl-3">
            {line.replace('## ', '')}
          </h2>
        )
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={i} className="text-lg font-semibold text-slate-800 mt-5 mb-2">
            {line.replace('### ', '')}
          </h3>
        )
      }
      if (line.startsWith('#### ')) {
        return (
          <h4 key={i} className="text-base font-semibold text-slate-700 mt-4 mb-2">
            {line.replace('#### ', '')}
          </h4>
        )
      }
      if (line.startsWith('**【') && line.includes('】**')) {
        return (
          <h4 key={i} className="text-base font-bold text-purple-700 mt-5 mb-2">
            {line.replace(/\*\*/g, '')}
          </h4>
        )
      }
      if (line.startsWith('- ')) {
        return (
          <li key={i} className="text-slate-600 ml-4 my-1">
            {line.replace('- ', '')}
          </li>
        )
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={i} className="font-semibold text-slate-800 my-2">
            {line.replace(/\*\*/g, '')}
          </p>
        )
      }
      if (line.match(/^\d+\.\s\*\*/)) {
        return (
          <p key={i} className="font-medium text-slate-700 mt-3 mb-1">
            {line.replace(/\*\*/g, '')}
          </p>
        )
      }
      if (line.trim()) {
        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        return (
          <p key={i} className="text-slate-600 leading-relaxed my-2">
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j} className="text-slate-800">
                  {part.replace(/\*\*/g, '')}
                </strong>
              ) : (
                part
              )
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
            <h1 className="text-lg font-semibold text-slate-900">八字专业职业解读</h1>
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
            {viewingFull ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium mb-4">
                <CheckCircle className="w-3.5 h-3.5" />
                完整报告
              </div>
            ) : (
              <div className="inline-block px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium mb-4">
                预览版 · 限时免费
              </div>
            )}

            <article className="prose prose-slate max-w-none">
              {renderContent(displayContent)}
            </article>
          </div>

          {/* 微信号输入区 — 仅未提交时显示 */}
          {!viewingFull && (
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent to-white" />
              <div className="bg-white pt-4 pb-8 px-5 text-center border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  完整报告限时免费查看
                </h3>
                <p className="text-slate-500 text-sm mb-4">
                  留下微信号，立即解锁完整八字专业职业解读
                  <br />
                  <span className="text-xs text-slate-400">
                    包含：五行→专业推荐 · 十神→职业天赋 · 大运→职业规划
                  </span>
                </p>

                <div className="max-w-xs mx-auto space-y-3">
                  <input
                    type="text"
                    value={wechatId}
                    onChange={(e) => setWechatId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitWechat()}
                    placeholder="请输入您的微信号"
                    className="w-full h-12 px-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none text-center"
                  />
                  <button
                    onClick={submitWechat}
                    disabled={!wechatId.trim()}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
                  >
                    解锁完整报告（限时免费）
                  </button>
                  <p className="text-xs text-slate-400">
                    完整报告 ¥9.90 · 当前内测限时免费
                  </p>
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
    </div>
  )
}
