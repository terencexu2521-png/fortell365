import { Link } from 'react-router-dom'
import { Sparkles, Sun, Award, BookOpen, Briefcase, ArrowRight, User } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function HomePage() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-lg font-bold text-slate-900">八字专业职业解读</span>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/reports" className="text-xs text-slate-500 hover:text-purple-600">
                  <User className="w-4 h-4 inline mr-1" />{user.email}
                </Link>
                <button onClick={logout} className="text-xs text-slate-400 hover:text-slate-600">退出</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-xs text-purple-600 hover:text-purple-700">登录</Link>
                <Link to="/register" className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700">注册</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            你的八字里，<br />
            藏着<span className="bg-gradient-to-r from-purple-600 to-amber-500 bg-clip-text text-transparent">最适合的方向</span>
          </h1>
          <p className="text-slate-500 mb-6 text-lg">
            用千年国学智慧 + AI，深度解析你的命理天赋与人生轨迹
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-8">
        <div className="max-w-xl mx-auto">
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { step: '1', title: '获取八字', desc: '小巫排盘截图上传', icon: BookOpen },
              { step: '2', title: 'AI 识别', desc: '图片自动提取八字', icon: Award },
              { step: '3', title: '查看解读', desc: '10大模块深度分析', icon: Briefcase },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <item.icon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-xs text-slate-400 mb-1">第{item.step}步</div>
                <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                <div className="text-xs text-slate-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main CTA */}
      <section className="px-4 pb-16">
        <div className="max-w-xl mx-auto">
          <Link
            to="/generate"
            className="group flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-2xl hover:border-purple-200 hover:shadow-lg transition-all duration-300"
          >
            <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <Sun className="w-7 h-7 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">八字命理深度解读</h3>
              <p className="text-slate-500 text-sm">
                日主五行 → 性格底色 · 十神组合 → 天赋领域 · 八步大运 → 人生节奏
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">免费</span>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition" />
            </div>
          </Link>

          {/* Value proposition — v3 扩展版 */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <p className="text-center text-sm text-slate-500">
              <span className="font-medium text-slate-700">免费查看 10 大模块完整命理解读</span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0" />
                命盘概览
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0" />
                性格DNA
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0" />
                五行力量分析
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0" />
                格局与十神
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0" />
                地支关系密码
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0" />
                身强弱与用神
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                人生各阶段详解
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                当前运势详判
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0" />
                天赋领域分析
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0" />
                命格总结
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400">八字专业职业解读 | 仅供娱乐参考</p>
      </footer>
    </div>
  )
}
