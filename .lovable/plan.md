

## Implementationsplan: GHL-webhook + stängd registrering

### 1. Konfigurera secret
Spara `GHL_WEBHOOK_SECRET` med värdet `hamnen_2026_03__p9K6w8rT2nV4aQ7xY1mD3sF5gH9jK4567sdgfGF` i Lovable Cloud.

### 2. Databasmigration
Skapa två nya tabeller:

**`webhook_events`** — idempotens
- `id` uuid PK, `webhook_id` text UNIQUE NOT NULL, `event_type` text, `payload` jsonb, `created_at` timestamptz default now()
- RLS enabled, inga client-policies (bara service role)

**`ghl_links`** — koppling user ↔ GHL-kontakt
- `id` uuid PK, `user_id` uuid NOT NULL, `ghl_contact_id` text UNIQUE NOT NULL, `created_at` timestamptz default now()
- RLS enabled, inga client-policies

### 3. Edge function: `ghl-webhook`
Ny fil `supabase/functions/ghl-webhook/index.ts`:

- CORS-headers + OPTIONS-hantering
- Validera `X-HAMNEN-SECRET` header
- Validera `X-HAMNEN-EVENT` = `body.event`
- Validera att email finns och har giltigt format
- Bygg `webhook_id` (från body eller `event:ghl_contact_id:timestamp`)
- Kolla `webhook_events` — om redan processad, returnera 200 direkt
- Kolla om användare redan finns (via email) — om ja, uppdatera namn/telefon, upsert ghl_links, returnera 200
- Skapa användare via `supabase.auth.admin.createUser({ email, email_confirm: true })`
- Upsert i `ghl_links`
- Generera recovery-länk via `supabase.auth.admin.generateLink({ type: 'recovery', email })`
- Skicka välkomstmail via Resend med länk till `https://hamnen.fyrorn.se/reset-password`
- Spara i `webhook_events`
- Returnera `{ ok: true }`
- Logga event_type, ghl_contact_id, email, resultat (aldrig secreten)

### 4. Config
Lägg till i `supabase/config.toml`:
```toml
[functions.ghl-webhook]
verify_jwt = false
```

### 5. Auth.tsx: Villkorad registrering
- **Utan invite-token:** Visa bara login (email + lösenord) + "Glömt lösenord" + text "Inget konto? Kontakta oss."
- **Med invite-token:** Visa registreringsformulär (namn + email + lösenord) som idag
- Ta bort möjligheten att växla till registrering utan invite-token

### 6. Uppdatera plan.md
Dokumentera GHL-integrationen i projektplanen.

### Filer som ändras
| Fil | Ändring |
|-----|---------|
| **Ny** `supabase/functions/ghl-webhook/index.ts` | Webhook-endpoint |
| **Migration** | `webhook_events` + `ghl_links` tabeller |
| `supabase/config.toml` | `[functions.ghl-webhook]` |
| `src/pages/Auth.tsx` | Registrering bara med invite-token |
| `.lovable/plan.md` | Dokumentation |
| **Secret** | `GHL_WEBHOOK_SECRET` |

