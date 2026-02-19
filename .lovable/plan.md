
## Åtgärda två buggar: Daglig Check & Närd

### Rotorsak: Två separata problem

#### Problem 1 — Daglig Check: Duplicate key constraint

`handleSave` i `DailyCheck.tsx` har kvar:
```typescript
if (!user || !profile?.couple_id) return;
```

Nu när alla användare alltid har ett `couple_id` borde detta aldrig blockera. Men om `profile` är `null` i en tidig render, hoppar funktionen ur — och när användaren försöker igen (med `profile` laddad) sker ett nytt `INSERT` istället för `UPDATE`, eftersom `existingId` inte laddats korrekt. Det bryter `UNIQUE (user_id, check_date)`.

**Fix**: Byt `insert` mot `upsert` med `onConflict: "user_id,check_date"` — precis som `evaluations` gör. Då hanteras duplicates automatiskt utan att `existingId` behöver vara satt.

#### Problem 2 — Närd (Evaluate): RLS USING-policy blockerar upsert

Postgres `upsert` kontrollerar BOTH `INSERT WITH CHECK` och `SELECT USING` när en befintlig rad ska uppdateras. SELECT-policyn för `evaluations` är:
```sql
USING (couple_id = get_my_couple_id())
```

`handleSubmit` i `Evaluate.tsx` har fortfarande:
```typescript
if (!user || !profile?.couple_id) return;
```

Problemet uppstår i en race condition: `profile.couple_id` finns, men `get_my_couple_id()` på databasservern returnerar `NULL` eller en annan couple_id eftersom profilen nyligen skapades av trigger men inte synkroniserats tillbaka till `useAuth`-kontexten. Upsert skickar rätt `couple_id`, men RLS SELECT-policyn nekar "synen" på raden.

**Fix**: Lägg till `refreshProfile()` efter att profilen laddats + ändra SELECT-policyn för `evaluations` så den även tillåter att läsa egna rader (via `user_id = auth.uid()`), precis som `repairs`-tabellen redan gör.

### Implementationsplan

#### Steg 1 — Databasmigration: Lägg till SELECT-policy för egna evaluations

Lägg till en alternativ SELECT-policy som alltid tillåter användare att läsa sina egna rader, oberoende av `couple_id`:

```sql
CREATE POLICY "Users can read own evaluations"
ON public.evaluations FOR SELECT
USING (auth.uid() = user_id);
```

Detta är samma mönster som redan används i `repairs`-tabellen ("Users can read own repairs" + "Partners can read couple repairs").

#### Steg 2 — DailyCheck.tsx: Byt insert mot upsert

Ändra `handleSave` från:
```typescript
if (existingId) {
  await supabase.from("daily_checks").update(payload).eq("id", existingId);
} else {
  await supabase.from("daily_checks").insert(payload);
}
```

Till att alltid använda `upsert` med conflict-hantering:
```typescript
await supabase.from("daily_checks").upsert(payload, {
  onConflict: "user_id,check_date",
});
```

Ta också bort den gamla `if (!user || !profile?.couple_id) return;`-guarden — den är nu onödig eftersom alla användare alltid har `couple_id`.

#### Steg 3 — Evaluate.tsx: Ta bort gammal guard + refreshProfile

- Ändra `if (!user || !profile?.couple_id) return;` till `if (!user) return;`
- Lägg till `await refreshProfile()` i `useAuth`-kontexten anropas innan `upsert` om `profile` verkar vara stale — alternativt vänta på att `profile?.couple_id` finns via en `useEffect`

#### Tekniska detaljer

- `daily_checks` har `UNIQUE (user_id, check_date)` — upsert med `onConflict` löser race conditions elegant
- `evaluations` har `UNIQUE (user_id, week_start, area)` — upsert fungerar redan, problemet är enbart RLS SELECT
- Inga ändringar i `couples`-tabellen eller triggers behövs
- `get_my_couple_id()` är VOLATILE — returnerar alltid rätt värde från databasen, men det kan vara ett timing-problem om profilen skapades i samma session utan refresh
