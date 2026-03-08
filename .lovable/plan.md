

# Designjusteringar – Ikoner, input-fokus & zoom-fix

## 1. Ändra tillbaka småikoner till olivgrön (`text-primary`)

Alla små ikoner vid Love Maps, Turn Toward, Mission, Sinne, Kropp, Relationer m.fl. ändras från `text-accent` (terrakotta) tillbaka till `text-primary` (olivgrön).

**Filer:**
- `src/pages/DailyCheck.tsx` – Map, Heart (uppskattning/närvaro), ArrowRightLeft, CloudSun-ikoner
- `src/pages/Evaluate.tsx` – Heart, Brain, Users, Compass-ikoner
- `src/pages/WeeklyConversation.tsx` – Heart, Sparkles, MessageCircle, SmilePlus-ikoner
- `src/pages/Dashboard.tsx` – Target, trend-ikoner
- `src/pages/Repair.tsx` – alla småikoner

Alla `text-accent` på dessa ikoner → `text-primary`.

## 2. Input/textarea fokus-ring: terrakotta med 20% opacity

Ändra `focus-visible:ring-accent` till `focus-visible:ring-accent/20` i:
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`

Detta ger en subtilare, varm markering utan hög kontrast.

## 3. Förhindra iOS auto-zoom vid input-fokus

iOS Safari zoomar in automatiskt på input-fält med `font-size < 16px`. Lösningen:
- I `src/components/ui/input.tsx`: ändra `text-base md:text-sm` till `text-base` (alltid 16px)
- I `src/components/ui/textarea.tsx`: ändra `text-sm` till `text-base`
- Alternativt lägga till `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">` i `index.html`

Jag gör båda – sätter font-size till 16px på inputs OCH lägger till `maximum-scale=1` i viewport-meta.

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/ui/input.tsx` | ring opacity 20%, text-base |
| `src/components/ui/textarea.tsx` | ring opacity 20%, text-base |
| `index.html` | viewport maximum-scale=1 |
| `src/pages/DailyCheck.tsx` | ikoner text-accent → text-primary |
| `src/pages/Evaluate.tsx` | ikoner text-accent → text-primary |
| `src/pages/WeeklyConversation.tsx` | ikoner text-accent → text-primary |
| `src/pages/Dashboard.tsx` | ikoner text-accent → text-primary |
| `src/pages/Repair.tsx` | ikoner text-accent → text-primary |

