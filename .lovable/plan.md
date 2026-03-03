

## Plan: Couple Paired → GHL Webhook

### Overview
When two users become paired, send a webhook to GHL with both users' details so GHL can start the Day 1 email sequence. This will be implemented as an enhancement to the existing `notify-partner-paired` Edge Function (which already runs at the exact right moment).

### Database Changes

1. **Add `ghl_day1_started_at` column to `couples` table** — timestamp, nullable, default null. Used for idempotency (only send webhook once per couple).

2. **Add `phone` column to `profiles` table** — text, nullable. Currently profiles don't store phone numbers but the webhook payload requires it.

### Secret to Add

- `GHL_COUPLE_PAIRED_WEBHOOK_URL` — value: `https://services.leadconnectorhq.com/hooks/4tOGnrR93KwicWUuAMjo/webhook-trigger/40e13ea2-6299-49de-a1d5-951727b8ec65`

The existing `GHL_WEBHOOK_SECRET` secret can be reused as the outbound secret header.

### Edge Function Changes

**Modify `notify-partner-paired/index.ts`** to add GHL webhook logic after the existing email notifications:

1. After sending confirmation emails, look up the `couple_id` for the paired users
2. Check `couples.ghl_day1_started_at` — if already set, skip (idempotency)
3. Fetch both users' profiles, emails, and `ghl_links` data
4. Determine buyer vs partner: the user with a `ghl_links` entry is the "buyer" (came from GHL), the other is the "partner"
5. POST the webhook payload to `GHL_COUPLE_PAIRED_WEBHOOK_URL` with:
   - `X-HAMNEN-SECRET` header (from `GHL_WEBHOOK_SECRET`)
   - Full JSON body with `event`, `pair_id`, `paired_at`, `buyer`, `partner` objects
6. If webhook returns 200: update `couples.ghl_day1_started_at = now()`
7. Log couple_id, emails, status code (no secrets)

### Trigger Points

The webhook is already called from two places (no changes needed):
- **`Auth.tsx`** line 22: after `accept_invitation` RPC succeeds (invite flow)
- **`Pairing.tsx`** line 97: after `pair_with_partner` RPC succeeds (code flow)

Both pass through `notify-partner-paired`, so the GHL webhook will fire regardless of pairing method.

### Additional: `pair_with_partner` RPC path

The `pair_with_partner` flow in `Pairing.tsx` calls `notify-partner-paired` but passes an empty `inviteToken`. The Edge Function currently requires the invite token to look up the couple. We need to update the function to also accept a `coupleId` parameter directly, so it works for both pairing methods (invite-based and code-based).

### Summary of Changes

| Component | Change |
|---|---|
| DB migration | Add `ghl_day1_started_at` to `couples`, `phone` to `profiles` |
| Secret | Add `GHL_COUPLE_PAIRED_WEBHOOK_URL` |
| `notify-partner-paired` | Add GHL webhook POST + idempotency check; support `coupleId` param |
| `Pairing.tsx` | Pass `coupleId` from `refreshProfile` result to notify function |

