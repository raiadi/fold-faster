// Calls the create-checkout Edge Function and redirects to Stripe Checkout.
import { supabase } from './supabase';

export async function redirectToCheckout() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    supabase.functions.setAuth(session.access_token);
  }
  const { data, error } = await supabase.functions.invoke('create-checkout', {});

  if (error) throw new Error(error.message || 'Could not start checkout');
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('No checkout URL returned');

  window.location.href = data.url;
}
