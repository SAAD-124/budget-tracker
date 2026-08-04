import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const KWD = n => `KWD ${parseFloat(n || 0).toFixed(3)}`
const PCT = (a, b) => b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0

export default function Budget() {
  const { profile } = useAuth()
  const [budgets, setBudgets] = useState([])
  const [catSpending, setCatSpending] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [budgetRes, catRes, sumRes] = await Promise.all([
      supabase.from('monthly_budgets').select('*, categories(name, icon, color)').eq('budget_month', thisMonth),
      supabase.from('vw_category_spending').select('*').eq('month', thisMonth),
      supabase.from('vw_monthly_summary').select('*').eq('month', thisMonth).single(),
    ])

    setBudgets(budgetRes.data || [])
    setCatSpending(catRes.data || [])
    setSummary(sumRes.data)
    setLoading(false)
  }

  const overall = profile?.monthly_spending_limit || 0
  const totalExpenses = parseFloat(summary?.total_expenses || 0)
  const overallPct = PCT(totalExpenses, overall)

  const catBudgetMap = catSpending.reduce((acc, c) => {
    acc[c.category_id] = parseFloat(c.total_spent)
    return acc
  }, {})

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Budget</div>
          <div className="page-subtitle">{new Date().toLocaleString('en', { month: 'long', year: 'numeric' })}</div>
        </div>
        <button className="btn-icon" onClick={() => setShowAdd(true)} style={{ fontSize: 22 }}>+</button>
      </div>

      {overall > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="budget-overview-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Overall Budget</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  {KWD(totalExpenses)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>of {KWD(overall)}</div>
              </div>
              <div style={{
                width: 68, height: 68,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `conic-gradient(${overallPct >= 100 ? '#EF4444' : overallPct >= 80 ? '#F59E0B' : '#10B981'} ${overallPct * 3.6}deg, var(--surface2) 0deg)`,
                flexShrink: 0,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800,
                  color: overallPct >= 100 ? 'var(--danger)' : overallPct >= 80 ? 'var(--accent)' : 'var(--secondary)',
                }}>
                  {overallPct}%
                </div>
              </div>
            </div>
            <div className="budget-progress-bar">
              <div
                className={`budget-progress-fill ${overallPct >= 100 ? 'danger' : overallPct >= 80 ? 'warning' : ''}`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <div style={{ fontSize: 12, color: overallPct >= 100 ? 'var(--danger)' : 'var(--muted)', marginTop: 4, fontWeight: 500 }}>
              {overallPct >= 100 ? `⚠️ Over budget by ${KWD(totalExpenses - overall)}` : `${KWD(overall - totalExpenses)} remaining`}
            </div>
          </div>
        </div>
      )}

      {budgets.length === 0 && overall === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-title">No budgets set</div>
          <div className="empty-desc">Set category budgets to track spending goals</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowAdd(true)}>
            Set Budget
          </button>
        </div>
      ) : (
        <>
          <div className="section-label">Category Budgets</div>
          <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            {budgets.map(b => {
              const spent = catBudgetMap[b.category_id] || 0
              const limit = parseFloat(b.budget_limit)
              const pct = PCT(spent, limit)
              return (
                <div key={b.id} className="budget-category-item">
                  <div style={{ fontSize: 22 }}>{b.categories?.icon || '📦'}</div>
                  <div className="budget-cat-info">
                    <div className="budget-cat-name">
                      {b.categories?.name || 'General'}
                      {pct >= 100 && <span style={{ fontSize: 12 }}>⚠️</span>}
                    </div>
                    <div className="budget-cat-bar">
                      <div
                        className="budget-cat-fill"
                        style={{
                          width: `${pct}%`,
                          background: pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--accent)' : 'var(--primary)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="budget-cat-amount">
                    <div style={{ color: pct >= 100 ? 'var(--danger)' : 'var(--text)' }}>
                      {parseFloat(spent).toFixed(3)}
                    </div>
                    <div className="budget-cat-sub">/ {parseFloat(limit).toFixed(3)}</div>
                  </div>
                </div>
              )
            })}

            {catSpending
              .filter(c => !budgets.find(b => b.category_id === c.category_id))
              .slice(0, 5)
              .map(c => (
                <div key={c.category_id} className="budget-category-item">
                  <div style={{ fontSize: 22 }}>{c.icon || '📦'}</div>
                  <div className="budget-cat-info">
                    <div className="budget-cat-name">{c.category_name}</div>
                    <div className="budget-cat-bar">
                      <div className="budget-cat-fill" style={{ width: '0%', background: 'var(--border)' }} />
                    </div>
                  </div>
                  <div className="budget-cat-amount">
                    <div>{parseFloat(c.total_spent).toFixed(3)}</div>
                    <div className="budget-cat-sub">no limit</div>
                  </div>
                </div>
              ))
            }
          </div>
        </>
      )}

      {showAdd && <AddBudgetModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadData() }} />}
    </div>
  )
}

function AddBudgetModal({ onClose, onSaved }) {
  const [cats, setCats] = useState([])
  const [catId, setCatId] = useState('')
  const [limit, setLimit] = useState('')
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  useEffect(() => {
    supabase.from('categories').select('*').eq('type', 'expense').order('sort_order').then(({ data }) => setCats(data || []))
  }, [])

  async function save() {
    if (!catId || !limit) return
    setSaving(true)
    await supabase.from('monthly_budgets').upsert({
      category_id: catId,
      budget_month: thisMonth,
      budget_limit: parseFloat(limit),
    }, { onConflict: 'user_id,category_id,budget_month' })
    onSaved()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.5)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', width: '100%', maxWidth: 430,
        margin: '0 auto', borderRadius: '24px 24px 0 0',
        padding: '24px 20px 40px',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Set Category Budget</div>
        <div className="form-stack">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={catId} onChange={e => setCatId(e.target.value)}>
              <option value="">Select category</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Monthly Limit (KWD)</label>
            <input type="number" className="form-input" placeholder="e.g. 150.000" value={limit} onChange={e => setLimit(e.target.value)} min="0" step="0.001" />
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : 'Save Budget'}
          </button>
        </div>
      </div>
    </div>
  )
}
