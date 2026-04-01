/**
 * Map Supabase Auth errors to user-facing copy (signup).
 * @returns {{ message: string, kind: 'email_exists' | 'password' | 'email_invalid' | 'generic' }}
 */
export function mapSignupError(err) {
  const raw = (err?.message || '').trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes('already registered')
    || lower.includes('user already registered')
    || lower.includes('already been registered')
    || err?.code === 'user_already_exists'
  ) {
    return {
      kind: 'email_exists',
      message:
        'An account with this email already exists. Log in instead?',
    };
  }

  if (
    lower.includes('password') && (lower.includes('6') || lower.includes('at least'))
  ) {
    return { kind: 'password', message: 'Password must be at least 6 characters' };
  }

  if (
    lower.includes('invalid email')
    || lower.includes('validate email')
    || lower.includes('email address')
    || err?.code === 'email_address_invalid'
  ) {
    return { kind: 'email_invalid', message: 'Please enter a valid email address' };
  }

  return { kind: 'generic', message: 'Something went wrong. Please try again.' };
}

/** Friendly login errors */
export function mapLoginError(err) {
  const lower = (err?.message || '').toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Wrong email or password. Try again or reset your password.';
  }
  return err?.message || 'Something went wrong. Please try again.';
}
