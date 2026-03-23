# Edge Functions

## skill-check-feedback

Calls the Anthropic API so the API key stays on the server and the browser avoids CORS.

### 1. Set the secret

In Supabase Dashboard: **Project Settings → Edge Functions → Secrets**, add:

- `ANTHROPIC_API_KEY` = your Anthropic API key

Or via CLI (from project root):

```bash
supabase secrets set ANTHROPIC_API_KEY=your_key_here
```

### 2. Deploy

```bash
supabase functions deploy skill-check-feedback
```

After deploying, the skill check in the app will use this function and feedback should load in Chrome.
