# Edge Functions

## Secrets (Anthropic)

Set once for all functions that call Claude:

```bash
supabase secrets set ANTHROPIC_API_KEY=your_key_here
```

(Dashboard: **Project Settings → Edge Functions → Secrets**.)

**Do not** put the Anthropic key in `VITE_*` env vars — it would ship to the browser.

---

## claude-feedback (primary — used by the app)

Generic Claude feedback with **JWT required** (`verify_jwt = true`). The frontend calls this via `supabase.functions.invoke` (session token sent automatically).

**Deploy:**

```bash
supabase functions deploy claude-feedback
```

---

## skill-check-feedback (legacy)

Older function with the same Anthropic secret; the **skill check UI now uses `claude-feedback`** via `src/lib/claude.js`. You can keep this deployed for backward compatibility or remove it after migrating any external callers.

```bash
supabase functions deploy skill-check-feedback
```
