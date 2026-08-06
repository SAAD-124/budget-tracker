import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const FN_URL = 'https://fxdnrufajxezvnyvkipn.supabase.co/functions/v1/subscription-payment'
const KWD = n => `KWD ${(Number(n) || 0).toFixed(3)}`
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PERKS = [
  { icon: '📅', title: 'Weekday patterns', desc: 'See which days drain your wallet' },
  { icon: '📈', title: 'Category trends', desc: 'Track every category across 6 months' },
  { icon: '🏪', title: 'Top merchants', desc: 'Where your money actually goes' },
  { icon: '🎯', title: 'Spending profile', desc: 'Your habits as a radar chart' },
]

export default function Premium() {
  const { session, profile } = useAuth()
  const [params, setParams] = useSearchParams()

  const [active, setActive] = useState(false)
  const [expiresAt, setExpiresAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    // Returning from the gateway: confirm with MyFatoorah before unlocking.
    const invoiceId = params.get('invoiceId') || params.get('InvoiceId')
    if (invoiceId) {
      setNotice('Confirming your payment…')
      await verify(invoiceId)
      setParams({}, { replace: true })
    }
    await refresh()
    setLoading(false)
  }

  async function refresh() {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .order('expires_at', { ascending: false })
      .limit(1)

    const sub = subs?.[0]
    const live = sub && (!sub.expires_at || new Date(sub.expires_at) > new Date())
    setActive(Boolean(live))
    setExpiresAt(live ? sub.expires_at : null)
    if (live) await loadCharts()
  }

  async function callFn(body) {
    const { data: { session: s } } = await supabase.auth.getSession()
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s?.access_token}` },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
    return json
  }

  async function verify(invoiceId) {
    try {
      const r = await callFn({ action: 'verify', invoiceId })
      if (r.status === 'active') setNotice('Payment confirmed — premium charts unlocked.')
      else if (r.status === 'pending') setNotice('Payment is still pending. Refresh in a moment.')
      else { setNotice(''); setError('That payment did not complete. You have not been charged for access.') }
    } catch (e) {
      setNotice('')
      setError(e.message)
    }
  }

  async function subscribe() {
    setBusy(true); setError(''); setNotice('')
    try {
      const r = await callFn({ action: 'create', returnUrl: window.location.origin + window.location.pathname })
      // Remember the invoice so the return trip can verify it even if the
      // gateway drops our query string.
      sessionStorage.setItem('pendingInvoice', r.invoiceId)
      window.location.href = r.paymentUrl
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  async function checkPending() {
    const id = sessionStorage.getItem('pendingInvoice')
    if (!id) { setError('No pending payment found.'); return }
    setBusy(true); setError(''); setNotice('Checking…')
    await verify(id)
    await refresh()
    setBusy(false)
  }

  async function loadCharts() {
    const since = new Date()
    since.setMonth(since.getMonth() - 6)

    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, type, transaction_date, merchant, categories(name)')
      .gte('transaction_date', since.toISOString().split('T')[0])
      .order('transaction_date')

    const rows = (txs || []).filter(t => t.type === 'expense')

    const byDay = DAYS.map(d => ({ day: d, amount: 0 }))
    const byMonthCat = {}
    const byMerchant = {}

    rows.forEach(t => {
      const amt = Number(t.amount)
      byDay[new Date(t.transaction_date).getDay()].amount += amt

      const m = t.transaction_date.slice(0, 7)
      const cat = t.categories?.name || 'Other'
      byMonthCat[m] = byMonthCat[m] || { month: m }
      byMonthCat[m][cat] = (byMonthCat[m][cat] || 0) + amt

      const name = (t.merchant || '').trim()
      if (name) byMerchant[name] = (byMerchant[name] || 0) + amt
    })

    const totals = {}
    rows.forEach(t => {
      const cat = t.categories?.name || 'Other'
      totals[cat] = (totals[cat] || 0) + Number(t.amount)
    })
    const topCats = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const max = topCats[0]?.[1] || 1

    setData({
      byDay: byDay.map(d => ({ ...d, amount: Number(d.amount.toFixed(3)) })),
      trend: Object.values(byMonthCat).map(r => ({
        ...r,
        month: new Date(r.month + '-01').toLocaleString('en', { month: 'short' }),
      })),
      trendKeys: topCats.map(([c]) => c),
      merchants: Object.entries(byMerchant)
        .sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([name, amount]) => ({ name, amount: Number(amount.toFixed(3)) })),
      radar: topCats.map(([cat, val]) => ({
        category: cat.length > 9 ? cat.slice(0, 8) + '…' : cat,
        value: Math.round((val / max) * 100),
      })),
    })
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  if (!active) {
    return (
      <div className="page">
        <div className="premium-hero">
          <div className="premium-badge">Premium</div>
          <div className="premium-title">Deeper insight into your spending</div>
          <div className="premium-sub">Four extra charts built from your own transactions.</div>
        </div>

        <div style={{ padding: '20px' }}>
          {error && <div className="error-banner" style={{ marginBottom: 14 }}>⚠️ {error}</div>}
          {notice && <div className="success-banner" style={{ marginBottom: 14 }}>{notice}</div>}

          <div className="perk-list">
            {PERKS.map(p => (
              <div key={p.title} className="perk">
                <div className="perk-icon">{p.icon}</div>
                <div>
                  <div className="perk-title">{p.title}</div>
                  <div className="perk-desc">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="price-card">
            <div className="price-amount">KWD 2.500</div>
            <div className="price-period">for 30 days</div>
          </div>

          <button className="btn btn-primary" onClick={subscribe} disabled={busy}>
            {busy ? <span className="btn-spinner" /> : 'Subscribe with MyFatoorah'}
          </button>

          <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={checkPending} disabled={busy}>
            I already paid — check status
          </button>

          <div className="pay-note">
            Pay by KNET or card. You are redirected to MyFatoorah — this app never sees your card details.
          </div>
        </div>
      </div>
    )
  }

  const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Premium Charts</div>
          <div className="page-subtitle">
            Active{expiresAt ? ` · renews ${new Date(expiresAt).toLocaleDateString('en', { day: 'numeric', month: 'short' })}` : ''}
          </div>
        </div>
        <div className="premium-pill">✓ Premium</div>
      </div>

      {notice && <div className="success-banner" style={{ margin: '0 20px 14px' }}>{notice}</div>}

      <div className="section-label">Spending by weekday</div>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data?.byDay || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip formatter={v => KWD(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="amount" fill="#4F46E5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="section-label">Category trend · 6 months</div>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data?.trend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip formatter={v => KWD(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {(data?.trendKeys || []).map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="section-label">Top merchants</div>
      <div className="chart-card">
        {data?.merchants?.length ? (
          <ResponsiveContainer width="100%" height={Math.max(160, data.merchants.length * 34)}>
            <BarChart data={data.merchants} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11, fill: 'var(--text2)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => KWD(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="amount" fill="#10B981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">Add merchant names to your transactions to see this.</div>
        )}
      </div>

      <div className="section-label">Spending profile</div>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={230}>
          <RadarChart data={data?.radar || []} outerRadius="72%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
            <PolarRadiusAxis tick={false} axisLine={false} />
            <Radar dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.45} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: 24 }} />
    </div>
  )
}
