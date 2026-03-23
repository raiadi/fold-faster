// Supabase Edge Function: creates a Stripe Checkout session for the Pro plan.
// Required secrets (set via: supabase secrets set KEY=value):
//   STRIPE_SECRET_KEY   — your Stripe secret key (sk_live_... or sk_test_...)
//   STRIPE_PRICE_ID     — price ID of the £8.99/month product with 7-day trial
//   SITE_URL            — your deployed site URL, e.g. https://fold-faster.vercel.app
//
// Deploy: supabase functions deploy create-checkout

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth: get the calling user from the JWT in the Authorization header
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const priceId = Deno.env.get('STRIPE_PRICE_ID');
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

    if (!stripeKey || !priceId) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID secrets.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create Stripe Checkout session
    const body = new URLSearchParams({
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'subscription_data[trial_period_days]': '7',
      'success_url': `${siteUrl}/home?checkout=success`,
      'cancel_url': `${siteUrl}/paywall`,
      'customer_email': user.email ?? '',
      'metadata[user_id]': user.id,
      'client_reference_id': user.id,
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.json().catch(() => ({}));
      const message = err.error?.message || stripeRes.statusText || 'Stripe error';
      return new Response(
        JSON.stringify({ error: message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const session = await stripeRes.json();
    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
