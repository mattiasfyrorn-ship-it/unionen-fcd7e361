

## Tre andringar: Glomt losenord, losenordsaterstallning, och invite-fix vid inloggning

### 1. Lagg till "Glomt losenord" i Auth.tsx

Nytt state `forgotPassword` i Auth.tsx. Nar aktivt visas:
- Rubrik: "Aterstall losenord"
- Beskrivning: "Ange din e-postadress sa skickar vi en lank for att aterstalla ditt losenord"
- E-postfalt
- Knapp "Skicka aterstallningslank"
- Lanken "Tillbaka till inloggning"

Anropar `supabase.auth.resetPasswordForEmail(email, { redirectTo: '${origin}/reset-password' })` och visar toast "Kolla din e-post! Vi har skickat en lank for att aterstalla ditt losenord."

"Glomt losenord?"-lanken visas under inloggningsformulaeret (bara i login-lage, inte vid registrering).

### 2. Skapa ny sida ResetPassword.tsx

Ny sida pa `/reset-password` som:
- Lyssnar pa `PASSWORD_RECOVERY`-event via `supabase.auth.onAuthStateChange`
- Visar formulaer med tva falt: "Nytt losenord" och "Bekrafta losenord"
- Validerar att losenorden matchar och ar minst 6 tecken
- Anropar `supabase.auth.updateUser({ password })` for att spara
- Visar toast vid lyckad uppdatering och redirectar till `/`
- Om inget recovery-event hittas visas ett meddelande om att lanken ar ogiltig

Stilen matchar Auth.tsx (samma gradient-bakgrund, glasmorfism-kort, hjart-logga).

### 3. Fix: Accept invitation vid inloggning

I `handleSubmit` — efter lyckad `signInWithPassword` och om `inviteToken` finns:
- Anropa `supabase.rpc("accept_invitation", { p_token: inviteToken })`
- Visa toast "Valkommen! Du ar nu ihopkopplad med din partner."
- Anropa `notify-partner-paired` edge function

### 4. Lagg till route i App.tsx

Lagg till publik route `/reset-password` som renderar `ResetPassword`-komponenten utan `ProtectedRoute`-wrapper.

### Teknisk sammanfattning

| Fil | Andring |
|---|---|
| `src/pages/Auth.tsx` | Lagg till `forgotPassword`-state, vy for e-postinmatning, "Glomt losenord?"-lank vid inloggning, och `accept_invitation` vid inloggning med invite-token |
| `src/pages/ResetPassword.tsx` | **Ny fil** — formulaer for att satta nytt losenord efter klick pa aterstallningslank |
| `src/App.tsx` | Lagg till publik route `/reset-password` |

