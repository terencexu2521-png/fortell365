import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/reports'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) { navigate(redirect, { replace: true }); return null }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { toast.error('请填写邮箱和密码'); return }
    setLoading(true)
    try { await login(email.trim(), password); toast.success('登录成功'); navigate(redirect, { replace: true }) }
    catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">国学智慧·专业/职业探索</h1>
          <p className="text-slate-500 text-sm mt-1">登录后生成报告并保存到账户</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">邮箱</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少6位"
              className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50">
            {loading ? '登录中...' : '登录'}
          </button>
          <p className="text-center text-xs text-slate-400">
            没有账号？<Link to={`/register?redirect=${encodeURIComponent(redirect)}`} className="text-purple-600 hover:underline">注册</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
