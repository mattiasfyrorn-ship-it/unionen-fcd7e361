

## Problem

Länken i välkomstmailet leder till `https://unionen.lovable.app/auth` istället för `https://hamnen.fyrorn.se/reset-password`. Detta beror på att Supabase-projektets **Site URL** fortfarande är satt till `unionen.lovable.app`. När `generateLink` skapar en recovery-länk och `redirect_to` inte finns i vitlistan, faller Supabase tillbaka till Site URL.

## Lösning — två delar

### 1. Fixa action_link i koden (ghl-webhook)

Som säkerhetsåtgärd: ersätt eventuella förekomster av `unionen.lovable.app` i den genererade `action_link` med `hamnen.fyrorn.se` innan den bäddas in i mailet. Detta görs på båda ställena i `ghl-webhook/index.ts` där `actionLink` används (rad ~131 och ~216).

```typescript
const actionLink = (linkData.properties?.action_link || "")
  .replace("unionen.lovable.app", "hamnen.fyrorn.se");
```

### 2. Uppdatera Supabase Auth-konfiguration

Site URL och Redirect URLs behöver uppdateras i backend-konfigurationen:
- **Site URL**: `https://hamnen.fyrorn.se`
- **Redirect URLs**: lägga till `https://hamnen.fyrorn.se/**`

Detta kräver en ändring i Supabase-projektets auth-inställningar. Jag hanterar detta via tillgängliga verktyg.

### 3. Meddelande för icke-GHL-registrerade på reset-password

Uppdatera `ResetPassword.tsx` så att om recovery-sessionen misslyckas eller saknas visas meddelandet:

> "Den här länken är ogiltig eller har redan använts. Om du inte har ett konto, registrera dig på [fyrorn.se/hamnen](https://fyrorn.se/hamnen)."

Istället för det nuvarande generiska meddelandet.

### Filer som ändras

| Fil | Ändring |
|-----|---------|
| `supabase/functions/ghl-webhook/index.ts` | Ersätt `unionen.lovable.app` → `hamnen.fyrorn.se` i action_link (2 ställen) |
| `src/pages/ResetPassword.tsx` | Uppdatera felmeddelande med hänvisning till fyrorn.se/hamnen |
| Backend auth-config | Uppdatera Site URL + Redirect URLs |

