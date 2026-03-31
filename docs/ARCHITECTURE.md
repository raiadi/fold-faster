<!--
  Purpose: Turn the PRD into concrete implementation rules so engineers and AI assistants
  make consistent stack, security, and structure choices without guessing.
  Update when: Stack changes, new app sections ship, or security/priority shifts.
-->

# Architecture

> **What this file is:** The technical source of truth for *how* Fold Faster is built—stack, boundaries, and non-negotiables. Read `docs/PRD.md` for *what* to build; read this for *how* to build it safely and consistently.

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Supabase
- Auth: Supabase Auth
- Payments: Stripe Checkout + Webhooks
- AI: Claude via Supabase Edge Functions
- Hosting: Vercel

## Principles

- Mobile-first at 390px width
- Keep components small and reusable
- Business logic should not live in UI components when avoidable
- Never expose secret keys in frontend
- AI calls must go through server-side functions
- Stripe logic must be server-side only
- Use typed data shapes for scenarios, progress, leaks, modules, subscriptions

## App sections

- Onboarding
- Skill Check
- Dashboard
- Modules
- Leaks
- Paywall
- Account / Subscription

## Security

- Move Anthropic API calls server-side
- Verify RLS for user-owned tables
- Never trust client subscription state without server verification

## Current priorities

1. Fix exposed Anthropic key
2. Verify Stripe webhook + subscription sync
3. Add analytics
4. Add error monitoring
5. Improve retention loop
