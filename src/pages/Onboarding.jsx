import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const EXPENSE_TYPES = [
  { label: '🍔 Food', value: 'food' },
  { label: '🏠 Rent', value: 'rent' },
  { label: '🚗 Transport', value: 'transport' },
  { label: '🛍️ Shopping', value: 'shopping' },
  { label: '💊 Health', value: 'health' },
  { label: '✈️ Travel', value: 'travel' },
  { label: '🎮 Entertainment', value: 'entertainment' },
  { label: '📚 Education', value: 'education' },
]

const GOALS = [
  { label: '🏠 Buy a home', value: 'buy_house' },
  { label: '🚗 Buy a car', value: 'buy_car' },
  { label: '✈️ Travel fund', value: 'travel' },
  { label: '💰 Emergency fund', value: 'emergency_fund' },
  { label: '📈 Investments', value: 'investment' },
  { label: '💍 Wedding', value: 'wedding' },
]

export default function Onboarding() {
  const { session, setProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [data, setData] = useState({
    employment_status: '',
    monthly_income: '',
    has_additional_income: false,
    biggest_expenses: [],
    usual_monthly_spending: '',
    finance_check_freq: '',
    currently_saving: false,
    monthly_savings_amount: '',
    main_financial_goal: '',
    wants_monthly_budget: true,
    monthly_spending_limit: '',
    spending_alerts: true,
    weekly_reports: false,
    monthly_reports: true,
  })

  const set = (k, v) => setData(p => ({ ...p, [k]: v }))
  const toggleArr = (arr, val) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

  const steps = [
    { title: 'Your Income', desc: 'Help us understand your financial situation so we can give you better insights.' },
    { title: 'Spending Habits', desc: "Tell us what you usually spend money on and how often you check your finances." },
    { title: 'Savings & Goals', desc: "What are you working toward? We'll help you get there." },
    { title: 'Budget Setup', desc: "Set up alerts and reports to stay on track." },
  ]

  const cur = steps[step - 1]

  async function finish() {
    setSaving(true)
    const userId = session.user.id
    const payload = {
      ...data,
      monthly_income: parseFloat(data.monthly_income) || 0,
      monthly_savings_amount: parseFloat(data.monthly_savings_amount) || 0,
      monthly_spending_limit: parseFloat(data.monthly_spending_limit) || 0,
      onboarding_completed: true,
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .upsert({ id: userId, ...payload })
      .select()
      .single()

    if (profile) setProfile(profile)
    navigate('/')
  }

  return (
    <div className="onboarding">
      <div className="ob-header">
        <div className="ob-progress-bar">
          <div className="ob-progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
        <div className="ob-step-label">Step {step} of 4</div>
        <div className="ob-title">{cur.title}</div>
        <div className="ob-desc">{cur.desc}</div>
      </div>

      <div className="ob-body">
        {step === 1 && (
          <div className="form-stack">
            <div className="form-group">
              <label className="form-label">Employment Status</label>
              <select className="form-select" value={data.employment_status} onChange={e => set('employment_status', e.target.value)}>
                <option value="">Select status</option>
                <option value="employee">Employed (Government / Private)</option>
                <option value="business_owner">Self-Employed / Business Owner</option>
                <option value="freelancer">Freelancer</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Income (KWD)</label>
              <input
                type="number" className="form-input" placeholder="e.g. 1200"
                value={data.monthly_income} onChange={e => set('monthly_income', e.target.value)}
                min="0" step="0.001"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Do you have additional income sources?</label>
              <div className="toggle-group">
                <button type="button" className={`toggle-opt ${data.has_additional_income ? 'selected' : ''}`} onClick={() => set('has_additional_income', true)}>
                  Yes
                </button>
                <button type="button" className={`toggle-opt ${!data.has_additional_income ? 'selected' : ''}`} onClick={() => set('has_additional_income', false)}>
                  No
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-stack">
            <div className="form-group">
              <label className="form-label">Biggest Monthly Expenses (select all that apply)</label>
              <div className="multi-select" style={{ marginTop: 8 }}>
                {EXPENSE_TYPES.map(e => (
                  <button
                    key={e.value}
                    type="button"
                    className={`multi-chip ${data.biggest_expenses.includes(e.value) ? 'selected' : ''}`}
                    onClick={() => set('biggest_expenses', toggleArr(data.biggest_expenses, e.value))}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Usual Monthly Spending (KWD)</label>
              <input
                type="number" className="form-input" placeholder="e.g. 800"
                value={data.usual_monthly_spending} onChange={e => set('usual_monthly_spending', e.target.value)}
                min="0" step="0.001"
              />
            </div>
            <div className="form-group">
              <label className="form-label">How often do you check your finances?</label>
              <select className="form-select" value={data.finance_check_freq} onChange={e => set('finance_check_freq', e.target.value)}>
                <option value="">Select frequency</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="rarely">Rarely</option>
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-stack">
            <div className="form-group">
              <label className="form-label">Are you currently saving money?</label>
              <div className="toggle-group">
                <button type="button" className={`toggle-opt ${data.currently_saving ? 'selected' : ''}`} onClick={() => set('currently_saving', true)}>Yes</button>
                <button type="button" className={`toggle-opt ${!data.currently_saving ? 'selected' : ''}`} onClick={() => set('currently_saving', false)}>No</button>
              </div>
            </div>
            {data.currently_saving && (
              <div className="form-group">
                <label className="form-label">Monthly Savings Amount (KWD)</label>
                <input
                  type="number" className="form-input" placeholder="e.g. 200"
                  value={data.monthly_savings_amount} onChange={e => set('monthly_savings_amount', e.target.value)}
                  min="0" step="0.001"
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Main Financial Goal</label>
              <div className="multi-select" style={{ marginTop: 8 }}>
                {GOALS.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    className={`multi-chip ${data.main_financial_goal === g.value ? 'selected' : ''}`}
                    onClick={() => set('main_financial_goal', g.value)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="form-stack">
            <div className="form-group">
              <label className="form-label">Set a monthly spending limit? (KWD)</label>
              <input
                type="number" className="form-input" placeholder="e.g. 1000"
                value={data.monthly_spending_limit} onChange={e => set('monthly_spending_limit', e.target.value)}
                min="0" step="0.001"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Spending Alerts</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Budget alerts</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Notify when 80% and 100% of budget is spent</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={data.spending_alerts} onChange={e => set('spending_alerts', e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reports</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { key: 'weekly_reports', label: 'Weekly spending summary' },
                  { key: 'monthly_reports', label: 'Monthly financial report' },
                ].map(r => (
                  <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{r.label}</div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={data[r.key]} onChange={e => set(r.key, e.target.checked)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div style={{ height: 20 }} />
      </div>

      <div className="ob-footer">
        {step > 1 && (
          <button className="btn btn-ghost" style={{ width: 'auto', flex: 1 }} onClick={() => setStep(s => s - 1)}>
            Back
          </button>
        )}
        {step < 4 ? (
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(s => s + 1)}>
            Continue
          </button>
        ) : (
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={finish} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : '🎉 Let\'s Go!'}
          </button>
        )}
      </div>
    </div>
  )
}
