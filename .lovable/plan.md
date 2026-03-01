

## Push-notiser: Analys och atgardsplan

### Identifierade problem

**Problem 1: Daglig paminnelse saknar VAPID-autentisering (KRITISKT)**

`daily-reminder/index.ts` hamtar VAPID-nycklar men anvander dem aldrig. Rad 78-86 gor en rak POST till push-endpointen utan Authorization-header. Alla push-tjanster (Google FCM, Mozilla) kraver VAPID-autentisering och avvisar forfragan med 401/403.

**Problem 2: Ingen payload-kryptering i nagon av funktionerna (KRITISKT)**

Web Push-specifikationen kraver att payload krypteras med mottagarens nycklar (`p256dh` och `auth` fran subscription-objektet) via ECDH + HKDF + AES-128-GCM. Bade `send-push-notification` och `daily-reminder` skickar payload som klartext men satter `Content-Encoding: aes128gcm` -- vilket ar felaktigt. Push-tjanster avvisar okrypterade payloads.

**Problem 3: VAPID-nyckelimport kan misslyckas**

`send-push-notification` importerar VAPID private key som `pkcs8`-format, men VAPID-nycklar ar normalt 32-byte raw EC-nycklar (URL-safe base64). Om nyckeln inte ar i PKCS8-format sa kastar `crypto.subtle.importKey` ett fel.

**Problem 4: Daglig paminnelse har ingen `generatePushHeaders`-funktion**

Aven om VAPID-headern fixas saknar `daily-reminder` funktionen `generatePushHeaders` som finns i `send-push-notification`. Logiken ar duplicerad och inkonsekvent.

### Sammanfattning

Push-notiser fungerar INTE i nulaget -- varken dagliga paminnelser eller meddelande-/reparationsnotiser -- eftersom payloaden aldrig krypteras enligt Web Push-standarden.

---

### Losning: Anvand `web-push`-biblioteket via npm

Istallet for att implementera Web Push-kryptering manuellt (extremt komplext: ECDH key exchange, HKDF, AES-128-GCM med specifik padding) anvander vi det beprövade `web-push`-biblioteket som hanterar allt korrekt.

#### 1. Uppdatera `send-push-notification/index.ts`

- Importera `web-push` via `npm:web-push@3`
- Ersatt manuell `generatePushHeaders` och rå `fetch` med `webpush.sendNotification()`
- Konfigurerar VAPID-detaljer korrekt: `webpush.setVapidDetails('mailto:...', publicKey, privateKey)`
- Subscription-objektet fran databasen skickas direkt till `webpush.sendNotification(subscription, payload)`
- Detta hanterar automatiskt: ECDH nyckelutbyte, payload-kryptering, VAPID JWT-signering, korrekt Content-Encoding

#### 2. Uppdatera `daily-reminder/index.ts`

- Samma `web-push`-import och konfiguration
- Ersatt den ra `fetch`-koden (rad 78-86) med `webpush.sendNotification()`
- Ta bort oanvanda VAPID-variabler som aldrig anvands korrekt

#### 3. Sakerstall korrekt VAPID-nyckelformat

- `web-push` kraver att VAPID_PRIVATE_KEY ar en URL-safe base64-kodad 32-byte EC-nyckel (inte PKCS8)
- Om befintlig nyckel ar i PKCS8-format behover den genereras om med `web-push generate-vapid-keys`
- Lagga till en kontroll i edge function som loggar om nyckelformatet ar felaktigt

#### 4. Ingen andring i klientkoden

- `src/lib/pushNotifications.ts` ar korrekt -- den hamtar VAPID public key fran edge function och skapar subscription via PushManager
- `public/sw.js` push/notificationclick-hantering ar korrekt
- Service worker-konfigurationen (injectManifest) ar korrekt

---

### Teknisk plan

| Fil | Andring |
|---|---|
| `supabase/functions/send-push-notification/index.ts` | Ersatt manuell krypto med `npm:web-push@3`. Ta bort `generatePushHeaders`. Anvand `webpush.sendNotification()` |
| `supabase/functions/daily-reminder/index.ts` | Lagg till `npm:web-push@3`. Ersatt raw fetch med `webpush.sendNotification()` |

### VAPID-nycklar

Befintliga secrets `VAPID_PUBLIC_KEY` och `VAPID_PRIVATE_KEY` finns redan. Om de ar i ratt format (URL-safe base64, 65 bytes public / 32 bytes private) fungerar de direkt med `web-push`. Om inte behover nya nycklar genereras -- jag kontrollerar detta under implementationen genom att testa edge function och lasa loggarna.

### Testningsmojlighet

Efter implementation kan vi:
1. Anropa `send-push-notification` med `action: 'get-vapid-key'` for att verifiera att VAPID-nyckeln returneras
2. Anropa `send-push-notification` med `action: 'send'` for att testa meddelandenotis (kraver tva ihopparade anvandare med push-prenumeration)
3. Anropa `daily-reminder` med ratt CRON_SECRET for att testa daglig paminnelse

