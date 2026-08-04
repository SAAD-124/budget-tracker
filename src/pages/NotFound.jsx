import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

export default function NotFound() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()

  return (
    <div className="notfound">
      <div className="notfound-code">404</div>
      <div className="notfound-title">Page not found</div>
      <div className="notfound-desc">
        Nothing lives at <code className="notfound-path">{location.pathname}</code>.
        The link may be out of date, or the page may have moved.
      </div>

      <div className="notfound-actions">
        <button className="btn btn-primary" onClick={() => navigate(session ? '/' : '/auth')}>
          {session ? 'Back to dashboard' : 'Go to sign in'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>

      {session && (
        <div className="notfound-links">
          {[
            { path: '/', label: '🏠 Dashboard' },
            { path: '/transactions', label: '💳 Transactions' },
            { path: '/budget', label: '📊 Budget' },
            { path: '/savings', label: '🎯 Savings' },
            { path: '/chat', label: '💬 AI Chat' },
          ].map(l => (
            <button key={l.path} className="notfound-link" onClick={() => navigate(l.path)}>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
