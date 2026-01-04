import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import HomePage from './pages/HomePage'
import GeneratePage from './pages/GeneratePage'
import ReportPage from './pages/ReportPage'
import StatsPage from './pages/StatsPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generate/:type" element={<GeneratePage />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </div>
      <Toaster position="top-center" />
    </BrowserRouter>
  )
}

export default App
