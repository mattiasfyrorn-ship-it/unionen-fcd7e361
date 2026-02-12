
# Fix Pairing + Add Email Invitation System

## Problem Analysis
The database logs confirm repeated "new row violates row-level security policy for table couples" errors. While the latest migration appears to have corrected the policy to PERMISSIVE, the pairing and email invitation flows need additional work:

1. **Pairing via code** -- may now work after the RLS fix but needs error handling improvements
2. **Email invitation** -- saves a record but never sends an actual email
3. **Auto-pairing on signup** -- no mechanism exists to link a new user to an existing couple via invitation

## Plan

### Step 1: Database Migration
- Create a database function `accept_invitation` (SECURITY DEFINER) that:
  - Takes an invitation token
  - Looks up the invitation, gets the couple_id
  - Updates the new user's profile with that couple_id
  - Marks the invitation as accepted
- Add a `token` column to `partner_invitations` (unique, auto-generated) for secure invitation links
- Create a trigger `on_signup_check_invitation` that runs after a new profile is created -- checks if the user's email matches any pending invitation and auto-pairs them

### Step 2: Edge Function `send-invitation`
- Create `supabase/functions/send-invitation/index.ts`
- Receives `{ email, inviterName, coupleId }` from the frontend
- Generates an invitation token, stores it in `partner_invitations`
- Sends an email using Supabase's built-in `auth.admin` (via Resend/SMTP configured in Lovable Cloud) with a signup link like: `https://unionen.lovable.app/auth?invite=TOKEN`
- Falls back to storing the invitation if email sending is not available

### Step 3: Update `Pairing.tsx`
- Better error logging: log the actual error to console for debugging
- For code pairing: add a retry with more descriptive error messages
- For email invites: call the `send-invitation` edge function instead of just inserting a row
- Show the invitation link so the user can manually share it if email doesn't arrive

### Step 4: Update `Auth.tsx`
- Read `?invite=TOKEN` from the URL on the signup page
- After successful signup, call the `accept_invitation` function to auto-pair
- Show a message like "Du har blivit inbjuden av [name]!" when an invite token is present

### Step 5: Auto-pair on signup (database trigger)
- A trigger on `profiles` INSERT checks `partner_invitations` for matching email
- If found, sets the new user's `couple_id` and marks invitation as accepted
- This handles the case where the user signs up normally (not via the link)

## Technical Details

### New edge function: `send-invitation`
- Uses CORS headers for browser access
- Validates the user is authenticated
- Constructs an invitation URL with a unique token
- Stores invitation in the database
- Uses Lovable AI or Resend for email delivery (with fallback)

### Database changes
- `partner_invitations`: add `token TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 16)`
- New function `handle_invitation_on_signup()` as trigger on profiles table
- RLS adjustments: allow reading invitations by token (for accepting)

### Files modified
- `supabase/functions/send-invitation/index.ts` (new)
- `supabase/config.toml` (add function config)
- `src/pages/Pairing.tsx` (update email flow)
- `src/pages/Auth.tsx` (handle invite token)
- `src/hooks/useAuth.tsx` (pass invitation acceptance after signup)
- Database migration for trigger + token column
