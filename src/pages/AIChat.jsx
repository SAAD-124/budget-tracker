import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { loadFinancialSnapshot, answerLocally } from '../lib/insights'

const SUGGESTIONS = [
  'How is my spending this month?',
  'Am I on track with my budget?',
  'Where can I cut expenses?',
  'How much should I save monthly?',
  'Analyze my top spending categories',
  'Tips to reach my savings goals faster',
]

const SYSTEM_MSG = {
  role: 'system',
  content: `You are a direct, no-nonsense financial advisor built into a personal budget tracker for Kuwait. You have access to the user's financial data and give specific, actionable advice — not generic tips. You use KWD (Kuwaiti Dinar) throughout. You're efficient and clear: no padding, no unnecessary caveats, no apologies. When you see numbers, you comment on the actual data. You speak like a sharp colleague who happens to know a lot about personal finance — helpful, precise, and occasionally blunt when the numbers demand it. Keep responses concise (3-5 sentences for simple questions, a short structured list for analysis). Never refuse to discuss the user's own financial data.`
}

export default function AIChat() {
  const { session, profile } = useAuth()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hey ${profile?.full_name?.split(' ')[0] || 'there'}! I'm your financial AI. I can see your transactions, budgets, and savings goals — ask me anything about your money.`
    }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [offline, setOffline] = useState(false)
  const snapshotRef = useRef(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  // Cached so the offline path doesn't refetch on every question.
  async function getSnapshot() {
    if (!snapshotRef.current) {
      snapshotRef.current = await loadFinancialSnapshot(profile)
    }
    return snapshotRef.current
  }

  async function send(text) {
    const userMsg = text || input.trim()
    if (!userMsg || thinking) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setThinking(true)

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      const token = currentSession?.access_token

      const res = await fetch(`https://fxdnrufajxezvnyvkipn.supabase.co/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: newMessages.slice(-10),
          systemMessage: SYSTEM_MSG.content,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Service unavailable' }))
        throw new Error(err.error || 'Failed to get response')
      }

      const data = await res.json()
      setOffline(false)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      // AI unavailable (no key, quota, network). Answer from real data instead
      // of showing an error -- the tab stays useful either way.
      try {
        const snapshot = await getSnapshot()
        setOffline(true)
        setMessages(prev => [...prev, { role: 'assistant', content: answerLocally(userMsg, snapshot) }])
      } catch {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I couldn't reach the AI service or read your data just now. Try again in a moment.`
        }])
      }
    }
    setThinking(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="chat-screen" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div className="chat-header">
        <div className={`chat-ai-tag ${offline ? 'offline' : ''}`}>
          <div className="chat-ai-dot" />
          {offline ? 'Offline Analysis' : 'AI Powered'}
        </div>
        <div className="chat-title">Financial AI</div>
        <div className="chat-subtitle">
          {offline ? 'Reading your data directly · Speaks KWD' : 'Powered by Claude · Speaks KWD'}
        </div>
      </div>

      {messages.length === 1 && (
        <div className="chat-suggestions">
          {SUGGESTIONS.map(s => (
            <button key={s} className="suggestion-chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role === 'user' ? 'user' : 'ai'}`}>
            {m.role === 'assistant' && (
              <div className="chat-avatar">🤖</div>
            )}
            <div className="chat-bubble" style={{ whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="chat-msg ai">
            <div className="chat-avatar">🤖</div>
            <div className="chat-bubble">
              <div className="chat-typing">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder="Ask about your finances..."
          value={input}
          onChange={e => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
          }}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="chat-send"
          onClick={() => send()}
          disabled={!input.trim() || thinking}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
