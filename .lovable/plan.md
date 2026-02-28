

## Andringar: Startvarde 0, klimatlinje i graf, layout

### 1. Startvarde 0

I `src/lib/relationskonto.ts`:
- Rad 40: `let konto = 50` andras till `let konto = 0`
- Rad 79: `getLatestKonto` default fran 50 till 0

I `src/pages/Dashboard.tsx`:
- Rad 58: `useState(50)` andras till `useState(0)`

### 2. Klimatlinje i graferna

Klimat (1-5) multipliceras med 20 for att fa 0-100-skalan. Visas som radata utan fordrojning/utjamning.

**`src/lib/relationskonto.ts`:**
- Utoka `DailyCheck`-interfacet med `climate?: number | null`
- Utoka `KontoPoint` till att inkludera `climate?: number`
- I loopen: om check finns och har climate, satt `climate: check.climate * 20`, annars `undefined`
- Select-fragen maste inkludera `climate`-faltet

**`src/pages/DailyCheck.tsx` (graf):**
- Lagg till `climate` i select-fragen (rad 129)
- Grafen far en andra linje: `<Line dataKey="Klimat" stroke="hsl(var(--gold))" />`
- Mappa `p.climate` till `Klimat` i graph-datan

**`src/pages/Dashboard.tsx` (graf):**
- Lagg till `climate` i alla select-fragor for daily_checks
- **"Min utveckling"**: Visa min klimatlinje direkt
- **"Var utveckling"**: Berakna genomsnitt av bada partners klimat per dag: `(mitt_klimat + partner_klimat) / 2`
- Lagg till `<Line dataKey="Klimat" />` i grafen

### 3. Layout-ordning pa Oversikten

Nuvarande ordning:
1. Solo-banner
2. Trendinsikter
3. Relationskonto-kort
4. View toggle
5. Relationskonto-graf
6. Var riktning
7. Nard-graf

Ny ordning:
1. Solo-banner
2. Trendinsikter
3. **Var riktning** (flyttas upp)
4. Relationskonto-kort + View toggle + graf
5. Nard-graf

### Teknisk sammanfattning

| Andring | Fil |
|---|---|
| `konto = 0`, `getLatestKonto` default 0 | `src/lib/relationskonto.ts` |
| `useState(0)` | `src/pages/Dashboard.tsx` |
| Klimat i KontoPoint + berakning | `src/lib/relationskonto.ts` |
| Klimatlinje i DailyCheck-graf | `src/pages/DailyCheck.tsx` |
| Klimatlinje + partner-genomsnitt i Dashboard-graf | `src/pages/Dashboard.tsx` |
| Flytta "Var riktning" fore Relationskonto | `src/pages/Dashboard.tsx` |

