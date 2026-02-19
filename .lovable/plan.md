
## Åtgärda två problem: Daglig Check & Närd

### Problem 1 — Närd: Alla dagar i veckan får prick, oavsett om de är ifyllda

**Rotorsak**: I `Evaluate.tsx`, `loadMarkedDates` (rad 59–79) markerar **alla 7 dagar** i varje vecka som har sparad data:

```typescript
uniqueWeeks.forEach((ws) => {
  const d = new Date(ws + "T00:00:00");
  for (let i = 0; i < 7; i++) {       // ← 7 dagar per vecka
    allDates.push(format(day, "yyyy-MM-dd"));
  }
});
```

Evaluate sparar data per **vecka** (ett `week_start`-värde), inte per dag. Så varje vecka som är ifylld genererar 7 prickar — en per dag. Eftersom varje ny vecka skapar 4 rader (en per område: hälsa, karriär, ekonomi, relationer), och dessa räknas som "ifylld vecka", syns prickar på alla dagarna.

**Fix**: Markera bara en dag per vecka — specifikt `week_start`-dagen (måndag). Alternativt: skicka enbart veckostartdatum till `markedDates` och låt `WeekDayPicker` jämföra om den visade veckans start matchar en markerad vecka.

Den renaste lösningen är att bara lägga till `week_start` som en enda prick (dvs. markera måndag i veckor som är ifyllda), inte alla 7 dagar. Så pricken syns bara på måndagen för ifyllda veckor. Men eftersom Närd är veckobaserat passar det bättre att visa pricken på *alla* dagar i den veckan, fast med ett nytt `weekMode`-prop i `WeekDayPicker`. 

Enklaste och klaraste lösningen: **Markera enbart den dag som är `week_start`** (alltid en måndag) och låt en prick synas bara på den dagen i veckovyn. Alternativt: ta bort denna "alla 7 dagar"-loop och bara lägg till `week_start`-datumet.

### Problem 2 — Daglig Check: Kan inte fylla i dagar bakåt

**Rotorsak**: `loadMarkedDates` hämtar bara dagar i **den aktuellt visade veckan** (rad 66–77 i DailyCheck.tsx):

```typescript
const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
const we = addDays(ws, 6);
// Hämtar bara dagar i [ws, we]
```

Det betyder att prickarna försvinner/uppdateras korrekt vid veckonavigering. **Men problemet med att faktiskt spara bakåtdatum** beror på ett timezone-problem: `since.toISOString().split("T")[0]` i grafdatahämtningen (rad 129) konverterar till UTC, vilket kan ge fel datum vid midnatt i europeisk tid.

Det troliga huvudproblemet med bakåt-sparning: `format(selectedDate, "yyyy-MM-dd")` använder lokal tid och borde ge rätt datum. Men när `WeekDayPicker` anropar `onDateChange(day)` med en `Date`-instans skapad av `addDays(weekStart, i)`, kan `weekStart` (från `startOfWeek(selectedDate, {weekStartsOn: 1})`) ge ett resultat som konverteras fel om `selectedDate` är ett UTC-datum.

**Mest trolig bugg**: `loadMarkedDates` är beroende av `selectedDate` och hämtar bara innevarande vecka — detta är korrekt beteende. Men `loadForDate` resetar formuläret och anropar `loadQuestion()` om `data` är null. När en användare navigerar bakåt i tid och ingen data finns, laddas en ny fråga. Det är korrekt. Problemet är om sparning faktiskt fungerar eller inte.

**Säkrare datumformatering**: Byt ut `since.toISOString().split("T")[0]` till en lokal datumformatering för att undvika timezone-shift vid grafdatainhämtning.

### Implementationsplan

#### Fix 1 — Evaluate.tsx: Rätta markedDates till att bara markera en dag per vecka

Ändra `loadMarkedDates` i `Evaluate.tsx` så att den enbart lägger till `week_start`-datumet (måndag) per ifylld vecka, istället för alla 7 dagar:

```typescript
// Förut:
uniqueWeeks.forEach((ws) => {
  const d = new Date(ws + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    allDates.push(format(day, "yyyy-MM-dd"));
  }
});
setMarkedDates(allDates);

// Efter:
setMarkedDates(uniqueWeeks); // week_start är redan "yyyy-MM-dd"
```

Eftersom `WeekDayPicker` visar prickar per dag, och Närd är veckobaserat, är det mest intuitivt att visa pricken på **måndagen** (week_start) när veckan är ifylld. Det undviker att alla dagar i veckan markeras.

#### Fix 2 — DailyCheck.tsx: Säkrare datumhantering

Byt ut `since.toISOString().split("T")[0]` i grafdatahämtningen mot en lokal datumformatering med `format(since, "yyyy-MM-dd")` från date-fns, för att undvika UTC-shift:

```typescript
// Förut:
.gte("check_date", since.toISOString().split("T")[0])

// Efter:
.gte("check_date", format(since, "yyyy-MM-dd"))
```

#### Tekniska detaljer

- `evaluations` lagrar data per vecka (ett `week_start` per vecka), inte per dag — därför ska pricken visas på veckostarten, inte på alla 7 dagar
- `daily_checks` lagrar per dag — prickar per dag är korrekt
- `format()` från date-fns använder lokal tid, vilket är korrekt för svenska användare i CET/CEST
- `toISOString()` konverterar till UTC och kan ge fel datum (t.ex. ger `2025-02-19 00:30 CET` → `2025-02-18T23:30:00Z`)
