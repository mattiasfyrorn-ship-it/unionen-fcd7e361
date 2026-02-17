

# Gör Närds datumväljare identisk med Relationskontots

## Problem
Närd-sidan använder `WeekDayPicker` med `weekMode={true}`, vilket gör att alla 7 dagar i veckan markeras med primary-färg samtidigt. Relationskontot markerar bara den valda dagen -- det ser helt annorlunda ut.

## Lösning
Ta bort `weekMode`-propen från WeekDayPicker i Evaluate.tsx. Datumväljaren kommer då se exakt likadan ut som i Relationskontot -- bara den valda dagen markeras, men datan laddar fortfarande baserat på veckans `week_start`.

## Teknisk ändring

| Fil | Ändring |
|---|---|
| `src/pages/Evaluate.tsx` | Ta bort `weekMode` från WeekDayPicker-anropet (rad 192-197) |

Rad 192-197 ändras från:
```tsx
<WeekDayPicker
  selectedDate={selectedDate}
  onDateChange={setSelectedDate}
  markedDates={markedDates}
  weekMode
/>
```
till:
```tsx
<WeekDayPicker
  selectedDate={selectedDate}
  onDateChange={setSelectedDate}
  markedDates={markedDates}
/>
```

Ingen annan ändring behövs -- all logik för att ladda/spara per vecka (via `weekStart`) behålls som den är.

