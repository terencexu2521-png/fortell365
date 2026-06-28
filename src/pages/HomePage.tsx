import { Link } from 'react-router-dom'
import { Sparkles, Sun, BookOpen, Briefcase, ArrowRight, User } from 'lucide-react'
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
            <span className="text-lg font-bold text-slate-900">国学智慧·专业/职业探索</span>
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
            国学智慧<br />
            <span className="bg-gradient-to-r from-purple-600 to-amber-500 bg-clip-text text-transparent">专业 / 职业探索</span>
          </h1>
          <p className="text-slate-500 mb-6 text-lg">
            以传统文化档案为参照，帮你看清特质方向与专业、职业可能
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-8">
        <div className="max-w-xl mx-auto">
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { step: '1', title: '填写信息', desc: '姓名、性别、出生时间与地点', icon: BookOpen },
              { step: '2', title: '确认排盘', desc: '自动计算并核对四柱', icon: Sun },
              { step: '3', title: '探索报告', desc: '专业与职业方向解读', icon: Briefcase },
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
              <h3 className="text-lg font-semibold text-slate-900">开始专业/职业探索</h3>
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
            <p className="text-center text-sm text-slate-500 mb-1">
              <span className="font-medium text-slate-700">10大模块报告，纵览人生</span>
            </p>
            <p className="text-center text-xs text-slate-400 mb-3">注册登录后，报告自动保存到「我的报告」</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {[
                { name: '文化档案概览', free: true },
                { name: '性格DNA', free: true },
                { name: '五行力量分析', free: true },
                { name: '格局与十神', free: true },
                { name: '地支关系密码', free: true },
                { name: '身强弱与用神', free: false },
                { name: '人生各阶段详解', free: false },
                { name: '当前阶段趋势', free: false },
                { name: '天赋领域分析', free: false },
                { name: '个性画像总结', free: false },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-1 text-slate-500">
                  <span className="flex items-center gap-1 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.free ? 'bg-purple-400' : 'bg-amber-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${item.free ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {item.free ? '免费' : '付费'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400">国学智慧·专业/职业探索 | 仅供文化学习与自我探索参考</p>
      </footer>
    </div>
  )
}
