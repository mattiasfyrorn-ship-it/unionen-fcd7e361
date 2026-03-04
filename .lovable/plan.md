

## Problem

When a partner registers via an invite link, the app calls `supabase.auth.signUp()` on the client side. This triggers the built-in email confirmation flow, but the default confirmation emails from the authentication system are not being delivered (no custom email domain or templates are configured for auth emails).

The partner has already proven email ownership by clicking the invite link, so requiring a second email verification is redundant.

## Solution

Create a new Edge Function `register-invited-user` that creates the partner account server-side with email already confirmed (same pattern as the GHL webhook). This skips the verification email entirely.

### Flow Change

```text
Current:
  Partner clicks invite link → fills form → supabase.auth.signUp() → "check email" → ❌ no email arrives

New:
  Partner clicks invite link → fills form → Edge Function creates user (pre-confirmed) → auto-login → paired
```

### Changes

**1. New Edge Function: `supabase/functions/register-invited-user/index.ts`**
- Accepts `{ email, password, displayName, inviteToken }`
- Validates the invite token is pending (via `partner_invitations` table)
- Creates user via `auth.admin.createUser` with `email_confirm: true`
- Signs in the user and returns the session
- The existing `handle_new_user` trigger + `handle_invitation_on_signup` trigger will handle profile creation and pairing automatically

**2. Update `src/pages/Auth.tsx`**
- When signing up with an invite token, call the `register-invited-user` Edge Function instead of `supabase.auth.signUp()`
- On success, set the session directly and navigate to home (pairing happens via DB triggers)
- Remove the "check your email" toast for invite signups

**3. Config: `supabase/config.toml`**
- Add `[functions.register-invited-user]` with `verify_jwt = false` (user doesn't have a JWT yet)

### Security
- The Edge Function validates the invite token before creating the account
- Only pending invitations are accepted
- The invite token acts as authorization (same as clicking a magic link)

