import { supabase } from './supabase'

const KWD = n => `KWD ${(Number(n) || 0).toFixed(3)}`
const monthStart = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
const monthName = s => new Date(s).toLocaleString('en', { month: 'long' })

// Pulls everything the offline answers need in one round trip.
export async function loadFinancialSnapshot(profile) {
  const now = new Date()
  const thisMonth = monthStart(now)
  const prevMonth = monthStart(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  const [summaryRes, catRes, prevCatRes, goalsRes, budgetRes] = await Promise.all([
    supabase.from('vw_monthly_summary').select('*').order('month', { ascending: false }).limit(6),
    supabase.from('vw_category_spending').select('*').eq('month', thisMonth).order('total_spent', { ascending: false }),
    supabase.from('vw_category_spending').select('*').eq('month', prevMonth),
    supabase.from('savings_goals').select('*').eq('status', 'active'),
    supabase.from('monthly_budgets').select('*, categories(name)').eq('budget_month', thisMonth),
  ])

  const months = summaryRes.data || []
  const current = months.find(m => m.month === thisMonth) || null

  return {
    thisMonth,
    prevMonth,
    current,
    months,
    categories: catRes.data || [],
    prevCategories: prevCatRes.data || [],
    goals: goalsRes.data || [],
    budgets: budgetRes.data || [],
    spendingLimit: Number(profile?.monthly_spending_limit) || 0,
    income: Number(profile?.monthly_income) || 0,
    goalLabel: (profile?.main_financial_goal || '').replace(/_/g, ' '),
  }
}

function spendingOverview(s) {
  if (!s.current) return `No transactions recorded for ${monthName(s.thisMonth)} yet. Add a few and I'll break down where your money is going.`

  const income = Number(s.current.total_income) || 0
  const expenses = Number(s.current.total_expenses) || 0
  const net = income - expenses
  const rate = income > 0 ? Math.round((net / income) * 100) : null

  const lines = [
    `${monthName(s.thisMonth)} so far: ${KWD(income)} in, ${KWD(expenses)} out — net ${KWD(net)}.`,
  ]

  if (rate !== null) {
    lines.push(rate >= 20
      ? `You're keeping ${rate}% of your income. That's a healthy margin.`
      : rate >= 0
        ? `You're keeping ${rate}% of your income. Under 20% leaves little room for anything unexpected.`
        : `You're spending more than you earn this month. That gap has to close.`)
  }

  const top = s.categories[0]
  if (top) lines.push(`Biggest category is ${top.category_name} at ${KWD(top.total_spent)}.`)

  return lines.join('\n\n')
}

function budgetStatus(s) {
  const limit = s.spendingLimit
  if (!limit) return `You haven't set a monthly spending limit yet. Set one on the Budget tab and I can track you against it.`
  if (!s.current) return `Your limit is ${KWD(limit)}, but there's nothing recorded for ${monthName(s.thisMonth)} yet.`

  const spent = Number(s.current.total_expenses) || 0
  const pct = Math.round((spent / limit) * 100)
  const left = limit - spent

  const now = new Date()
  const daysIn = now.getDate()
  const daysTotal = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const expectedPct = Math.round((daysIn / daysTotal) * 100)

  const lines = [`${KWD(spent)} of ${KWD(limit)} — that's ${pct}%, with ${KWD(Math.max(0, left))} left.`]

  if (pct >= 100) {
    lines.push(`You're over budget by ${KWD(spent - limit)}. Worth pausing non-essentials for the rest of the month.`)
  } else if (pct > expectedPct + 10) {
    lines.push(`You're ${daysIn} days into a ${daysTotal}-day month, so you'd expect to be near ${expectedPct}%. You're running ahead.`)
  } else {
    lines.push(`You're ${daysIn} days in and tracking near the ${expectedPct}% you'd expect. On pace.`)
  }

  const daysLeft = daysTotal - daysIn
  if (daysLeft > 0 && left > 0) {
    lines.push(`That leaves about ${KWD(left / daysLeft)} per day for the remaining ${daysLeft} days.`)
  }

  return lines.join('\n\n')
}

function topCategories(s) {
  if (!s.categories.length) return `No categorised spending for ${monthName(s.thisMonth)} yet.`

  const total = s.categories.reduce((sum, c) => sum + Number(c.total_spent), 0)
  const rows = s.categories.slice(0, 5).map((c, i) => {
    const amt = Number(c.total_spent)
    const share = total > 0 ? Math.round((amt / total) * 100) : 0
    const prev = s.prevCategories.find(p => p.category_id === c.category_id)
    let delta = ''
    if (prev) {
      const diff = amt - Number(prev.total_spent)
      const pct = Number(prev.total_spent) > 0 ? Math.round((diff / Number(prev.total_spent)) * 100) : 0
      if (Math.abs(pct) >= 10) delta = diff > 0 ? `  (up ${pct}% on last month)` : `  (down ${Math.abs(pct)}% on last month)`
    }
    return `${i + 1}. ${c.category_name} — ${KWD(amt)}, ${share}% of spending${delta}`
  })

  return [`Top categories for ${monthName(s.thisMonth)}:`, rows.join('\n'), `Total tracked: ${KWD(total)} across ${s.categories.length} categories.`].join('\n\n')
}

function whereToCut(s) {
  if (!s.categories.length) return `Nothing recorded for ${monthName(s.thisMonth)} yet, so there's nothing to trim.`

  const discretionary = ['Restaurants', 'Coffee', 'Shopping', 'Entertainment', 'Food', 'Travel']
  const targets = s.categories.filter(c => discretionary.includes(c.category_name))

  if (!targets.length) {
    const top = s.categories[0]
    return `Your spending is mostly in essentials. The largest single line is ${top.category_name} at ${KWD(top.total_spent)} — worth checking whether any of it is avoidable.`
  }

  const trimTotal = targets.reduce((sum, c) => sum + Number(c.total_spent), 0)
  const rows = targets.slice(0, 4).map(c => {
    const amt = Number(c.total_spent)
    return `• ${c.category_name}: ${KWD(amt)} — cutting a quarter saves ${KWD(amt * 0.25)}`
  })

  return [
    `Discretionary spending is ${KWD(trimTotal)} this month. The realistic targets:`,
    rows.join('\n'),
    `Trimming 25% across these frees roughly ${KWD(trimTotal * 0.25)} a month, or ${KWD(trimTotal * 0.25 * 12)} a year.`,
  ].join('\n\n')
}

function savingsAdvice(s) {
  const income = s.income || (s.current ? Number(s.current.total_income) : 0)
  if (!income) return `I don't have an income figure for you yet. Add it in your profile and I'll work out a target.`

  const lines = [
    `On ${KWD(income)} a month: 20% is ${KWD(income * 0.2)}, which is the standard target. A leaner 10% is ${KWD(income * 0.1)}.`,
  ]

  if (s.current) {
    const actual = Number(s.current.total_income) - Number(s.current.total_expenses)
    lines.push(actual > 0
      ? `You're currently netting ${KWD(actual)} this month, so ${actual >= income * 0.2 ? "you're already clearing the 20% mark" : `you'd need another ${KWD(income * 0.2 - actual)} to hit 20%`}.`
      : `Right now you're not netting anything, so the first goal is getting back above zero.`)
  }

  const emergency = income * 3
  lines.push(`Worth building an emergency fund of ${KWD(emergency)} — three months of income — before anything else.`)

  return lines.join('\n\n')
}

function goalProgress(s) {
  if (!s.goals.length) return `You don't have any active savings goals. Add one on the Savings tab and I'll track the pace you need.`

  const blocks = s.goals.map(g => {
    const target = Number(g.target_amount)
    const saved = Number(g.current_amount)
    const remaining = Math.max(0, target - saved)
    const pct = target > 0 ? Math.round((saved / target) * 100) : 0

    const out = [`${g.icon || '🎯'} ${g.name}: ${KWD(saved)} of ${KWD(target)} — ${pct}%.`]

    if (g.target_date) {
      const days = Math.ceil((new Date(g.target_date) - new Date()) / 86400000)
      if (days > 0) {
        const perMonth = remaining / (days / 30.44)
        out.push(`${days} days left, so about ${KWD(perMonth)} a month to land it on time.`)
      } else {
        out.push(`The target date has passed and ${KWD(remaining)} is still outstanding.`)
      }
    } else {
      out.push(`${KWD(remaining)} to go. No target date set.`)
    }
    return out.join(' ')
  })

  const tip = s.categories.length
    ? `To move faster, the easiest lever is your discretionary spending — see "Where can I cut expenses?".`
    : ''

  return [blocks.join('\n\n'), tip].filter(Boolean).join('\n\n')
}

const ROUTES = [
  { keys: ['budget', 'on track', 'limit', 'over'],                 fn: budgetStatus },
  { keys: ['cut', 'reduce', 'save money', 'spend less', 'trim'],   fn: whereToCut },
  { keys: ['category', 'categories', 'top spend', 'breakdown'],    fn: topCategories },
  { keys: ['goal', 'apartment', 'target', 'faster'],               fn: goalProgress },
  { keys: ['save', 'saving', 'how much should'],                   fn: savingsAdvice },
  { keys: ['spend', 'spending', 'month', 'summary', 'overview'],   fn: spendingOverview },
]

// Answers from the user's real data when the AI endpoint is unavailable.
export function answerLocally(question, snapshot) {
  const q = (question || '').toLowerCase()
  const hit = ROUTES.find(r => r.keys.some(k => q.includes(k)))
  if (hit) return hit.fn(snapshot)

  return [
    spendingOverview(snapshot),
    `I'm running on offline analysis right now, so I can answer these directly:`,
    `• How is my spending this month?\n• Am I on track with my budget?\n• Where can I cut expenses?\n• How much should I save monthly?\n• Analyze my top spending categories\n• Tips to reach my savings goals faster`,
  ].join('\n\n')
}
