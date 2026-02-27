

## Fix: Infinite recursion i RLS-policy for weekly_conversations

### Rotorsak

Databasloggarna visar: **"infinite recursion detected in policy for relation weekly_conversations"**

SELECT-policyn pa `weekly_conversations` innehaller en subquery mot `weekly_entries`. Men `weekly_entries` har en SELECT-policy ("Read couple entries") som gor en subquery tillbaka mot `weekly_conversations`. Detta skapar en oandlig loop.

Den problematiska policyn:
```text
(auth.uid() = user_id) 
OR (couple_id = get_my_couple_id()) 
OR (EXISTS (SELECT 1 FROM weekly_entries we 
    WHERE we.conversation_id = we.id  -- <-- BUG: jamfor med sig sjalv
    AND we.user_id = auth.uid()))
```

Dessutom finns en bugg: `we.conversation_id = we.id` jamfor entry-tabellens egna kolumner mot varandra istallet for mot conversations-tabellens id.

### Losning

Ta bort den problematiska policyn och ersatt med en enklare som inte orsakar rekursion. Solo-anvandare tacks redan av `auth.uid() = user_id`, och par-anvandare tacks av `couple_id = get_my_couple_id()`. EXISTS-villkoret behovs inte.

### Databasmigration

```sql
DROP POLICY IF EXISTS "Users can read own or couple conversations" 
  ON weekly_conversations;

CREATE POLICY "Users can read own or couple conversations"
  ON weekly_conversations FOR SELECT
  USING (
    auth.uid() = user_id 
    OR couple_id = get_my_couple_id()
  );
```

### Kodandring

I `WeeklyConversation.tsx`, lagg till felhantering sa att tysta fel inte langre sker:

- Lagg till `console.error` och en toast vid fel i `load()`-funktionen (conversation-skapning och -hamtning)
- Lagg till feedback i `handleSave` nar `conversationId` ar null: visa en toast som sager att nagon gick fel vid laddning

### Sammanfattning

| Andring | Plats |
|---|---|
| Ersatt rekursiv SELECT-policy | DB-migration pa `weekly_conversations` |
| Lagg till felhantering i load/save | WeeklyConversation.tsx |

