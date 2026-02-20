
## Byt till externt cron-jobb med CRON_SECRET

### Vad som ändras

Idag utlöses `daily-reminder`-funktionen av ett internt pg_cron-jobb i databasen. Det fungerar bara när databasen är på Lovable Cloud / Supabase. Om du byter databas slutar det fungera.

Lösningen är att:
- En **extern cron-tjänst** (t.ex. cron-job.org, GitHub Actions, eller liknande) anropar funktionens URL varje timme via HTTP
- Funktionen skyddas med en hemlig nyckel (`CRON_SECRET`) som bara den externa tjänsten känner till
- Det interna pg_cron-jobbet tas bort

### Tekniska detaljer

**Steg 1 — Lägg till CRON_SECRET som backend-secret**

Ett nytt hemligt lösenord skapas och lagras i backend-secrets. Den externa cron-tjänsten skickar det i en `Authorization`-header vid varje anrop.

**Steg 2 — Uppdatera `daily-reminder/index.ts`**

Lägg till en check i början av funktionen:

```typescript
const cronSecret = Deno.env.get('CRON_SECRET');
const authHeader = req.headers.get('x-cron-secret');
if (!cronSecret || authHeader !== cronSecret) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

**Steg 3 — Ta bort pg_cron-jobbet**

En databasmigration kör:
```sql
SELECT cron.unschedule('daily-reminder-hourly');
```

**Steg 4 — Konfigurera extern cron-tjänst**

Du behöver konfigurera en gratis tjänst som [cron-job.org](https://cron-job.org) med:
- **URL**: `https://ucgarzkamhrcihmcfsul.supabase.co/functions/v1/daily-reminder`
- **Schema**: Varje timme (`0 * * * *`)
- **Header**: `x-cron-secret: DIN_HEMLIGA_NYCKEL`

Jag ger dig exakta instruktioner och nyckelns värde när allt är klart.

### Varför detta är bättre

- Fungerar oavsett var databasen körs (Supabase, Railway, annan host)
- Tydlig autentisering — ingen kan trigga funktionen utan nyckeln
- Lätt att övervaka och testa manuellt via en HTTP-anrop
