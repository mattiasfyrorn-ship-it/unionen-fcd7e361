

## Plan: Klientbaserad daglig påminnelse + förbättrad felloggning

### Vad görs

**1. Klientbaserad daglig påminnelse i PushInitializer** (`src/App.tsx`)

Ny `useEffect` som vid varje app-öppning:
- Hämtar användarens `notification_preferences` (daily_reminder_enabled, daily_reminder_time)
- Om påminnelse är aktiverad OCH klockan har passerat den inställda tiden idag:
  - Kollar om `daily_checks` redan finns för idag → om ja, skippa
  - Kollar `localStorage`-flagga `daily_reminder_shown_<datum>` → om redan visad, skippa
  - Visar lokal notis via `registration.showNotification()` med titel "Relationskontot" och url `'/'`
  - Sätter localStorage-flagga så den bara visas en gång per dag

Detta fungerar som primär mekanism istället för den opålitliga pg_net-cron.

**2. Förbättrad felloggning i sendPushToPartner** (`src/lib/pushNotifications.ts`)

- Logga `data` och `error` från `supabase.functions.invoke`
- Visa `toast` vid fel så användaren ser om pushen misslyckades

### Tekniska detaljer

**Filer som ändras:**
- `src/App.tsx` — Ny useEffect i PushInitializer med lokal notis-logik
- `src/lib/pushNotifications.ts` — Uppdatera `sendPushToPartner` med detaljerad loggning + toast vid fel

**Inga databasändringar behövs.**

