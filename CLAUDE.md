# Fold Faster — Claude Code Project Brief

## What This App Is
A mobile-first poker decision trainer for beginner No-Limit Texas Hold'em players.
Positioning: "Duolingo for beginner poker decision-making."
NOT a GTO solver. NOT a video course. NOT for advanced players.

## One-Line Summary
Short daily drills that teach beginners what hands to play, how position works,
and when to fold — with instant plain-English AI feedback.

## Target User
Casual low-stakes Hold'em players who know the rules but keep losing.
Ages 21–40. Play home games or micro-stakes online.
Want to improve without studying like a pro.

---

## Tech Stack
- Frontend: React + Vite + Tailwind CSS (mobile-first)
- Auth + Database: Supabase (email/password auth)
- AI Feedback: Anthropic Claude API (claude-sonnet-4-20250514)
- Payments: Stripe (Checkout + webhooks)
- Hosting: Vercel

## Design System
- Background: #0f1923 (dark navy)
- Accent: #22c55e (green)
- Text: white / gray-400
- Feel: Premium mobile app. Think Duolingo meets a poker table.
- All screens must be mobile-first and work well on phone browsers

---

## Supabase Schema

### users
- id (uuid, primary key)
- email (text)
- experience_level (text) — 'losing' | 'beginner' | 'regular'
- goal (text) — 'starting_hands' | 'position' | 'stop_bad_calls' | 'confidence'
- created_at (timestamp)

### progress
- id (uuid, primary key)
- user_id (uuid, foreign key → users.id)
- xp (integer, default 0)
- streak (integer, default 0)
- last_active (date)
- current_module (integer, default 1)
- level (text) — 'bronze' | 'silver' | 'gold'

### sessions
- id (uuid, primary key)
- user_id (uuid, foreign key → users.id)
- scenarios_completed (integer)
- correct_count (integer)
- created_at (timestamp)

### leaks
- id (uuid, primary key)
- user_id (uuid, foreign key → users.id)
- leak_type (text) — 'loose_preflop' | 'position_error' | 'overcalling' | 'overplaying'
- frequency (integer, default 1)
- last_seen (timestamp)

### subscriptions
- id (uuid, primary key)
- user_id (uuid, foreign key → users.id)
- status (text) — 'active' | 'cancelled' | 'trialing' | 'past_due'
- stripe_customer_id (text)
- stripe_subscription_id (text)
- plan (text) — 'monthly'
- created_at (timestamp)

---

## What's Already Built (DO NOT REBUILD)
- Full 4-step onboarding: Welcome → Experience Level → Goal → Signup
- Supabase Auth (email/password signup + login)
- 8-scenario skill check with Claude API feedback via Supabase Edge Function
- Session saving, XP system, streak tracking, leak detection
- Home dashboard: streak card, XP bar, top leaks, upgrade banner
- Placeholder module system (labels exist, no content yet)

---

## What Still Needs Building

### TASK 1 — Module Content + Completion Tracking
The module system exists but:
- Has no real scenario content (currently hardcoded/empty)
- Completion % is hardcoded to 0
- No completion tracking in Supabase

Build 4 modules with 15 scenarios each:

**Module 1: Starting Hands Basics**
- Premium hands (AA, KK, QQ, AK suited) — always raise
- Playable hands by position (JJ, TT, AQ, KQ)
- Trash hands to fold (K2o, J4o, Q6o, 83o etc.)
- Suited vs offsuit basics

**Module 2: Position Basics**
- Early position: play tight (UTG, UTG+1)
- Middle position: slightly wider range
- Late position / Button advantage: can play more hands
- Blind defence: when to defend vs fold

**Module 3: Facing a Raise**
- When to call a raise with your hand
- When to fold even decent hands (dominated)
- Common overcalls beginners make (A7o vs raise, KJo vs UTG raise)
- 3-betting basics

**Module 4: Beginner Traps**
- Overplaying Ace-rag (A5o, A7o) in wrong spots
- Limping habits and why they're weak
- Dominated hands (KJo vs KQ, QTo vs AQ)
- Overvaluing suited cards

Each scenario must include:
- hole_cards (e.g. "K♠ 7♦")
- position (Early / Middle / Late / Button / Small Blind / Big Blind)
- action (e.g. "Folded to you" / "Player raised 3x from UTG")
- correct_answer ('fold' | 'call' | 'raise')
- explanation (2-3 sentences, plain English, no jargon without explanation)
- leak_type (tag wrong answers: loose_preflop | position_error | overcalling | overplaying)
- module_id (1–4)
- difficulty ('beginner')

Completion tracking:
- Mark module complete in Supabase progress table when user gets 12/15 correct
- Unlock next module automatically
- Show real completion % on module cards

### TASK 2 — Stripe Paywall + Subscription Gating

**Free tier limits:**
- Maximum 3 training sessions per day
- Access to Module 1 only
- Basic leak tracking

**Paid tier (£8.99/month):**
- Unlimited daily sessions
- All 4 modules + future modules
- Full leak history and trends
- 7-day free trial

**Paywall screen triggers:**
- User tries to start session 4+ in a day
- User tries to access Module 2, 3, or 4
- Upgrade banner tap on home dashboard

**Paywall screen UI:**
- Headline: "Unlock your full training path"
- 3 benefit bullets with green checkmarks
- Price: "£8.99 / month — cancel anytime"
- CTA button: "Start 7-day free trial"
- Small text: "No charge for 7 days. Cancel any time."

**Stripe setup:**
- Use Stripe Checkout (simplest for MVP)
- Product: Fold Faster Pro, £8.99/month, 7-day trial
- On checkout success: update subscriptions table in Supabase
  (status = 'trialing' or 'active', store stripe_customer_id)
- Gate premium content: check subscriptions.status IN ('active', 'trialing')
- Handle these webhook events via Supabase Edge Function:
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_failed

---

## Claude API Usage Rules
- Model: claude-sonnet-4-20250514
- Always include header: "anthropic-version": "2023-06-01"
- Always include header: "anthropic-dangerous-direct-browser-access": "true" (dev only)
- System prompt must always say: "You are a poker training coach for beginners.
  Always use plain English. Never use poker jargon without explaining it first.
  Keep all explanations to 2-3 sentences maximum."
- API key is in .env as VITE_ANTHROPIC_API_KEY
- TODO before launch: move all Claude API calls to a Supabase Edge Function
  to keep the API key server-side

---

## XP + Level System
- Complete a session: +50 XP
- All correct in session: +25 bonus XP
- 7-day streak milestone: +100 XP
- Level thresholds:
  - Bronze: 0–500 XP
  - Silver: 501–1500 XP
  - Gold: 1501+ XP

## Streak Rules
- Increment streak if last_active was yesterday
- Do not double-count if last_active was today
- Reset to 1 if last_active was 2+ days ago

---

## Key Reminders
- NEVER rebuild what's already working (onboarding, auth, skill check, dashboard)
- Always check existing components before creating new files
- Mobile-first on every screen — test at 390px width
- Keep AI feedback in plain English — if it sounds like a poker forum, rewrite it
- After completing each task, run: git add . && git commit -m "[description]" && git push
- Stripe account: sayog.team@gmail.com | Account name: FoldFaster | Org: Sayog UK
- Supabase email confirmation is currently disabled for dev — re-enable before launch
- Set up custom SMTP (SendGrid or Resend) before launch

---

## Environment Variables Required
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ANTHROPIC_API_KEY=
VITE_STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY= (server-side / Edge Function only)
STRIPE_WEBHOOK_SECRET= (server-side / Edge Function only)

---

## Definition of Done for MVP
- [ ] User can sign up and complete onboarding
- [ ] Skill check runs with real Claude API feedback
- [ ] All 4 modules have real scenario content
- [ ] Module completion tracking works and saves to Supabase
- [ ] Free tier is gated at 3 sessions/day and Module 1 only
- [ ] Stripe paywall screen shows at correct triggers
- [ ] Stripe Checkout works with 7-day trial
- [ ] Subscription status gates premium content
- [ ] Streak and XP update correctly after each session
- [ ] Leak tracker shows top 3 recurring mistakes
- [ ] All changes pushed to GitHub