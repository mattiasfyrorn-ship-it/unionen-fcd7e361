

## Visa inbjudarens namn + alla mejl via Resend (mail1.fyrorn.se)

### Vad som andras

#### 1. Databasandring — lagg till `inviter_name` pa `partner_invitations`

Ny kolumn for att spara inbjudarens namn sa det kan visas pa Auth-sidan utan inloggning.

```sql
ALTER TABLE partner_invitations ADD COLUMN inviter_name text DEFAULT '';
```

Plus en ny RPC-funktion som gar att anropa utan inloggning (SECURITY DEFINER) for att hamta inbjudarens namn fran en token:

```sql
CREATE FUNCTION get_invitation_info(p_token text)
RETURNS TABLE(inviter_name text) AS $$
  SELECT inviter_name FROM partner_invitations
  WHERE token = p_token AND status = 'pending' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
```

#### 2. `supabase/functions/send-invitation/index.ts` — tre fixar

- **Fran-adress**: Byt `onboarding@resend.dev` till `Unionen <noreply@mail1.fyrorn.se>`
- **URL:er**: Byt `unionen.lovable.app` till `unionen.fyrorn.se`
- **Spara namn**: Lagg till `inviter_name` i insert-anropet

#### 3. Ny edge-funktion `supabase/functions/notify-partner-paired/index.ts`

Anropas fran klienten efter lyckad parkoppling. Tar emot `inviteToken` och `inviteeName`.

Funktionen:
1. Slar upp inbjudan via token (hamtar inviter_id, inviter_name, invitee_email)
2. Hamtar inbjudarens e-post fran auth.users via service role
3. Skickar tva mejl via Resend fran `noreply@mail1.fyrorn.se`:
   - **Till invitee**: "Valkommen [namn]! Du ar nu ihopkopplad med [inbjudarens namn]."
   - **Till inviter**: "[Partnerns namn] har registrerat sig! Ni ar nu ihopkopplade."

#### 4. `supabase/config.toml` — lagg till ny funktion

```toml
[functions.notify-partner-paired]
verify_jwt = false
```

#### 5. `src/pages/Auth.tsx` — visa inbjudarens namn + trigga notifiering

- Vid laddning: om `invite`-token finns, anropa `get_invitation_info` RPC och hamta inbjudarens namn
- Visa i bannern: "Du har en inbjudan fran **Anna**!" istallet for generiskt meddelande
- Efter lyckad registrering + parkoppling: anropa `notify-partner-paired` edge-funktionen med token och den nyas namn

#### 6. `src/pages/Pairing.tsx` — trigga notifiering vid manuell parkoppling

Nar `pair_with_partner` lyckas via parningskod: anropa `notify-partner-paired` for att skicka bekraftelsemejl till bada parter.

---

### E-postflodet efter andringarna

```text
1. Anna anger Eriks e-post → send-invitation skickar mejl fran noreply@mail1.fyrorn.se
2. Erik klickar lanken → Auth-sidan visar "Du har en inbjudan fran Anna!"
3. Erik registrerar sig → parkoppling sker
4. notify-partner-paired skickar:
   a) Bekraftelse till Erik: "Valkommen Erik! Du ar ihopkopplad med Anna."
   b) Notifiering till Anna: "Erik har registrerat sig! Ni ar ihopkopplade."
```

### Filer som andras

| Fil | Andring |
|---|---|
| Migration (SQL) | Lagg till `inviter_name`-kolumn, skapa `get_invitation_info` RPC |
| `supabase/functions/send-invitation/index.ts` | Byt fran-adress till `mail1.fyrorn.se`, byt URL:er till `unionen.fyrorn.se`, spara `inviter_name` |
| `supabase/functions/notify-partner-paired/index.ts` | **Ny fil** — skickar bekraftelse + notifiering via Resend |
| `supabase/config.toml` | Automatiskt uppdaterad med `[functions.notify-partner-paired]` |
| `src/pages/Auth.tsx` | Hamta och visa inbjudarens namn, anropa notify efter parkoppling |
| `src/pages/Pairing.tsx` | Anropa notify efter lyckad manuell parkoppling |

