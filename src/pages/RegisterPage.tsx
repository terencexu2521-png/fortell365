import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { register, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) { navigate('/reports', { replace: true }); return null }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { toast.error('请填写邮箱和密码'); return }
    if (password !== confirm) { toast.error('两次密码不一致'); return }
    if (password.length < 6) { toast.error('密码至少6位'); return }
    setLoading(true)
    try { await register(email.trim(), password); toast.success('注册成功，请登录'); navigate('/login', { replace: true }) }
    catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">知命择业</h1>
          <p className="text-slate-500 text-sm mt-1">注册账号，保存你的八字解读</p>
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">确认密码</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="再次输入密码"
              className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50">
            {loading ? '注册中...' : '注册'}
          </button>
          <p className="text-center text-xs text-slate-400">
            已有账号？<Link to="/login" className="text-purple-600 hover:underline">登录</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
