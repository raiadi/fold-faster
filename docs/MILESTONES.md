<!--
  Purpose: Operational scope control—one small, shippable, testable milestone at a time.
  Update when: A milestone ships, scope changes, or acceptance criteria are clarified.
  Cursor/agents should implement work against the current milestone unless told otherwise.
-->

# Milestones

> **What this file is:** The most important operational doc for sequencing work. Each milestone is **small**, **shippable**, **testable**, and **user-facing** when possible. Prefer pointing agents at *one milestone* instead of “improve the app.”

## Milestone 1 — Secure AI feedback

**Goal:** Remove Anthropic API usage from frontend and move feedback generation server-side.

**Acceptance criteria:**

- No Anthropic secret in frontend env vars
- Skill check feedback works through Supabase Edge Function
- Frontend calls only the secure endpoint
- Errors are handled gracefully in UI

## Milestone 2 — Stripe subscription verification

**Goal:** Make paywall gating reliable.

**Acceptance criteria:**

- Stripe webhook updates subscriptions table correctly
- Free users are blocked from premium modules
- Trialing and active users can access premium features
- Subscription state refreshes correctly after checkout

## Milestone 3 — Analytics foundation

**Goal:** Track key user funnel events.

**Acceptance criteria:**

- Track onboarding_started
- Track onboarding_completed
- Track skill_check_started
- Track skill_check_completed
- Track paywall_viewed
- Track checkout_started
- Track trial_started
