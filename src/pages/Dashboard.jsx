import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const KWD = n => `KWD ${parseFloat(n || 0).toFixed(3)}`
const PCT = (a, b) => b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#EC4899', '#F97316']

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState([])
  const [recent, setRecent] = useState([])
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [summaryRes, catRes, recentRes, trendRes] = await Promise.all([
      supabase.from('vw_monthly_summary').select('*').eq('month', thisMonth).single(),
      supabase.from('vw_category_spending').select('*').eq('month', thisMonth).order('total_spent', { ascending: false }).limit(6),
      supabase.from('transactions').select('*, categories(name, icon, color)').order('transaction_date', { ascending: false }).limit(5),
      supabase.from('vw_monthly_summary').select('month, total_income, total_expenses').order('month', { ascending: false }).limit(6),
    ])

    setSummary(summaryRes.data)
    setCategories(catRes.data || [])
    setRecent(recentRes.data || [])

    const t = (trendRes.data || []).reverse().map(r => ({
      month: new Date(r.month).toLocaleString('en', { month: 'short' }),
      income: parseFloat(r.total_income),
      expenses: parseFloat(r.total_expenses),
    }))
    setTrend(t)
    setLoading(false)
  }

  const income = parseFloat(summary?.total_income || 0)
  const expenses = parseFloat(summary?.total_expenses || 0)
  const balance = income - expenses
  const budgetLimit = parseFloat(summary?.budget_limit || profile?.monthly_spending_limit || 0)
  const budgetPct = PCT(expenses, budgetLimit)

  if (loading) return (
    <div className="loading-screen"><div className="spinner" /></div>
  )

  const firstName = (profile?.full_name || 'there').split(' ')[0]

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="dash-greeting">Good day,</div>
            <div className="dash-name">{firstName} 👋</div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.4)',
              color: 'white', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 4,
            }}
          >
            {(profile?.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </button>
        </div>

        <div className="balance-card">
          <div className="balance-label">Net Balance This Month</div>
          <div className="balance-amount">{KWD(balance)}</div>
          <div className="balance-row">
            <div className="balance-item">
              <div className="balance-dot" style={{ background: '#34D399' }} />
              <div className="balance-item-info">
                <div className="balance-item-label">Income</div>
                <div className="balance-item-value">{KWD(income)}</div>
              </div>
            </div>
            <div className="balance-item">
              <div className="balance-dot" style={{ background: '#F87171' }} />
              <div className="balance-item-info">
                <div className="balance-item-label">Expenses</div>
                <div className="balance-item-value">{KWD(expenses)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {budgetLimit > 0 && (
        <div style={{ padding: '16px 20px 0' }}>
          <div className="card-sm">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Monthly Budget</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: budgetPct >= 100 ? 'var(--danger)' : budgetPct >= 80 ? 'var(--accent)' : 'var(--secondary)' }}>
                {budgetPct}%
              </span>
            </div>
            <div className="budget-progress-bar">
              <div
                className={`budget-progress-fill ${budgetPct >= 100 ? 'danger' : budgetPct >= 80 ? 'warning' : ''}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <div className="budget-meta">
              <span>{KWD(expenses)} spent</span>
              <span>{KWD(budgetLimit - expenses)} left</span>
            </div>
          </div>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-icon">📊</div>
          <div className="stat-card-value">{summary?.transaction_count || 0}</div>
          <div className="stat-card-label">Transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">📅</div>
          <div className="stat-card-value">{new Date().toLocaleString('en', { month: 'short' })}</div>
          <div className="stat-card-label">This Month</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">💰</div>
          <div className="stat-card-value">{KWD(balance).replace('KWD ', '')}</div>
          <div className="stat-card-label">Balance</div>
        </div>
      </div>

      {trend.length > 1 && (
        <>
          <div className="section-label">Income vs Expenses Trend</div>
          <div style={{ padding: '0 20px' }}>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                    formatter={v => [`KWD ${v.toFixed(3)}`, '']}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#incG)" name="Income" />
                  <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fill="url(#expG)" name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
                {[{ c: '#10B981', l: 'Income' }, { c: '#EF4444', l: 'Expenses' }].map(x => (
                  <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 50, background: x.c }} />
                    {x.l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {categories.length > 0 && (
        <>
          <div className="section-label">Spending by Category</div>
          <div style={{ padding: '0 20px' }}>
            <div className="chart-card">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ flexShrink: 0 }}>
                  <PieChart width={120} height={120}>
                    <Pie data={categories} dataKey="total_spent" cx="50%" cy="50%" innerRadius={32} outerRadius={52}>
                      {categories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {categories.slice(0, 5).map((c, i) => (
                    <div key={c.category_name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 50, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.category_icon} {c.category_name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {KWD(c.total_spent)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {recent.length > 0 && (
        <>
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}>
            <span>Recent Transactions</span>
            <button style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/transactions')}>
              See all
            </button>
          </div>
          <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            {recent.map(tx => (
              <TxRow key={tx.id} tx={tx} onClick={() => navigate(`/edit/${tx.id}`)} />
            ))}
          </div>
        </>
      )}

      <div style={{ height: 8 }} />
    </div>
  )
}

function TxRow({ tx, onClick }) {
  const cat = tx.categories
  const isExpense = tx.type === 'expense'
  const date = new Date(tx.transaction_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })

  return (
    <div className="tx-card" onClick={onClick}>
      <div className="tx-icon" style={{ background: cat?.color ? `${cat.color}20` : 'var(--surface2)' }}>
        {cat?.icon || '💳'}
      </div>
      <div className="tx-info">
        <div className="tx-title">{tx.title}</div>
        <div className="tx-meta">{cat?.name} · {date}</div>
      </div>
      <div className={`tx-amount ${isExpense ? 'expense' : 'income'}`}>
        {isExpense ? '-' : '+'}{parseFloat(tx.amount).toFixed(3)}
      </div>
    </div>
  )
}
