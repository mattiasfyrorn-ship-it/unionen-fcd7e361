## ✅ Implementerat: Ny Relationskonto-beräkning

### Ändringar
- `src/lib/relationskonto.ts`: Ny formel med startvärde 10, ingen decay vid insättning, 5% decay utan. Nya insättningskategorier (reparationer +2, veckosamtal +2). `computeSharedRelationskonto` för gemensamt konto (max 100) där båda partners effekter summeras.
- `src/lib/enrichChecks.ts`: Ny hjälpfil som hämtar repairs, quick_repairs, weekly_conversations och mergar in i check-data.
- `src/pages/DailyCheck.tsx`: Använder `computeSharedRelationskonto` för "Vår utveckling"-grafen.
- `src/pages/Dashboard.tsx`: Använder shared konto för summary-kort och graf.
