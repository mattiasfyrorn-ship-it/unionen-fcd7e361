

# Dagsväljare för Relationskontot och Närd

## Översikt

Lägg till en dagsväljare-komponent i båda sidorna som visar veckans dagar (Mån-Sön) som knappar, med pilknappar för att navigera till tidigare/framtida veckor. Dagens datum är förvalt. Formuläret laddar befintlig data eller visar tomt för den valda dagen. Spara uppdaterar eller skapar ny post.

---

## 1. Ny komponent: `src/components/WeekDayPicker.tsx`

En återanvändbar komponent som visar:
- Vänsterpil (föregående vecka) och högerpil (nästa vecka, max denna vecka)
- Veckans datum som etikett (t.ex. "10 feb - 16 feb")
- 7 knappar: M T O T F L S -- den valda dagen markeras med primary-färg
- Dagar med befintlig data kan visas med en prick/indikator (valfritt)

Props: `selectedDate`, `onDateChange`, `markedDates?` (optional, för att visa vilka dagar som har data)

---

## 2. Ändringar i `src/pages/DailyCheck.tsx`

- Lägg till `selectedDate` state (default: idag)
- Visa `WeekDayPicker` högst upp under rubriken
- När `selectedDate` ändras: ladda befintlig data för den dagen (query med `check_date = selectedDate`)
- Fyll i formuläret med befintlig data eller nollställ till tomt
- Spara-knappen gör upsert med `check_date = selectedDate`
- Ta bort "saved"-vyn som blockerar formuläret -- visa toast istället och stanna kvar
- `handleSave` använder `selectedDate` istället för hårdkodad `today`

---

## 3. Ändringar i `src/pages/Evaluate.tsx`

- Närd är veckobas (evaluations har `week_start`), men dagsväljaren fungerar som veckobas: att välja en dag sätter `week_start` till måndagen i den veckan
- Lägg till `selectedDate` state (default: idag)
- Visa `WeekDayPicker` -- men här agerar den som veckoväljare (hela veckan markeras)
- När vecka ändras: ladda befintlig data för den veckans `week_start`
- Fyll i formuläret eller nollställ
- Ta bort "submitted"-vyn -- visa toast och stanna kvar
- `handleSubmit` använder beräknad `weekStart` från `selectedDate`

---

## Teknisk sammanfattning

| Fil | Ändring |
|---|---|
| `src/components/WeekDayPicker.tsx` | Ny komponent -- veckonavigering med dagknappar |
| `src/pages/DailyCheck.tsx` | Integrera dagsväljare, ladda/spara per valt datum |
| `src/pages/Evaluate.tsx` | Integrera veckoväljare, ladda/spara per vald vecka |

### Databasändringar
Inga -- befintliga tabeller stödjer redan datum-baserad upsert.

