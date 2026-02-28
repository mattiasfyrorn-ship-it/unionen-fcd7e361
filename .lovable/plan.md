

## Relationskonto V2 – Översikt och ny beräkningsmodell

### Sammanfattning

Ersätt den nuvarande dagliga procentgrafen med ett dynamiskt relationskonto (0-100) som bygger på exponentiell utjämning. Byt "Dashboard" till "Översikt" i navigationen, ta bort sidrubriken, och visa trendinsikter direkt överst.

### 1. Navigation och sidrubrik

- I `AppLayout.tsx`: Byt label "Dashboard" till "Översikt"
- I `Dashboard.tsx`: Ta bort h1-rubriken "Dashboard" och p-taggen under. Trendinsikter visas direkt som förstaelement (efter solo-bannern)

### 2. Ny beräkningsfunktion: `computeRelationskonto`

Skapa `src/lib/relationskonto.ts` med logiken:

```text
Initialvarde: 50
Varje dag: konto_ny = konto_gammal * 0.95 + (100 * d * 0.05)
  - d = antal markerade av 4 (love_map, appreciation, turn_toward, adjusted) / 4
  - Om ingen check-in: d = 0.25
Begransning: 0 <= konto <= 100
```

Funktionen tar emot en array av daily_checks sorterade efter datum och beraknar kontovarde for varje dag (inklusive "luckor" utan check-in). Returnerar array med `{ date, value }`.

### 3. Uppdatera grafer overallt

**Dashboard/Oversikt (`Dashboard.tsx`):**
- Default-vy: "Var utveckling" (ours) istallet for "mine"
- Relationskontografen visar den nya 0-100 linjen istallet for individuella insattningar
- Toggle "Mitt konto" / "Vart konto" (genomsnitt av bada partners konton)
- Period-toggle: Vecka / Manad / Ar

**Relationskontot-sidan (`DailyCheck.tsx`):**
- Ersatt nuvarande graf med samma nya Relationskonto-linje (0-100)
- Period-toggle: Vecka / Manad / Ar

### 4. Relationskonto-kort pa Oversikten

Visa ett kort med:
- Stort tal: "72 / 100"
- Trend senaste 7 dagar: "+4" eller "-3"
- Forklaringstext: "Kontot bygger pa dagliga insattningar och sjunker langamt utan dem."

### 5. Gemensamt konto

Nar partner finns, hamta partnerns daily_checks via couple_id, berakna deras konto, och visa:
- `konto_vi = (konto_jag + konto_partner) / 2`

### Teknisk plan

| Andring | Fil |
|---|---|
| Byt "Dashboard" -> "Oversikt" i nav | `AppLayout.tsx` |
| Ta bort rubrik, flytta trendinsikter overst | `Dashboard.tsx` |
| Default-vy "ours" | `Dashboard.tsx` |
| Ny berakningsfunktion | `src/lib/relationskonto.ts` (ny fil) |
| Ersatt gamla grafer med Relationskonto 0-100 | `Dashboard.tsx`, `DailyCheck.tsx` |
| Relationskonto-kort med tal + trend | `Dashboard.tsx` |
| Gemensamt konto (partner-genomsnitt) | `Dashboard.tsx` |

Ingen databasmigration behovs -- all berakning sker klientsidigt baserat pa befintliga daily_checks-data.

