

## Plan: Persistent "Markera reparation som slutförd" i Repair-vyn

### Problem
Om knapparna "Reparerat" / "Reparationssamtal planerat" bara visas på slutskärmen (steg 13) försvinner de när användaren lämnar sidan och kommer tillbaka.

### Lösning
Visa en banner/kort på **startsidan av reparationsflödet (steg 0)** när det finns en öppen (icke-slutförd) reparation. Bannern visar senaste reparationens datum och två knappar för att markera den som slutförd. Reparationer med `status = "shared"` eller `"needs_time"` och utan `completed_at` räknas som öppna.

### Ändringar

**1. `src/pages/Repair.tsx`**

- På steg 0, före valet "Reglering / Snabb reparation", kolla om det finns en öppen reparation (senaste reparationen där `completed_at IS NULL` och `status` inte redan är `"completed"`).
- Om ja, visa ett kort med:
  - Text: "Du har en öppen reparation från [datum]"
  - Knapp 1: "Reparerat" → sätter `status = "completed"`, `completed_at = now()`
  - Knapp 2: "Reparationssamtal planerat" → sätter `status = "conversation_planned"`, `completed_at = now()`
  - Efter klick: toast-bekräftelse, dölj kortet
- Samma logik på steg 13 (done-skärmen) — visa knapparna även där som idag planerat.

**2. Även kolla `quick_repairs`**
- Senaste quick_repair där `partner_response IS NULL` visas på liknande sätt med en "Reparerat"-knapp som sätter `partner_response = "completed"`.

### Tekniska detaljer
- Nytt state: `openRepair` (den senaste oslutförda reparationen) laddas i befintlig `useEffect`
- Filtrera `pastRepairs`-queryn och plocka ut den första med `completed_at IS NULL`
- Uppdatering sker direkt mot `repairs`/`quick_repairs`-tabellen med befintliga RLS-policies (user can update own)
- Inga databasmigrationer behövs — `completed_at` och `status` finns redan på `repairs`, `partner_response` finns på `quick_repairs`

