

## Plan: Gemensamma kvartalsmål med anteckningar och arkiv

### Nuläge
Idag sparar varje person sina egna kvartalsmål (`quarterly_goals` filtreras på `user_id`). Partner ser inte varandras mål. Det finns inga anteckningsfält eller arkivfunktion för slutförda mål.

### Ny design
Ett par delar EN rad per måltyp per kvartal, kopplat till `couple_id`. När en person skriver sparas det för båda. Varje mål kan expanderas för löpande anteckningar och markeras som slutfört, varpå det flyttas till ett arkiv.

---

### Steg 1 — Databasändring

Skapa ny tabell `couple_goals` (istället för att ändra `quarterly_goals`, som kan behållas för bakåtkompatibilitet):

```sql
CREATE TABLE couple_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  quarter_start date NOT NULL,
  goal_type text NOT NULL,        -- 'relationship', 'experience', 'practical'
  title text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_id, quarter_start, goal_type)
);

ALTER TABLE couple_goals ENABLE ROW LEVEL SECURITY;

-- RLS: läs/skriv via couple_id
CREATE POLICY "Read couple goals" ON couple_goals FOR SELECT
  USING (couple_id = get_my_couple_id());
CREATE POLICY "Insert couple goals" ON couple_goals FOR INSERT
  WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "Update couple goals" ON couple_goals FOR UPDATE
  USING (couple_id = get_my_couple_id());
CREATE POLICY "Delete couple goals" ON couple_goals FOR DELETE
  USING (couple_id = get_my_couple_id());
```

### Steg 2 — Uppdatera Dashboard.tsx

**Hämtning**: Byt från `quarterly_goals` med `user_id`-filter till `couple_goals` med `couple_id`-filter. Hämta 3 rader (en per goal_type) för aktuellt kvartal.

**Sparning**: Vid varje ändring (titel, anteckning, checkbox) → upsert mot `couple_goals` baserat på `(couple_id, quarter_start, goal_type)`.

**UI per mål**:
- Klickbar rad som expanderar ett `Textarea` för löpande anteckningar
- Knapp "Mål uppnått" som sätter `completed = true` och `completed_at = now()`
- Slutförda mål flyttas automatiskt ned till ett "Arkiv"-avsnitt (Collapsible) längst ned i kortet
- Arkivet visar slutförda mål grupperade per kvartal med datum

**Arkiv**: Hämta alla `couple_goals` med `completed = true` för aktuellt couple_id, sorterade efter `completed_at DESC`.

### Steg 3 — Uppdatera onboardingSteps.ts

Ändra checkCompletion för "Vår riktning"-steget att kolla `couple_goals` istället för `quarterly_goals`.

---

### Tekniska detaljer
- Tabellen `couple_goals` ägs av paret (couple_id), inte individen — båda kan läsa och skriva
- Unique constraint säkerställer max ett mål per typ per kvartal per par
- `updated_at` trigger för automatisk uppdatering vid ändringar
- Befintliga `quarterly_goals` lämnas orörda (ingen migration av gammal data)

