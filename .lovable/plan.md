
## Tillåt användning av appen innan partner registrerat sig

### Problemet

Flera sidor blockerar helt om `profile.couple_id` saknas. Det innebär att en användare som bjudit in sin partner — men partnern ännu inte registrerat sig — inte kan använda några funktioner.

### Berörda sidor och blockeringar

**Hårt blockerade (visar "gå till parkoppling"-skärm):**
- `Dashboard` (rad 411–422) – visar "koppla ihop"-prompt istället för innehåll
- `Evaluate` (rad 170–177) – "Du måste koppla ihop med din partner först"
- `Messages` – "Koppla ihop med din partner först"

**Funktioner som kräver `couple_id` vid sparning men inte blockerar vyn:**
- `DailyCheck` – sparar med `couple_id` i `daily_checks`-tabellen
- `Repair` – `handleShare` kräver `couple_id`
- `WeeklyConversation` – hela laddningen beror på `couple_id`

### Lösningen

#### Strategi: "Solo-läge"

En användare utan `couple_id` bör kunna använda alla individuella funktioner. Data sparas med `user_id` men temporärt utan `couple_id`. När parkopplingen sker knyts datan till paret.

Det finns dock ett problem: tabellerna `daily_checks`, `evaluations`, `quarterly_goals`, `repairs` etc. har `couple_id NOT NULL`. Det innebär att data **inte kan sparas** utan ett `couple_id`.

**Bästa lösning:** Skapa ett "eget" (solo) couple-objekt per användare vid registrering, via en trigger. När partnern sedan kopplas ihop migreras datan till det gemensamma coupleId.

**Alternativ enklare lösning (vald):** Låt `couple_id` i `daily_checks`, `evaluations`, `quarterly_goals` och `repairs` vara nullable, och hantera solo-data med `user_id`. Vyer och grafer anpassas för att fungera utan partnerdata.

**Den enklaste och robustaste lösningen (rekommenderas):** Skapa automatiskt ett "solo couple" för varje ny användare via en DB-trigger/funktion. Det löser alla null-problem på en gång.

### Implementationsplan

#### 1. Databasmigration: Auto-skapa solo-couple vid signup

En trigger på `profiles`-tabellen (efter `handle_new_user`) skapar automatiskt ett `couples`-rad och sätter `couple_id` på profilen direkt vid registrering. Det innebär att varje användare alltid har ett `couple_id` — antingen ett solo-couple eller ett delat couple.

```sql
-- Funktion: skapa solo-couple och sätt couple_id direkt vid ny profil
CREATE OR REPLACE FUNCTION public.handle_new_profile_couple()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_couple_id uuid;
BEGIN
  INSERT INTO couples DEFAULT VALUES RETURNING id INTO v_couple_id;
  NEW.couple_id := v_couple_id;
  RETURN NEW;
END;
$$;

-- Trigger: körs BEFORE INSERT på profiles
CREATE TRIGGER on_profile_created_create_couple
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_couple();
```

**Varför BEFORE INSERT?** Så att `couple_id` sätts direkt i samma INSERT, inga tomma rader.

#### 2. Befintliga användare utan couple_id

En del befintliga användare kan sakna `couple_id`. SQL-migration uppdaterar dessa:

```sql
-- Skapa solo-couples för befintliga profiler som saknar couple_id
DO $$
DECLARE
  r RECORD;
  v_couple_id uuid;
BEGIN
  FOR r IN SELECT user_id FROM profiles WHERE couple_id IS NULL LOOP
    INSERT INTO couples DEFAULT VALUES RETURNING id INTO v_couple_id;
    UPDATE profiles SET couple_id = v_couple_id WHERE user_id = r.user_id;
  END LOOP;
END;
$$;
```

#### 3. Frontend: Ta bort couple_id-blockeringar

När alla användare alltid har ett `couple_id` behöver vi inte längre blockera:

- **Dashboard**: Ta bort `if (!profile?.couple_id)` redirect-blocket. Visa istället ett banner/tips om att bjuda in sin partner om `hasPartner === false`.
- **Evaluate**: Ta bort `if (!profile?.couple_id)` redirect-blocket.
- **Messages**: Ta bort redirect-blocket. Visa ett tomt chattfönster med info om att partnern inte kopplat ihop ännu.
- **WeeklyConversation**: Låt laddningen köras — den hittar inget från en solo-partner, men kraschar inte.

#### 4. Partner-status i Dashboard

Dashboard visar idag `"Du & {partnerName || 'din partner'}"`. Utan en riktig partner visas ett diskret banner:

```
"Din partner har inte registrerat sig ännu. Bjud in dem via Parkoppling."
```

Detta visas baserat på om det finns en annan profil med samma `couple_id` (logiken finns redan i `Pairing.tsx` via `hasPartner`-kontrollen).

### Tekniska detaljer

**Varför trigger BEFORE INSERT (inte AFTER)?**  
`handle_invitation_on_signup`-triggern körs AFTER INSERT och kan behöva skriva om `couple_id` om en inbjudan hittas. Med en BEFORE-trigger sätts solo-couple_id direkt i raden — AFTER-triggern kan sedan skriva över den om en inbjudan matchar. Det är en clean lösning.

**Påverkar pair_with_partner-funktionen?**  
Ja — `pair_with_partner` kolla redan om `v_my_couple_id IS NOT NULL` och `v_partner_couple_id IS NOT NULL`. Den väljer det äldsta/existerande coupleId. Det innebär att när två solo-users parar ihop sig väljs en av deras solo-couples, och den andra överges. Data som sparats under solo-coupleId följer med (eftersom den andra profilen uppdateras till det valda coupleId). Ingen dataförlust.

**Migrationsordning:**
1. Kör SQL för befintliga profiler utan couple_id
2. Skapa trigger för nya profiler
3. Uppdatera frontend-sidor

Inga ändringar krävs i RLS-policies — de fungerar redan med `get_my_couple_id()`.
