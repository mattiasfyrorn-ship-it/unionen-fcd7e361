

# Robust Push Notification Registration Flow

## Problem
The current push toggle calls `subscribeToPush` which does the registration, but lacks:
- iOS PWA standalone detection (push only works from home screen)
- Clear user feedback for each state
- Debug logging
- Test push button
- The notification section is hidden entirely when `isPushSupported` is false, giving no guidance to iOS users

## Plan

### 1. Update `src/lib/pushNotifications.ts` — Add PWA detection + logging

Add helper functions:
- `isInstalledPWA()`: checks `window.matchMedia('(display-mode: standalone)')` or `navigator.standalone` (iOS)
- `isIOSSafari()`: detects iOS Safari (not standalone)
- Add `console.log` breadcrumbs throughout `subscribeToPush` for: permission status, SW registration, subscription created, saved to backend

### 2. Rewrite push toggle in `src/pages/Account.tsx`

**Show notification card always** (not just when `pushSupported`), with contextual messaging:

- If iOS but NOT standalone → show message: "Installera appen på hemskärmen för att aktivera push på iPhone" with link to `/install`
- If push not supported at all → show "Din webbläsare stöder inte push-notiser"
- If supported → show the toggle

**When user toggles push ON** (user-initiated click):
1. Call `Notification.requestPermission()`
2. If denied → toast "Notiser nekades — ändra i enhetens inställningar", don't enable toggle
3. If granted → run full `subscribeToPush(userId)` which creates subscription + saves to DB
4. Toast "Notiser aktiverade ✓"

**Save button** saves all preferences to `notification_preferences` table as today.

### 3. Add "Skicka test-push" button

Visible when `pushEnabled` is true. Calls `broadcast-push` edge function with `{ title: "Testnotis", body: "Push fungerar! 🎉" }` filtered to current user only.

Update `broadcast-push/index.ts` to accept optional `user_id` parameter — if provided, only send to that user instead of all users.

### 4. Files changed

| File | Change |
|------|--------|
| `src/lib/pushNotifications.ts` | Add `isInstalledPWA()`, `isIOSSafari()` exports; add console.log debugging throughout `subscribeToPush` |
| `src/pages/Account.tsx` | Rewrite notification card: always show, iOS detection, permission flow on toggle, test button |
| `supabase/functions/broadcast-push/index.ts` | Accept optional `user_id` to send test push to single user |

### Technical details

**iOS standalone detection:**
```ts
const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
  || (window.navigator as any).standalone === true;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
```

**Permission flow** triggered only on Switch `onCheckedChange` (user click), never on page load.

**Debug logging** format: `[Push] step: detail` for easy filtering in console.

