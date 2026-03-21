

## Plan: Uppdaterad Relationskonto-beräkning med ny formel och gemensamt konto (max 100)

### Sammanfattning
Ny beräkningslogik: insättningsdagar har ingen decay, tomma dagar har 5% decay. Startvärde 10. Nya insättningskategorier (reparationer, veckosamtal). Gemensamt konto = ett enda konto (max 100) där båda partners dagliga effekter summeras.

### Ny formel

**Individuellt konto (för "Min" vy):**
- Start: 10
- Om `dagens_poäng > 0`: `konto = min(100, konto + poäng/4)`
- Om `dagens_poäng == 0`: `konto = max(0, konto * 0.95)`

**Gemensamt konto (för "Vår" vy):**
- Ett enda delat konto (max 100), inte två separata som slås ihop
- Varje dag beräknas varje partners effekt:
  - Om partner har `poäng > 0`: effekt = `poäng / 4`
  - Om partner har `poäng == 0`: effekt = `konto * -0.05` (decay)
- `konto = max(0, min(100, konto + effekt_A + effekt_B))`

**Dagliga poäng:**
| Kategori | Poäng |
|---|---|
| Love Maps (besvarad) | 0 / 1 |
| Uppskattning | 0 / 1 |
| Turn Toward (en = 0.5, båda = 1) | 0 / 0.5 / 1 |
| Låt partner påverka | 0 / 1 |
| Reparationsinitiativ | 0 / 2 |
| Slutförd reparation | 0 / 2 |
| State of the Union | 0 / 2 |
| Klimatmodifierare (1→-1.5, 2→-0.75, 3→0, 4→+0.75, 5→+1.5) | -1.5 till +1.5 |

Klimat räknas bara om andra insättningar finns. Klimat ensam = decay.

### Ändringar

**1. `src/lib/relationskonto.ts`**
- Utöka `DailyCheck` med: `repair_initiated`, `repair_completed`, `weekly_conversation_done`
- Lägg till `dailyChange` i `KontoPoint`
- Ny `computeDailyPoints(check)` funktion som beräknar poäng enligt tabellen ovan
- Ny `computeRelationskonto`: startvärde 10, ny formel utan exponentiell utjämning
- Ny `computeSharedRelationskonto(myChecks, partnerChecks, start, end)`: ett delat konto där båda partners effekter summeras per dag
- Klimat i KontoPoint: visa råvärde (1-5 × 20) som idag

**2. `src/pages/DailyCheck.tsx` — Hämta reparationer/veckosamtal**
- I `fetchGraph`: hämta `repairs` (created_at per datum = initierad, completed_at per datum = slutförd), `quick_repairs`, och `weekly_conversations` (status = 'completed')
- Bygg per-datum-lookup och mergea in `repair_initiated`, `repair_completed`, `weekly_conversation_done` i check-datan
- Använd `computeSharedRelationskonto` istället för att beräkna separat och ta genomsnitt

**3. `src/pages/Dashboard.tsx` — Samma uppdateringar**
- `buildKontoSummary` och `rebuildGraphs`: hämta reparationer/veckosamtal, mergea, använd `computeSharedRelationskonto` för "ours"-vyn
- Individuell vy: använd uppdaterade `computeRelationskonto`

### Ingen databasmigration behövs
All data finns redan i `repairs`, `quick_repairs`, `weekly_conversations` och `daily_checks`.

