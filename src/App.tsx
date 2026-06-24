import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './lib/auth'
import HomePage from './pages/HomePage'
import GeneratePage from './pages/GeneratePage'
import ReportPage from './pages/ReportPage'
import StatsPage from './pages/StatsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ReportsPage from './pages/ReportsPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/report/:id" element={<ReportPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </div>
        <Toaster position="top-center" />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
