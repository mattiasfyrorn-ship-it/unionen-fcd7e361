

# Fix: Push notifications not working

## Problems Found

1. **PushInitializer is empty** — `App.tsx` imports push functions but `PushInitializer` just returns `null`. No auto-refresh happens on app load. Subscriptions only refresh if the user visits Account settings.

2. **All push subscriptions are stale** — Both stored subscriptions are 20-30 days old (7-day threshold). Stale tokens = push providers reject the notification.

3. **Daily reminder cron never fires** — Zero logs for the `daily-reminder` function. The external cron service needs to be configured to call it hourly.

## Fix Plan

### 1. Restore PushInitializer logic
In `src/App.tsx`, make `PushInitializer` actually call `refreshPushSubscription` on app load when a user is logged in. This ensures subscriptions stay fresh every time the user opens the app.

### 2. Clean up stale subscriptions in database
The current stale subscriptions (20-30 days old) will be automatically replaced once users open the app with the fixed `PushInitializer`.

### 3. Set up daily-reminder cron
The `daily-reminder` edge function exists but nothing is calling it. Options:
- **Option A**: Use an external cron service (e.g. cron-job.org) to POST to the function URL hourly with the `x-cron-secret` header
- **Option B**: Use a Supabase `pg_cron` job to invoke the function hourly

## Technical Details

**PushInitializer change** (`src/App.tsx`):
```tsx
function PushInitializer() {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.id) {
      refreshPushSubscription(user.id);
    }
  }, [user?.id]);
  return null;
}
```

**Cron setup**: The `daily-reminder` function expects a `x-cron-secret` header matching the `CRON_SECRET` secret (which is already configured). An external cron service needs to call:
```
POST https://<project>.supabase.co/functions/v1/daily-reminder
Header: x-cron-secret: <secret value>
```
every hour (e.g. at :00).

