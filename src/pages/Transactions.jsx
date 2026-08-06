import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ListSkeleton } from '../components/Skeleton'

const KWD = n => parseFloat(n || 0).toFixed(3)

export default function Transactions() {
  const navigate = useNavigate()
  const [txs, setTxs] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')

  useEffect(() => { loadCats() }, [])
  useEffect(() => { loadTxs() }, [search, typeFilter, catFilter])

  async function loadCats() {
    const { data } = await supabase.from('categories').select('id, name, icon').order('name')
    setCats(data || [])
  }

  async function loadTxs() {
    setLoading(true)
    let q = supabase
      .from('transactions')
      .select('*, categories(name, icon, color)')
      .order('transaction_date', { ascending: false })
      .limit(100)

    if (search) q = q.ilike('title', `%${search}%`)
    if (typeFilter !== 'all') q = q.eq('type', typeFilter)
    if (catFilter !== 'all') q = q.eq('category_id', catFilter)

    const { data } = await q
    setTxs(data || [])
    setLoading(false)
  }

  const grouped = txs.reduce((acc, tx) => {
    const d = new Date(tx.transaction_date)
    const key = d.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(tx)
    return acc
  }, {})

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Transactions</div>
          <div className="page-subtitle">{txs.length} records</div>
        </div>
        <button className="btn-icon" onClick={() => navigate('/add')}>+</button>
      </div>

      <div className="tx-search">
        <span className="tx-search-icon">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          type="text" placeholder="Search transactions..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="tx-filter-row">
        {[
          { val: 'all', label: 'All' },
          { val: 'expense', label: '📤 Expense' },
          { val: 'income', label: '📥 Income' },
          { val: 'transfer', label: '🔄 Transfer' },
        ].map(f => (
          <button
            key={f.val}
            className={`filter-chip ${typeFilter === f.val ? 'active' : ''}`}
            onClick={() => setTypeFilter(f.val)}
          >
            {f.label}
          </button>
        ))}
        {cats.slice(0, 6).map(c => (
          <button
            key={c.id}
            className={`filter-chip ${catFilter === c.id ? 'active' : ''}`}
            onClick={() => setCatFilter(catFilter === c.id ? 'all' : c.id)}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <ListSkeleton rows={7} />
      ) : txs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No transactions found</div>
          <div className="empty-desc">Try adjusting your search or filters</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/add')}>
            Add Transaction
          </button>
        </div>
      ) : (
        <div className="tx-list">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="tx-date-group">
              <div className="tx-date-label">{date}</div>
              {items.map(tx => (
                <TxCard key={tx.id} tx={tx} onClick={() => navigate(`/edit/${tx.id}`)} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TxCard({ tx, onClick }) {
  const cat = tx.categories
  const isExpense = tx.type === 'expense'
  const isIncome = tx.type === 'income'

  return (
    <div className="tx-card" onClick={onClick}>
      <div className="tx-icon" style={{ background: cat?.color ? `${cat.color}20` : 'var(--surface2)' }}>
        {cat?.icon || '💳'}
      </div>
      <div className="tx-info">
        <div className="tx-title">
          {tx.title}
          {tx.receipt_image && <span className="tx-receipt-badge" title="Receipt attached">📎</span>}
        </div>
        <div className="tx-meta">
          {cat?.name && `${cat.name} · `}
          {tx.payment_method?.replace(/_/g, ' ')}
          {tx.merchant && ` · ${tx.merchant}`}
        </div>
      </div>
      <div className={`tx-amount ${isExpense ? 'expense' : isIncome ? 'income' : ''}`}>
        {isExpense ? '-' : isIncome ? '+' : ''}{KWD(tx.amount)}
      </div>
    </div>
  )
}
