

# Fix push notifications + banner/heads-up style

## Diagnosis

The backend works -- edge function returns `sent: 1` and VAPID keys are configured. Both users have push subscriptions in the database. The problems are likely:

1. **Expired Apple push subscription** -- Mattias's subscription (Apple endpoint) was created Feb 20 and may have expired/become invalid
2. **Service worker `push` event** -- needs `requireInteraction: true` for persistent banner-style notifications
3. **No re-subscription logic** -- if a subscription expires, there's no auto-refresh
4. **Missing notification actions** -- no tap-to-open actions configured

## Plan

### 1. Update `public/sw.js` -- better notification options

- Add `requireInteraction: true` so the notification stays visible as a banner (not silently dismissed)
- Add `actions` array for quick interaction (e.g., "Öppna")
- Ensure `silent: false` is explicitly set so device vibrates/sounds

### 2. Update `src/lib/pushNotifications.ts` -- auto-refresh stale subscriptions

- When `subscribeToPush` finds an existing subscription, check if the endpoint is still valid by comparing against stored subscription
- Add logic to re-subscribe if the existing subscription might be stale (older than 7 days)
- Add better error logging to surface issues

### 3. Update `src/pages/Account.tsx` -- auto-resubscribe on page load

- When the user visits the account page and push is enabled, silently re-subscribe to refresh the subscription endpoint
- This ensures expired Apple/FCM subscriptions get replaced

### 4. Update edge function payload

- In `supabase/functions/send-push-notification/index.ts`, add `requireInteraction: true` and `silent: false` to the payload so the service worker can pass them through

## Files changed

| File | Change |
|------|--------|
| `public/sw.js` | Add `requireInteraction`, `actions`, ensure banner-style display |
| `src/lib/pushNotifications.ts` | Force re-subscribe to refresh stale endpoints, better error handling |
| `src/pages/Account.tsx` | Auto-refresh subscription when push is enabled on page load |
| `supabase/functions/send-push-notification/index.ts` | Add banner notification flags to payload |

