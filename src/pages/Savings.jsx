import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const KWD = n => parseFloat(n || 0).toFixed(3)
const PCT = (a, b) => b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0

const ICONS = ['🏠', '🚗', '✈️', '💍', '📱', '🎓', '🏥', '💰', '🏋️', '🎮', '🛍️', '🌴']
const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#EC4899', '#F97316']

export default function Savings() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [fundGoal, setFundGoal] = useState(null)

  useEffect(() => { loadGoals() }, [])

  async function loadGoals() {
    const { data } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: false })
    setGoals(data || [])
    setLoading(false)
  }

  const totalSaved = goals.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0)
  const totalTarget = goals.reduce((s, g) => s + parseFloat(g.target_amount || 0), 0)
  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Savings Goals</div>
          <div className="page-subtitle">{activeGoals.length} active</div>
        </div>
        <button className="btn-icon" onClick={() => setShowAdd(true)} style={{ fontSize: 22 }}>+</button>
      </div>

      {goals.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 4 }}>
          <div className="card-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total Saved</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--secondary)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                {KWD(totalSaved)} <span style={{ fontSize: 12, fontWeight: 500 }}>KWD</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total Target</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                {KWD(totalTarget)} <span style={{ fontSize: 12, fontWeight: 500 }}>KWD</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <div className="empty-title">No savings goals yet</div>
          <div className="empty-desc">Set a goal and track your progress towards it</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowAdd(true)}>
            Create Goal
          </button>
        </div>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <>
              <div className="section-label">Active Goals</div>
              {activeGoals.map(g => (
                <GoalCard key={g.id} goal={g} onFund={() => setFundGoal(g)} onRefresh={loadGoals} />
              ))}
            </>
          )}

          {completedGoals.length > 0 && (
            <>
              <div className="section-label">Completed 🎉</div>
              {completedGoals.map(g => (
                <GoalCard key={g.id} goal={g} onRefresh={loadGoals} />
              ))}
            </>
          )}
        </>
      )}

      {showAdd && <AddGoalModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadGoals() }} />}
      {fundGoal && <FundGoalModal goal={fundGoal} onClose={() => setFundGoal(null)} onSaved={() => { setFundGoal(null); loadGoals() }} />}
    </div>
  )
}

function GoalCard({ goal, onFund, onRefresh }) {
  const pct = PCT(goal.current_amount, goal.target_amount)
  const isComplete = goal.status === 'completed'
  const daysLeft = goal.target_date
    ? Math.max(0, Math.ceil((new Date(goal.target_date) - new Date()) / 86400000))
    : null

  async function updateStatus(status) {
    await supabase.from('savings_goals').update({ status }).eq('id', goal.id)
    onRefresh()
  }

  return (
    <div className="goal-card">
      <div className="goal-card-header">
        <div className="goal-icon" style={{ background: `${goal.color || '#4F46E5'}20` }}>
          {goal.icon || '🎯'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="goal-name">{goal.name}</div>
          <div className="goal-target">Target: KWD {KWD(goal.target_amount)}</div>
        </div>
        <div className={`goal-status ${goal.status}`}>{isComplete ? '✅ Done' : goal.status}</div>
      </div>

      <div className="goal-progress-row">
        <span className="goal-saved">KWD {KWD(goal.current_amount)}</span>
        <span className="goal-pct">{pct}%</span>
      </div>
      <div className="goal-bar">
        <div
          className="goal-fill"
          style={{ width: `${pct}%`, background: isComplete ? 'var(--secondary)' : goal.color || 'var(--primary)' }}
        />
      </div>

      <div className="goal-date">
        {goal.target_date && (
          isComplete ? '🎊 Goal reached!' : `${daysLeft} days left · ${new Date(goal.target_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
        )}
      </div>

      {!isComplete && (
        <div className="goal-actions">
          {onFund && (
            <button className="btn btn-secondary btn-sm" onClick={onFund}>
              + Add Funds
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => updateStatus('paused')}>
            Pause
          </button>
        </div>
      )}
    </div>
  )
}

function AddGoalModal({ onClose, onSaved }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [current, setCurrent] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [icon, setIcon] = useState('🎯')
  const [color, setColor] = useState('#4F46E5')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name || !target) return
    setSaving(true)
    await supabase.from('savings_goals').insert({
      name, icon, color,
      target_amount: parseFloat(target),
      current_amount: parseFloat(current) || 0,
      target_date: targetDate || null,
      status: 'active',
    })
    onSaved()
  }

  return (
    <BottomSheet onClose={onClose} title="New Savings Goal">
      <div className="form-stack">
        <div className="form-group">
          <label className="form-label">Goal Name</label>
          <input type="text" className="form-input" placeholder="e.g. New Car" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Pick an Icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {ICONS.map(i => (
              <button key={i} type="button" onClick={() => setIcon(i)}
                style={{ width: 40, height: 40, borderRadius: 12, border: `2px solid ${icon === i ? 'var(--primary)' : 'var(--border)'}`, fontSize: 20, background: 'var(--surface)', cursor: 'pointer' }}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Color</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${color === c ? 'var(--text)' : 'transparent'}`, cursor: 'pointer' }} />
            ))}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Target (KWD)</label>
            <input type="number" className="form-input" placeholder="0.000" value={target} onChange={e => setTarget(e.target.value)} min="0" step="0.001" />
          </div>
          <div className="form-group">
            <label className="form-label">Already Saved</label>
            <input type="number" className="form-input" placeholder="0.000" value={current} onChange={e => setCurrent(e.target.value)} min="0" step="0.001" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Target Date (Optional)</label>
          <input type="date" className="form-input" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <span className="btn-spinner" /> : 'Create Goal'}
        </button>
      </div>
    </BottomSheet>
  )
}

function FundGoalModal({ goal, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!amount || parseFloat(amount) <= 0) return
    setSaving(true)
    const newAmount = parseFloat(goal.current_amount) + parseFloat(amount)
    const isComplete = newAmount >= parseFloat(goal.target_amount)
    await supabase.from('savings_goals').update({
      current_amount: newAmount,
      status: isComplete ? 'completed' : 'active',
    }).eq('id', goal.id)
    onSaved()
  }

  return (
    <BottomSheet onClose={onClose} title={`Add Funds — ${goal.name}`}>
      <div className="form-stack">
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 32 }}>{goal.icon}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            KWD {KWD(goal.current_amount)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>of KWD {KWD(goal.target_amount)}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Amount to Add (KWD)</label>
          <input type="number" className="form-input" placeholder="0.000" value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.001" autoFocus />
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <span className="btn-spinner" /> : 'Add Funds'}
        </button>
      </div>
    </BottomSheet>
  )
}

function BottomSheet({ onClose, title, children }) {
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
        maxHeight: '90dvh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{title}</div>
        {children}
      </div>
    </div>
  )
}
