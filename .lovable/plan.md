

## Two Issues Found

### Issue 1: GHL Webhook Not Sent After Invite Registration

The `register-invited-user` flow in `Auth.tsx` (lines 100-118) never calls `notify-partner-paired`. After successful registration and sign-in, it just relies on `onAuthStateChange` to redirect. The `acceptAndNotify` function (which calls `notify-partner-paired`) is only used for already-logged-in users accepting invites, not for new registrations.

**Fix**: After successful sign-in on line 110, call `notify-partner-paired` with the invite token, display name, and couple_id (returned from the edge function).

Also, `register-invited-user` currently only returns `{ success: true, userId }` — it needs to also return `couple_id` so the client can pass it to `notify-partner-paired`.

### Issue 2: `token_hash=undefined` in Password Reset Link

The `send-password-reset` edge function extracts `token_hash` from the `action_link` returned by `generateLink`. The link format from the admin API is typically `https://<project>.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=...` — it does NOT contain `token_hash` as a query param. The code on line 54 looks for `token_hash` in query params and hash fragment, finds neither, and gets `null`/`undefined`.

**Fix**: Parse the correct parameter from the action link. The admin `generateLink` returns `properties.hashed_token` directly in the response data — use `linkData.properties.hashed_token` instead of trying to parse it from the URL.

### Changes

**1. `supabase/functions/send-password-reset/index.ts`**
- Replace URL parsing logic with `linkData.properties.hashed_token` to get the correct token hash.

**2. `supabase/functions/register-invited-user/index.ts`**
- Return `couple_id` in the success response alongside `userId`.

**3. `src/pages/Auth.tsx`**
- After successful invite registration + sign-in, call `notify-partner-paired` with `{ inviteToken, inviteeName: displayName, coupleId: fnData.couple_id }`.

