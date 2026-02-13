
# Fix: Email Invitation and Premature Pairing

## Problem 1: Emails don't actually send
The current approach uses `auth.admin.inviteUserByEmail` which fails for already-registered users ("A user with this email address has already been registered"). Even for new users, delivery is unreliable. The UI says "mail skickats" regardless.

**Solution:** Stop claiming emails were sent. Instead, generate the invite link and clearly present it as the primary sharing method. Update the toast message to say "Inbjudningslank skapad" instead of "mail skickats". The link is the reliable mechanism.

## Problem 2: Premature "Ni ar ihopkopplade!"
When sending an email invite, the edge function creates a `couple` record and sets the inviter's `couple_id` immediately -- before the partner has even signed up. Then `Pairing.tsx` checks `profile?.couple_id` and shows the "paired" screen, hiding all pairing options.

**Solution:** Don't set the inviter's `couple_id` until the partner actually accepts. The edge function should only create the invitation record with a `couple_id` placeholder (create the couple but don't link the inviter yet). Or better: don't create the couple at all until the partner accepts -- store only the inviter_id in the invitation and create the couple + link both users when the invitation is accepted.

## Changes

### 1. Edge function `send-invitation/index.ts`
- Remove the "create couple and set inviter's couple_id" logic
- Only store the invitation with `inviter_id`, `invitee_email`, and `token`
- Remove `auth.admin.inviteUserByEmail` (unreliable)
- Return the invite link URL
- The couple will be created when the partner accepts

### 2. Database function `accept_invitation`
- Update to create the couple at acceptance time
- Set `couple_id` on BOTH the inviter and the accepter profiles
- Mark invitation as accepted

### 3. `Pairing.tsx`
- Remove the early return when `profile?.couple_id` is set (the "Ni ar ihopkopplade" blocker)
- Instead show a status indicator at the top if paired, but still allow the user to see the page
- Actually, keep the paired state but only show it when BOTH partners have `couple_id` set -- check if partner exists in the couple
- Change toast text from "Ett mail har skickats" to "Inbjudningslank skapad! Dela lanken med din partner."
- Always show the invite link prominently after creating an invitation

### 4. `Pairing.tsx` - verify pairing is real
- After `refreshProfile()`, check if there's actually another user in the same couple before showing "ihopkopplade"
- Query profiles table for another user with same `couple_id`
- Only show paired state when both users exist

## Technical Details

### Edge function changes (send-invitation/index.ts)
- Remove lines 49-74 (couple creation + profile update)
- Store invitation with just `inviter_id`, `invitee_email`, `token` (no `couple_id` needed yet)
- Update the `partner_invitations` table: make `couple_id` nullable or create couple later
- Since `couple_id` is NOT NULL in the table, we need a migration to make it nullable OR we create the couple but don't link the inviter

Better approach: keep creating the couple (to satisfy NOT NULL), but do NOT update the inviter's profile. The couple record exists as a placeholder. When partner accepts, link both profiles.

### Database migration
- Update `accept_invitation` function to also set the inviter's `couple_id`:
  ```sql
  -- Set couple_id on BOTH inviter and accepter
  UPDATE profiles SET couple_id = v_couple_id WHERE user_id = v_inviter_id;
  UPDATE profiles SET couple_id = v_couple_id WHERE user_id = p_user_id;
  ```

### Pairing.tsx verification
- Add a check: query for partner profile with same `couple_id` and different `user_id`
- Only show "ihopkopplade" if a partner is found
- Otherwise show all pairing options with a note "Vantar pa att din partner ska acceptera"

### Files modified
- `supabase/functions/send-invitation/index.ts` -- stop linking inviter's profile
- `src/pages/Pairing.tsx` -- verify partner exists before showing paired state, fix toast messages
- Database migration -- update `accept_invitation` to link both users
