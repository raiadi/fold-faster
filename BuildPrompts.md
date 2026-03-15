CURSOR PROMPT 1 — Project Setup
Clone the starter template:
git clone https://github.com/raiadi/react-vite-tailwind-starter fold-faster
cd fold-faster && rm -rf .git && git init && npm install && npm run dev

Set up Supabase:
- Create project at supabase.com
- Enable Email/Password auth
- Create these tables:

users: id, email, created_at
progress: id, user_id, xp, streak, last_active, current_module, level
sessions: id, user_id, scenarios_completed, correct_count, created_at
leaks: id, user_id, leak_type, frequency, last_seen
subscriptions: id, user_id, status, stripe_customer_id, plan

Add .env with:
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ANTHROPIC_API_KEY=
VITE_STRIPE_PUBLIC_KEY=

Wire up Supabase client in /src/lib/supabase.js
Create /src/lib/claude.js and /src/lib/stripe.js as empty service files.

CURSOR PROMPT 2 — Onboarding Flow
Build a 4-screen onboarding flow using React Router.
Style it mobile-first with Tailwind. Dark background (#0f1923), 
green accent (#22c55e), white text. Feels like a premium mobile app.

Screen 1 — Welcome
- Logo/icon (playing card or chip)
- Headline: "Stop making costly poker mistakes"
- Subhead: "Daily drills for beginner Hold'em players. 5 minutes a day."
- CTA button: "Start free"

Screen 2 — Experience level
- "Where are you right now?"
- 3 options as selectable cards:
  "I know the rules but always lose"
  "I've played a few times"  
  "I play regularly but want to improve"

Screen 3 — Goal selection
- "What's your main goal?"
- 4 options as selectable cards:
  "Learn which hands to play"
  "Understand position"
  "Stop making bad calls"
  "Build confidence before real games"

Screen 4 — Auth
- Simple email + password signup
- "Start training free" CTA
- "Already have an account? Log in" link

After signup, save experience + goal to Supabase users table and 
route to the skill check.

CURSOR PROMPT 3 — Skill Check + Scenario Engine
Build the core training screen. This is the most important screen in the app.

Skill Check (8 scenarios):
- Show hole cards (use emoji suits: ♠♥♦♣ or simple card components)
- Show position (Early / Middle / Late / Button / Blind)
- Show simplified action (e.g. "Folded to you" or "Player raised 3x")
- Three answer buttons: FOLD / CALL / RAISE
- On answer: call Claude API with this prompt:

System: "You are a poker training coach for beginners. 
Always respond in plain English. Never use poker jargon without explaining it. 
Keep explanations to 2-3 sentences maximum."

User: "The player held [CARDS] in [POSITION] position. 
The action was: [ACTION]. They chose to [DECISION]. 
Was this correct? Explain why in 2-3 simple sentences. 
Start with either 'Good fold.' 'Good call.' 'Good raise.' or 
'You should have folded/called/raised here.' "

- Display feedback in a coloured panel: green = correct, red = incorrect
- Track correct/incorrect in local state
- After 8 scenarios, route to skill check results screen

Results screen:
- Show score (e.g. "5/8 correct")
- Show top leak identified (based on which types they got wrong)
- "Start your training path" CTA
- Save baseline score + leak to Supabase

CURSOR PROMPT 4 — Home Dashboard + Streak System
Build the home dashboard — the screen users return to every day.

Layout (mobile-first, scrollable):
- Top bar: App name + settings icon
- Streak card: 🔥 [X] day streak, "Keep it going!"
- XP progress bar: "Level [N] — [X] XP to next level"
  Level thresholds: Bronze 0-500 XP, Silver 501-1500, Gold 1501+
- Today's training CTA: large green button "Start today's drills"
- Your top leaks: small card showing top 2 recurring mistakes
- Module progress: show current module + % complete
- If free user: subtle upgrade banner at bottom

Streak logic:
- On session complete: check if last_active was yesterday → increment streak
- If last_active was today: don't double-count
- If last_active was 2+ days ago: reset streak to 1
- Store in Supabase progress table

XP awards:
- Complete a session: +50 XP
- All correct in session: +25 bonus XP  
- Daily streak milestone (7 days): +100 XP

CURSOR PROMPT 5 — Leak Tracker + Module Progression
Build the learning intelligence layer.

Leak tracking:
- Every wrong answer is tagged with a leak type:
  "loose_preflop" — played too many weak hands
  "position_error" — ignored position in decision
  "overcalling" — called when should fold
  "overplaying" — raised too aggressively with weak hand
- After each session, upsert leak frequency to Supabase leaks table
- On leaks screen: show top 3 leaks with plain-English descriptions
  e.g. "You play too many weak hands from early position. 
  This is your most expensive habit."

Module progression:
Build 4 modules in /src/data/modules.js:

Module 1: Starting Hands Basics
- Premium hands (AA, KK, QQ, AK)
- Playable hands by position
- Trash hands to fold

Module 2: Position Basics  
- Early position: play tight
- Button advantage
- Blind defence basics

Module 3: Facing a Raise
- When to call a raise with your hand
- When to fold even good hands
- Common overcalls beginners make

Module 4: Beginner Traps
- Overplaying Ace-rag
- Limping habits
- Dominated hands

Each module = 15 scenarios. Mark complete in Supabase when 
12/15 correct. Unlock next module automatically.

CURSOR PROMPT 6 — Stripe Paywall + Subscription
Implement the freemium paywall.

Free tier limits:
- 3 training sessions per day maximum
- Access to Module 1 only
- Basic leak tracking

Paid tier (£8.99/month):
- Unlimited daily drills
- All 4 modules + future modules
- Full leak history and trends
- Priority scenario personalisation

Paywall screen triggers:
- When free user tries to start session 4
- When free user tries to access Module 2+
- Upgrade banner tap on home screen

Paywall screen UI:
- Headline: "Unlock your full training path"
- 3 benefit bullets with green checkmarks
- Price: "£8.99 / month — cancel anytime"
- CTA: "Start 7-day free trial"
- Small text: "No charge for 7 days"

Stripe integration:
- Use Stripe Checkout (simplest for MVP)
- On subscribe success: update subscriptions table in Supabase
- Check subscription status on app load
- Gate premium content based on subscriptions.status = 'active'

Use VITE_STRIPE_PUBLIC_KEY from .env.
Set up Stripe webhook endpoint (use Supabase Edge Functions) 
to handle subscription lifecycle events.