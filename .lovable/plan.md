

## Fix: Veckosamtal kan inte spara eller markera klar

### Rotorsak

Tabellen `weekly_entries` saknar en SELECT-policy for egen data. Den enda SELECT-policyn ("Read couple entries") kraver att samtalet har ett `couple_id` som matchar via `get_my_couple_id()`. Nar anvandaren inte har nagon partner (couple_id ar null) kan de inte lasa tillbaka sina egna entries.

Detta bryter sparningen eftersom koden gor `.insert(payload).select().single()` -- insert lyckas, men SELECT-steget blockeras av RLS, sa hela operationen returnerar ett fel.

### Losning

#### Databasmigration

Lagg till en SELECT-policy pa `weekly_entries` som tillater anvandare att lasa sina egna poster:

```sql
CREATE POLICY "Users can read own entries"
ON weekly_entries FOR SELECT
USING (auth.uid() = user_id);
```

Det ar den enda andringen som behovs. Ingen kodandring kravs -- frontendens logik ar korrekt, det ar bara databasatkomsten som blockerar.

### Teknisk sammanfattning

| Andring | Plats |
|---|---|
| Lagg till SELECT-policy for egna entries | DB-migration pa `weekly_entries` |

