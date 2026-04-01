# Fold Faster — Product Requirements Document

> **Version:** 1.7.0 | **Status:** 🚀 Pre-launch prep | **Last Updated:** 1 Apr 2026
> **Owner:** Sayog UK | **Domain:** fold-faster.vercel.app (custom TBD) | **Repo:** github.com/raiadi/fold-faster

---

## 1. Product Overview

### Vision
A mobile-first poker decision trainer for beginner No-Limit Texas Hold'em players.
The Duolingo of beginner poker — short daily drills, instant AI feedback, and a
habit loop that makes practice feel like a game.

### Positioning
"The fastest way for new Hold'em players to stop making obvious mistakes."

### One-Line Summary
Short daily drills that teach beginners positions, hand rankings, game flow, and
which hands to play — with instant plain-English AI feedback.

### What This Is NOT
- NOT a GTO solver
- NOT a video course platform
- NOT a coaching marketplace
- NOT a multi-format trainer (Omaha, tournaments)
- NOT built for advanced players

---

## 2. Problem Statement

New poker players who know the rules still lose because they don't know which hands
to play, how position changes decisions, when to fold, and how to avoid obvious
beginner mistakes. Free content exists but is fragmented and passive. Existing
training products skew toward GTO study or serious players — creating a gap for
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

---

## 4. Business Model

| Tier | Price | Limits |
|------|-------|--------|
| Free | £0 | 3 full module runs/module/day |
| Pro  | £8.99/month | Unlimited runs, all content |

**Trial:** 7-day free trial on Pro (no charge for 7 days, cancel any time)
**Payment:** Stripe Checkout
**Stripe Account:** sayog.team@gmail.com | FoldFaster | Sayog UK
**Stripe Product ID:** prod_UCi4pd94ipkSLF
**Stripe Price ID:** price_1TEIe7QfNxIoy1zgLNXTJIjb

### Free Tier Gating
- 3 full module runs per module per day (implemented in src/lib/runLimits.js)
- A "run" = one complete section session
- Ranges module: unlimited for all users (infinite variety)
- RunLimitModal shown on limit hit — never redirects, always modal
- Pro/trialing users: never gated

---

## 5. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Auth + Database | Supabase |
| AI Feedback | Anthropic Claude API (claude-sonnet-4-20250514) — server-side only |
| Payments | Stripe Checkout + Webhooks |
| Hosting | Vercel (fold-faster.vercel.app) |
| Edge Functions | Supabase Edge Functions (Deno/TypeScript) |

### Design System
- Background: `#0f1923` (dark navy)
- Accent: `#22c55e` (green)
- Text: white / gray-400
- Mobile-first — all screens designed at 390px width

### Environment Variables

**Frontend / Vercel**
```
VITE_SUPABASE_URL=https://rcpclbtojfxvapuedwrz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...   (JWT format)
VITE_STRIPE_PUBLIC_KEY=pk_live_...
# VITE_ANTHROPIC_API_KEY — REMOVED. Server-side via Edge Function.
```

**Supabase Secrets**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
SITE_URL=https://fold-faster.vercel.app
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 6. Database Schema

### module_completions (key table for new modules)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| user_id | uuid, FK | |
| module_id | integer | See map below |
| best_correct | integer | |
| completed | boolean | |
| | | UNIQUE (user_id, module_id) |

**module_id map:**
- 10 = Positions: Early
- 11 = Positions: Middle
- 12 = Positions: Late
- 20 = Hand Rankings
- 30 = Ranges: Early
- 31 = Ranges: Middle
- 32 = Ranges: Late
- 40 = Game Flow

### subscriptions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| user_id | uuid, FK | UNIQUE constraint added 31 Mar 2026 |
| status | text | active / trialing / cancelled / past_due |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| plan | text | |
| current_period_end | timestamp | |
| created_at | timestamp | |

Full schema for users, progress, sessions, leaks unchanged from v1.0.

---

## 7. Feature Specifications

### 7.1 Onboarding ✅ BUILT
- 4-screen flow: Welcome → Experience Level → Goal → Auth
- "Already have an account? Log in" link on Welcome screen
- On signup: saves experience + goal → redirects to skill check

### 7.2 Skill Check ✅ BUILT
- 8 preflop scenarios (Fold / Call / Raise)
- AI feedback via `skill-check-feedback` Edge Function
- Results: score + top leak saved to Supabase

### 7.3 Foundational Modules ✅ ALL BUILT

**Module order:** Positions (1) → Hand Rankings (2) → Game Flow (3) → Ranges (4)

| # | Module | module_ids | Questions | Threshold |
|---|--------|-----------|-----------|-----------|
| 1 | Positions | 10, 11, 12 | 50/section, 10/session | 90% |
| 2 | Hand Rankings | 20 | 15/tier × 3 + 20 Phase 2 | 90% |
| 3 | Game Flow | 40 | 50 hands, 10/session | 90% |
| 4 | Ranges | 30, 31, 32 | Infinite (generated) | 80% |

**Shared infrastructure:**
- `src/lib/moduleProgress.js` — `saveModuleProgress()` + `getModuleProgress()`
- `src/lib/runLimits.js` — `getRemainingRuns()` + `recordRun()` + `FREE_RUN_LIMIT=3`
- `src/components/PlayingCard.jsx` — rank, suit, size (sm/md/lg), faceDown props
- `src/components/PokerTable.jsx` — interactive table, playerCount/dealerIndex/bigBlindIndex props
- `src/components/RunLimitModal.jsx` — daily limit paywall modal

**Module 1 — Positions** (`src/screens/PositionsModule.jsx`)
- One dashboard card, three sections (Early/Middle/Late) via tabs
- Mode A: tap the correct seat | Mode B: name the highlighted seat
- Player count varies (6/7/9) — positions relative to dealer button
- 📊 reference: illustrated table diagram, position key, colour-coded by group
- Confidence check on first visit (localStorage)

**Module 2 — Hand Rankings** (`src/hand-rankings-trainer.jsx`)
- Phase 1: identify the hand type (4 options, confusion-map wrong answers)
- 3 tiers: obvious → subtle → trap (Straight Flush vs Straight, Full House vs Trips)
- Phase 2: which hand wins? Two 5-card hands, tap the winner
- 📊 reference: 1–10 ranked chart with PlayingCard examples per hand

**Module 3 — Game Flow** (`src/screens/GameFlowModule.jsx`)
- 10 shuffled hands × 4 streets = 40 questions per session
- PlayingCard with face-down backs, 300ms flip on street advance
- 5-slot community card board always visible
- Question types: street recognition, card counts, hand identification
- 📊 reference: 4-street explainer table

**Module 4 — Ranges** (`src/screens/RangesModule.jsx`)
- Three sections (Early/Middle/Late), one dashboard card
- Ranges: Early (9 hands, very tight) | Middle (adds KQo, suited connectors) | Late (adds A2s-A9s, connectors)
- Drill: two PlayingCards (hole cards) + position → Fold | Playable
- 📊 reference: full-screen 13×13 poker matrix, 100vw, no scroll
  - Colour: 🟢 Early > 🟡 Middle > 🔵 Late > 🔴 Fold
  - Bold pairs, monospace, suited/offsuit opacity split, sticky headers

**Hidden (preserved, reintroduce with Module 5):**
- Starting Hands Basics, Position Basics, Facing a Raise, Beginner Traps
- src/data/moduleScenarios.js — 60 Fold/Call/Raise scenarios

### 7.4 Home Dashboard ✅ BUILT
Module card order: 🪑 Positions | 🃏 Hand Rankings | 🎮 Game Flow | 🎯 Ranges
- Streak card, XP bar, upgrade banner (free users)
- Leaks card: HIDDEN until Module 5
- Old decision modules: HIDDEN until Module 5

### 7.5 Stripe Paywall ✅ BUILT
- Triggers: run limit hit, upgrade banner tap
- Gating: `subscriptions.status IN ('active', 'trialing')`
- Webhook: all 5 events handled, auto-writes subscription row on checkout

### 7.6 Supabase Edge Functions ✅ DEPLOYED

| Function | Notes |
|----------|-------|
| create-checkout | --no-verify-jwt, calls setAuth() before invoke |
| stripe-webhook | --no-verify-jwt, uses SUPABASE_SERVICE_ROLE_KEY for DB writes |
| skill-check-feedback | default JWT verification |
| claude-feedback | default JWT verification, replaced VITE_ANTHROPIC_API_KEY |

### 7.7 Auth ✅ BUILT
- persistSession, autoRefreshToken, detectSessionInUrl
- Email confirmation: ON
- SMTP: Resend (smtp.resend.com, port 465, user: resend, sender: onboarding@resend.dev)

---

## 8. Launch Checklist

### ✅ Done
- [x] Stripe webhook registered + STRIPE_WEBHOOK_SECRET set
- [x] STRIPE_SECRET_KEY (test), STRIPE_PRICE_ID corrected
- [x] Subscriptions RLS + missing columns + unique constraint
- [x] VITE_SUPABASE_ANON_KEY corrected
- [x] Webhook auto-write confirmed working end-to-end
- [x] Anthropic API key server-side (no src/ references)
- [x] VITE_ANTHROPIC_API_KEY removed from Vercel
- [x] Email confirmation enabled
- [x] Resend SMTP configured
- [x] Vercel env vars set (Supabase, Stripe public key)

### ⏳ Remaining
- [ ] Update Supabase Auth redirect URLs → https://fold-faster.vercel.app
- [ ] `supabase secrets set SITE_URL=https://fold-faster.vercel.app`
- [ ] Trigger Vercel redeploy
- [ ] Flip Stripe to live mode + new webhook + live secrets
- [ ] Full end-to-end test on live URL
- [ ] Custom domain (post-launch)
- [ ] Resend domain verification when domain acquired (post-launch)

### 🚀 Launch Activities
- [ ] Post in r/learnpoker and r/poker
- [ ] TikTok/Reels: "Would you fold this?" content
- [ ] Launch post on X (Twitter)
- [ ] Vercel Analytics or PostHog
- [ ] Sentry error monitoring

---

## 9. Roadmap

### v1 — Foundational Curriculum 🚀 Pre-launch
- 4 foundational modules, reference charts, Stripe, full auth

### v2 — Decisions + Retention
- Module 5: Decision Training (Fold/Play by street)
- Reintroduce 4 hidden decision modules as Advanced Pro
- Reintroduce leak tracker
- Daily challenge, push notifications, leak trends

### v3 — Growth
- Native iOS/Android, AI coach, social features

---

## 10. Change Log

| Date | Version | Change |
|------|---------|--------|
| Mar 2026 | 0.1–1.0 | Initial build: onboarding, skill check, 4 decision modules, streak/XP, Stripe, Edge Functions |
| 30 Mar 2026 | 1.0.1 | Stripe webhook + secrets fixed. create-checkout 401 fixed. Logout + login link added |
| 30 Mar 2026 | 1.0.2 | Subscriptions RLS applied. useSubscription → getSession(). Auth config fixed |
| 31 Mar 2026 | 1.0.3 | Full Stripe integration confirmed. Missing columns + unique constraint. Anon key fixed. Webhook auto-write confirmed |
| 31 Mar 2026 | 1.1.0 | Content pivot: new foundational curriculum. Old 4 modules hidden as Pro content |
| 31 Mar 2026 | 1.2.0 | Module 1 (Positions) + Module 2 (Hand Rankings) built and wired |
| 31 Mar 2026 | 1.3.0 | Supabase persistence for all modules via moduleProgress.js |
| 1 Apr 2026 | 1.4.0 | Module 3 (Game Flow) + Module 4 (Ranges) built. PlayingCard + PokerTable. 13×13 matrix. Reference charts in all modules |
| 1 Apr 2026 | 1.5.0 | Module order confirmed: Positions → Hand Rankings → Game Flow → Ranges |
| 1 Apr 2026 | 1.6.0 | Question pools expanded. Free tier 3 runs/day. Dashboard cleaned up |
| 1 Apr 2026 | 1.7.0 | Pre-launch: Anthropic key server-side confirmed. Email + SMTP live. Vercel env vars set |
