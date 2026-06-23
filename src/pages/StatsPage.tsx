import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">数据统计</h1>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-500">统计功能即将上线</p>
      </div>
    </div>
  )
}
