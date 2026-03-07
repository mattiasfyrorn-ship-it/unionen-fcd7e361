

## Plan: Split GHL webhook into two separate calls (buyer + partner)

### What changes

Modify the `notify-partner-paired` edge function to send **two separate webhook POST requests** when a couple is paired:

1. **Buyer webhook** → sent to the existing `GHL_COUPLE_PAIRED_WEBHOOK_URL` with event `"buyer_connected"` and the new flat payload format
2. **Partner webhook** → sent to `https://services.leadconnectorhq.com/hooks/4tOGnrR93KwicWUuAMjo/webhook-trigger/85w9PolTRd0uBagG7iV6` with event `"partner_connected"` and the matching flat payload format

### Payload structure (both use same shape, swapping buyer/partner perspective)

Each webhook includes: `event`, `secret` (hardcoded value from your spec), `email`, `first_name`, `last_name`, `phone`, `user_id`, `pair_id`, `role`, `partner_name`, `partner_email`, `pair_label`.

### Technical details

**File: `supabase/functions/notify-partner-paired/index.ts`**

- Replace the single `webhookBody` construction and single `fetch()` call with two separate payloads and two separate `fetch()` calls
- Partner webhook URL is hardcoded (or stored as a new secret — but since you provided it directly, I will hardcode it like the secret string)
- The `secret` field uses the value `"hamnen_2026_03__p9K6w8rT2nV4aQ7xY1mD3sF5gH9jK4567sdgfGF"` directly in the payload (no longer from env var in the body, though `X-HAMNEN-SECRET` header can remain)
- Both webhooks must succeed (or be logged) before marking `ghl_day1_started_at`
- The `directToGhl` passthrough mode and email notification logic remain unchanged

### New secret needed

A new secret `GHL_PARTNER_WEBHOOK_URL` for the partner webhook URL, or hardcode it. I will hardcode it since you provided the URL directly. If you prefer it as a secret, let me know.

