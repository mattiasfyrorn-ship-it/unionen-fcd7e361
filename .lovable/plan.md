

## Fixar: Logostorlek, Dashboard-bredd, och Favicon-bakgrund

### 1. Logotyp -- storre i bade mobil och desktop

**`src/components/AppLayout.tsx`**:
- Mobil header: Logga fran `w-8 h-8` till `w-10 h-10`, text fran `text-xl` till `text-2xl`
- Desktop header: Logga fran `w-10 h-10` till `w-12 h-12`, text fran `text-2xl` till `text-3xl`

### 2. Dashboard -- samma bredd som ovriga sidor

**`src/pages/Dashboard.tsx`**:
- Lagg till `max-w-2xl mx-auto` pa root-containern (rad 427), sa att den matchar DailyCheck, Evaluate, WeeklyConversation m.fl.
- Nuvarande: `<div className="space-y-8">`
- Nytt: `<div className="space-y-8 max-w-2xl mx-auto">`

### 3. Favicon utan bakgrund

**`public/favicon.svg`**:
- Filen har redan `fill="none"` och transparent bakgrund (ingen rect eller bakgrundsform). Det ar korrekt.
- Problemet ar att `index.html` pekar pa `/favicon.png` (rad 9), inte pa SVG-filen. PNG-filen kan ha bakgrund.
- Andring: Byt tillbaka favicon-referensen i `index.html` till SVG: `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`
- SVG:en har redan transparent bakgrund med bara hjartikonen i olivgront.

### Filer som andras

| Fil | Andring |
|---|---|
| `src/components/AppLayout.tsx` | Storre logotyp (mobil + desktop) |
| `src/pages/Dashboard.tsx` | Lagg till `max-w-2xl mx-auto` |
| `index.html` | Byt favicon till SVG (transparent bakgrund) |

