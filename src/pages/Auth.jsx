import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [login, setLogin] = useState({ email: '', password: '' })
  const [reg, setReg] = useState({
    full_name: '', age: '', email: '', mobile: '', password: '', confirm: ''
  })

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: login.email, password: login.password
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (reg.password !== reg.confirm) { setError('Passwords do not match'); return }
    if (reg.password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (!reg.full_name.trim()) { setError('Full name is required'); return }
    if (parseInt(reg.age) < 13 || parseInt(reg.age) > 120) { setError('Enter a valid age'); return }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: reg.email,
      password: reg.password,
      options: {
        data: {
          full_name: reg.full_name,
          age: parseInt(reg.age),
          mobile_number: reg.mobile
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: reg.email, password: reg.password
    })
    if (signInError) {
      setSuccess('Account created! You can now sign in.')
      setTab('login')
      setLogin({ email: reg.email, password: '' })
    }
    setLoading(false)
  }

  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <div className="auth-logo">💸</div>
        <h1>Budget Tracker</h1>
        <p>Smart money management for Kuwait</p>
      </div>

      <div className="auth-body">
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); setSuccess('') }}>
            Sign In
          </button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); setSuccess('') }}>
            Create Account
          </button>
        </div>

        {error && <div className="error-banner">⚠️ {error}</div>}
        {success && <div className="success-banner">✅ {success}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="form-stack">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email" className="form-input" placeholder="you@example.com"
                value={login.email} onChange={e => setLogin(p => ({ ...p, email: e.target.value }))}
                required autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password" className="form-input" placeholder="••••••••"
                value={login.password} onChange={e => setLogin(p => ({ ...p, password: e.target.value }))}
                required autoComplete="current-password"
              />
            </div>
            <div style={{ height: 4 }} />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : 'Sign In'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={async () => {
              setLoading(true); setError('')
              const { error } = await supabase.auth.signInWithPassword({
                email: 'ahmad.demo@budgettracker.kw', password: 'demo1234'
              })
              if (error) setError('Demo login failed: ' + error.message)
              setLoading(false)
            }}>
              Try Demo Account
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="form-stack">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text" className="form-input" placeholder="Ahmad Al-Sabah"
                value={reg.full_name} onChange={e => setReg(p => ({ ...p, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  type="number" className="form-input" placeholder="25"
                  value={reg.age} onChange={e => setReg(p => ({ ...p, age: e.target.value }))}
                  min="13" max="120" required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input
                  type="tel" className="form-input" placeholder="+965 9999 9999"
                  value={reg.mobile} onChange={e => setReg(p => ({ ...p, mobile: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email" className="form-input" placeholder="you@example.com"
                value={reg.email} onChange={e => setReg(p => ({ ...p, email: e.target.value }))}
                required autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password" className="form-input" placeholder="Min. 6 characters"
                value={reg.password} onChange={e => setReg(p => ({ ...p, password: e.target.value }))}
                required autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password" className="form-input" placeholder="Repeat password"
                value={reg.confirm} onChange={e => setReg(p => ({ ...p, confirm: e.target.value }))}
                required
              />
            </div>
            <div style={{ height: 4 }} />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : 'Create Account'}
            </button>
          </form>
        )}
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
