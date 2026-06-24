import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthUser { token: string; email: string; userId: number }

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType>(null!)

const API = 'https://fortell365-api.terencexu2521.workers.dev'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('fortell365_user')
    if (stored) try { const u = JSON.parse(stored); if (u.exp > Date.now()) setUser(u); else localStorage.removeItem('fortell365_user') } catch { localStorage.removeItem('fortell365_user') }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const resp = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await resp.json()
    if (!resp.ok || !data.success) throw new Error(data.error || '登录失败')
    const u = { token: data.data.token, email: data.data.email, userId: data.data.userId, exp: Date.now() + 7 * 24 * 3600000 }
    localStorage.setItem('fortell365_user', JSON.stringify(u))
    setUser(u)
  }

  const register = async (email: string, password: string) => {
    const resp = await fetch(API + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await resp.json()
    if (!resp.ok || !data.success) throw new Error(data.error || '注册失败')
  }

  const logout = () => { localStorage.removeItem('fortell365_user'); setUser(null) }

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
export { API }
