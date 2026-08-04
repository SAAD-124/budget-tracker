import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024

const PAYMENT_METHODS = [
  { val: 'cash', label: 'Cash' },
  { val: 'knet', label: 'KNET' },
  { val: 'credit_card', label: 'Credit Card' },
  { val: 'debit_card', label: 'Debit Card' },
  { val: 'bank_transfer', label: 'Bank Transfer' },
  { val: 'benefit', label: 'Benefit' },
  { val: 'stcpay', label: 'STC Pay' },
  { val: 'other', label: 'Other' },
]

export default function AddTransaction() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [merchant, setMerchant] = useState('')
  const [note, setNote] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [recurringInterval, setRecurringInterval] = useState('monthly')

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [receiptUrl, setReceiptUrl] = useState('')
  const [receiptPath, setReceiptPath] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { loadCategories() }, [type])
  useEffect(() => { if (isEdit) loadTx() }, [id])

  async function loadCategories() {
    const typeFilter = type === 'transfer' ? 'both' : type
    const { data } = await supabase
      .from('categories')
      .select('*')
      .or(`type.eq.${typeFilter},type.eq.both`)
      .order('sort_order')
    setCategories(data || [])
  }

  async function loadTx() {
    const { data } = await supabase.from('transactions').select('*').eq('id', id).single()
    if (data) {
      setType(data.type)
      setAmount(data.amount.toString())
      setTitle(data.title)
      setCategoryId(data.category_id || '')
      setPaymentMethod(data.payment_method || 'cash')
      setDate(data.transaction_date)
      setMerchant(data.merchant || '')
      setNote(data.note || '')
      setRecurring(data.recurring || false)
      setRecurringInterval(data.recurring_interval || 'monthly')
      setReceiptUrl(data.receipt_image || '')
    }
  }

  async function handleReceiptPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Receipt must be an image')
      return
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setError('Receipt must be under 5 MB')
      return
    }

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('receipts')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (upErr) {
      setError(`Upload failed: ${upErr.message}`)
      setUploading(false)
      return
    }

    const { data: pub } = supabase.storage.from('receipts').getPublicUrl(path)
    setReceiptUrl(pub.publicUrl)
    setReceiptPath(path)
    setUploading(false)
  }

  async function removeReceipt() {
    if (receiptPath) {
      await supabase.storage.from('receipts').remove([receiptPath])
    }
    setReceiptUrl('')
    setReceiptPath('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Title is required'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return }

    setLoading(true)

    const payload = {
      type, title: title.trim(),
      amount: parseFloat(amount),
      category_id: categoryId || null,
      payment_method: paymentMethod,
      transaction_date: date,
      merchant: merchant.trim() || null,
      note: note.trim() || null,
      recurring,
      recurring_interval: recurring ? recurringInterval : null,
      receipt_image: receiptUrl || null,
    }

    let err
    if (isEdit) {
      ;({ error: err } = await supabase.from('transactions').update(payload).eq('id', id))
    } else {
      ;({ error: err } = await supabase.from('transactions').insert(payload))
    }

    if (err) { setError(err.message); setLoading(false); return }
    navigate(-1)
  }

  async function handleDelete() {
    if (!confirm('Delete this transaction?')) return
    await supabase.from('transactions').delete().eq('id', id)
    navigate('/transactions')
  }

  return (
    <div className="add-tx">
      <div className="add-tx-header">
        <button className="btn-icon" onClick={() => navigate(-1)}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="page-title">{isEdit ? 'Edit Transaction' : 'Add Transaction'}</div>
        {isEdit && (
          <button className="btn-icon" style={{ background: 'var(--danger-l)', color: 'var(--danger)' }} onClick={handleDelete}>
            🗑
          </button>
        )}
      </div>

      <div className="type-toggle">
        {['expense', 'income', 'transfer'].map(t => (
          <button
            key={t}
            className={`type-btn ${t} ${type === t ? 'active' : ''}`}
            onClick={() => { setType(t); setCategoryId('') }}
          >
            {t === 'expense' ? '📤 Expense' : t === 'income' ? '📥 Income' : '🔄 Transfer'}
          </button>
        ))}
      </div>

      <div className="amount-input-wrap">
        <span className="amount-currency">KWD</span>
        <input
          type="number" className="amount-input" placeholder="0.000"
          value={amount} onChange={e => setAmount(e.target.value)}
          min="0" step="0.001" inputMode="decimal"
        />
      </div>

      {error && <div className="error-banner" style={{ margin: '0 20px 16px' }}>⚠️ {error}</div>}

      <form onSubmit={handleSubmit} className="add-tx-form">
        <div className="form-group">
          <label className="form-label">Title</label>
          <input
            type="text" className="form-input" placeholder="e.g. Lunch at Slider Station"
            value={title} onChange={e => setTitle(e.target.value)} required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <div className="cat-grid">
            {categories.map(c => (
              <button
                key={c.id} type="button"
                className={`cat-item ${categoryId === c.id ? 'selected' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                <span className="cat-emoji">{c.icon}</span>
                <span style={{ fontSize: 10 }}>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <div className="payment-grid">
            {PAYMENT_METHODS.map(p => (
              <button
                key={p.val} type="button"
                className={`pay-item ${paymentMethod === p.val ? 'selected' : ''}`}
                onClick={() => setPaymentMethod(p.val)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Merchant</label>
            <input
              type="text" className="form-input" placeholder="Optional"
              value={merchant} onChange={e => setMerchant(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Note</label>
          <textarea
            className="form-textarea" placeholder="Optional note..."
            value={note} onChange={e => setNote(e.target.value)} rows={2}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Receipt</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleReceiptPick}
          />

          {receiptUrl ? (
            <div className="receipt-preview">
              <img src={receiptUrl} alt="Receipt" className="receipt-thumb" />
              <div className="receipt-meta">
                <div className="receipt-name">Receipt attached</div>
                <a href={receiptUrl} target="_blank" rel="noreferrer" className="receipt-link">View full size</a>
              </div>
              <button type="button" className="receipt-remove" onClick={removeReceipt} aria-label="Remove receipt">
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="receipt-drop"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><span className="btn-spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /> Uploading…</>
              ) : (
                <>📷 Add receipt photo</>
              )}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Recurring transaction</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>

        {recurring && (
          <div className="form-group">
            <label className="form-label">Repeat</label>
            <select className="form-select" value={recurringInterval} onChange={e => setRecurringInterval(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        )}

        <div style={{ height: 8 }} />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <span className="btn-spinner" /> : isEdit ? 'Save Changes' : 'Add Transaction'}
        </button>
        <div style={{ height: 20 }} />
      </form>
    </div>
  )
}
