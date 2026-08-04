# Budget Tracker

A mobile-first personal expense tracker built for Kuwait, with all amounts in Kuwaiti Dinar (KWD, 3 decimal places).

## Features

- **Auth** — email/password registration with full name, age, and mobile; sessions handled by Supabase Auth
- **Onboarding** — 4-step setup capturing income, spending habits, savings goals, and budget preferences
- **Dashboard** — net balance card, monthly budget progress, income vs expenses trend (area chart), and spending by category (donut chart)
- **Transactions** — search, filter by type and category, grouped by date
- **Add / edit** — expense, income, or transfer with category, payment method (KNET, Benefit, STC Pay, and others), merchant, notes, recurring intervals, and receipt photo upload
- **Budgets** — overall and per-category limits with colour-coded progress
- **Savings goals** — targets with progress tracking and fund contributions
- **AI chat** — a financial assistant backed by a Supabase Edge Function calling the Anthropic API
- **Theming** — light and dark modes, plus system preference

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router 6 |
| Charts | Recharts |
| Backend | Supabase (Postgres 17, Auth, Storage, Edge Functions) |
| AI | Anthropic API via a Deno edge function |

## Getting started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Supabase setup

The client is configured in `src/lib/supabase.js`. The anon key is safe to expose — it is designed for browser use, and every table is protected by Row Level Security scoped to `auth.uid()`.

### Database

Six tables: `user_profiles`, `categories`, `transactions`, `monthly_budgets`, `savings_goals`, and `notifications`. Two reporting views, `vw_monthly_summary` and `vw_category_spending`, run with `security_invoker` so they respect the caller's RLS.

`user_id` columns default to `auth.uid()`, so the database stamps ownership server-side rather than trusting the client.

### Storage

A public `receipts` bucket holds receipt images. Upload, read, update, and delete are restricted by RLS to a folder named after the user's id, so users can only reach their own files.

### AI chat

The `ai-chat` edge function requires an Anthropic API key set as a secret:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key --project-ref <your-project-ref>
```

Without it the endpoint returns 503 and the chat shows a "not configured" message. The key stays server-side and is never exposed to the browser.

## Project structure

```
src/
  App.jsx              Auth context, routing, theme
  index.css            Global styles and design tokens
  lib/supabase.js      Supabase client
  components/
    BottomNav.jsx      Bottom tab navigation
  pages/
    Auth.jsx           Sign in and registration
    Onboarding.jsx     4-step setup
    Dashboard.jsx      Charts and summary
    Transactions.jsx   List, search, filters
    AddTransaction.jsx Add and edit, receipt upload
    Budget.jsx         Budget limits
    Savings.jsx        Savings goals
    AIChat.jsx         Financial assistant
    Profile.jsx        Settings and sign out
```
