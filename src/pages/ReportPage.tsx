import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Share2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface ReportData {
  reportId: string
  fullContent: string
  fortuneType: string
  formData?: { name: string; gender: string; baziString: string }
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [wechatId, setWechatId] = useState('')
  const [wechatSubmitted, setWechatSubmitted] = useState(false)
  const [viewingFull, setViewingFull] = useState(false)
  // v3: 免费版内容大幅扩展，预览也相应增加
  const PREVIEW_LEN = 3000

  useEffect(() => {
    const loadReport = () => {
      if (!id) return
      const cached = localStorage.getItem(`report_${id}`)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          setReport(data)
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
  }, [id])

  const submitWechat = () => {
    const trimmed = wechatId.trim()
    if (!trimmed) {
      toast.error('请输入您的微信号')
      return
    }
    setWechatSubmitted(true)
    setViewingFull(true)

    if (report) {
      const updated = { ...report, wechatId: trimmed }
      localStorage.setItem(`report_${id}`, JSON.stringify(updated))
      setReport(updated)
    }
    toast.success('已解锁完整报告！')
  }

  const getDisplayContent = () => {
    if (!report?.fullContent) return ''
    if (viewingFull) return report.fullContent

    // v3: 免费版显示更多内容（前3000字），让用户看到足够有价值的命理分析
    const freeContent = report.fullContent.substring(0, PREVIEW_LEN)

    // 尝试在模块边界截断（在最后一个完整的"模块X"之后截断）
    const moduleMatches = [...freeContent.matchAll(/## 模块/g)]
    if (moduleMatches.length >= 5) {
      // 至少有5个模块，在最后一个完整模块后截断更自然
      const lastModuleEnd = moduleMatches[moduleMatches.length - 1].index
      if (lastModuleEnd > 1000) {
        return freeContent.substring(0, lastModuleEnd) +
          '\n\n> *…以上为前几个模块的免费预览。免费版实际包含全部10个模块的完整解读。留下微信号即可查看完整报告，包括：人生各阶段详解、当前运势详判、天赋领域分析等。*'
      }
    }

    return freeContent + '\n\n> *…以上为免费预览。留下微信号即可解锁全部10个模块的完整命理报告（限时免费）*'
  }

  // ====== v3 Markdown 渲染器：支持专业分析/通俗版结构 ======
  const renderContent = (content: string | undefined) => {
    if (!content) return null
    const lines = content.split('\n')
    const elements: JSX.Element[] = []

    // 跟踪是否在表格/代码块中
    let inCodeBlock = false
    let codeBlockLines: string[] = []
    let codeBlockStart = 0

    const flushCodeBlock = () => {
      if (codeBlockLines.length > 0) {
        elements.push(
          <div key={`code-${codeBlockStart}`} className="my-3 overflow-x-auto">
            <pre className="bg-slate-100 rounded-lg p-3 text-xs leading-relaxed text-slate-700 font-mono">
              {codeBlockLines.join('\n')}
            </pre>
          </div>
        )
        codeBlockLines = []
      }
      inCodeBlock = false
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 代码块处理
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock()
        } else {
          flushCodeBlock() // 先flush之前的
          inCodeBlock = true
          codeBlockStart = i
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockLines.push(line)
        continue
      }

      // 空行
      if (!line.trim()) {
        elements.push(<div key={i} className="h-2" />)
        continue
      }

      // 模块标题 ## 模块X：
      if (line.match(/^## 模块[一二三四五六七八九十\d]+/)) {
        elements.push(
          <h2 key={i} className="text-xl font-bold text-slate-900 mt-6 mb-3 border-l-4 border-purple-500 pl-3 py-1">
            {line.replace(/^## /, '')}
          </h2>
        )
        continue
      }

      // 二级标题 ### XXXX
      if (line.startsWith('### ')) {
        const title = line.replace('### ', '')
        const isPro = title.includes('专业分析')
        const isPopular = title.includes('通俗版')
        elements.push(
          <h3 key={i} className={`text-base font-semibold mt-5 mb-2 ${isPro ? 'text-amber-700' : isPopular ? 'text-purple-700' : 'text-slate-800'}`}>
            {title}
          </h3>
        )
        continue
      }

      // 四级标题 #### XXXX
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={i} className="text-sm font-semibold text-slate-700 mt-4 mb-2">{line.replace('#### ', '')}</h4>
        )
        continue
      }

      // 引用
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={i} className="border-l-4 border-amber-400 bg-amber-50 px-3 py-2 my-2 text-sm text-slate-500 italic rounded-r-lg">
            {line.replace(/^> /, '').replace(/\*/g, '')}
          </blockquote>
        )
        continue
      }

      // 粗体加数字的列表项
      if (line.match(/^\*\*\d+\./)) {
        elements.push(
          <p key={i} className="font-semibold text-slate-800 mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>
        )
        continue
      }

      // 列表项
      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={i} className="text-slate-600 ml-4 my-1 text-sm">{line.replace(/^[-*] /, '')}</li>
        )
        continue
      }

      // 数字列表
      if (line.match(/^\d+\.\s/)) {
        elements.push(
          <p key={i} className="text-slate-600 ml-2 my-1 text-sm">{line}</p>
        )
        continue
      }

      // 粗体整行
      if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <p key={i} className="font-semibold text-slate-800 my-2">{line.replace(/\*\*/g, '')}</p>
        )
        continue
      }

      // 普通行——处理行内粗体
      if (line.trim()) {
        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        elements.push(
          <p key={i} className="text-slate-600 leading-relaxed my-1.5 text-sm">
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j} className="text-slate-800">{part.replace(/\*\*/g, '')}</strong>
              ) : (
                part
              )
            )}
          </p>
        )
      }
    }

    // 最后flush
    flushCodeBlock()

    return elements
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

  const displayContent = getDisplayContent()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">八字命理报告</h1>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600" onClick={() => toast.success('已复制链接')}>
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
                免费预览版
              </div>
            )}

            {/* v3: 用户信息概览 */}
            {report.formData && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg flex items-center gap-3 text-sm">
                <span className="text-purple-600 font-medium">{report.formData.name}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">{report.formData.gender === 'male' ? '男' : '女'}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-mono">{report.formData.baziString}</span>
              </div>
            )}

            <article className="prose prose-slate max-w-none">
              {renderContent(displayContent)}
            </article>
          </div>

          {/* 微信号输入区 — 仅未解锁时显示 */}
          {!viewingFull && (
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent to-white" />
              <div className="bg-white pt-4 pb-8 px-5 text-center border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  解锁完整命理报告
                </h3>
                <p className="text-slate-500 text-sm mb-2">
                  留下微信号，立即查看全部10个模块的完整解读
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  包含：人生各阶段详解 · 当前运势详判 · 天赋领域分析 · 命格总结
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
                    完整报告 · 当前内测限时免费
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/generate" className="text-purple-600 text-sm hover:underline">
            再测一个八字
          </Link>
        </div>
      </div>
    </div>
  )
}
