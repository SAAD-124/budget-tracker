import { createContext, useContext, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import AddTransaction from './pages/AddTransaction'
import Budget from './pages/Budget'
import Savings from './pages/Savings'
import AIChat from './pages/AIChat'
import Profile from './pages/Profile'
import BottomNav from './components/BottomNav'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function initTheme() {
  const saved = localStorage.getItem('theme')
  const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const theme = saved || sys
  document.documentElement.setAttribute('data-theme', theme)
  return theme
}

function ProtectedRoute({ children }) {
  const { session, loading, profile } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )

  if (!session) return <Navigate to="/auth" replace />

  if (profile && !profile.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" replace />} />
        <Route path="/onboarding" element={
          <ProtectedRoute><Onboarding /></ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute><Dashboard /><BottomNav /></ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute><Transactions /><BottomNav /></ProtectedRoute>
        } />
        <Route path="/add" element={
          <ProtectedRoute><AddTransaction /></ProtectedRoute>
        } />
        <Route path="/edit/:id" element={
          <ProtectedRoute><AddTransaction /></ProtectedRoute>
        } />
        <Route path="/budget" element={
          <ProtectedRoute><Budget /><BottomNav /></ProtectedRoute>
        } />
        <Route path="/savings" element={
          <ProtectedRoute><Savings /><BottomNav /></ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute><AIChat /><BottomNav /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Profile /><BottomNav /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => initTheme())

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('theme', t)
    setTheme(t)
  }

  return (
    <AuthContext.Provider value={{ session, profile, setProfile, loading, theme, applyTheme }}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
