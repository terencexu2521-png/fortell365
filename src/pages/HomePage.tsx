import { Link } from 'react-router-dom'
import { Sparkles, Sun, Award, BookOpen, Briefcase, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-lg font-bold text-slate-900">八字专业职业解读</span>
          </div>
          <span className="text-xs text-slate-400">国学智慧 | 科学参考</span>
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
            用千年国学智慧，帮你找到匹配命理的专业和职业
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-8">
        <div className="max-w-xl mx-auto">
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { step: '1', title: '获取八字', desc: '小巫排盘等工具测好', icon: BookOpen },
              { step: '2', title: '填入信息', desc: '30 秒提交四柱八字', icon: Award },
              { step: '3', title: '查看解读', desc: '先免费看性格画像', icon: Briefcase },
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
              <h3 className="text-lg font-semibold text-slate-900">八字专业职业解读</h3>
              <p className="text-slate-500 text-sm">
                日主五行 → 性格底色 · 十神组合 → 职业天赋 · 大运走势 → 人生节奏
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                免费预览
              </span>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition" />
            </div>
          </Link>

          {/* Value proposition */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <p className="text-center text-sm text-slate-500">
              <span className="font-medium text-slate-700">免费查看命理画像</span> — 性格·优势·人生节律
              <br />
              <span className="text-slate-400">专业推荐 & 职业规划 需解锁完整版 ¥39.90</span>
            </p>
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
