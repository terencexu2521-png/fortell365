import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Users, Mail, BarChart3, RefreshCw } from 'lucide-react'

const SUPABASE_URL = 'https://rkqutqsdnlbuhgvondrh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrcXV0cXNkbmxidWhndm9uZHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzE0NDQsImV4cCI6MjA4MzAwNzQ0NH0._-Jn-WxsSwauwhxhg35Z1B3Im_VxAMSQ4YBvEic3QWM'

const fortuneNames: Record<string, string> = {
  ziwei: '紫微斗数',
  bazi: '八字命理',
  tarot: '塔罗占卜',
  jiugong: '九宫命理'
}

interface ClickData {
  id: string
  fortune_type: string
  report_type: string
  price: number
  contact_type: string | null
  contact_value: string | null
  created_at: string
}

interface Stats {
  totalClicks: number
  contactSubmits: number
  conversionRate: number
  byType: Record<string, number>
  recentClicks: ClickData[]
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/payment_intent_clicks?select=*&order=created_at.desc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      })
      const data: ClickData[] = await response.json()
      
      const paymentClicks = data.filter(d => d.report_type === 'main_report')
      const contactClicks = data.filter(d => d.report_type === 'contact_submit')
      
      const byType: Record<string, number> = {}
      paymentClicks.forEach(click => {
        byType[click.fortune_type] = (byType[click.fortune_type] || 0) + 1
      })
      
      setStats({
        totalClicks: paymentClicks.length,
        contactSubmits: contactClicks.length,
        conversionRate: paymentClicks.length > 0 ? (contactClicks.length / paymentClicks.length * 100) : 0,
        byType,
        recentClicks: data.slice(0, 20)
      })
    } catch (err) {
      console.error('Failed to load stats')
    }
    setLoading(false)
  }

  useEffect(() => { loadStats() }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">付费意愿数据统计</h1>
          </div>
          <button onClick={loadStats} className="p-2 text-slate-500 hover:text-slate-700">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 核心指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              付费点击
            </div>
            <div className="text-2xl font-bold text-purple-600">{stats?.totalClicks || 0}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Mail className="w-4 h-4" />
              联系方式
            </div>
            <div className="text-2xl font-bold text-green-600">{stats?.contactSubmits || 0}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Users className="w-4 h-4" />
              转化率
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats?.conversionRate.toFixed(1) || 0}%</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <BarChart3 className="w-4 h-4" />
              命理类型
            </div>
            <div className="text-2xl font-bold text-slate-700">{Object.keys(stats?.byType || {}).length}</div>
          </div>
        </div>

        {/* 分类型统计 */}
        <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">各类型点击分布</h2>
          <div className="space-y-3">
            {Object.entries(stats?.byType || {}).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="w-20 text-sm text-slate-600">{fortuneNames[type] || type}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-amber-500 rounded-full"
                    style={{ width: `${stats?.totalClicks ? (count / stats.totalClicks * 100) : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700 w-12 text-right">{count}</span>
              </div>
            ))}
            {Object.keys(stats?.byType || {}).length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">暂无点击数据</p>
            )}
          </div>
        </div>

        {/* 最近点击记录 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">最近点击记录</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="pb-2 font-medium">类型</th>
                  <th className="pb-2 font-medium">价格</th>
                  <th className="pb-2 font-medium">联系方式</th>
                  <th className="pb-2 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentClicks.map(click => (
                  <tr key={click.id} className="border-b border-slate-50">
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        click.report_type === 'contact_submit' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {click.report_type === 'contact_submit' ? '留联系方式' : fortuneNames[click.fortune_type]}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600">¥{(click.price / 100).toFixed(1)}</td>
                    <td className="py-2 text-slate-600">{click.contact_value || '-'}</td>
                    <td className="py-2 text-slate-400">{new Date(click.created_at).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
                {!stats?.recentClicks.length && (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
