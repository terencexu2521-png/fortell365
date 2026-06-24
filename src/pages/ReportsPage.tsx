import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, API } from '../lib/auth'
import { Loader2, ArrowLeft, LogOut, FileText } from 'lucide-react'

interface ReportItem { id: string; name: string; gender: string; bazi_string: string; created_at: string }

export default function ReportsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetch(API + '/reports', { headers: { Authorization: 'Bearer ' + user.token } })
      .then(r => r.json()).then(d => { if (d.success) setReports(d.data) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [user])

  const handleLogout = () => { logout(); navigate('/') }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-700"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="text-lg font-semibold text-slate-900">我的报告</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <LogOut className="w-4 h-4" />退出
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">暂无报告</p>
            <Link to="/generate" className="text-purple-600 hover:underline text-sm">生成第一份八字解读</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <Link key={r.id} to={`/report/${r.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">{r.name} 的八字解读</h3>
                  <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{r.gender === 'male' ? '男' : '女'}</span>
                  <span className="font-mono text-purple-600">{r.bazi_string}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
