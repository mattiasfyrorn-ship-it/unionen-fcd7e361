

## Ändra from-adress i ghl-webhook

Två av tre edge functions (`notify-partner-paired` och `send-invitation`) använder redan `noreply@mail1.fyrorn.se`. Bara `ghl-webhook` har fel domän (`noreply@hamnen.fyrorn.se`).

### Ändring

| Fil | Rad | Från | Till |
|-----|-----|------|------|
| `supabase/functions/ghl-webhook/index.ts` | 184 | `Hamnen <noreply@hamnen.fyrorn.se>` | `Hamnen <noreply@mail1.fyrorn.se>` |

En rad, en fil. Övriga funktioner behöver ingen ändring.

