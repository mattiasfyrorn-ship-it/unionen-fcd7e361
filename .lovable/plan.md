

## Alla funktioner ska fungera utan partner

### Problem

- `daily_checks.couple_id` och `evaluations.couple_id` har NOT NULL-constraint -- blockerar sparning utan partner
- RLS-policys for SELECT kraver matchande `couple_id` via `get_my_couple_id()`
- WeeklyConversation avbryter helt om `couple_id` saknas (rad 68)
- Koden skickar `profile.couple_id` direkt utan fallback

### Databasandringar (migration)

1. **Gor `couple_id` nullable** i bade `daily_checks` och `evaluations`:
```sql
ALTER TABLE daily_checks ALTER COLUMN couple_id DROP NOT NULL;
ALTER TABLE evaluations ALTER COLUMN couple_id DROP NOT NULL;
ALTER TABLE weekly_conversations ALTER COLUMN couple_id DROP NOT NULL;
```

2. **Uppdatera RLS-policys** sa att anvandare alltid kan lasa sin egen data, oavsett `couple_id`:

- `daily_checks` INSERT: Tillat om `auth.uid() = user_id` (redan sa, men couple_id null maste tillatas)
- `daily_checks` SELECT: Lagg till policy for `auth.uid() = user_id` (utover befintlig couple-baserad)
- `evaluations` INSERT/SELECT: Samma monster
- `weekly_conversations`: Lagg till policy som tillater operationer baserat pa user_id via entries, inte bara couple_id

3. **Lagg till SELECT-policy for egen data** pa `weekly_conversations`:
```sql
CREATE POLICY "Users can manage own conversations"
ON weekly_conversations FOR ALL
USING (
  couple_id = get_my_couple_id()
  OR couple_id IS NULL
  OR EXISTS (
    SELECT 1 FROM weekly_entries we WHERE we.conversation_id = id AND we.user_id = auth.uid()
  )
);
```

### Kodandringar

#### DailyCheck.tsx
- Andra `couple_id: profile.couple_id` till `couple_id: profile.couple_id || null` i payload (rad 158)

#### Evaluate.tsx
- Samma andring: `couple_id: profile.couple_id || null` i inserts (rad 120)
- Ta bort check som blockerar om couple_id saknas

#### WeeklyConversation.tsx
- Ta bort `if (!profile?.couple_id) return;` (rad 68)
- Anvand `profile.couple_id || null` vid insert av conversation
- Dolj partner-status-rad om ingen partner finns
- Tillat "Klar for mote" och sparning aven utan partner
- Gom "Starta mote"-knappen om ingen partner ar kopplad (behover bada vara redo)
- Visa anteckningsvy direkt om ingen partner finns (solo-mote)

### Sammanfattning

| Andring | Plats |
|---|---|
| Gor couple_id nullable i 3 tabeller | DB-migration |
| Lagg till RLS for egen data | DB-migration |
| Fallback for null couple_id | DailyCheck.tsx, Evaluate.tsx |
| Solo-lage for veckosamtal | WeeklyConversation.tsx |

