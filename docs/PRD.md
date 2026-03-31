# Fold Faster — Product Requirements Document

> **Version:** 1.0 | **Status:** 🧪 Testing | **Last Updated:** March 2026
> **Owner:** Sayog UK | **Repo:** github.com/raiadi/fold-faster | **Domain:** TBD

---

## 1. Product Overview

### Vision
A mobile-first poker decision trainer for beginner No-Limit Texas Hold'em players.
The Duolingo of beginner poker — short daily drills, instant AI feedback, and a
habit loop that makes practice feel like a game.

### Positioning
"The fastest way for new Hold'em players to stop making obvious mistakes."

### One-Line Summary
Short daily drills that teach beginners what hands to play, how position works,
and when to fold — with instant plain-English AI feedback.

### What This Is NOT
- NOT a GTO solver
- NOT a video course platform
- NOT a coaching marketplace
- NOT a multi-format trainer (Omaha, tournaments)
- NOT built for advanced players

---

## 2. Problem Statement

New poker players who know the rules still lose because they don't know:
- Which hands to play
- How position changes decisions
- When to bet / check / call / fold
- How to avoid obvious beginner mistakes

Free content exists but is fragmented and passive. Existing training products skew
toward broader libraries, GTO study, or serious players — creating a gap for
something simpler and more habit-forming for beginners.

---

## 3. Target Users

### Primary Persona — "Casual Losing Beginner"
- Knows hand rankings and basic rules
- Plays low-stakes cash games, home games, or micro-stakes online
- Wants to improve without studying like a pro
- Gets overwhelmed by long videos and charts
- Uses phone more than desktop for casual learning
- Ages 21–40

### Pain Points
- Plays too many hands
- Doesn't understand position
- Calls when should fold
- Overvalues weak hands
- Knows they're making mistakes, but not exactly which ones

### Do NOT Target
- Complete non-players
- Advanced grinders
- Tournament specialists
- Omaha players

---

## 4. Business Model

| Tier | Price       | Limits                                                        |
|------|-------------|---------------------------------------------------------------|
| Free | £0          | 3 sessions/day, Module 1 only, basic leak tracking            |
| Pro  | £8.99/month | Unlimited sessions, all 4 modules, full leak history          |

- **Trial:** 7-day free trial on Pro (no charge for 7 days, cancel any time)
- **Payment:** Stripe Checkout
- **Stripe Account:** sayog.team@gmail.com | FoldFaster | Sayog UK
- **Stripe Product ID:** prod_UCi4pd94ipkSLF
- **Stripe Price ID:** price_1TEIe7QfNxIoy1zgLNXTJIjb

---

## 5. Tech Stack

| Layer            | Technology                                      |
|------------------|-------------------------------------------------|
| Frontend         | React + Vite + Tailwind CSS                     |
| Auth + Database  | Supabase                                        |
| AI Feedback      | Anthropic Claude API (claude-sonnet-4-20250514) |
| Payments         | Stripe Checkout + Webhooks                      |
| Hosting          | Vercel (domain TBD)                             |
| Edge Functions   | Supabase Edge Functions (Deno/TypeScript)       |

### Design System
- Background: `#0f1923` (dark navy)
- Accent: `#22c55e` (green)
- Text: white / gray-400
- Mobile-first — all screens designed at 390px width

### Environment Variables

#### Frontend (.env)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ANTHROPIC_API_KEY=       # ⚠️ move server-side before launch
VITE_STRIPE_PUBLIC_KEY=
```

#### Supabase Secrets (server-side)
```
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
SITE_URL=
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 6. Database Schema

### users
| Column           | Type      | Notes                                              |
|------------------|-----------|----------------------------------------------------|
| id               | uuid, PK  |                                                    |
| email            | text      |                                                    |
| experience_level | text      | 'losing' \| 'beginner' \| 'regular'               |
| goal             | text      | 'starting_hands' \| 'position' \| 'stop_bad_calls' \| 'confidence' |
| created_at       | timestamp |                                                    |

### progress
| Column         | Type           | Notes                              |
|----------------|----------------|------------------------------------|
| id             | uuid, PK       |                                    |
| user_id        | uuid, FK       |                                    |
| xp             | integer        | default 0                          |
| streak         | integer        | default 0                          |
| last_active    | date           |                                    |
| current_module | integer        | default 1                          |
| level          | text           | 'bronze' \| 'silver' \| 'gold'    |

### sessions
| Column              | Type      | Notes |
|---------------------|-----------|-------|
| id                  | uuid, PK  |       |
| user_id             | uuid, FK  |       |
| scenarios_completed | integer   |       |
| correct_count       | integer   |       |
| created_at          | timestamp |       |

### leaks
| Column    | Type      | Notes                                                                   |
|-----------|-----------|-------------------------------------------------------------------------|
| id        | uuid, PK  |                                                                         |
| user_id   | uuid, FK  |                                                                         |
| leak_type | text      | 'loose_preflop' \| 'position_error' \| 'overcalling' \| 'overplaying' |
| frequency | integer   | default 1                                                               |
| last_seen | timestamp |                                                                         |

### module_completions
| Column       | Type     | Notes                          |
|--------------|----------|--------------------------------|
| id           | uuid, PK |                                |
| user_id      | uuid, FK |                                |
| module_id    | integer  |                                |
| best_correct | integer  |                                |
| completed    | boolean  |                                |
|              |          | UNIQUE (user_id, module_id)    |

### subscriptions
| Column                | Type      | Notes                                          |
|-----------------------|-----------|------------------------------------------------|
| id                    | uuid, PK  |                                                |
| user_id               | uuid, FK  |                                                |
| status                | text      | 'active' \| 'cancelled' \| 'trialing' \| 'past_due' |
| stripe_customer_id    | text      |                                                |
| stripe_subscription_id| text      |                                                |
| plan                  | text      |                                                |
| current_period_end    | timestamp |                                                |
| created_at            | timestamp |                                                |

---

## 7. Feature Specifications

### 7.1 Onboarding Flow ✅ BUILT
4-screen flow:
1. **Welcome** — headline, tagline, "Start free" CTA
2. **Experience Level** — 3 selectable cards
3. **Goal Selection** — 4 selectable cards
4. **Auth** — email/password signup + login path

On signup: save experience + goal to Supabase → redirect to skill check.

### 7.2 Skill Check ✅ BUILT
- 8 preflop scenarios shown one at a time
- Each shows: hole cards, position, action context
- Answer buttons: Fold / Call / Raise
- Claude API feedback after each answer (2–3 sentences, plain English)
- Results screen: score + top leak identified
- Saves baseline score + leak type to Supabase

### 7.3 Training Modules ✅ BUILT
4 modules × 15 scenarios = 60 total (src/data/moduleScenarios.js)

| Module | Topic                  | Scenarios |
|--------|------------------------|-----------|
| 1      | Starting Hands Basics  | 15        |
| 2      | Position Basics        | 15        |
| 3      | Facing a Raise         | 15        |
| 4      | Beginner Traps         | 15        |

- Completion threshold: 12/15 correct → module marked complete
- Unlocks next module automatically
- Saves completion to module_completions via upsert

### 7.4 Home Dashboard ✅ BUILT
- 🔥 Streak card (current day streak)
- XP progress bar (Bronze 0–500, Silver 501–1500, Gold 1501+)
- "Start today's drills" CTA button
- Top leaks card (top 2 recurring mistakes)
- 4 module cards with real completion %
- Upgrade banner (free users only)

### 7.5 Leak Tracker ✅ BUILT
Tags each wrong answer with a leak type:

| Leak Type      | Meaning                               |
|----------------|---------------------------------------|
| loose_preflop  | Played too many weak hands            |
| position_error | Ignored position in decision          |
| overcalling    | Called when should have folded        |
| overplaying    | Raised aggressively with weak hand    |

Shows top 3 leaks in plain English on dashboard and leaks screen.

### 7.6 Streak + XP System ✅ BUILT
- Complete a session: +50 XP
- All correct in session: +25 bonus XP
- 7-day streak milestone: +100 XP
- Streak increments if last_active = yesterday
- Streak resets to 1 if gap > 1 day
- No double-count if last_active = today

### 7.7 Stripe Paywall ✅ BUILT
Triggers:
- Session 4+ in a day (free users)
- Accessing Module 2, 3, or 4 (free users)
- Upgrade banner tap on home dashboard

Paywall screen:
- Headline: "Unlock your full training path"
- 3 green-check benefit bullets
- Price: "£8.99 / month — cancel anytime"
- CTA: "Start 7-day free trial"
- Footer: "No charge for 7 days"

Content gating: `subscriptions.status IN ('active', 'trialing')`

### 7.8 Supabase Edge Functions ✅ DEPLOYED

| Function             | URL                                                                          | Status                    |
|----------------------|------------------------------------------------------------------------------|---------------------------|
| create-checkout      | https://rcpclbtojfxvapuedwrz.supabase.co/functions/v1/create-checkout       | ✅ Live                   |
| stripe-webhook       | https://rcpclbtojfxvapuedwrz.supabase.co/functions/v1/stripe-webhook        | ✅ Live (verify_jwt=false) |
| skill-check-feedback | https://rcpclbtojfxvapuedwrz.supabase.co/functions/v1/skill-check-feedback  | ✅ Live                   |

Webhook events handled:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_failed

---

## 8. Success Metrics

| Metric                     | Target | Priority    |
|----------------------------|--------|-------------|
| Day 7 retention            | 25%+   | 🔴 Critical |
| Onboarding completion      | 60%+   | 🔴 Critical |
| First session completion   | 50%+   | 🔴 Critical |
| Paywall → trial conversion | 8%+    | 🟠 High     |
| Monthly churn              | <15%   | 🟠 High     |
| Sessions per user per week | 3+     | 🟡 Medium   |
| Scenarios per session      | 10+    | 🟡 Medium   |
| Free → paid conversion     | 5%+    | 🟡 Medium   |

---

## 9. MoSCoW Feature List

### ✅ Must Have (MVP — Built)
- Onboarding + auth
- Skill check with AI feedback
- 4 training modules (60 scenarios)
- Streak + XP system
- Leak tracker
- Home dashboard
- Stripe paywall + subscription gating
- Supabase Edge Functions

### 🔵 Should Have (v2)
- Daily challenge hand
- Push notifications / streak reminders
- Postflop basics module
- Leak trend over time
- Friend streaks / leaderboard
- Custom SMTP (SendGrid/Resend)

### 🟡 Could Have (v3)
- Native iOS/Android app
- AI coach chat
- Personalised study plans
- Hand history upload
- Session replay
- Social sharing (streak screenshots)

### 🚫 Won't Have
- GTO solver
- Video course library
- Coaching marketplace
- Omaha / tournament formats
- Real money integration

---

## 10. Roadmap

### v1 — MVP (Current) 🧪 Testing
- Preflop drills, skill check, streaks, paywall
- Goal: prove the habit loop + willingness to pay

### v2 — Retention
- Daily challenge, notifications, postflop module
- Goal: improve Day 7 retention to 35%+

### v3 — Growth
- Native mobile app, AI coach, social features
- Goal: viral growth + App Store presence

---

## 11. Launch Checklist

### ⚠️ Required Before Going Live
- [ ] Register Stripe webhook in Stripe Dashboard → Developers → Webhooks
- [ ] Set STRIPE_WEBHOOK_SECRET in Supabase secrets
- [ ] Move Anthropic API key server-side (remove VITE_ANTHROPIC_API_KEY from frontend)
- [ ] Re-enable Supabase email confirmation
- [ ] Set up custom SMTP (SendGrid or Resend)
- [ ] Switch Stripe from sandbox to live mode
- [ ] Assign domain and deploy to Vercel
- [ ] Test full flow with Stripe test card: 4242 4242 4242 4242
- [ ] Verify module_completions RLS policies
- [ ] Test subscription gating end-to-end

### 🚀 Launch Activities
- [ ] Post in r/learnpoker and r/poker (beta testers)
- [ ] Create TikTok/Reels "Would you fold this?" content
- [ ] Launch post on X (Twitter)
- [ ] Set up analytics (Vercel Analytics or PostHog)
- [ ] Set up error monitoring (Sentry)

---

## 12. Known Issues & Risks

| Issue                                      | Risk     | Status                    |
|--------------------------------------------|----------|---------------------------|
| Anthropic API key exposed in frontend      | 🔴 High  | ⚠️ Fix before launch      |
| Supabase email confirmation disabled       | 🟠 Medium| ⚠️ Re-enable before launch|
| No custom SMTP — Supabase rate limits      | 🟠 Medium| ⚠️ Set up SendGrid/Resend |
| Stripe webhook not yet registered          | 🔴 High  | ⏳ Pending                |
| No error monitoring                        | 🟡 Low   | 🔜 Add Sentry post-launch |
| No analytics tracking                      | 🟡 Low   | 🔜 Add PostHog post-launch|
| Retention risk — study feels like homework | 🔴 High  | Mitigated by streak/XP    |

---

## 13. Competitor Analysis

| Competitor        | Angle                         | Weakness                       | Our Edge                        |
|-------------------|-------------------------------|--------------------------------|---------------------------------|
| PokerCoaching.com | Pro coaches, video, quizzes   | Expensive, advanced, overwhelming | Simpler, cheaper, beginner-first |
| GTO Wizard        | Solver-heavy serious study    | Too complex for beginners      | Plain English, no solver needed |
| Poker Trainer     | Basic preflop charts          | Static, no feedback, outdated  | AI feedback, gamified           |
| Upswing Poker     | Course library, pro content   | Passive, not interactive       | Interactive daily drills        |

---

## 14. Change Log

| Date     | Version | Change                                              |
|----------|---------|-----------------------------------------------------|
| Mar 2026 | 0.1     | Project setup, Supabase, Stripe account             |
| Mar 2026 | 0.2     | Onboarding flow + auth                              |
| Mar 2026 | 0.3     | AI scenario engine + Claude feedback                |
| Mar 2026 | 0.4     | Home dashboard + streak system                      |
| Mar 2026 | 0.8     | 60 scenarios across 4 modules + completion tracking |
| Mar 2026 | 0.9     | Stripe paywall + subscription gating + Edge Functions |
| Mar 2026 | 0.9.1   | Claude model upgraded to claude-sonnet-4-20250514   |
| Mar 2026 | 0.9.2   | stripe-webhook bug fixed (verify_jwt=false)         |
| Mar 2026 | 1.0     | MVP complete — entering testing phase               |
