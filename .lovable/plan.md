

# Gör Unionen till en PWA med push-notiser

## Sammanfattning
Appen görs om till en installerbar PWA (Progressive Web App) som kan öppnas som en egen app på mobilen, med push-notiser för meddelanden, reparationer och dagliga påminnelser för Relationskontot.

## Vad användaren får
- Appen kan installeras direkt från webbläsaren till hemskärmen (fungerar som en vanlig app)
- Push-notiser vid nya meddelanden från partnern
- Push-notiser vid reparationsförsök (quick repair)
- Dagliga påminnelser för Relationskontot (konfigurerbar tid)
- Fungerar på både iPhone och Android utan app-butiker

## Begränsningar att känna till
- **iOS**: Push-notiser fungerar från iOS 16.4+ och kräver att appen är installerad (Add to Home Screen). Användaren måste ge tillstånd.
- **Android**: Fungerar fullt ut i Chrome, Edge m.fl.
- Notiser kräver att användaren aktivt godkänner dem i webbläsaren.

---

## Teknisk plan

### 1. Installera och konfigurera vite-plugin-pwa
- Installera `vite-plugin-pwa`
- Konfigurera i `vite.config.ts` med manifest, ikoner, service worker
- Lägga till `navigateFallbackDenylist: [/^\/~oauth/]` för att inte cacha OAuth-routes

### 2. Uppdatera `index.html`
- Lägga till meta-taggar för mobilapp (theme-color, apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style)
- Länka manifest.json

### 3. Skapa PWA-ikoner
- Skapa grundläggande ikoner (192x192, 512x512) i `/public`

### 4. Push-notiser: Databas
Ny tabell `push_subscriptions`:

| Kolumn | Typ |
|---|---|
| id | uuid PK |
| user_id | uuid |
| subscription | jsonb (endpoint, keys) |
| created_at | timestamptz |

Ny tabell `notification_preferences`:

| Kolumn | Typ |
|---|---|
| id | uuid PK |
| user_id | uuid |
| daily_reminder_enabled | boolean (default true) |
| daily_reminder_time | time (default '08:00') |
| messages_enabled | boolean (default true) |
| repairs_enabled | boolean (default true) |
| created_at | timestamptz |

RLS-policies: användare kan bara läsa/skriva sina egna rader.

### 5. Push-notiser: Edge function `send-push-notification`
- Tar emot user_id + title + body
- Hämtar push_subscriptions för den användaren
- Skickar Web Push via `web-push`-protokollet
- Kräver VAPID-nycklar (genereras och sparas som secrets)

### 6. Push-notiser: Edge function `daily-reminder`
- Körs via cron-jobb (varje timme)
- Kollar vilka användare som har daglig påminnelse aktiverad och vars tid matchar aktuell timme
- Skickar push-notis: "Dags att fylla i Relationskontot!"

### 7. Klientkod: Service Worker-registrering + prenumeration
- `src/lib/pushNotifications.ts`: Registrera service worker, begär tillstånd, prenumerera via `PushManager.subscribe()`, spara subscription till databasen
- Trigga push-notis vid nya meddelanden (anropa edge function vid INSERT i messages-tabellen via database webhook eller direkt i koden)

### 8. Skicka notis vid nya meddelanden
- I `send-push-notification` edge function: triggas från klient-sidan när ett meddelande skickas (anrop i Messages.tsx efter lyckad insert)
- Alternativt via database webhook (mer robust)

### 9. Skicka notis vid reparation
- I Repair.tsx: efter att en quick repair skickas, anropa edge function för att notifiera partnern

### 10. Inställningssida för notiser
- Ny sektion i `Account.tsx` för att hantera notis-inställningar
- Aktivera/avaktivera push-notiser
- Ställa in tid för daglig påminnelse
- Aktivera/avaktivera meddelande- och reparationsnotiser

### 11. Installationsflöde
- Skapa `/install`-sida med instruktioner för att installera appen
- Visa en banner/prompt i appen som föreslår installation

### Fil-översikt

| Fil | Ändring |
|---|---|
| `vite.config.ts` | Lägg till VitePWA-plugin med manifest |
| `index.html` | Meta-taggar för mobil |
| `public/icon-192.png` | PWA-ikon |
| `public/icon-512.png` | PWA-ikon |
| `src/lib/pushNotifications.ts` | Ny: push-registrering, subscription-hantering |
| `src/pages/Account.tsx` | Ny sektion: notis-inställningar |
| `src/pages/Install.tsx` | Ny sida: installationsinstruktioner |
| `src/pages/Messages.tsx` | Trigga push vid skickat meddelande |
| `src/pages/Repair.tsx` | Trigga push vid quick repair |
| `src/App.tsx` | Lägg till /install-route, initiera push vid login |
| `supabase/functions/send-push-notification/index.ts` | Ny edge function |
| `supabase/functions/daily-reminder/index.ts` | Ny edge function |
| DB-migration | Nya tabeller: push_subscriptions, notification_preferences |
| Cron-jobb | Schemalägg daily-reminder varje timme |
| Secrets | VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY |

