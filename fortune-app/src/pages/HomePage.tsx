import { Link } from 'react-router-dom'
import { Sparkles, Star, Moon, Sun, Compass, ArrowRight, Gift } from 'lucide-react'

const services = [
  { id: 'bazi', name: '八字命理', desc: '传统命学，洞察先天命格与人生轨迹', icon: Sun, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'ziwei', name: '紫微斗数', desc: '帝王之学，全面解析命盘格局', icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'tarot', name: '塔罗占卜', desc: '灵感指引，解答当下困惑与抉择', icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'jiugong', name: '九宫命理', desc: '数字密码，揭示性格与命运密钥', icon: Compass, color: 'text-teal-600', bg: 'bg-teal-50' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-lg font-bold text-slate-900">灵感命理</span>
          </div>
          <span className="text-xs text-slate-400">AI驱动 | 即时解读</span>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full text-green-700 text-sm mb-4">
            <Gift className="w-3.5 h-3.5" />
            免费体验 | 即刻获取简版报告
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            探索你的<span className="bg-gradient-to-r from-purple-600 to-amber-500 bg-clip-text text-transparent">命运蓝图</span>
          </h1>
          <p className="text-slate-500 mb-2">
            融合传统智慧与AI技术，为你提供专业命理解读
          </p>
          <p className="text-sm text-slate-400">
            先看免费简版，满意再解锁深度报告
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="grid gap-4">
            {services.map((service) => (
              <Link
                key={service.id}
                to={`/generate/${service.id}`}
                className="group flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-2xl hover:border-purple-200 hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-14 h-14 ${service.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <service.icon className={`w-7 h-7 ${service.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900">{service.name}</h3>
                  <p className="text-slate-500 text-sm">{service.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">免费体验</span>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition" />
                </div>
              </Link>
            ))}
          </div>

          {/* Value proposition */}
          <div className="mt-8 p-4 bg-slate-50 rounded-xl">
            <p className="text-center text-sm text-slate-500">
              <span className="font-medium text-slate-700">简版报告免费</span> - 快速了解命理方向
              <br />
              <span className="text-slate-400">深度解读需解锁完整版</span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400">2024 灵感命理 | 仅供娱乐参考</p>
      </footer>
    </div>
  )
}
