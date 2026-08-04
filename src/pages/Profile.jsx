import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function Profile() {
  const { profile, theme, applyTheme, session } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  const name = profile?.full_name || session?.user?.email?.split('@')[0] || 'User'
  const email = session?.user?.email || ''
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const stats = [
    { icon: '📅', label: 'Member since', value: new Date(session?.user?.created_at || Date.now()).toLocaleDateString('en', { month: 'long', year: 'numeric' }) },
    { icon: '💰', label: 'Monthly Income', value: profile?.monthly_income ? `KWD ${parseFloat(profile.monthly_income).toFixed(3)}` : 'Not set' },
    { icon: '🎯', label: 'Financial Goal', value: (profile?.main_financial_goal || 'Not set').replace(/_/g, ' ') },
    { icon: '🏦', label: 'Currency', value: profile?.currency || 'KWD' },
  ]

  return (
    <div className="page">
      <div className="profile-hero">
        <div className="profile-avatar">{initials || '👤'}</div>
        <div className="profile-name">{name}</div>
        <div className="profile-email">{email}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '16px 20px 0' }}>
        {stats.map(s => (
          <div key={s.label} className="card-sm">
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="setting-section">
        <div className="setting-section-label">Appearance</div>

        <div className="theme-selector" style={{ margin: '0 0 0' }}>
          {[
            { val: 'light', label: '☀️ Light' },
            { val: 'dark', label: '🌙 Dark' },
            { val: null, label: '⚙️ System' },
          ].map(t => {
            const isActive = t.val === null
              ? localStorage.getItem('theme') === null || (!localStorage.getItem('theme') && theme === (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
              : theme === t.val
            return (
              <button
                key={t.label}
                className={`theme-opt ${t.val === theme || (t.val === null && !['light','dark'].includes(localStorage.getItem('theme'))) ? 'active' : ''}`}
                onClick={() => {
                  if (t.val === null) { localStorage.removeItem('theme'); applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') }
                  else applyTheme(t.val)
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="setting-section">
        <div className="setting-section-label">Notifications</div>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {[
            { key: 'spending_alerts', label: 'Budget Alerts', desc: 'When 80% or 100% of budget is spent' },
            { key: 'monthly_reports', label: 'Monthly Reports', desc: 'Monthly summary of your finances' },
            { key: 'weekly_reports', label: 'Weekly Reports', desc: 'Weekly spending digest' },
          ].map((pref, i, arr) => (
            <div key={pref.key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{pref.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{pref.desc}</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={profile?.[pref.key] ?? false}
                  onChange={async e => {
                    await supabase.from('user_profiles').update({ [pref.key]: e.target.checked }).eq('id', session.user.id)
                  }}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="setting-section">
        <div className="setting-section-label">Account</div>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Employment</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>
              {(profile?.employment_status || 'Not set').replace(/_/g, ' ')}
            </div>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Finance Check Frequency</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>
              {(profile?.finance_check_freq || 'Not set')}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 20px 20px' }}>
        <button
          className="btn btn-danger"
          onClick={signOut}
          disabled={signingOut}
        >
          {signingOut ? <span className="btn-spinner" style={{ borderColor: 'var(--danger)', borderTopColor: 'transparent' }} /> : '👋 Sign Out'}
        </button>
      </div>

      <div style={{ textAlign: 'center', padding: '0 20px 20px', fontSize: 12, color: 'var(--muted)' }}>
        Budget Tracker v1.0 · Built with ❤️ for Kuwait
      </div>
    </div>
  )
}
